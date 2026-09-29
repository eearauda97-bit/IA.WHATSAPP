// lib/rate-limit.ts
// Limite de tentativas guardado no Postgres (tabela RateLimit).
// Não usa memória do servidor porque na Vercel cada requisição pode cair
// numa instância diferente, então um Map em memória não seria confiável.
//
// Se o banco falhar, o limitador "abre" (deixa passar) e só registra o erro,
// para um problema aqui não derrubar o login/recuperação de senha.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/**
 * Conta uma tentativa para `key`. Permite até `limit` tentativas a cada
 * `windowSec` segundos. Ex.: rateLimit("forgot:ip:1.2.3.4", 10, 3600).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  try {
    const now = new Date();

    // Limpeza ocasional de linhas vencidas, para a tabela não crescer sem fim.
    if (Math.random() < 0.02) {
      await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
    }

    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    // Sem registro, ou janela anterior já venceu: começa uma janela nova.
    if (!existing || existing.resetAt <= now) {
      const resetAt = new Date(now.getTime() + windowSec * 1000);
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, retryAfterSec: windowSec };
    }

    // Janela em andamento: soma 1 (increment é atômico no banco).
    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)
    );
    return { ok: updated.count <= limit, retryAfterSec };
  } catch (err) {
    console.error("[rate-limit]", err);
    return { ok: true, retryAfterSec: 0 };
  }
}

/** IP do cliente. Na Vercel, x-real-ip / x-forwarded-for vêm da própria plataforma. */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

/** Resposta padrão de "muitas tentativas" (HTTP 429). */
export function tooManyRequests(retryAfterSec: number) {
  const minutos = Math.max(1, Math.ceil(retryAfterSec / 60));
  return NextResponse.json(
    {
      error: `Muitas tentativas. Tente novamente em ${minutos} minuto${
        minutos > 1 ? "s" : ""
      }.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}