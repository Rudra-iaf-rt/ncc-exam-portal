const { performance } = require("perf_hooks");
const { logger } = require("../utils/logger");
const { runWithPerfContext, createPerfContext } = require("../lib/perf-context");

/**
 * In-memory ring buffer — last 200 request perf records.
 * Shared in-process. Cleared on restart (intentional — live diagnostic only).
 * Exposed as global so perf.routes.js can read it without a circular dep.
 */
const RING_SIZE = 200;
const perfRing = [];
global._perfRing = perfRing; // accessible from perf.routes.js

function pushToRing(record) {
  perfRing.push(record);
  if (perfRing.length > RING_SIZE) perfRing.shift();
}

/**
 * Telemetry middleware.
 *
 * Per-request flow:
 * 1. Create a fresh perf context object.
 * 2. Wrap the downstream call (next()) in AsyncLocalStorage so Prisma queries
 *    and Redis lookups automatically annotate the same context.
 * 3. On response finish: compute total duration, merge with perf context,
 *    log a structured JSON line, and push a record into the ring buffer.
 */
function telemetry(req, res, next) {
  const startTime = performance.now();
  const perfCtx = createPerfContext();

  // Set standard tracing headers
  if (req.requestId) {
    res.setHeader("X-Request-ID", String(req.requestId));
  }

  res.on("finish", () => {
    const totalMs = performance.now() - startTime;
    const statusCode = res.statusCode;

    // Classify log level based on HTTP status
    let level = "info";
    if (statusCode >= 400 && statusCode < 500) level = "warn";
    else if (statusCode >= 500) level = "error";

    // Map REST action in verb_noun format: e.g. GET_EXAMS, POST_ATTEMPT_START
    let cleanPath = (req.baseUrl || "") + req.path;
    cleanPath = cleanPath
      .replace(/\/\d+/g, "/:id")   // Replace ID segments
      .replace(/^\/api/, "")        // Strip /api prefix
      .replace(/[\/\-]/g, "_")      // Slashes/hyphens → underscore
      .toUpperCase();
    if (cleanPath.startsWith("_")) cleanPath = cleanPath.substring(1);
    const action = `${req.method}_${cleanPath || "ROOT"}`;

    // Extract potential primary resource IDs
    const resourceId =
      req.params?.id ||
      req.params?.examId ||
      req.params?.attemptId ||
      req.body?.examId ||
      req.body?.id ||
      null;

    // Payload size from Content-Length header (may be absent for streams)
    const payloadBytes = parseInt(res.getHeader("content-length") || "0", 10) || 0;

    const telemetryData = {
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode,
      // --- Timing breakdown ---
      duration_ms: Number(totalMs.toFixed(2)),
      db_query_count: perfCtx.db_query_count,
      db_time_ms: Number(perfCtx.db_time_ms.toFixed(2)),
      db_rows: perfCtx.db_rows,
      cache_checked: perfCtx.cache_checked,
      cache_hit: perfCtx.cache_hit,
      cache_time_ms: Number(perfCtx.cache_time_ms.toFixed(2)),
      // --- Payload ---
      payload_bytes: payloadBytes,
      // --- Request identity ---
      request_id: req.requestId || null,
      resource_id: resourceId ? String(resourceId) : null,
      ip: req.ip || null,
      message: `${req.method} ${req.originalUrl || req.path} ${statusCode} ${totalMs.toFixed(2)}ms (db:${perfCtx.db_time_ms.toFixed(1)}ms cache:${perfCtx.cache_hit ? "HIT" : "MISS"})`,
    };

    // Structured log
    const actor = req.user ? String(req.user.id) : "anonymous";
    if (level === "error") logger.error(action, telemetryData, actor);
    else if (level === "warn") logger.warn(action, telemetryData, actor);
    else logger.info(action, telemetryData, actor);

    // Push to ring buffer for /api/admin/perf
    pushToRing({
      ts: Date.now(),
      method: req.method,
      route: action,
      path: (req.baseUrl || "") + req.path,
      statusCode,
      duration_ms: Number(totalMs.toFixed(2)),
      db_query_count: perfCtx.db_query_count,
      db_time_ms: Number(perfCtx.db_time_ms.toFixed(2)),
      db_rows: perfCtx.db_rows,
      cache_checked: perfCtx.cache_checked,
      cache_hit: perfCtx.cache_hit,
      cache_time_ms: Number(perfCtx.cache_time_ms.toFixed(2)),
      payload_bytes: payloadBytes,
      actor,
    });
  });

  // Run the remainder of the middleware chain inside the async context
  // so that Prisma extensions and cache helpers can call getPerfContext()
  runWithPerfContext(perfCtx, next);
}

module.exports = { telemetry };
