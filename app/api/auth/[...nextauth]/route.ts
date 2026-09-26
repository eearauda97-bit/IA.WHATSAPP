// app/api/auth/[...nextauth]/route.ts
// Rota obrigatória do NextAuth — não é Parte A nem Parte B, é infraestrutura
// que o próprio lib/auth.ts exige pra existir. Não precisa mexer aqui.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
