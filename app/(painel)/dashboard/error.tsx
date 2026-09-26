// app/(painel)/dashboard/error.tsx
"use client";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="p-6">
      <h2 className="font-semibold text-red-600">Erro no dashboard</h2>
      <pre className="mt-2 whitespace-pre-wrap text-sm">{error.message}</pre>
      <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-400">{error.stack}</pre>
    </div>
  );
}