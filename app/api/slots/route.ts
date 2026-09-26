import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findNextCompatibleEntry, markEntryAsNotified } from "@/lib/queue";
// GRUPO B ainda vai implementar essa função em lib/whatsapp.ts.
// Assinatura esperada: sendWhatsAppMessage(to: string, message: string): Promise<void>
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// GRUPO A - Parte 4
// POST /api/slots
// Chamado pelo painel quando o atendente marca que um horário abriu
// (por cancelamento). Body esperado:
// {
//   establishmentId: string,
//   startsAt: string (ISO),
//   endsAt: string (ISO),
//   serviceId?: string
// }
const bodySchema = z.object({
  establishmentId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  serviceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    // Caso de borda: corpo da requisição não é JSON válido.
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { establishmentId, startsAt, endsAt, serviceId } = parsed.data;
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  // Caso de borda: horário de fim antes (ou igual) ao de início.
  if (end.getTime() <= start.getTime()) {
    return NextResponse.json(
      { error: "endsAt deve ser depois de startsAt" },
      { status: 400 }
    );
  }

  // Caso de borda: estabelecimento não existe.
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
  });
  if (!establishment) {
    return NextResponse.json({ error: "Estabelecimento não encontrado" }, { status: 404 });
  }

  const slotDurationMins = Math.round((end.getTime() - start.getTime()) / 60_000);

  // Cria o registro do horário vago primeiro, mesmo que ninguém seja notificado
  // ainda - assim fica registrado no histórico independente do resultado da fila.
  const slot = await prisma.slot.create({
    data: {
      establishmentId,
      startsAt: start,
      endsAt: end,
    },
  });

  const nextEntry = await findNextCompatibleEntry(establishmentId, slotDurationMins, serviceId);

  // Caso de borda: ninguém na fila é compatível com esse horário.
  if (!nextEntry) {
    return NextResponse.json(
      {
        slot,
        notified: null,
        message: "Nenhum cliente compatível na fila no momento",
      },
      { status: 200 }
    );
  }

  await markEntryAsNotified(nextEntry.id, establishment.notifyWindowMins);

  const formattedTime = start.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: establishment.timezone,
  });

  // Se o envio do WhatsApp falhar (ex: token expirado, número inválido),
  // não queremos que o cliente fique preso em "NOTIFIED" sem nunca ter
  // recebido a mensagem de verdade - por isso o try/catch e o rollback do status.
  try {
    await sendWhatsAppMessage(
      nextEntry.customerPhone,
      `Abriu um horário às ${formattedTime}! Responda "SIM" em até ${establishment.notifyWindowMins} minutos para confirmar.`
    );
  } catch (err) {
    console.error("Falha ao enviar WhatsApp para", nextEntry.customerPhone, err);

    // Rollback: devolve o cliente pro status de espera, já que ele não
    // recebeu a notificação de verdade.
    await prisma.queueEntry.update({
      where: { id: nextEntry.id },
      data: { status: "WAITING", notifiedAt: null, notifyExpiresAt: null },
    });

    return NextResponse.json(
      {
        slot,
        notified: null,
        error: "Horário registrado, mas falha ao notificar o cliente. Tentando o próximo não foi feito automaticamente.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ slot, notified: nextEntry }, { status: 200 });
}