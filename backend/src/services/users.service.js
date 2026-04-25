const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { HttpError } = require("../utils/http-error");
const { ROLES } = require("../middleware/roles");
const { sanitizeUser } = require("./auth.service");

const SALT_ROUNDS = 10;



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
    wing: true,
    isActive: true,
  };
}

async function createUser(body) {
  const { name, regimentalNumber, college, password, role, email, wing, batch, isActive } = body;
  
  const existing = await prisma.user.findFirst({
    where: { 
      OR: [
        regimentalNumber ? { regimentalNumber } : undefined,
        email ? { email: normalizeEmail(email) } : undefined
      ].filter(Boolean)
    }
  });

  if (existing) {
    throw new HttpError(409, "User with this Regimental Number or Email already exists");
  }

  const hashedPassword = await bcrypt.hash(password || "cadet123", SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      regimentalNumber,
      college,
      password: hashedPassword,
      role: role || ROLES.STUDENT,
      email: email ? normalizeEmail(email) : null,
      wing,
      batch,
      isActive: isActive ?? true
    }
  });

  return sanitizeUser(user);
}

async function updateUser(idRaw, body) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) throw new HttpError(400, "Invalid user ID");

  const { name, regimentalNumber, college, password, email, role, wing, batch, isActive } = body;

  if (regimentalNumber || email) {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          regimentalNumber ? { regimentalNumber } : undefined,
          email ? { email: normalizeEmail(email) } : undefined,
        ].filter(Boolean),
      },
    });
    if (existing) {
      throw new HttpError(409, "Regimental Number or Email already in use");
    }
  }

  const updateData = {
    name,
    regimentalNumber,
    college,
    email: email ? normalizeEmail(email) : undefined,
    role,
    wing,
    batch,
    isActive
  };

  if (password) {
    updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return sanitizeUser(user);
}

async function listUsers(query = {}) {
  const role = typeof query.role === "string" ? query.role.trim().toUpperCase() : null;
  const where = role ? { role } : {};
  const rows = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: safeUserSelect(),
  });
  return rows.map(sanitizeUser);
}

async function searchUsers(filters = {}) {
  const { wing, college, batch, query } = filters;
  
  return prisma.user.findMany({
    where: {
      role: ROLES.STUDENT,
      isActive: true,
      AND: [
        wing ? { wing } : {},
        college ? { college: { contains: college, mode: 'insensitive' } } : {},
        batch ? { batch: { contains: batch, mode: 'insensitive' } } : {},
        query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { regimentalNumber: { contains: query, mode: 'insensitive' } }
          ]
        } : {}
      ]
    },
    select: safeUserSelect(),
    take: 50
  });
}

async function getFilters() {
  const [wings, colleges, batches] = await Promise.all([
    prisma.user.findMany({ where: { role: ROLES.STUDENT }, select: { wing: true }, distinct: ['wing'] }),
    prisma.user.findMany({ where: { role: ROLES.STUDENT }, select: { college: true }, distinct: ['college'] }),
    prisma.user.findMany({ where: { role: ROLES.STUDENT }, select: { batch: true }, distinct: ['batch'] }),
  ]);

  return {
    wings: wings.map(w => w.wing).filter(Boolean),
    colleges: colleges.map(c => c.college).filter(Boolean).sort(),
    batches: batches.map(b => b.batch).filter(Boolean).sort((a, b) => b.localeCompare(a))
  };
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

  // Atomic deletion of all user data
  await prisma.$transaction(async (tx) => {
    await tx.result.deleteMany({ where: { studentId: id } });
    await tx.attempt.deleteMany({ where: { studentId: id } });
    await tx.examAssignment.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

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
  createUser,
  updateUser,
  listUsers,
  searchUsers,
  getFilters,
  getUserById,
  deleteUserById,
  adminResetUserPassword,
};
