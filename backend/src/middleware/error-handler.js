const { HttpError } = require("../utils/http-error");

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Not found" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status =
    err instanceof HttpError
      ? err.status
      : typeof err.status === "number"
        ? err.status
        : typeof err.statusCode === "number"
          ? err.statusCode
          : 500;

  const message = err.message || "Internal Server Error";

  // Handle CORS errors specifically
  if (message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS Error",
      message: "The origin is not allowed to access this resource",
      code: "AUTH_CORS"
    });
  }

  const isServer = status >= 500;
  
  // Structured logging for ALL errors
  console.error(`[ERROR] ${err.code || (isServer ? 'SRV_001' : 'VAL_001')}: ${err.message}`, {
    status,
    path: req.path,
    method: req.method,
    actor: req.user?.id || 'anonymous',
    stack: isServer ? err.stack : undefined
  });

  // File logging
  if (isServer) {
    try {
      const fs = require("fs");
      const logMsg = `[${new Date().toISOString()}] ${err.stack || err.message}\n`;
      fs.appendFileSync("backend-error.log", logMsg);
    } catch (e) {
      console.error("[LOGGER] Failed to write to log file", e.message);
    }
  }

  // Graceful failure for the user
  res.status(status).json({
    error: isServer ? "Internal Server Error" : "Bad Request",
    message: (process.env.NODE_ENV === "development" || !isServer) ? message : "Something went wrong",
    code: err.code || (isServer ? 'SRV_001' : 'VAL_001')
  });
}

module.exports = { asyncHandler, notFoundHandler, errorHandler };
