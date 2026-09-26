import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  action: z.enum(["confirm", "cancel"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido (JSON malformado)." },
      { status: 400 }
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ação inválida. Use 'confirm' ou 'cancel'." },
      { status: 400 }
    );
  }

  const entry = await prisma.queueEntry.findUnique({ where: { id } });

  if (!entry) {
    return NextResponse.json(
      { error: "Entrada da fila não encontrada." },
      { status: 404 }
    );
  }

  const { action } = parsed.data;

  if (action === "cancel") {
    if (entry.status === "CONFIRMED" || entry.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Não é possível cancelar uma entrada com status ${entry.status}.` },
        { status: 409 }
      );
    }

    const updated = await prisma.queueEntry.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ message: "Entrada cancelada.", entry: updated });
  }

  // action === "confirm"
  if (entry.status !== "NOTIFIED") {
    return NextResponse.json(
      { error: "Só é possível confirmar uma entrada que foi notificada." },
      { status: 409 }
    );
  }

  if (entry.notifyExpiresAt && entry.notifyExpiresAt < new Date()) {
    const expired = await prisma.queueEntry.update({
      where: { id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json(
      { error: "O prazo para confirmar esse horário já expirou.", entry: expired },
      { status: 410 }
    );
  }

  const confirmed = await prisma.queueEntry.update({
    where: { id },
    data: { status: "CONFIRMED", respondedAt: new Date() },
  });

  return NextResponse.json({ message: "Entrada confirmada.", entry: confirmed });
}