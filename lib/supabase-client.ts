// lib/supabase-client.ts
// Cliente Supabase pro NAVEGADOR — usado só pra escutar mudanças em tempo
// real (Realtime). Todas as queries de dados continuam via Prisma; isso
// aqui não substitui o prisma.ts, só complementa pro caso do Realtime.
//
// Precisa no .env.example (Parte B):
//   NEXT_PUBLIC_SUPABASE_URL=
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=
// (a anon key é pública por design, pode ir exposta no client)
//
// Precisa no package.json (Parte B):
//   @supabase/supabase-js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey);
