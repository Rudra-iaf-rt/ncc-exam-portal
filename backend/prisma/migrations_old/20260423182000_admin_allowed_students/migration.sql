-- CreateTable
CREATE TABLE "AllowedStudent" (
    "id" SERIAL NOT NULL,
    "regimentalNumber" TEXT NOT NULL,
    "name" TEXT,
    "college" TEXT,
    "batch" TEXT,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedStudent_regimentalNumber_key" ON "AllowedStudent"("regimentalNumber");

-- CreateIndex
CREATE INDEX "AllowedStudent_isRegistered_idx" ON "AllowedStudent"("isRegistered");

-- CreateIndex
CREATE INDEX "AllowedStudent_createdAt_idx" ON "AllowedStudent"("createdAt");
