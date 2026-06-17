require("./load-env");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and set your PostgreSQL URL."
  );
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, 
  },
  max: Number(process.env.DB_POOL_SIZE) || 10, 
  idleTimeoutMillis: 10000,      // Close idle connections after 10 seconds to stay ahead of Neon's timeout
  connectionTimeoutMillis: 15000, // Timeout after 15 seconds if database is unreachable (gives Neon cold-start head room)
  keepAlive: true,                // Enable TCP Keep-Alive to prevent socket idle drops
});

pool.on("error", (err) => {
  console.error("[Postgres Pool Error]", err);
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

let finalPrisma = prisma;
if (process.env.LOAD_TEST === "true") {
  const fs = require("fs");
  const path = require("path");
  const logFile = path.join(__dirname, "..", "..", "scratch", "query_times.jsonl");
  
  finalPrisma = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const end = performance.now();
          const timeMs = end - start;
          
          fs.appendFile(
            logFile,
            JSON.stringify({ model, operation, timeMs, timestamp: new Date().toISOString() }) + "\n",
            (err) => { if (err) console.error("Failed to write query log", err); }
          );
          
          return result;
        },
      },
    },
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = finalPrisma;
}

module.exports = { prisma: finalPrisma };