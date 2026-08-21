-- AlterTable
ALTER TABLE "Exam"
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3);
