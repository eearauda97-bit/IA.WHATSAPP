// lib/queue.ts
// Responsabilidades deste arquivo (Parte A): entrar na fila, notificar o
// próximo cliente e expirar notificações não confirmadas.
//
// A lógica de "achar o próximo cliente compatível" é Parte B — este arquivo
// só CONSOME findNextCompatibleEntry de ./queue-matching.ts, sem implementar
// nada dessa parte.

import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { findNextCompatibleEntry } from "@/lib/queue-matching";
import type { QueueEntry, QueueStatus } from "@prisma/client";

const ACTIVE_STATUSES: QueueStatus[] = ["WAITING", "NOTIFIED", "CONFIRMED"];

type EnterQueueParams = {
  establishmentId: string;
  customerPhone: string;
  customerName?: string;
  serviceId?: string;
};

/**
 * Adiciona um cliente à fila de um estabelecimento. Se o cliente já tiver
 * uma entrada ativa (esperando, notificado ou confirmado), não duplica —
 * retorna a entrada existente e avisa a posição atual dela.
 */
export async function enterQueue(params: EnterQueueParams): Promise<QueueEntry> {
  const { establishmentId, customerPhone, customerName, serviceId } = params;

  const establishment = await prisma.establishment.findUniqueOrThrow({
    where: { id: establishmentId },
  });

  const existing = await prisma.queueEntry.findFirst({
    where: {
      establishmentId,
      customerPhone,
      status: { in: ACTIVE_STATUSES },
    },
  });

  if (existing) {
    const position = await getPosition(existing);
    try {
      await sendWhatsAppMessage(
        establishment.whatsappPhoneId,
        customerPhone,
        `Você já está na fila! Sua posição atual é ${position}.`
      );
    } catch (err) {
      // A entrada na fila já existe e já foi encontrada — não deixamos uma
      // falha de envio (token expirado, rede, restrição da Meta) impedir
      // o retorno normal da função.
      console.error(`Falha ao enviar mensagem de "já está na fila" para ${customerPhone}:`, err);
    }
    return existing;
  }

  const entry = await prisma.queueEntry.create({
    data: {
      establishmentId,
      customerPhone,
      customerName,
      serviceId,
      status: "WAITING",
    },
  });

  const position = await getPosition(entry);
  try {
    await sendWhatsAppMessage(
      establishment.whatsappPhoneId,
      customerPhone,
      `Você entrou na fila! Sua posição é ${position}. Avisaremos por aqui quando chegar sua vez.`
    );
  } catch (err) {
    // O registro já foi criado no banco — uma falha só no envio da
    // confirmação não deve derrubar o fluxo de quem chamou enterQueue
    // (ex: o webhook, que processa várias mensagens em sequência).
    console.error(`Falha ao enviar mensagem de confirmação de entrada para ${customerPhone}:`, err);
  }

  return entry;
}

/**
 * Posição (1-indexed) de uma entrada dentro da fila de espera do seu
 * estabelecimento, contando só quem está WAITING antes dela.
 */
export async function getPosition(entry: QueueEntry): Promise<number> {
  if (entry.status !== "WAITING") return 0;

  const countBefore = await prisma.queueEntry.count({
    where: {
      establishmentId: entry.establishmentId,
      status: "WAITING",
      createdAt: { lt: entry.createdAt },
    },
  });

  return countBefore + 1;
}

/**
 * Chama o próximo cliente da fila, se ainda não houver ninguém NOTIFIED
 * aguardando confirmação (evita chamar dois clientes ao mesmo tempo).
 * Usa Establishment.notifyWindowMins como prazo de expiração.
 *
 * Quem decide QUEM é o próximo é a Parte B (findNextCompatibleEntry) —
 * este arquivo só orquestra notificação e expiração em cima do resultado.
 */
export async function notifyNext(establishmentId: string): Promise<QueueEntry | null> {
  const alreadyNotified = await prisma.queueEntry.findFirst({
    where: { establishmentId, status: "NOTIFIED" },
  });
  if (alreadyNotified) return null;

  const next = await findNextCompatibleEntry(establishmentId);
  if (!next) return null;

  const establishment = await prisma.establishment.findUniqueOrThrow({
    where: { id: establishmentId },
  });

  const notifiedAt = new Date();
  const notifyExpiresAt = new Date(notifiedAt.getTime() + establishment.notifyWindowMins * 60_000);

  const updated = await prisma.queueEntry.update({
    where: { id: next.id },
    data: { status: "NOTIFIED", notifiedAt, notifyExpiresAt },
  });

  try {
    await sendWhatsAppMessage(
      establishment.whatsappPhoneId,
      updated.customerPhone,
      `Chegou sua vez! Você tem ${establishment.notifyWindowMins} minutos para confirmar, ou perderá a vez.`
    );
  } catch (err) {
    // O status já mudou pra NOTIFIED no banco antes disso — mesmo que o
    // envio da mensagem falhe (token expirado, rede, restrição da Meta),
    // não queremos que isso derrube quem chamou notifyNext (ex: um loop
    // de expireStaleNotifications processando vários clientes).
    console.error(`Falha ao enviar notificação WhatsApp para ${updated.customerPhone}:`, err);
  }

  return updated;
}

/**
 * Expira quem foi notificado e não confirmou dentro do prazo, e já chama o
 * próximo em seguida. Pensado para ser chamado periodicamente (Vercel Cron).
 * Sem establishmentId, roda para todos os estabelecimentos de uma vez.
 */
export async function expireStaleNotifications(establishmentId?: string): Promise<number> {
  const now = new Date();

  const stale = await prisma.queueEntry.findMany({
    where: {
      status: "NOTIFIED",
      notifyExpiresAt: { lt: now },
      ...(establishmentId ? { establishmentId } : {}),
    },
  });

  for (const entry of stale) {
    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { status: "EXPIRED", respondedAt: now },
    });

    // Libera vaga pro próximo dessa mesma fila.
    await notifyNext(entry.establishmentId);
  }

  return stale.length;
}