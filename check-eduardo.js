const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.queueEntry.findMany({
    where: { customerPhone: '5562998341670' },
  });
  console.log(entries);
}

main().finally(() => prisma.$disconnect());