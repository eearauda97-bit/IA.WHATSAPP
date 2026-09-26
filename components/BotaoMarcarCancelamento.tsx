"use client";

import { useState } from "react";

// GRUPO A - Parte 7
// Botão que o atendente clica quando um cliente cancela um horário.
// Ele chama POST /api/slots (parte 4), que acha o próximo cliente
// compatível na fila e dispara a notificação via WhatsApp.
//
// Uso esperado (dentro do dashboard, feito pelo Grupo B):
// <BotaoMarcarCancelamento
//   establishmentId={estabelecimento.id}
//   startsAt="2026-09-26T18:30:00-03:00"
//   endsAt="2026-09-26T19:00:00-03:00"
//   onResult={(resultado) => atualizarListaDaFila()}
// />

type ResultadoSlot = {
  slot: unknown;
  notified: { id: string; customerName: string | null; customerPhone: string } | null;
  message?: string;
  error?: string;
};

interface BotaoMarcarCancelamentoProps {
  establishmentId: string;
  startsAt: string; // ISO string
  endsAt: string; // ISO string
  serviceId?: string;
  onResult?: (resultado: ResultadoSlot) => void;
}

export default function BotaoMarcarCancelamento({
  establishmentId,
  startsAt,
  endsAt,
  serviceId,
  onResult,
}: BotaoMarcarCancelamentoProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleClick() {
    // Caso de borda: clique duplo enquanto a requisição anterior ainda
    // está em andamento - ignora silenciosamente em vez de disparar duas
    // notificações pro mesmo horário.
    if (loading) return;

    setLoading(true);
    setFeedback(null);
    setIsError(false);

    try {
      const response = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ establishmentId, startsAt, endsAt, serviceId }),
      });

      const data: ResultadoSlot = await response.json();

      // Caso de borda: a API respondeu, mas com um status de erro
      // (400, 404, 502 etc). Trata como falha mesmo que o JSON tenha vindo certo.
      if (!response.ok) {
        setIsError(true);
        setFeedback(data.error ?? "Não foi possível processar o cancelamento.");
        onResult?.(data);
        return;
      }

      // Caso de borda: ninguém compatível na fila (não é erro, mas o
      // atendente precisa saber que nenhuma notificação foi enviada).
      if (!data.notified) {
        setFeedback(data.message ?? "Nenhum cliente compatível na fila no momento.");
      } else {
        setFeedback(
          `Horário oferecido para ${data.notified.customerName ?? data.notified.customerPhone}.`
        );
      }

      onResult?.(data);
    } catch (err) {
      // Caso de borda: falha de rede (sem internet, servidor fora do ar).
      console.error("Erro ao marcar cancelamento:", err);
      setIsError(true);
      setFeedback("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="botao-cancelamento-wrapper">
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Processando..." : "Marcar cancelamento"}
      </button>

      {feedback && (
        <p role="status" className={isError ? "feedback-erro" : "feedback-sucesso"}>
          {feedback}
        </p>
      )}
    </div>
  );
}
