const { verifyToken } = require("../utils/jwt");
const { allowRole } = require("./roles");
const { logger } = require("../utils/logger");
const { prisma } = require("../lib/prisma");
const { features } = require("../config/features");

/**
 * Verifies Bearer JWT and attaches `req.user` with `id` and `role`.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const cookieToken = features.cookieAuth ? req.cookies?.ncc_access_token : null;
  const queryToken = req.query.token;
  const token = bearer || cookieToken || queryToken;

  if (!token) {
    logger.warn('AUTH_FAILED', { reason: 'Missing or malformed Authorization header', path: req.path });
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const options = {};
    if (
      req.path.includes('/attempt/submit') || 
      req.path.includes('/attempt/answer') || 
      req.path.includes('/attempt/save-progress') || 
      req.path.includes('/exams/submit')
    ) {
      options.ignoreExpiration = true;
    }
    const decoded = verifyToken(token, options);
    const role = decoded.role;

    if (!allowRole(role)) {
      logger.warn('AUTH_FAILED', { reason: 'Invalid role in token', role, path: req.path });
      return res.status(403).json({ error: "Access denied for this role" });
    }

    const id = typeof decoded.sub === "string" ? parseInt(decoded.sub, 10) : decoded.sub;
    if (id == null || isNaN(id)) {
      throw new Error("Invalid user ID in token");
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Account disabled or not found" });
    }
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    logger.warn('AUTH_FAILED', { reason: 'Token verification failed', error: err.message, path: req.path });
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
