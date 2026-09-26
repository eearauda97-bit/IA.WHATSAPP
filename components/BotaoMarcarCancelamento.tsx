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
          mensagem: data.error || "Erro ao marcar cancelamento.",
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
    } catch (err) {
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
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Marcando..." : "Marcar cancelamento"}
      </button>

      {resultado && (
        <p
          style={{
            color:
              resultado.tipo === "erro"
                ? "red"
                : resultado.tipo === "sucesso-notificado"
                ? "green"
                : "orange",
          }}
        >
          {resultado.mensagem}
        </p>
      )}
    </div>
  );
}