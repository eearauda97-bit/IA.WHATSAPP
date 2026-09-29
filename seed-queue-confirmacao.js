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

  const entry = await prisma.queueEntry.create({
    data: {
      establishmentId: establishment.id,
      customerPhone: '56994052585',
      customerName: 'Teste Confirmação',
      status: 'WAITING',
    },
  });

  console.log('Cliente adicionado na fila:', entry);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });