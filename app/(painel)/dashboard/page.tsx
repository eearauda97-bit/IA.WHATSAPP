// app/(painel)/dashboard/page.tsx
// Server component: exige sessão, busca a fila do estabelecimento logado
// e passa pro ListaFila (client component) já com a posição calculada.
import BotaoMarcarCancelamento from "@/components/BotaoMarcarCancelamento";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPosition } from "@/lib/queue";
import ListaFila from "@/components/ListaFila";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const entries = await prisma.queueEntry.findMany({
    where: {
      establishmentId: session.user.establishmentId,
      status: { in: ["WAITING", "NOTIFIED", "CONFIRMED"] },
    },
    include: { service: true },
    orderBy: { createdAt: "asc" },
  });

  const entriesWithPosition = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      position: await getPosition(entry),
    }))
  );

    return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Fila de atendimento</h1>

      <div className="mb-4">
        <BotaoMarcarCancelamento
          establishmentId={session.user.establishmentId}
          startsAt={new Date(Date.now() + 30 * 60 * 1000).toISOString()}
          endsAt={new Date(Date.now() + 60 * 60 * 1000).toISOString()}
        />
      </div>

      <ListaFila
        initialEntries={entriesWithPosition}
        establishmentId={session.user.establishmentId}
      />
    </main>
  );
}
