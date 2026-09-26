import { prisma } from "./prisma";
import { QueueStatus } from "@prisma/client";

// GRUPO A - Parte 3
// Quando um horário abre (por cancelamento), essa função decide QUEM da fila
// deve ser notificado primeiro.
//
// Regra: pega o cliente que está esperando (status WAITING) há mais tempo
// (ordem de chegada) e cujo serviço desejado (se informado) cabe dentro da
// duração do horário que abriu.
//
// Parâmetros:
//   establishmentId - de qual salão é a fila (multi-tenant)
//   slotDurationMins - quantos minutos o horário vago tem disponível
//   serviceId - opcional. Se informado, só considera clientes que pediram
//               esse serviço específico (ou que não especificaram nenhum).
export async function findNextCompatibleEntry(
  establishmentId: string,
  slotDurationMins: number,
  serviceId?: string
) {
  // Caso de borda: duração inválida (0, negativa) não deveria nem chegar
  // aqui, mas protegemos contra dados malformados vindos da API.
  if (!establishmentId || slotDurationMins <= 0) {
    return null;
  }

  // Busca os candidatos aguardando, do mais antigo pro mais recente.
  const candidates = await prisma.queueEntry.findMany({
    where: {
      establishmentId,
      status: QueueStatus.WAITING,
    },
    include: { service: true },
    orderBy: { createdAt: "asc" },
  });

  // Caso de borda: fila vazia.
  if (candidates.length === 0) {
    return null;
  }

  for (const entry of candidates) {
    // Cliente sem serviço definido: consideramos compatível com qualquer horário.
    if (!entry.serviceId) {
      return entry;
    }

    // Se um serviceId específico foi passado, só casa com clientes que
    // pediram exatamente esse serviço.
    if (serviceId && entry.serviceId !== serviceId) {
      continue;
    }

    // Verifica se o serviço do cliente cabe dentro do horário disponível.
    // Ex: não faz sentido oferecer 20min de horário pra quem quer um
    // serviço de 60min.
    const duration = entry.service?.durationMins ?? 30;
    if (duration <= slotDurationMins) {
      return entry;
    }
    // Se não cabe, continua procurando o próximo da fila (não quebra a
    // ordem de chegada pulando só quem não serve pra esse horário).
  }

  // Ninguém da fila é compatível com esse horário específico.
  return null;
}

// Marca uma entrada da fila como "notificada", registrando até quando
// o cliente tem pra confirmar (janela configurável por estabelecimento,
// padrão 15 minutos - ver Establishment.notifyWindowMins).
export async function markEntryAsNotified(entryId: string, windowMins: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMins * 60_000);

  return prisma.queueEntry.update({
    where: { id: entryId },
    data: {
      status: QueueStatus.NOTIFIED,
      notifiedAt: now,
      notifyExpiresAt: expiresAt,
    },
  });
}