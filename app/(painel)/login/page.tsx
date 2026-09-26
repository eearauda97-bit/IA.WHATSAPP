"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// GRUPO A - Parte 5
// Tela de login do painel. Usa o NextAuth (configurado pelo Grupo B em
// lib/auth.ts) com um provider de credenciais (e-mail + senha).
//
// Nota importante pro Grupo B: como o e-mail do Staff é único apenas
// DENTRO de cada estabelecimento (@@unique([establishmentId, email]) no
// schema), o mesmo e-mail poderia teoricamente existir em dois salões
// diferentes. O lib/auth.ts precisa decidir como tratar esse caso
// (ex: pedir também um identificador do estabelecimento, ou tratar como
// erro de configuração já que na prática cada dono terá e-mails distintos).
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Caso de borda: campos vazios (o "required" do input já ajuda, mas
    // navegadores/autofill às vezes deixam passar espaços em branco).
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      // Caso de borda: signIn pode falhar silenciosamente sem lançar
      // exceção - o erro vem dentro do próprio resultado.
      if (!result || result.error) {
        setError("E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      // Caso de borda: falha de rede/servidor durante o login.
      console.error("Erro ao tentar logar:", err);
      setError("Não foi possível conectar. Tente novamente em instantes.");
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>Entrar no painel</h1>

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          disabled={loading}
        />

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
        />

        {error && (
          <p role="alert" className="login-error">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
