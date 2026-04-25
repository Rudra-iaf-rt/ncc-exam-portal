-- AlterTable
ALTER TABLE "User" ADD COLUMN     "batch" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "wing" TEXT;
