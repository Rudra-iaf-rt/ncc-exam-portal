require("./load-env");
const { performance } = require("perf_hooks");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { getPerfContext } = require("./perf-context");

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
  // --- Neon cold-start mitigation ---
  // 10s was too aggressive — pool was dropping working connections after every
  // quiet period, forcing a full Neon cold-start (2-5s) on the next request.
  // 60s keeps the connection alive through normal inter-request gaps in dev.
  idleTimeoutMillis: 60_000,
  // Give Neon compute 20s to wake from cold if needed (covers worst-case cold start)
  connectionTimeoutMillis: 20_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000, // send first TCP keepalive 10s after connect
});

pool.on("error", (err) => {
  console.error("[Postgres Pool Error]", err);
});

// --- Neon keep-alive ping ---
// Fires a lightweight SELECT 1 every 45 seconds to prevent Neon from pausing
// compute during quiet periods. Cost: 1 trivial query every 45s.
// Without this, a gap of >5min between requests triggers a 2-5s cold-start.
const KEEP_ALIVE_INTERVAL_MS = 45_000;
let _keepAliveTimer = null;

function startKeepAlive() {
  if (_keepAliveTimer) return; // already running
  _keepAliveTimer = setInterval(async () => {
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      // Non-fatal — the pool will reconnect on the next real request.
      console.warn("[DB Keep-Alive] ping failed:", err.message);
    }
  }, KEEP_ALIVE_INTERVAL_MS);

  // Don't block Node from exiting cleanly
  if (_keepAliveTimer.unref) _keepAliveTimer.unref();
}

// Start immediately so the very first request after boot finds a warm connection
startKeepAlive();


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

// --- Always-on query profiling extension ---
// Annotates the AsyncLocalStorage perf context with per-query timing and row counts.
// Also emits a structured slow-query warning for any query exceeding SLOW_QUERY_MS.
const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 500);

const perfTrackedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const t0 = performance.now();
        const result = await query(args);
        const elapsed = performance.now() - t0;

        // Annotate the current request's perf context (no-op outside a request)
        const ctx = getPerfContext();
        if (ctx) {
          ctx.db_query_count += 1;
          ctx.db_time_ms += elapsed;
          if (Array.isArray(result)) {
            ctx.db_rows += result.length;
          } else if (result != null) {
            ctx.db_rows += 1;
          }
        }

        // Slow-query warning: log any query over the threshold so you can see
        // exactly which model+operation is the culprit in the console.
        if (elapsed >= SLOW_QUERY_MS) {
          const rowCount = Array.isArray(result) ? result.length : (result != null ? 1 : 0);
          console.warn(
            `[SLOW QUERY] ${model}.${operation} — ${elapsed.toFixed(1)}ms — ${rowCount} row(s)` +
            (elapsed > 2000 ? " ⚠️  likely Neon cold-start" : "")
          );
        }

        return result;
      },
    },
  },
});


// --- LOAD_TEST file-logging extension (layered on top of perf tracking) ---
let finalPrisma = perfTrackedPrisma;
if (process.env.LOAD_TEST === "true") {
  const fs = require("fs");
  const path = require("path");
  const logFile = path.join(__dirname, "..", "..", "scratch", "query_times.jsonl");

  finalPrisma = perfTrackedPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now();
          const result = await query(args);
          const timeMs = performance.now() - start;

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