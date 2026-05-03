import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js"
  },
  datasource: {
    // Use process.env directly with a fallback to avoid strict validation errors during build/generation
    url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/placeholder",
  },
});
