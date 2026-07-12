const crypto = require("crypto");
const { Buffer } = require("buffer");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redis } = require("../lib/redis");

function requestContext(req, res, next) {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-XSS-Protection", "0");
  next();
}


function createRateLimiter({ windowMs, max, keyFn, message }) {
  const limiterConfig = {
    windowMs,
    max,
    keyGenerator: typeof keyFn === "function" ? keyFn : (req) => req.ip || "unknown",
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
      const retryAfterSec = Math.max(1, Math.ceil(options.windowMs / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: message || "Too many requests",
        code: "RATE_001",
      });
    },
    skip: () => process.env.LOAD_TEST === "true",
  };

  // Without Redis: return a plain express-rate-limit instance (MemoryStore).
  if (!process.env.REDIS_URL) {
    return rateLimit(limiterConfig);
  }

  // With Redis: defer RedisStore construction until the first request so the
  // ioredis connection is established before any commands are sent.
  let _limiter = null;
  return (req, res, next) => {
    if (!_limiter) {
      const store = new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      });
      _limiter = rateLimit({ ...limiterConfig, store });
    }
    return _limiter(req, res, next);
  };
}

const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyFn: (req) => {

    const fromBody =
      req.body?.regimentalNumber ||
      req.body?.email;
    if (fromBody) return `rl:auth:${fromBody}:${String(req.path || "")}`;

    // Last resort: try to decode the JWT to get a user ID
    try {
      const token =
        req.cookies?.accessToken ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);
      if (token) {
        const payloadB64 = token.split(".")[1];
        if (payloadB64) {
          const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
          if (decoded?.id) return `rl:auth:user:${decoded.id}:${String(req.path || "")}`;
        }
      }
    } catch (_) {}

    return `rl:auth:anonymous:${String(req.path || "")}`;
  },
  message: "Too many auth requests. Please try again shortly.",
});

const attemptRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyFn: (req) => `rl:attempt:user:${String(req.user?.id || "guest")}`,
  message: "Too many attempt actions. Please slow down.",
});

const antiCheatRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyFn: (req) => `rl:anticheat:user:${String(req.user?.id || "guest")}`,
  message: "Too many anti-cheat requests. Please slow down.",
});

const refreshRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyFn: (req) => {
    try {
      const token =
        req.cookies?.accessToken ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.slice(7)
          : null);
      if (token) {
        const payloadB64 = token.split(".")[1];
        if (payloadB64) {
          const decoded = JSON.parse(
            Buffer.from(payloadB64, "base64url").toString()
          );
          if (decoded?.id) return `rl:refresh:user:${decoded.id}`;
        }
      }
    } catch (_) {}
    return `rl:refresh:unauthenticated`;
  },
  message: "Too many refresh requests. Please try again shortly.",
});

module.exports = {
  requestContext,
  securityHeaders,
  createRateLimiter,
  authRateLimiter,
  refreshRateLimiter,
  attemptRateLimiter,
  antiCheatRateLimiter,
};

