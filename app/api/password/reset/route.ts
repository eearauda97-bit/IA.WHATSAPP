import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  // Limite por IP: 10 tentativas a cada 15 minutos. Protege contra chute de
  // token e contra abuso do bcrypt (que é caro de processar).
  const byIp = await rateLimit(`reset:ip:${getClientIp(req)}`, 10, 15 * 60);
  if (!byIp.ok) return tooManyRequests(byIp.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A senha precisa ter de 8 a 72 caracteres." },
      { status: 400 }
    );
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.staff.update({ where: { id: record.staffId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { staffId: record.staffId } }),
  ]);

  return NextResponse.json({ ok: true });
}