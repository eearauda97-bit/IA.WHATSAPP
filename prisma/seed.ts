import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const establishment = await prisma.establishment.upsert({
    where: { whatsappPhoneId: "1317136151489296" },
    update: {},
    create: {
      name: "Salão de Teste",
      whatsappPhoneId: "1317136151489296",
      whatsappNumber: "15551467876",
      timezone: "America/Sao_Paulo",
      notifyWindowMins: 15,
    },
  });

  console.log("Establishment criado:", establishment);

  const passwordHash = await bcrypt.hash("senha123", 10);
  const staff = await prisma.staff.upsert({
    where: { establishmentId_email: { establishmentId: establishment.id, email: "teste@teste.com" } },
    update: {},
    create: {
      establishmentId: establishment.id,
      email: "teste@teste.com",
      passwordHash,
      role: "OWNER",
    },
  });

  console.log("Staff criado:", staff.email, "/ senha: senha123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());