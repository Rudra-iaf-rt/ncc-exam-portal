const { performance } = require("perf_hooks");

function serverTiming(req, res, next) {
  const start = performance.now();
  const originalEnd = res.end;

  res.end = function patchedEnd(...args) {
    try {
      const durationMs = performance.now() - start;
      if (!res.headersSent) {
        // Total backend time for this request (ms), useful for separating API vs frontend latency.
        res.setHeader("Server-Timing", `app;dur=${durationMs.toFixed(2)}`);
      }
    } catch (_err) {
      // Never block response path for telemetry headers.
    }
    return originalEnd.apply(this, args);
  };

  next();
}

module.exports = { serverTiming };
