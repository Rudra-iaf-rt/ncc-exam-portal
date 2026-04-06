const { HttpError } = require("../utils/http-error");

/**
 * Wraps async route handlers so rejected promises reach the global error middleware.
 * @param {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<unknown>} fn
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Not found" });
}

/**
 * @param {unknown} err
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
function errorHandler(err, _req, res, next) {
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

  const isServer = status >= 500;
  if (isServer) {
    console.error(err);
  }

  const message = isServer ? "Internal server error" : err.message || "Request failed";
  res.status(status).json({ error: message });
}

module.exports = { asyncHandler, notFoundHandler, errorHandler };
