const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL?.trim();

async function main() {
  console.log("Initializing Pool with robust configurations...");
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 10000,      // Terminate idle clients after 10 seconds to stay ahead of Neon timeout
    connectionTimeoutMillis: 5000, // Timeout after 5 seconds if connection fails (DB_001 rule)
    keepAlive: true,                // Enable TCP Keep-Alive
  });

  pool.on("error", (err) => {
    console.error("[Postgres Pool Error]", err);
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Executing test query via pool adapter...");
    const result = await prisma.$queryRaw`SELECT 1 as val`;
    console.log("Query Successful:", result);

    console.log("Simulating idle wait for 12 seconds to trigger idle timeout clean up...");
    await new Promise((resolve) => setTimeout(resolve, 12000));

    console.log("Executing query again after idle timeout to test connection recovery...");
    const result2 = await prisma.$queryRaw`SELECT 2 as val`;
    console.log("Query 2 Successful:", result2);
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    console.log("Done.");
  }
}

main();
