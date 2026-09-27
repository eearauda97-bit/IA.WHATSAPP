const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const establishment = await prisma.establishment.findFirst({
    where: { whatsappPhoneId: '12345' },
  });

  if (!establishment) {
    console.error('Establishment de teste não encontrado. Rode "node seed.js" primeiro.');
    process.exit(1);
  }

  const entry = await prisma.queueEntry.create({
    data: {
      establishmentId: establishment.id,
      customerPhone: '5511988887777',
      customerName: 'Cliente Teste',
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