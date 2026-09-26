import { NextRequest, NextResponse } from "next/server";

// GRUPO A - Parte 2
// Essa função responde à verificação que a Meta faz quando você cadastra
// a URL do webhook no painel do WhatsApp Cloud API (Meta for Developers).
//
// Fluxo: a Meta chama essa rota com 3 parâmetros na URL:
//   hub.mode      -> sempre "subscribe"
//   hub.verify_token -> o token que a Meta está te enviando de volta
//   hub.challenge -> um número aleatório que precisamos devolver
//
// Se o "hub.verify_token" bater com o WHATSAPP_VERIFY_TOKEN que definimos
// no .env, devolvemos o "hub.challenge" e a Meta confirma que o webhook é válido.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Caso de borda: a Meta pode chamar essa rota sem os parâmetros
  // (ex: alguém acessando a URL direto no navegador). Nesse caso,
  // não deve nem tentar validar - só retorna erro.
  if (!mode || !token || !challenge) {
    return new NextResponse("Parâmetros ausentes", { status: 400 });
  }

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Caso de borda: se esquecemos de configurar o .env, é melhor falhar
  // de forma clara do que aceitar qualquer token por engano.
  if (!expectedToken) {
    console.error(
      "WHATSAPP_VERIFY_TOKEN não está definido no .env - configure antes de cadastrar o webhook na Meta"
    );
    return new NextResponse("Configuração ausente no servidor", { status: 500 });
  }

  if (mode === "subscribe" && token === expectedToken) {
    // A Meta espera receber o challenge de volta como texto puro, sem JSON.
    return new NextResponse(challenge, { status: 200 });
  }

  // Token não bateu ou modo diferente de "subscribe" - rejeita.
  return new NextResponse("Token de verificação inválido", { status: 403 });
}

// A função POST (que recebe as mensagens de verdade dos clientes) é do
// Grupo B - vai ser adicionada nesse mesmo arquivo por eles.
// Import necessário aqui pra o arquivo não dar erro de "POST is not defined"
// caso alguém tente rodar antes do Grupo B terminar a parte deles:
export async function POST(request: NextRequest) {
  return new NextResponse("Ainda não implementado (Grupo B)", { status: 501 });
}