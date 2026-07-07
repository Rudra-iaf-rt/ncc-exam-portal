const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { HttpError } = require("../utils/http-error");
const { ROLES } = require("../middleware/roles");
const { sanitizeUser } = require("./auth.service");
const { features } = require("../config/features");

const SALT_ROUNDS = 10;

async function clearCollegesCache() {
  try {
    await Promise.all([
      redis.del('cache:colleges:active'),
      redis.del('cache:colleges:all')
    ]);
  } catch (err) {
    console.error('[Redis Cache Del Error in users.service]', err);
  }
}

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
    collegeCode: true,
    college: {
      select: {
        name: true,
        code: true
      }
    },
    wing: true,
    isActive: true,
  };
}

async function createUser(body, currentUser, tx = prisma) {
  let { name, regimentalNumber, college: collegeCode, password, role, email, wing, batch, isActive } = body;
  
  if (currentUser?.role === ROLES.INSTRUCTOR) {
    const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!instructorRecord || !instructorRecord.collegeCode) {
      throw new HttpError(403, "Instructor must have an assigned college to create cadets");
    }
    collegeCode = instructorRecord.collegeCode;
    role = ROLES.STUDENT; // Instructors can only create students
  }
  
  const existing = await tx.user.findFirst({
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

  const defaultPass = (role || ROLES.STUDENT) === ROLES.INSTRUCTOR ? 'staff@ncc123' : 'cadet123';
  const hashedPassword = await bcrypt.hash(password || defaultPass, SALT_ROUNDS);

  const user = await tx.user.create({
    data: {
      name,
      regimentalNumber,
      collegeCode,
      password: hashedPassword,
      role: role || ROLES.STUDENT,
      email: email ? normalizeEmail(email) : null,
      wing,
      batch,
      isActive: isActive ?? true
    },
    include: { college: true }
  });

  await clearCollegesCache();
  return sanitizeUser(user);
}

async function updateUser(idRaw, body, tx = prisma) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) throw new HttpError(400, "Invalid user ID");

  const { name, regimentalNumber, college: collegeCode, password, email, role, wing, batch, isActive } = body;

  if (regimentalNumber || email) {
    const existing = await tx.user.findFirst({
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
    collegeCode,
    email: email ? normalizeEmail(email) : undefined,
    role,
    wing,
    batch,
    isActive
  };

  if (password) {
    updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const user = await tx.user.update({
    where: { id },
    data: updateData,
    include: { college: true }
  });

  await clearCollegesCache();
  if (updateData.isActive === false) {
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return sanitizeUser(user);
}

async function listUsers(query = {}, currentUser) {
  const role = typeof query.role === "string" ? query.role.trim().toUpperCase() : null;
  const where = role ? { role } : {};

  if (currentUser?.role === ROLES.INSTRUCTOR) {
    const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (instructorRecord?.collegeCode) {
      where.collegeCode = instructorRecord.collegeCode;
    }
  }

  // Search & Filters
  if (query.search && String(query.search).trim() !== "") {
    const term = String(query.search).trim();
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { regimentalNumber: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } }
        ]
      }
    ];
  }

  if (query.wing && query.wing !== "ALL") {
    where.wing = query.wing;
  }

  // Pagination
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: safeUserSelect(),
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const users = rows.map(u => ({
    ...sanitizeUser(u),
    college: u.college?.name || u.collegeCode || 'N/A'
  }));

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
}

async function listInstructors() {
  const rows = await prisma.user.findMany({
    where: { role: ROLES.INSTRUCTOR },
    orderBy: { name: "asc" },
    select: safeUserSelect(),
  });
  return rows.map(u => ({
    ...sanitizeUser(u),
    college: u.college?.name || u.collegeCode || 'N/A'
  }));
}

async function createInstructor(body, tx = prisma) {
  return createUser({ ...body, role: ROLES.INSTRUCTOR }, null, tx);
}

async function bulkImportCadets(cadetsArray, currentUser) {
  if (!Array.isArray(cadetsArray)) {
    throw new HttpError(400, "Cadets data must be an array");
  }

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  const defaultPassword = await bcrypt.hash('cadet123', SALT_ROUNDS);

  for (const cadet of cadetsArray) {
    try {
      const { name, regimentalNumber, collegeCode, wing, batch } = cadet;
      
      if (!name || !regimentalNumber || !collegeCode) {
        throw new Error("Missing required fields: name, regimentalNumber, or collegeCode");
      }

      await prisma.user.create({
        data: {
          name,
          regimentalNumber,
          collegeCode: collegeCode.toUpperCase(),
          role: ROLES.STUDENT,
          password: defaultPassword,
          wing: wing || null,
          batch: batch || null,
          isActive: true
        }
      });
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ 
        regimentalNumber: cadet.regimentalNumber || 'N/A', 
        error: err.message 
      });
    }
  }

  if (results.success > 0) {
    await clearCollegesCache();
  }

  return results;
}

async function searchUsers(filters = {}, currentUser) {
  const { wing, batch, query, examId } = filters;
  let collegeCode = filters.collegeCode;

  if (currentUser?.role === ROLES.INSTRUCTOR) {
    const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (instructorRecord?.collegeCode) {
      collegeCode = instructorRecord.collegeCode;
    }
  }

  const rows = await prisma.user.findMany({
    where: {
      role: ROLES.STUDENT,
      isActive: true,
      AND: [
        wing ? { wing } : {},
        collegeCode ? { collegeCode } : {},
        batch ? { batch: { contains: batch, mode: 'insensitive' } } : {},
        query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { regimentalNumber: { contains: query, mode: 'insensitive' } }
          ]
        } : {},
        examId ? {
          assignments: {
            none: {
              examId: parseInt(examId)
            }
          }
        } : {}
      ]
    },
    select: safeUserSelect(),
    take: 3000
  });

  return rows.map(u => ({
    ...sanitizeUser(u),
    college: u.college?.name || u.collegeCode || 'N/A'
  }));
}

async function getFilters(currentUser) {
  let collegeWhere = {};
  if (currentUser?.role === ROLES.INSTRUCTOR) {
    const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (instructorRecord?.collegeCode) {
      collegeWhere = { collegeCode: instructorRecord.collegeCode };
    }
  }

  const [wings, colleges, userBatches, masterBatches] = await Promise.all([
    prisma.user.findMany({ where: { role: ROLES.STUDENT, ...collegeWhere }, select: { wing: true }, distinct: ['wing'] }),
    prisma.user.findMany({ 
      where: { role: ROLES.STUDENT, ...collegeWhere }, 
      select: { college: { select: { name: true, code: true } } }, 
      distinct: ['collegeCode'] 
    }),
    prisma.user.findMany({ where: { role: ROLES.STUDENT, ...collegeWhere }, select: { batch: true }, distinct: ['batch'] }),
    prisma.batch.findMany({ select: { name: true } })
  ]);

  const allBatches = Array.from(new Set([
    ...userBatches.map(b => b.batch),
    ...masterBatches.map(b => b.name)
  ])).filter(Boolean).sort((a, b) => b.localeCompare(a));

  return {
    wings: wings.map(w => w.wing).filter(Boolean),
    colleges: colleges.map(c => c.college).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)),
    batches: allBatches
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
  return {
    ...sanitizeUser(user),
    college: user.college?.name || user.collegeCode || 'N/A'
  };
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

  if (features.softDeleteUsers) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    await clearCollegesCache();
    return { id, softDeleted: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.result.deleteMany({ where: { studentId: id } });
    await tx.attempt.deleteMany({ where: { studentId: id } });
    await tx.examAssignment.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  await clearCollegesCache();
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
  listInstructors,
  createInstructor,
  bulkImportCadets,
};
