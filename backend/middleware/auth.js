const { verifyToken } = require("../src/utils/jwt");
const { allowRole } = require("./roles");

/**
 * Verifies Bearer JWT and attaches `req.user` with `id` and `role`.
 * Only tokens whose `role` is STUDENT, ADMIN, or INSTRUCTOR are accepted.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    const role = decoded.role;

    if (!allowRole(role)) {
      return res.status(403).json({ error: "Access denied for this role" });
    }

    const id = decoded.sub;
    req.user = {
      id: typeof id === "string" ? parseInt(id, 10) : id,
      role,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
