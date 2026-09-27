// scripts/test-expire.ts
// Força o notifyExpiresAt do cliente NOTIFIED pro passado (simula expiração),
// depois chama expireStaleNotifications pra ver se ele expira e libera o próximo.
// Roda com: npx tsx scripts/test-expire.ts

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { expireStaleNotifications } from "../lib/queue";
import { prisma } from "../lib/prisma";

async function main() {
  const establishmentId = "cmuiumuod000011e9f4055iwk";

  // Força expiração: joga notifyExpiresAt pro passado no cliente NOTIFIED atual
  const notified = await prisma.queueEntry.findFirst({
    where: { establishmentId, status: "NOTIFIED" },
  });

  if (!notified) {
    console.log("Nenhum cliente NOTIFIED encontrado. Rode notifyNext primeiro.");
    await prisma.$disconnect();
    return;
  }

  await prisma.queueEntry.update({
    where: { id: notified.id },
    data: { notifyExpiresAt: new Date(Date.now() - 60_000) }, // 1 min atrás
  });
  console.log(`Forçado notifyExpiresAt no passado para: ${notified.customerName}`);

  console.log("\n--- Chamando expireStaleNotifications ---");
  const count = await expireStaleNotifications(establishmentId);
  console.log(`Entradas expiradas: ${count}`);

  console.log("\n--- Estado da fila DEPOIS ---");
  const after = await prisma.queueEntry.findMany({
    where: { establishmentId, status: { in: ["WAITING", "NOTIFIED", "EXPIRED"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true, customerName: true, status: true },
  });
  console.log(after);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});