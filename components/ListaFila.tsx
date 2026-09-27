// components/ListaFila.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowserClient } from "@/lib/supabase-client";

type QueueEntryWithExtras = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  status: "WAITING" | "NOTIFIED" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
  position: number;
  notifiedAt: string | Date | null;
  notifyExpiresAt: string | Date | null;
  service?: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Aguardando",
  NOTIFIED: "Chamado",
  CONFIRMED: "Confirmado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

const STATUS_STYLE: Record<string, string> = {
  WAITING: "bg-surfaceMuted text-inkSecondary",
  NOTIFIED: "bg-warningSoft text-warning",
  CONFIRMED: "bg-successSoft text-success",
  EXPIRED: "bg-dangerSoft text-danger",
  CANCELLED: "bg-surfaceMuted text-inkMuted",
};

// Chave usada no filtro <-> status real da entrada
type FiltroStatus = "WAITING" | "NOTIFIED" | "CONFIRMED" | null;

function initialsFrom(name: string | null, phone: string) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return phone.slice(-2);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_STYLE[status] ?? "bg-surfaceMuted text-inkMuted"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function ListaFila({
  initialEntries,
  establishmentId,
}: {
  initialEntries: QueueEntryWithExtras[];
  establishmentId: string;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries);
    } catch {
      // Falha de rede pontual — mantém a última lista conhecida na tela.
    }
  }, []);

  useEffect(() => {
    const channel = supabaseBrowserClient
      .channel(`queue-${establishmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "QueueEntry",
          filter: `establishmentId=eq.${establishmentId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, [establishmentId, refetch]);

  const stats = useMemo(() => {
    return {
      waiting: entries.filter((e) => e.status === "WAITING").length,
      notified: entries.filter((e) => e.status === "NOTIFIED").length,
      confirmed: entries.filter((e) => e.status === "CONFIRMED").length,
    };
  }, [entries]);

  // Se houver filtro ativo, mostra só quem tem aquele status.
  // Clicar de novo no mesmo card (ou no botão "Ver todos") volta a mostrar tudo.
  const entriesFiltradas = useMemo(() => {
    if (!filtroStatus) return entries;
    return entries.filter((e) => e.status === filtroStatus);
  }, [entries, filtroStatus]);

  function toggleFiltro(status: FiltroStatus) {
    setFiltroStatus((atual) => (atual === status ? null : status));
  }

  const cardBase =
    "rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const cardInativo = "border-border bg-surface hover:bg-surfaceMuted";
  const cardAtivo = "border-accent bg-accentSoft";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Fila de atendimento</h1>
        {filtroStatus && (
          <button
            type="button"
            onClick={() => setFiltroStatus(null)}
            className="text-sm font-medium text-accent hover:underline"
          >
            ← Ver todos
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => toggleFiltro("WAITING")}
          className={`${cardBase} ${
            filtroStatus === "WAITING" ? cardAtivo : cardInativo
          }`}
        >
          <p className="text-2xl font-semibold text-ink">{stats.waiting}</p>
          <p className="mt-0.5 text-xs text-inkMuted">Aguardando</p>
        </button>

        <button
          type="button"
          onClick={() => toggleFiltro("NOTIFIED")}
          className={`${cardBase} ${
            filtroStatus === "NOTIFIED" ? cardAtivo : cardInativo
          }`}
        >
          <p className="text-2xl font-semibold text-ink">{stats.notified}</p>
          <p className="mt-0.5 text-xs text-inkMuted">Chamados</p>
        </button>

        <button
          type="button"
          onClick={() => toggleFiltro("CONFIRMED")}
          className={`${cardBase} ${
            filtroStatus === "CONFIRMED" ? cardAtivo : cardInativo
          }`}
        >
          <p className="text-2xl font-semibold text-ink">{stats.confirmed}</p>
          <p className="mt-0.5 text-xs text-inkMuted">Confirmados</p>
        </button>
      </div>

      {entriesFiltradas.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">
            {filtroStatus
              ? `Nenhum cliente com status "${STATUS_LABEL[filtroStatus]}"`
              : "Nenhum cliente na fila"}
          </p>
          <p className="mt-1 text-sm text-inkMuted">
            {filtroStatus
              ? "Assim que houver alguém nesse status, a lista atualiza automaticamente."
              : "Assim que alguém entrar pelo WhatsApp, essa lista é atualizada automaticamente."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {entriesFiltradas.map((entry) => (
            <li key={entry.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex w-6 shrink-0 justify-center">
                {entry.status === "WAITING" && (
                  <span className="text-sm font-semibold text-inkMuted">
                    {entry.position}
                  </span>
                )}
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accentSoft text-xs font-semibold text-accent">
                {initialsFrom(entry.customerName, entry.customerPhone)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {entry.customerName || entry.customerPhone}
                </p>
                <p className="truncate text-xs text-inkMuted">
                  {entry.service?.name ?? "Serviço não informado"}
                </p>
              </div>

              <p className="hidden shrink-0 text-xs text-inkMuted sm:block">
                {entry.customerPhone}
              </p>

              <StatusBadge status={entry.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}