// lib/whatsapp.ts
// Integração com a WhatsApp Cloud API (Meta / Graph API).
//
// Multi-tenant: um único token de sistema (WHATSAPP_TOKEN) é usado para
// TODOS os estabelecimentos, mas cada envio precisa do phoneNumberId
// específico do Establishment (Establishment.whatsappPhoneId), já que cada
// salão/barbearia tem seu próprio número dentro da mesma conta Meta Business.
//
// Variáveis de ambiente necessárias (ver .env.example):
//   WHATSAPP_TOKEN         -> token permanente do System User (Meta App), compartilhado
//   WHATSAPP_VERIFY_TOKEN  -> string arbitrária usada na verificação GET do webhook
//   WHATSAPP_APP_SECRET    -> App Secret do app na Meta, usado para validar a assinatura do webhook

import crypto from "crypto";

const GRAPH_API_VERSION = "v21.0";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
}

/**
 * Envia uma mensagem de texto simples a partir do número de um estabelecimento.
 * Só funciona dentro da janela de 24h após a última mensagem do cliente,
 * ou se o cliente iniciou a conversa. Fora disso, use sendWhatsAppTemplate.
 */
export async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const token = getEnv("WHATSAPP_TOKEN");

  const res = await fetch(graphUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Falha ao enviar mensagem WhatsApp: ${res.status} ${errorBody}`);
  }

  return res.json();
}

/**
 * Envia uma mensagem de template aprovado (necessário para iniciar conversa
 * fora da janela de 24h, ex: notificar "chegou sua vez").
 */
export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string = "pt_BR",
  bodyParams: string[] = []
) {
  const token = getEnv("WHATSAPP_TOKEN");

  const res = await fetch(graphUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: bodyParams.length
          ? [
              {
                type: "body",
                parameters: bodyParams.map((text) => ({ type: "text", text })),
              },
            ]
          : undefined,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Falha ao enviar template WhatsApp: ${res.status} ${errorBody}`);
  }

  return res.json();
}

/**
 * Valida a assinatura X-Hub-Signature-256 enviada pela Meta em cada
 * webhook, usando o corpo BRUTO (raw) da requisição. Isso garante que a
 * chamada realmente veio da Meta e não foi forjada.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const appSecret = getEnv("WHATSAPP_APP_SECRET");
  const expectedHash = crypto.createHmac("sha256", appSecret).update(rawBody, "utf-8").digest("hex");
  const expectedSignature = `sha256=${expectedHash}`;

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type IncomingWhatsAppMessage = {
  phoneNumberId: string; // qual número recebeu -> identifica o Establishment
  from: string; // telefone do cliente, ex: "5562999999999"
  name?: string; // nome do perfil do WhatsApp, se disponível
  text: string;
  messageId: string;
  timestamp: string;
};

/**
 * Extrai as mensagens de texto recebidas do payload bruto do webhook da Meta.
 * O payload pode conter status de entrega (sent/delivered/read) em vez de
 * mensagens novas — essa função ignora esses casos e retorna [] quando não
 * há mensagem de texto para processar.
 */
export function parseIncomingMessages(payload: any): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = [];

  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const value = change?.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const contacts = value?.contacts ?? [];
      const incoming = value?.messages ?? [];

      for (const msg of incoming) {
        if (msg.type !== "text") continue; // ignora imagens, áudios etc. por enquanto

        const contact = contacts.find((c: any) => c.wa_id === msg.from);

        messages.push({
          phoneNumberId,
          from: msg.from,
          name: contact?.profile?.name,
          text: msg.text?.body ?? "",
          messageId: msg.id,
          timestamp: msg.timestamp,
        });
      }
    }
  }

  return messages;
}
