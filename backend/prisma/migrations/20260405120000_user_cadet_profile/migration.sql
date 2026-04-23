-- Cadet profile fields for mobile registration
-- NOTE: `mobile` already exists in the initial migration for this repo.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "batch" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "yearOfStudy" TEXT;
