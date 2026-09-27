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

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const staff = await prisma.staff.findFirst({ where: { email } });
        if (!staff) return null;

        const validPassword = await bcrypt.compare(password, staff.passwordHash);
        if (!validPassword) return null;

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