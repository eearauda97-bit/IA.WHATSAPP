// components/ListaFila.tsx
// Renderiza a fila e se atualiza sozinha via Supabase Realtime: qualquer
// INSERT/UPDATE/DELETE em QueueEntry do estabelecimento dispara um refetch
// de /api/queue (mantém posição e dados do serviço sempre corretos, em vez
// de tentar reconstruir isso a partir do payload cru do Realtime).
//
// Pré-requisito (Parte B / config Supabase): habilitar Realtime na tabela
// QueueEntry em Database > Replication no painel do Supabase — sem isso,
// o canal se inscreve mas nunca recebe eventos.

"use client";

import { useEffect, useState, useCallback } from "react";
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
  WAITING: "bg-quietSoft text-quiet",
  NOTIFIED: "bg-amberSoft text-amber",
  CONFIRMED: "bg-accentSoft text-accent",
  EXPIRED: "bg-dangerSoft text-danger",
  CANCELLED: "bg-quietSoft text-quiet",
};

export default function ListaFila({
  initialEntries,
  establishmentId,
}: {
  initialEntries: QueueEntryWithExtras[];
  establishmentId: string;
}) {
  const [entries, setEntries] = useState(initialEntries);

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
          event: "*", // INSERT, UPDATE e DELETE
          schema: "public",
          table: "QueueEntry",
          filter: `establishmentId=eq.${establishmentId}`,
        },
        () => {
          // Não confiamos no payload do evento pra montar a linha (não traz
          // service.name nem a posição calculada) — só usamos como gatilho
          // pra buscar o estado atualizado da API.
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowserClient.removeChannel(channel);
    };
  }, [establishmentId, refetch]);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-muted">
        Nenhum cliente na fila no momento.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {entry.status === "WAITING" ? `${entry.position}º — ` : ""}
              {entry.customerName || entry.customerPhone}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {entry.service?.name ?? "Serviço não informado"} · {entry.customerPhone}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[entry.status] ?? "bg-quietSoft text-quiet"}`}
          >
            {STATUS_LABEL[entry.status] ?? entry.status}
          </span>
        </li>
      ))}
    </ul>
  );
}