import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
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