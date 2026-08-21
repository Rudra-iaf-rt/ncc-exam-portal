-- AlterTable
ALTER TABLE "User" ALTER COLUMN "regimentalNumber" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
