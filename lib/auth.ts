// lib/auth.ts
// Autenticação com NextAuth (Auth.js v5) usando Credentials Provider
// (email + senha) sobre o modelo Staff.
//
// Dependências a adicionar no package.json (Parte B):
//   next-auth@beta   (Auth.js v5, compatível com App Router)
//   bcryptjs
//
// Variável de ambiente a adicionar no .env.example (Parte B):
//   AUTH_SECRET=   (gerar com: npx auth secret)

import crypto from "crypto";
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { StaffRole } from "@prisma/client";

// Estende os tipos padrão do NextAuth pra incluir os campos que a gente
// precisa em toda sessão (multi-tenant: sempre sabemos de qual
// establishment o usuário logado é).
declare module "next-auth" {
  interface User {
    role: StaffRole;
    establishmentId: string;
  }

  interface Session {
    user: {
      id: string;
      role: StaffRole;
      establishmentId: string;
    } & DefaultSession["user"];
  }
}

// Import de tipo "vazio" necessário antes do augmentation abaixo: o
// TypeScript, em alguns casos, não reconhece corretamente o subcaminho
// "next-auth/jwt" (que vem do campo "exports" do pacote) dentro de um
// `declare module` sem essa referência explícita antes.
import type {} from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    staffId?: string;
    role?: StaffRole;
    establishmentId?: string;
  }
}

// Erro com código próprio para a tela de login diferenciar "muitas
// tentativas" de "e-mail ou senha inválidos". O código chega ao navegador
// em `result.code` (signIn de next-auth/react).
class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

// Hash de mentira, calculado uma vez. Quando o e-mail não existe, comparamos
// a senha com ele só para gastar o mesmo tempo de um login real. Sem isso, dá
// para descobrir quais e-mails existem medindo a demora da resposta.
const DUMMY_HASH = bcrypt.hashSync("senha-de-mentira-para-igualar-o-tempo", 10);

// Limites de tentativa de login (janela de 15 minutos).
const LOGIN_WINDOW_SEC = 15 * 60;
const LOGIN_MAX_POR_EMAIL = 10;
const LOGIN_MAX_POR_IP = 20;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials, request) => {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!rawEmail || !password) return null;

        // E-mail não diferencia maiúsculas: guardamos e buscamos sempre em minúsculas.
        const email = rawEmail.trim().toLowerCase();

        // Limite de tentativas, por IP e por e-mail. Acima do limite o login
        // falha com um erro de código próprio ("rate_limited"), que a tela
        // mostra como "muitas tentativas". A chave do e-mail é um hash, para
        // o e-mail não ficar em texto puro na tabela. O limite vale também
        // para e-mails que não existem, então a mensagem não revela quais
        // e-mails estão cadastrados.
        const ip = request ? getClientIp(request) : "unknown";
        const emailKey = crypto.createHash("sha256").update(email).digest("hex").slice(0, 16);

        const porIp = await rateLimit(`login:ip:${ip}`, LOGIN_MAX_POR_IP, LOGIN_WINDOW_SEC);
        const porEmail = await rateLimit(`login:email:${emailKey}`, LOGIN_MAX_POR_EMAIL, LOGIN_WINDOW_SEC);
        if (!porIp.ok || !porEmail.ok) throw new RateLimitedError();

        const staff = await prisma.staff.findUnique({ where: { email } });

        // Compara sempre, mesmo sem usuário, para o tempo de resposta ser parecido.
        const validPassword = await bcrypt.compare(
          password,
          staff?.passwordHash ?? DUMMY_HASH
        );
        if (!staff || !validPassword) return null;

        // Login certo: zera o contador de tentativas desse e-mail.
        await prisma.rateLimit
          .deleteMany({ where: { key: `login:email:${emailKey}` } })
          .catch(() => {});

        return {
          id: staff.id,
          email: staff.email,
          role: staff.role,
          establishmentId: staff.establishmentId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.staffId = user.id;
        token.role = user.role;
        token.establishmentId = user.establishmentId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.staffId) session.user.id = token.staffId;
      if (token.role) session.user.role = token.role;
      if (token.establishmentId) session.user.establishmentId = token.establishmentId;
      return session;
    },
  },
});

/**
 * Helper pra usar dentro de rotas de API (route handlers) que precisam de
 * login. Lança erro se não houver sessão válida — use dentro de um try/catch
 * ou deixe a rota responder 401 no catch.
 *
 * Exemplo de uso em app/api/queue/route.ts:
 *   const staff = await requireStaff();
 *   // staff.establishmentId já garante o isolamento multi-tenant
 */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user; // { id, role, establishmentId, ... }
}

/**
 * Gera o hash de uma senha em texto puro. Use ao criar/editar um Staff
 * (isso é Parte B, mas deixo aqui porque é a mesma lib de hashing).
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}