import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  try {
    const staff = await prisma.staff.findFirst({
      where: { email: { equals: parsed.data.email.trim(), mode: "insensitive" } },
    });

    if (staff) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      await prisma.passwordResetToken.deleteMany({ where: { staffId: staff.id } });
      await prisma.passwordResetToken.create({
        data: {
          tokenHash,
          staffId: staff.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const base = process.env.APP_URL ?? new URL(req.url).origin;
      await sendPasswordResetEmail(staff.email, `${base}/redefinir-senha?token=${token}`);
    }
  } catch (err) {
    // Só loga: a resposta é sempre a mesma pra não revelar quais e-mails existem.
    console.error("[forgot-password]", err);
  }

  return NextResponse.json({ ok: true });
}