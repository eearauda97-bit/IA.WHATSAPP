const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const establishment = await prisma.establishment.findFirst({
    where: { whatsappPhoneId: '1317136151489296' },
  });

  if (!establishment) {
    console.error('Establishment não encontrado.');
    process.exit(1);
  }

  // Remove todas as entradas da fila desse estabelecimento, EXCETO a do Eduardo (telefone real).
  const result = await prisma.queueEntry.deleteMany({
    where: {
      establishmentId: establishment.id,
      customerPhone: { not: '5562998341670' },
    },
  });

  console.log(`${result.count} entrada(s) de teste removida(s).`);

  const remaining = await prisma.queueEntry.findMany({
    where: { establishmentId: establishment.id },
  });
  console.log('Fila restante:', remaining);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });