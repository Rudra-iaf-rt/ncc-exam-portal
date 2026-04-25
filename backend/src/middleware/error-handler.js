const { HttpError } = require("../utils/http-error");

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Not found" });
}

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
    try {
      const fs = require("fs");
      const logMsg = `[${new Date().toISOString()}] ${err.stack || err.message}\n`;
      fs.appendFileSync("backend-error.log", logMsg);
    } catch (e) {
      console.log(e);
    }
  }

  const message = isServer ? "Internal server error" : err.message || "Request failed";
  res.status(status).json({ error: message });
}

module.exports = { asyncHandler, notFoundHandler, errorHandler };
