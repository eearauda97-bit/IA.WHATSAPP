// scripts/test-notify-next.ts
// Testa notifyNext isoladamente, sem passar pelo webhook.
// Roda com: npx tsx scripts/test-notify-next.ts

import dotenv from "dotenv";
import path from "path";

// Carrega explicitamente o .env.local (não o .env, que só tem DATABASE_URL)
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { notifyNext } from "../lib/queue";
import { prisma } from "../lib/prisma";

async function main() {
  const establishmentId = "cmuiumuod000011e9f4055iwk"; // "Salão de Teste"

  console.log("--- Estado da fila ANTES de notificar ---");
  const before = await prisma.queueEntry.findMany({
    where: { establishmentId, status: { in: ["WAITING", "NOTIFIED"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, customerName: true, status: true, createdAt: true },
  });
  console.log(before);

  console.log("\n--- Chamando notifyNext ---");
  const result = await notifyNext(establishmentId);

  if (!result) {
    console.log("notifyNext retornou null (já tem alguém NOTIFIED, ou não há ninguém WAITING).");
  } else {
    console.log("Cliente notificado:", {
      id: result.id,
      customerName: result.customerName,
      status: result.status,
      notifiedAt: result.notifiedAt,
      notifyExpiresAt: result.notifyExpiresAt,
    });
  }

  console.log("\n--- Estado da fila DEPOIS de notificar ---");
  const after = await prisma.queueEntry.findMany({
    where: { establishmentId, status: { in: ["WAITING", "NOTIFIED"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, customerName: true, status: true, createdAt: true },
  });
  console.log(after);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
})