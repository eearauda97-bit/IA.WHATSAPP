import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyNext } from "@/lib/queue";

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

  try {
    const notifiedEntry = await notifyNext(establishmentId);

    if (!notifiedEntry) {
      return NextResponse.json(
        {
          message: "Horário registrado, mas ninguém compatível na fila no momento (ou já há alguém aguardando confirmação).",
          slot,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Cliente notificado com sucesso.",
        slot,
        notifiedEntry,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao processar a notificação.", slot },
      { status: 502 }
    );
  }
}