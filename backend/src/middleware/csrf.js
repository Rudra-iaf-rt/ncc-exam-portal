const crypto = require("crypto");
const { features } = require("../config/features");

const CSRF_COOKIE = "ncc_csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function issueCsrfToken(res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return token;
}

function csrfGuard(req, res, next) {
  if (!features.cookieAuth) return next();
  if (SAFE_METHODS.has(req.method)) return next();
  const path = String(req.originalUrl || req.path || "");
  if (
    path.includes("/api/auth/login") ||
    path.includes("/api/auth/register") ||
    path.includes("/api/auth/password/forgot") ||
    path.includes("/api/auth/password/reset") ||
    path.includes("/api/auth/forgot-password") ||
    path.includes("/api/auth/reset-password")
  ) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }
  return next();
}

module.exports = {
  CSRF_COOKIE,
  CSRF_HEADER,
  issueCsrfToken,
  csrfGuard,
};
