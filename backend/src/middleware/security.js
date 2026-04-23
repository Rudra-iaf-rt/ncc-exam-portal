const crypto = require("crypto");

function requestContext(req, _res, next) {
  req.requestId = crypto.randomUUID();
  next();
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

function createRateLimiter({ windowMs, max, keyFn, message }) {
  const buckets = new Map();
  const resolveKey = typeof keyFn === "function" ? keyFn : (req) => req.ip || "unknown";

  return (req, res, next) => {
    const key = resolveKey(req);
    const now = Date.now();
    const existing = buckets.get(key);
    const fresh = !existing || existing.resetAt <= now;
    const bucket = fresh ? { count: 0, resetAt: now + windowMs } : existing;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: message || "Too many requests" });
    }

    if (buckets.size > 5000) {
      for (const [k, b] of buckets.entries()) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    return next();
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  keyFn: (req) => `${req.ip || "unknown"}:${String(req.path || "")}`,
  message: "Too many auth requests. Please try again shortly.",
});

const attemptRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  keyFn: (req) =>
    `${req.ip || "unknown"}:${String(req.user?.id || "guest")}:attempt`,
  message: "Too many attempt actions. Please slow down.",
});

const antiCheatRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyFn: (req) =>
    `${req.ip || "unknown"}:${String(req.user?.id || "guest")}:anti-cheat`,
  message: "Too many anti-cheat requests. Please slow down.",
});

module.exports = {
  requestContext,
  securityHeaders,
  createRateLimiter,
  authRateLimiter,
  attemptRateLimiter,
  antiCheatRateLimiter,
};
