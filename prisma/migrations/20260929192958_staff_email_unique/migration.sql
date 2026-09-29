/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Staff_establishmentId_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "Staff_email_key" ON "Staff"("email");
