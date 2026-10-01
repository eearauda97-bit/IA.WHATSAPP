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
  // Opcional: se /api/queue já devolver createdAt, o "há X min" aparece na fila.
  createdAt?: string | Date | null;
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
  WAITING: "bg-accentSoft text-accent",
  NOTIFIED: "bg-warningSoft text-warning",
  CONFIRMED: "bg-successSoft text-success",
  EXPIRED: "bg-dangerSoft text-danger",
  CANCELLED: "bg-surfaceMuted text-inkMuted",
};

type FiltroStatus = "WAITING" | "NOTIFIED" | "CONFIRMED" | null;

// ---------- Ícones (SVG inline, sem dependência) ----------

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 9.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </svg>
  );
}

// ---------- Configuração dos cards de filtro ----------
// Classes escritas por extenso para o Tailwind enxergar todas.

const FILTROS: {
  key: Exclude<FiltroStatus, null>;
  label: string;
  Icon: () => JSX.Element;
  barra: string;
  icone: string;
  ativo: string;
}[] = [
  {
    key: "WAITING",
    label: "Aguardando",
    Icon: IconClock,
    barra: "bg-accent",
    icone: "bg-accentSoft text-accent",
    ativo: "border-accent bg-accentSoft",
  },
  {
    key: "NOTIFIED",
    label: "Chamados",
    Icon: IconBell,
    barra: "bg-warning",
    icone: "bg-warningSoft text-warning",
    ativo: "border-warning bg-warningSoft",
  },
  {
    key: "CONFIRMED",
    label: "Confirmados",
    Icon: IconCheck,
    barra: "bg-success",
    icone: "bg-successSoft text-success",
    ativo: "border-success bg-successSoft",
  },
];

// ---------- Helpers ----------

const AVATAR_CORES = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

function corDoAvatar(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_CORES[hash % AVATAR_CORES.length];
}

function initialsFrom(name: string | null, phone: string) {
  if (name && name.trim().length > 0) {
    const parts = name
      .replace(/\(.*?\)/g, "") // ignora o que estiver entre parênteses
      .trim()
      .split(/\s+/)
      .map((p) => p.replace(/[^A-Za-zÀ-ÿ0-9]/g, ""))
      .filter(Boolean);
    if (parts.length > 0) {
      return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
    }
  }
  return phone.slice(-2);
}

// 556222222222  -> +55 62 2222-2222
// 5562999999999 -> +55 62 99999-9999
// Qualquer outro formato volta como veio.
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const local = d.slice(4);
    const corte = local.length - 4;
    return `+55 ${ddd} ${local.slice(0, corte)}-${local.slice(corte)}`;
  }
  return raw;
}

function toMs(value: string | Date | null | undefined) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function formatDuration(minutes: number) {
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function tempoNaFila(entry: QueueEntryWithExtras, now: number) {
  const inicio = toMs(entry.createdAt);
  if (inicio === null) return null;
  const min = Math.max(0, Math.floor((now - inicio) / 60000));
  return `há ${formatDuration(min)}`;
}

function tempoParaExpirar(entry: QueueEntryWithExtras, now: number) {
  const fim = toMs(entry.notifyExpiresAt);
  if (fim === null) return null;
  const min = Math.ceil((fim - now) / 60000);
  if (min <= 0) return "expirando";
  return `expira em ${formatDuration(min)}`;
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

// ---------- Componente ----------

export default function ListaFila({
  initialEntries,
  establishmentId,
}: {
  initialEntries: QueueEntryWithExtras[];
  establishmentId: string;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ao_vivo, setAoVivo] = useState(false);

  // Atualiza os "há X min" a cada 30s.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

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
      .subscribe((status) => {
        setAoVivo(status === "SUBSCRIBED");
      });

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

  const contagem: Record<Exclude<FiltroStatus, null>, number> = {
    WAITING: stats.waiting,
    NOTIFIED: stats.notified,
    CONFIRMED: stats.confirmed,
  };

  const entriesFiltradas = useMemo(() => {
    if (!filtroStatus) return entries;
    return entries.filter((e) => e.status === filtroStatus);
  }, [entries, filtroStatus]);

  function toggleFiltro(status: FiltroStatus) {
    setFiltroStatus((atual) => (atual === status ? null : status));
  }

  async function cancelar(id: string) {
    if (!window.confirm("Cancelar este cliente? Ninguém será chamado automaticamente.")) return;
    await fetch(`/api/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    refetch();
  }

  async function chamarProximo() {
    const res = await fetch("/api/queue/call-next", { method: "POST" });
    const data = await res.json();
    window.alert(data.message ?? data.error);
    refetch();
  }

  const naFilaAgora = stats.waiting + stats.notified;

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-ink">
              Fila de atendimento
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                ao_vivo
                  ? "bg-successSoft text-success"
                  : "bg-surfaceMuted text-inkMuted"
              }`}
              title={
                ao_vivo
                  ? "Atualizando em tempo real"
                  : "Reconectando ao tempo real…"
              }
            >
              <span className="relative flex h-2 w-2">
                {ao_vivo && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              {ao_vivo ? "Ao vivo" : "Conectando"}
            </span>
          </div>
          <p className="mt-1 text-sm text-inkMuted">
            {naFilaAgora === 0
              ? "Ninguém na fila agora"
              : naFilaAgora === 1
              ? "1 pessoa na fila agora"
              : `${naFilaAgora} pessoas na fila agora`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {filtroStatus && (
            <button
              type="button"
              onClick={() => setFiltroStatus(null)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accentSoft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              ← Ver todos
            </button>
          )}
          <button
            type="button"
            onClick={chamarProximo}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accentHover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Chamar próximo
          </button>
        </div>
      </div>

      {/* Cards de filtro */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FILTROS.map(({ key, label, Icon, barra, icone, ativo }) => {
          const selecionado = filtroStatus === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFiltro(key)}
              aria-pressed={selecionado}
              className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                selecionado
                  ? ativo
                  : "border-border bg-surface hover:bg-surfaceMuted"
              }`}
            >
              <span
                className={`absolute inset-x-0 top-0 h-1 ${barra}`}
                aria-hidden="true"
              />
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${icone}`}
              >
                <Icon />
              </span>
              <span>
                <span className="block text-3xl font-bold leading-none text-ink">
                  {contagem[key]}
                </span>
                <span className="mt-1 block text-sm text-inkSecondary">
                  {label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {entriesFiltradas.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-borderStrong bg-surface px-6 py-14 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surfaceMuted text-inkMuted">
            <IconUsers />
          </span>
          <p className="text-sm font-medium text-ink">
            {filtroStatus
              ? `Nenhum cliente com status "${STATUS_LABEL[filtroStatus]}"`
              : "Nenhum cliente na fila"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-inkMuted">
            {filtroStatus
              ? "Assim que houver alguém nesse status, a lista atualiza automaticamente."
              : "Assim que alguém entrar pelo WhatsApp, essa lista é atualizada automaticamente."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {entriesFiltradas.map((entry) => {
            const tempo =
              entry.status === "NOTIFIED"
                ? tempoParaExpirar(entry, now)
                : entry.status === "WAITING"
                ? tempoNaFila(entry, now)
                : null;

            return (
              <li
                key={entry.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surfaceMuted/60"
              >
                <div className="flex w-7 shrink-0 justify-center">
                  {entry.status === "WAITING" && (
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-surfaceMuted px-1.5 text-xs font-semibold text-inkSecondary">
                      {entry.position}
                    </span>
                  )}
                </div>

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${corDoAvatar(
                    entry.customerName || entry.customerPhone
                  )}`}
                >
                  {initialsFrom(entry.customerName, entry.customerPhone)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {entry.customerName || formatPhone(entry.customerPhone)}
                  </p>
                  <p className="truncate text-xs text-inkMuted">
                    {entry.service?.name ?? "Serviço não informado"}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-inkSecondary">
                    {formatPhone(entry.customerPhone)}
                  </p>
                  {tempo && (
                    <p
                      className={`mt-0.5 text-xs ${
                        entry.status === "NOTIFIED"
                          ? "font-medium text-warning"
                          : "text-inkMuted"
                      }`}
                    >
                      {tempo}
                    </p>
                  )}
                </div>

                {(entry.status === "WAITING" ||
                  entry.status === "NOTIFIED" ||
                  entry.status === "CONFIRMED") && (
                  <button
                    type="button"
                    onClick={() => cancelar(entry.id)}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-dangerSoft"
                  >
                    Cancelar
                  </button>
                )}

                <StatusBadge status={entry.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}