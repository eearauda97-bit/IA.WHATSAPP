const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const establishments = await prisma.establishment.findMany();
  console.log('=== Establishments ===');
  console.log(establishments);

  const staff = await prisma.staff.findMany();
  console.log('=== Staff ===');
  console.log(staff);

  const entries = await prisma.queueEntry.findMany({
    where: { customerPhone: '5562998341670' },
  });
  console.log('=== QueueEntries com esse telefone ===');
  console.log(entries);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });