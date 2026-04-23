const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { HttpError } = require("../utils/http-error");
const { ROLES } = require("../middleware/roles");
const { sanitizeUser } = require("./auth.service");

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeUserSelect() {
  return {
    id: true,
    name: true,
    regimentalNumber: true,
    email: true,
    mobile: true,
    batch: true,
    yearOfStudy: true,
    role: true,
    college: true,
  };
}

async function createInstructor(body) {
  const { name, email, password, college } = body ?? {};
  if (!name || !email || !password || !college) {
    throw new HttpError(400, "name, email, password and college are required");
  }
  const emailNorm = normalizeEmail(email);
  if (!EMAIL_RE.test(emailNorm)) {
    throw new HttpError(400, "Invalid email address");
  }
  if (String(password).length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters");
  }

  const hashed = await bcrypt.hash(String(password), SALT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: emailNorm,
        password: hashed,
        role: ROLES.INSTRUCTOR,
        college: String(college).trim(),
      },
    });
    return sanitizeUser(user);
  } catch (e) {
    if (e && typeof e === "object" && e.code === "P2002") {
      throw new HttpError(409, "Email already exists");
    }
    throw e;
  }
}

async function listUsers(query = {}) {
  const role = typeof query.role === "string" ? query.role.trim().toUpperCase() : null;
  const where = role ? { role } : {};
  const rows = await prisma.user.findMany({
    where,
    orderBy: { id: "desc" },
    select: safeUserSelect(),
  });
  return rows.map(sanitizeUser);
}

async function getUserById(idRaw) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    throw new HttpError(400, "Invalid user id");
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect(),
  });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return sanitizeUser(user);
}

async function deleteUserById(idRaw) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    throw new HttpError(400, "Invalid user id");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  await prisma.user.delete({ where: { id } });
  return { id };
}

async function adminResetUserPassword(idRaw, newPassword) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) {
    throw new HttpError(400, "Invalid user id");
  }
  if (!newPassword || String(newPassword).length < 6) {
    throw new HttpError(400, "newPassword must be at least 6 characters");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  const password = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { password } });
  return { ok: true };
}

module.exports = {
  createInstructor,
  listUsers,
  getUserById,
  deleteUserById,
  adminResetUserPassword,
};
