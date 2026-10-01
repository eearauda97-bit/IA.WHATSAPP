"use client";

import { useState } from "react";

type Resultado =
  | { tipo: "sucesso-notificado"; mensagem: string }
  | { tipo: "sucesso-sem-fila"; mensagem: string }
  | { tipo: "erro"; mensagem: string };

interface BotaoMarcarCancelamentoProps {
  establishmentId: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  onResult?: (resultado: Resultado) => void;
}

// Classes por tipo de resultado (escritas por extenso para o Tailwind enxergar).
const RESULTADO_STYLE: Record<Resultado["tipo"], string> = {
  "sucesso-notificado": "bg-successSoft text-success",
  "sucesso-sem-fila": "bg-warningSoft text-warning",
  erro: "bg-dangerSoft text-danger",
};

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 motion-safe:animate-spin" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

export default function BotaoMarcarCancelamento({
  establishmentId,
  startsAt,
  endsAt,
  onResult,
}: BotaoMarcarCancelamentoProps) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function handleClick() {
    if (loading) return; // evita clique duplo

    setLoading(true);
    setResultado(null);

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ establishmentId, startsAt, endsAt }),
      });

      const data = await res.json();

      let novoResultado: Resultado;

      if (!res.ok) {
        novoResultado = {
          tipo: "erro",
          mensagem: data.error || "Erro ao liberar o horário.",
        };
      } else if (data.notifiedEntry) {
        novoResultado = {
          tipo: "sucesso-notificado",
          mensagem: `Cliente ${data.notifiedEntry.customerName || data.notifiedEntry.customerPhone} foi notificado.`,
        };
      } else {
        novoResultado = {
          tipo: "sucesso-sem-fila",
          mensagem: "Horário registrado, mas ninguém compatível na fila no momento.",
        };
      }

      setResultado(novoResultado);
      onResult?.(novoResultado);
    } catch {
      const erroResultado: Resultado = {
        tipo: "erro",
        mensagem: "Falha de conexão. Tente novamente.",
      };
      setResultado(erroResultado);
      onResult?.(erroResultado);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accentSoft text-accent">
            <IconCalendar />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Um horário vagou?
            </p>
            <p className="text-sm text-inkSecondary">
              Registre o horário vago e o próximo da fila é avisado no WhatsApp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accentHover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <IconSpinner />}
          {loading ? "Liberando..." : "Liberar horário"}
        </button>
      </div>

      {resultado && (
        <p
          role={resultado.tipo === "erro" ? "alert" : "status"}
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${RESULTADO_STYLE[resultado.tipo]}`}
        >
          {resultado.mensagem}
        </p>
      )}
    </div>
  );
}