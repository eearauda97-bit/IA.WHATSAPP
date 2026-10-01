import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { notifyNext } from "@/lib/queue";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST() {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const limit = await rateLimit(`call-next:staff:${staff.id}`, 30, 60 * 60);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const entry = await notifyNext(staff.establishmentId);
  if (!entry) {
    return NextResponse.json({
      message: "Ninguém para chamar (fila vazia ou já há alguém aguardando resposta).",
    });
  }
  return NextResponse.json({ message: "Cliente chamado.", entry });
}