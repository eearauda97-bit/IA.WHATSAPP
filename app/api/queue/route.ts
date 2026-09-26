import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { QueueStatus } from "@prisma/client";

// GRUPO A - Parte 6
// PATCH /api/queue/:id
// Usado tanto pelo cliente (ao clicar "Sim, quero o horário" vindo do
// WhatsApp) quanto pelo atendente no painel (botão de remover manualmente).
//
// Body esperado:
// { action: "confirm" | "cancel" }
const bodySchema = z.object({
  action: z.enum(["confirm", "cancel"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Caso de borda: id vazio ou ausente na rota (não deveria acontecer com
  // o roteamento do Next, mas protegemos mesmo assim).
  if (!id) {
    return NextResponse.json({ error: "ID da entrada não informado" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const entry = await prisma.queueEntry.findUnique({ where: { id } });

  // Caso de borda: entrada não existe (id errado, ou já foi deletada).
  if (!entry) {
    return NextResponse.json({ error: "Entrada da fila não encontrada" }, { status: 404 });
  }

  const { action } = parsed.data;

  if (action === "cancel") {
    // Cancelar é permitido em qualquer estado não-final (evita "cancelar"
    // algo que já foi cancelado/confirmado antes, o que confundiria o histórico).
    if (entry.status === QueueStatus.CANCELLED || entry.status === QueueStatus.CONFIRMED) {
      return NextResponse.json(
        { error: `Esta entrada já está com status "${entry.status}" e não pode ser cancelada novamente` },
        { status: 409 }
      );
    }

    const updated = await prisma.queueEntry.update({
      where: { id },
      data: { status: QueueStatus.CANCELLED, respondedAt: new Date() },
    });
    return NextResponse.json({ entry: updated }, { status: 200 });
  }

  // action === "confirm"
  // Só faz sentido confirmar uma entrada que foi notificada (recebeu a
  // oferta de horário). Confirmar do nada (status WAITING) não é um fluxo válido.
  if (entry.status !== QueueStatus.NOTIFIED) {
    return NextResponse.json(
      {
        error: `Não é possível confirmar: status atual é "${entry.status}", esperado "NOTIFIED"`,
      },
      { status: 409 }
    );
  }

  // Caso de borda crítico: a janela de tempo pra confirmar expirou
  // (ex: cliente demorou mais de 15min pra responder). Marca como EXPIRED
  // em vez de confirmar, e avisa o motivo.
  if (entry.notifyExpiresAt && entry.notifyExpiresAt.getTime() < Date.now()) {
    const expired = await prisma.queueEntry.update({
      where: { id },
      data: { status: QueueStatus.EXPIRED, respondedAt: new Date() },
    });
    return NextResponse.json(
      { error: "O tempo para confirmar esse horário já expirou", entry: expired },
      { status: 410 }
    );
  }

  const confirmed = await prisma.queueEntry.update({
    where: { id },
    data: { status: QueueStatus.CONFIRMED, respondedAt: new Date() },
  });

  return NextResponse.json({ entry: confirmed }, { status: 200 });
}