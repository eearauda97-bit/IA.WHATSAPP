// app/api/queue/route.ts
//
// GET  -> lista a fila do estabelecimento do staff logado (pro dashboard).
// POST -> adiciona um cliente manualmente na fila (walk-in / cliente sem WhatsApp),
//         reaproveitando a mesma lógica de enterQueue usada pelo webhook.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { enterQueue, getPosition } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { QueueStatus } from "@prisma/client";

const STATUS_VALIDOS: QueueStatus[] = [
  "WAITING",
  "NOTIFIED",
  "CONFIRMED",
  "EXPIRED",
  "CANCELLED",
];

const postSchema = z.object({
  customerPhone: z.string().trim().min(8).max(25),
  customerName: z.string().trim().max(80).optional(),
  serviceId: z.string().trim().min(1).max(50).optional(),
});

// O webhook recebe o número só com dígitos e com DDI (ex.: 5562998341670), e a
// confirmação por WhatsApp compara nesse formato. Então normalizamos aqui:
// só dígitos; se vier sem DDI (10 ou 11 dígitos), assume Brasil (55).
function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) return null;
  return digits;
}

export async function GET(request: NextRequest) {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  // ?status=WAITING,NOTIFIED  (opcional — default mostra só quem está ativo)
  const statusParam = request.nextUrl.searchParams.get("status");
  let statuses: QueueStatus[] = ["WAITING", "NOTIFIED", "CONFIRMED"];

  if (statusParam) {
    const pedidos = statusParam.split(",").map((s) => s.trim().toUpperCase());
    statuses = pedidos.filter((s): s is QueueStatus =>
      (STATUS_VALIDOS as string[]).includes(s)
    );
    if (statuses.length === 0) {
      return NextResponse.json(
        { error: `status inválido. Use: ${STATUS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }
  }

  const entries = await prisma.queueEntry.findMany({
    where: {
      establishmentId: staff.establishmentId,
      status: { in: statuses },
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

  // Limite de uso: 60 cadastros manuais por hora por funcionário.
  const limite = await rateLimit(`queue-post:staff:${staff.id}`, 60, 60 * 60);
  if (!limite.ok) return tooManyRequests(limite.retryAfterSec);

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "customerPhone é obrigatório (e os campos têm limite de tamanho)." },
      { status: 400 }
    );
  }

  const { customerName, serviceId } = parsed.data;

  const customerPhone = normalizePhone(parsed.data.customerPhone);
  if (!customerPhone) {
    return NextResponse.json(
      { error: "Telefone inválido. Use DDD + número (ex.: 62 99999-9999)." },
      { status: 400 }
    );
  }

  // O serviço precisa ser do mesmo estabelecimento de quem está logado.
  if (serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, establishmentId: staff.establishmentId },
      select: { id: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
    }
  }

  try {
    const entry = await enterQueue({
      establishmentId: staff.establishmentId,
      customerPhone,
      customerName: customerName || undefined,
      serviceId,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    console.error("[queue] falha ao adicionar na fila:", err);
    return NextResponse.json(
      { error: "Não foi possível adicionar à fila." },
      { status: 500 }
    );
  }
}