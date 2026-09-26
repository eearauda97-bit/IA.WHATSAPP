// app/api/auth/[...nextauth]/route.ts
// Rota obrigatória do NextAuth — não é Parte A nem Parte B, é infraestrutura
// que o próprio lib/auth.ts exige pra existir. Não precisa mexer aqui.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// app/api/queue/route.ts
//
// GET  -> lista a fila do estabelecimento do staff logado (pro dashboard).
// POST -> adiciona um cliente manualmente na fila (walk-in / cliente sem WhatsApp),
//         reaproveitando a mesma lógica de enterQueue usada pelo webhook.

import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { enterQueue, getPosition } from "@/lib/queue";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  // ?status=WAITING,NOTIFIED  (opcional — default mostra só quem está ativo)
  const statusParam = request.nextUrl.searchParams.get("status");
  const statuses = statusParam
    ? statusParam.split(",")
    : ["WAITING", "NOTIFIED", "CONFIRMED"];

  const entries = await prisma.queueEntry.findMany({
    where: {
      establishmentId: staff.establishmentId,
      status: { in: statuses as any },
    },
    include: { service: true },
    orderBy: { createdAt: "asc" },
  });

  // Calcula a posição de cada um (só relevante pra quem está WAITING).
  const withPosition = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      position: await getPosition(entry),
    }))
  );

  return NextResponse.json({ entries: withPosition });
}

export async function POST(request: NextRequest) {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const customerPhone = body?.customerPhone as string | undefined;
  const customerName = body?.customerName as string | undefined;
  const serviceId = body?.serviceId as string | undefined;

  if (!customerPhone) {
    return NextResponse.json({ error: "customerPhone é obrigatório" }, { status: 400 });
  }

  const entry = await enterQueue({
    establishmentId: staff.establishmentId,
    customerPhone,
    customerName,
    serviceId,
  });

  return NextResponse.json({ entry }, { status: 201 });
}