const { performance } = require("perf_hooks");
const { logger } = require("../utils/logger");

/**
 * Custom middleware to track high-precision request duration (latency)
 * and output structured JSON telemetry.
 */
function telemetry(req, res, next) {
  const startTime = performance.now();

  // Set standard tracing headers if request context initialized it
  if (req.requestId) {
    res.setHeader("X-Request-ID", String(req.requestId));
  }

  res.on("finish", () => {
    const duration = performance.now() - startTime;
    const statusCode = res.statusCode;

    // Classify log level based on HTTP status
    let level = "info";
    if (statusCode >= 400 && statusCode < 500) {
      level = "warn";
    } else if (statusCode >= 500) {
      level = "error";
    }

    // Map REST action in verb_noun format: e.g. GET_EXAMS, POST_ATTEMPT_START
    let cleanPath = (req.baseUrl || "") + req.path;
    cleanPath = cleanPath
      .replace(/\/\d+/g, "/:id") // Replace ID numbers in path
      .replace(/^\/api/, "")    // Strip API prefix
      .replace(/[\/\-]/g, "_")  // Replace slashes/hyphens with underscore
      .toUpperCase();
    
    if (cleanPath.startsWith("_")) {
      cleanPath = cleanPath.substring(1);
    }
    const action = `${req.method}_${cleanPath || "ROOT"}`;

    // Extract potential primary resource IDs from query, body, or params
    const resourceId =
      req.params?.id ||
      req.params?.examId ||
      req.params?.attemptId ||
      req.body?.examId ||
      req.body?.id ||
      null;

    const telemetryData = {
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode,
      duration_ms: Number(duration.toFixed(2)),
      request_id: req.requestId || null,
      resource_id: resourceId ? String(resourceId) : null,
      ip: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      message: `${req.method} ${req.originalUrl || req.path} responded with ${statusCode} in ${duration.toFixed(2)}ms`,
    };

    // Log the structured event
    const actor = req.user ? String(req.user.id) : "anonymous";
    
    if (level === "error") {
      logger.error(action, telemetryData, actor);
    } else if (level === "warn") {
      logger.warn(action, telemetryData, actor);
    } else {
      logger.info(action, telemetryData, actor);
    }
  });

  next();
}

module.exports = { telemetry };
