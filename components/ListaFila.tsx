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
    return <p className="text-gray-500">Nenhum cliente na fila no momento.</p>;
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">
              {entry.status === "WAITING" ? `${entry.position}º — ` : ""}
              {entry.customerName || entry.customerPhone}
            </p>
            <p className="text-sm text-gray-500">
              {entry.service?.name ?? "Serviço não informado"} · {entry.customerPhone}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
              {STATUS_LABEL[entry.status] ?? entry.status}
            </span>
            {/* Botão de cancelamento é Parte B (BotaoMarcarCancelamento.tsx).
                Quando estiver pronto, importar e usar aqui, ex:
                <BotaoMarcarCancelamento entryId={entry.id} /> */}
          </div>
        </li>
      ))}
    </ul>
  );
}