import Link from "next/link";

export default function EsqueciSenhaPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/90 p-8 text-center shadow-sm backdrop-blur-sm">
        <h1 className="font-display text-2xl font-medium text-ink">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted">
          Esta função estará disponível em breve. Por enquanto, peça ao administrador para redefinir sua senha.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}