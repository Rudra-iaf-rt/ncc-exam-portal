const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

async function main() {
  console.log("Initializing native Prisma Client...");
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

  try {
    console.log("Running direct query using native driver...");
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as val`;
    console.log("Native Connection Successful!", result);
    console.log(`Query took ${Date.now() - start}ms`);

    console.log("Listing some materials...");
    const materials = await prisma.material.findMany({ take: 3 });
    console.log("Materials:", materials);
  } catch (err) {
    console.error("Native connection failed:", err);
  } finally {
    await prisma.$disconnect();
    console.log("Disconnected.");
  }
}

main();
