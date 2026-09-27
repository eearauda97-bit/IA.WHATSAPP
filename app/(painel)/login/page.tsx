"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result) {
        setError("Erro inesperado ao tentar entrar. Tente novamente.");
        return;
      }

      if (result.error) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/90 p-8 shadow-sm backdrop-blur-sm">
        <h1 className="font-display text-2xl font-medium text-ink">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse o painel do seu estabelecimento.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">E-mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accentSoft disabled:opacity-60" />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">Senha</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accentSoft disabled:opacity-60" />
          </div>

          {error && (
            <p className="rounded-lg bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}