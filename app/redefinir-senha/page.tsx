import Link from "next/link";
import RedefinirSenhaForm from "@/components/RedefinirSenhaForm";

export default function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/90 p-8 text-center shadow-sm backdrop-blur-sm">
        <h1 className="font-display text-2xl font-medium text-ink">Nova senha</h1>
        {token ? (
          <RedefinirSenhaForm token={token} />
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">Link inválido.</p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
              Voltar para o login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}