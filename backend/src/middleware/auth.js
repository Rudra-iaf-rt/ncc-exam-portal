const { verifyToken } = require("../utils/jwt");
const { allowRole } = require("./roles");
const { logger } = require("../utils/logger");

/**
 * Verifies Bearer JWT and attaches `req.user` with `id` and `role`.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn('AUTH_FAILED', { reason: 'Missing or malformed Authorization header', path: req.path });
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    const role = decoded.role;

    if (!allowRole(role)) {
      logger.warn('AUTH_FAILED', { reason: 'Invalid role in token', role, path: req.path });
      return res.status(403).json({ error: "Access denied for this role" });
    }

    const id = decoded.sub;
    req.user = {
      id: typeof id === "string" ? parseInt(id, 10) : id,
      role,
    };
    next();
  } catch (err) {
    logger.warn('AUTH_FAILED', { reason: 'Token verification failed', error: err.message, path: req.path });
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
