import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  // Limite por IP: 10 pedidos por hora.
  const byIp = await rateLimit(`forgot:ip:${getClientIp(req)}`, 10, 60 * 60);
  if (!byIp.ok) return tooManyRequests(byIp.retryAfterSec);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  try {
    // E-mail não diferencia maiúsculas: buscamos sempre em minúsculas.
    const email = parsed.data.email.trim().toLowerCase();

    // Limite por e-mail: 3 e-mails por hora. Acima disso a resposta é a mesma
    // de sempre (ok), só que nenhum e-mail é enviado. Assim ninguém consegue
    // lotar a caixa de outra pessoa nem descobrir quais e-mails existem.
    const byEmail = await rateLimit(`forgot:email:${email}`, 3, 60 * 60);
    const staff = byEmail.ok
      ? await prisma.staff.findUnique({ where: { email } })
      : null;

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