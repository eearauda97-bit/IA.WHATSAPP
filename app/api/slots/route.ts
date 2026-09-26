import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findNextCompatibleEntry, markEntryAsNotified } from "@/lib/queue";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const slotSchema = z.object({
  establishmentId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido (JSON malformado)." },
      { status: 400 }
    );
  }

  const parsed = slotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { establishmentId, startsAt, endsAt } = parsed.data;
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (endDate <= startDate) {
    return NextResponse.json(
      { error: "O horário de término deve ser depois do horário de início." },
      { status: 400 }
    );
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
  });

  if (!establishment) {
    return NextResponse.json(
      { error: "Estabelecimento não encontrado." },
      { status: 404 }
    );
  }

  // Registra o slot no histórico, mesmo que ninguém seja notificado.
  const slot = await prisma.slot.create({
    data: {
      establishmentId,
      startsAt: startDate,
      endsAt: endDate,
    },
  });

  const nextEntry = await findNextCompatibleEntry(establishmentId, startDate, endDate);

  if (!nextEntry) {
    return NextResponse.json(
      {
        message: "Horário registrado, mas ninguém compatível na fila no momento.",
        slot,
      },
      { status: 200 }
    );
  }

  try {
    await sendWhatsAppMessage(
      nextEntry.customerPhone,
      `Abriu um horário às ${startDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}. Você quer pegar? Responda SIM para confirmar.`
    );
  } catch (err) {
    // Rollback: não deixa o cliente marcado como "notificado" se a mensagem falhou.
    await prisma.queueEntry.update({
      where: { id: nextEntry.id },
      data: { status: "WAITING", notifiedAt: null, notifyExpiresAt: null },
    });

    return NextResponse.json(
      { error: "Falha ao enviar notificação via WhatsApp.", slot },
      { status: 502 }
    );
  }

  await markEntryAsNotified(nextEntry.id, establishment.notifyWindowMins);

  return NextResponse.json(
    {
      message: "Cliente notificado com sucesso.",
      slot,
      notifiedEntry: nextEntry,
    },
    { status: 200 }
  );
}