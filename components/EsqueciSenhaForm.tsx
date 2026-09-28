"use client";

import { useState } from "react";

export default function EsqueciSenhaForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-4 text-sm text-muted">
        Se esse e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.
        Confira também a caixa de spam.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 text-left">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu e-mail"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {status === "loading" ? "Enviando..." : "Enviar link de recuperação"}
      </button>
      {status === "error" && (
        <p className="text-sm text-danger">Não foi possível enviar. Tente de novo.</p>
      )}
    </form>
  );
}