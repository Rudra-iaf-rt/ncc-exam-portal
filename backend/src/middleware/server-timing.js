const { performance } = require("perf_hooks");
const { getPerfContext } = require("../lib/perf-context");

/**
 * Server-Timing middleware.
 *
 * Emits a rich Server-Timing header that Chrome DevTools → Network → Timing
 * tab will parse automatically into individual segments:
 *
 *   Server-Timing: total;dur=240, db;dur=180, cache;dur=12
 *
 * Segments:
 *  total  — full backend wall-clock time for this request (ms)
 *  db     — accumulated ORM/Prisma query time (ms) — 0 if no DB queries
 *  cache  — time spent in Redis get/set (ms) — 0 if cache not checked
 *
 * The frontend can also read these programmatically via the
 * PerformanceServerTiming API in the browser (zero extra fetch needed).
 *
 * NOTE: This middleware must run *before* telemetry so that start time
 * is captured before the context is set up.
 */
function serverTiming(req, res, next) {
  const start = performance.now();
  const originalEnd = res.end;

  res.end = function patchedEnd(...args) {
    try {
      if (!res.headersSent) {
        const totalMs = (performance.now() - start).toFixed(2);

        // Pull DB and cache timings from the perf context set by telemetry
        const ctx = getPerfContext();
        const dbMs = ctx ? ctx.db_time_ms.toFixed(2) : "0";
        const cacheMs = ctx ? ctx.cache_time_ms.toFixed(2) : "0";

        res.setHeader(
          "Server-Timing",
          `total;dur=${totalMs}, db;dur=${dbMs}, cache;dur=${cacheMs}`
        );
      }
    } catch (_err) {
      // Never block the response path for telemetry headers.
    }
    return originalEnd.apply(this, args);
  };

  next();
}

module.exports = { serverTiming };
