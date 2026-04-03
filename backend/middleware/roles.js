const ROLES = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
  INSTRUCTOR: "INSTRUCTOR",
};

/** Roles permitted to use the API (JWT `role` must match one of these). */
const ALLOWED_ROLES = Object.freeze([
  ROLES.STUDENT,
  ROLES.ADMIN,
  ROLES.INSTRUCTOR,
]);

function allowRole(role) {
  return typeof role === "string" && ALLOWED_ROLES.includes(role);
}

function requireStudent(req, res, next) {
  if (req.user?.role !== ROLES.STUDENT) {
    return res.status(403).json({ error: "Students only" });
  }
  next();
}

function requireStaff(req, res, next) {
  const r = req.user?.role;
  if (r !== ROLES.ADMIN && r !== ROLES.INSTRUCTOR) {
    return res.status(403).json({ error: "Admins and instructors only" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}

function requireInstructor(req, res, next) {
  if (req.user?.role !== ROLES.INSTRUCTOR) {
    return res.status(403).json({ error: "Instructors only" });
  }
  next();
}

module.exports = {
  ROLES,
  ALLOWED_ROLES,
  allowRole,
  requireStudent,
  requireStaff,
  requireAdmin,
  requireInstructor,
};
