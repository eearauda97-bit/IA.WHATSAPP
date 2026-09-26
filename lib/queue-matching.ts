// lib/queue-matching.ts
// 👉 Parte B (amigo): "achar o próximo cliente compatível".
//
// Combinei aqui só a ASSINATURA que o queue.ts (Parte A) espera consumir —
// a implementação (checar serviceId, profissional disponível, slot livre
// etc.) é por sua conta. Pode mexer neste arquivo à vontade sem afetar o
// resto do fluxo, contanto que a função continue retornando isso aqui.

import { prisma } from "@/lib/prisma";
import type { QueueEntry } from "@prisma/client";

/**
 * Deve retornar a próxima QueueEntry (status WAITING) que pode ser chamada
 * agora nesse estabelecimento, considerando compatibilidade de serviço,
 * profissional disponível e/ou slot livre. Retorna null se não houver
 * ninguém compatível pra chamar no momento.
 */
export async function findNextCompatibleEntry(establishmentId: string): Promise<QueueEntry | null> {
  // TODO (Parte B): substituir por lógica real de compatibilidade.
  // Placeholder atual: FIFO simples, só pra não travar o fluxo de teste.
  return prisma.queueEntry.findFirst({
    where: { establishmentId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
  });
}
