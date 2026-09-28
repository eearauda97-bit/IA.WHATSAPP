"use client";

import { useState } from "react";
import Link from "next/link";

export default function RedefinirSenhaForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("As senhas não são iguais.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
      } else {
        setError(data.error ?? "Não foi possível redefinir a senha.");
        setStatus("idle");
      }
    } catch {
      setError("Erro de conexão. Tente de novo.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="mt-4">
        <p className="text-sm text-muted">Senha alterada com sucesso.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 text-left">
      <input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nova senha (mín. 8 caracteres)"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
      />
      <input
        type="password"
        required
        minLength={8}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repita a nova senha"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "loading" ? "Salvando..." : "Salvar nova senha"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}