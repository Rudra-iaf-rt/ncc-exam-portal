const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma");
const { cacheDel } = require("../lib/cache");
const { HttpError } = require("../utils/http-error");
const { ROLES } = require("../middleware/roles");
const { sanitizeUser } = require("./auth.service");
const { features } = require("../config/features");

const SALT_ROUNDS = 10;

async function clearCollegesCache() {
  await cacheDel(['cache:colleges:active', 'cache:colleges:all']);
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
    canManageExams: true,
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
  
  const orConditions = [
    regimentalNumber?.trim() ? { regimentalNumber: regimentalNumber.trim() } : undefined,
    email?.trim() ? { email: normalizeEmail(email) } : undefined
  ].filter(Boolean);

  let existing = null;
  if (orConditions.length > 0) {
    existing = await tx.user.findFirst({
      where: { OR: orConditions }
    });
  }

  if (existing) {
    throw new HttpError(409, "User with this Regimental Number or Email already exists");
  }

  const defaultPass = (role || ROLES.STUDENT) === ROLES.INSTRUCTOR ? 'staff@ncc123' : 'cadet123';
  const hashedPassword = await bcrypt.hash(password || defaultPass, SALT_ROUNDS);

  const user = await tx.user.create({
    data: {
      name,
      regimentalNumber: regimentalNumber?.trim() || null,
      collegeCode,
      password: hashedPassword,
      role: role || ROLES.STUDENT,
      email: email?.trim() ? normalizeEmail(email) : null,
      wing,
      batch,
      isActive: isActive ?? true,
      canManageExams: body.canManageExams ? Boolean(body.canManageExams) : false,
    },
    include: { college: true }
  });

  await clearCollegesCache();
  return sanitizeUser(user);
}

async function updateUser(idRaw, body, tx = prisma) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) throw new HttpError(400, "Invalid user ID");

  const { name, regimentalNumber, college: collegeCode, password, email, role, wing, batch, isActive, canManageExams } = body;

  const orConditions = [
    regimentalNumber?.trim() ? { regimentalNumber: regimentalNumber.trim() } : undefined,
    email?.trim() ? { email: normalizeEmail(email) } : undefined,
  ].filter(Boolean);

  if (orConditions.length > 0) {
    const existing = await tx.user.findFirst({
      where: {
        id: { not: id },
        OR: orConditions,
      },
    });
    if (existing) {
      throw new HttpError(409, "Regimental Number or Email already in use");
    }
  }

  const updateData = {
    name,
    regimentalNumber: regimentalNumber?.trim() || null,
    collegeCode,
    email: email?.trim() ? normalizeEmail(email) : null,
    role,
    wing,
    batch,
    isActive
  };

  if (canManageExams !== undefined) {
    updateData.canManageExams = Boolean(canManageExams);
  }

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
  await cacheDel(['user:metadata:' + id]).catch(() => {});
  return sanitizeUser(user);
}

async function bulkUpdateManageExams(enable) {
  const result = await prisma.user.updateMany({
    where: { role: "INSTRUCTOR" },
    data: { canManageExams: Boolean(enable) }
  });
  return result.count;
}

async function listUsers(query = {}, currentUser = null) {
  const role = typeof query.role === "string" ? query.role.trim().toUpperCase() : null;
  const where = role ? { role } : {};

  if (currentUser?.role === ROLES.INSTRUCTOR) {
    if (currentUser.collegeCode) {
      where.collegeCode = currentUser.collegeCode;
    } else {
      const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
      if (instructorRecord?.collegeCode) {
        where.collegeCode = instructorRecord.collegeCode;
      }
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
  const limit = Math.min(10000, Math.max(1, parseInt(query.limit || "20", 10)));
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

  const validCadets = [];
  const regNumbersInPayload = new Set();
  
  for (const cadet of cadetsArray) {
    const { name, regimentalNumber, collegeCode, wing, batch } = cadet;
    if (!name || !regimentalNumber || !collegeCode) {
      results.failed++;
      results.errors.push({
        regimentalNumber: regimentalNumber || 'N/A',
        error: "Missing required fields: name, regimentalNumber, or collegeCode"
      });
      continue;
    }
    
    if (regNumbersInPayload.has(regimentalNumber)) {
      results.failed++;
      results.errors.push({
        regimentalNumber,
        error: "Duplicate regimentalNumber in import payload"
      });
      continue;
    }
    
    regNumbersInPayload.add(regimentalNumber);
    validCadets.push({
      name,
      regimentalNumber,
      collegeCode: collegeCode.toUpperCase(),
      role: ROLES.STUDENT,
      password: defaultPassword,
      wing: wing || null,
      batch: batch || null,
      isActive: true
    });
  }

  if (validCadets.length === 0) {
    return results;
  }

  const existingUsers = await prisma.user.findMany({
    where: {
      regimentalNumber: { in: Array.from(regNumbersInPayload) }
    },
    select: { regimentalNumber: true }
  });
  
  const existingRegSet = new Set(existingUsers.map(u => u.regimentalNumber));
  
  const toInsert = [];
  for (const cadet of validCadets) {
    if (existingRegSet.has(cadet.regimentalNumber)) {
      results.failed++;
      results.errors.push({
        regimentalNumber: cadet.regimentalNumber,
        error: "User with this Regimental Number already exists"
      });
    } else {
      toInsert.push(cadet);
    }
  }

  if (toInsert.length > 0) {
    try {
      const inserted = await prisma.user.createMany({
        data: toInsert,
        skipDuplicates: true
      });
      results.success += inserted.count;
      await clearCollegesCache();
    } catch (err) {
      for (const cadet of toInsert) {
        results.failed++;
        results.errors.push({
          regimentalNumber: cadet.regimentalNumber,
          error: "Bulk insert failed: " + err.message
        });
      }
    }
  }

  return results;
}

async function searchUsers(filters = {}, currentUser) {
  const { wing, batch, query, examId, groupIds } = filters;
  let collegeCode = filters.collegeCode;

  if (currentUser?.role === ROLES.INSTRUCTOR) {
    if (currentUser.collegeCode) {
      collegeCode = currentUser.collegeCode;
    } else {
      const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
      if (instructorRecord?.collegeCode) {
        collegeCode = instructorRecord.collegeCode;
      }
    }
  }

  // Handle groupIds resolution
  let groupCollegeCodes = [];
  let groupUserIds = [];
  if (groupIds) {
    const ids = Array.isArray(groupIds) ? groupIds : String(groupIds).split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length > 0) {
      const groups = await prisma.candidateGroup.findMany({
        where: { id: { in: ids }, isActive: true },
        include: { colleges: true, members: true }
      });
      groups.forEach(g => {
        g.colleges.forEach(c => groupCollegeCodes.push(c.collegeCode));
        g.members.forEach(m => groupUserIds.push(m.userId));
      });
    }
  }

  // Deduplicate group targets
  groupCollegeCodes = [...new Set(groupCollegeCodes)];
  groupUserIds = [...new Set(groupUserIds)];

  let baseWhere = {
    role: ROLES.STUDENT,
    isActive: true,
  };

  const andConditions = [];

  // Group OR standard filters
  if (groupCollegeCodes.length > 0 || groupUserIds.length > 0) {
    // If groups are selected, users must either belong to the group's colleges, or be explicitly in the group's members
    // BUT they also still need to respect standard filters if provided (like query, wing, etc.)
    // However, usually if you select groups, you might want just the group members. 
    // If collegeCode is ALSO selected manually, it's an additive or restrictive filter?
    // Let's make it additive: user matches (manual college/wing/batch) OR (in groups)
    // Wait, the prompt says "Allow administrators to combine Multiple reusable groups, Multiple colleges, Individual cadets".
    // So it should be an OR across the primary selection criteria.
    const selectionOr = [];
    
    // 1. Matched by manual college filter (if any)
    if (collegeCode) {
      selectionOr.push({ collegeCode });
    }
    
    // 2. Matched by group colleges
    if (groupCollegeCodes.length > 0) {
      selectionOr.push({ collegeCode: { in: groupCollegeCodes } });
    }
    
    // 3. Matched by group users
    if (groupUserIds.length > 0) {
      selectionOr.push({ id: { in: groupUserIds } });
    }
    
    // If there was no manual collegeCode, but there's a wing/batch filter, how does that apply?
    // It's safer to just do the selection OR first.
    if (selectionOr.length > 0) {
      andConditions.push({ OR: selectionOr });
    }
  } else if (collegeCode) {
    andConditions.push({ collegeCode });
  }

  if (wing) andConditions.push({ wing });
  if (batch) andConditions.push({ batch: { contains: batch, mode: 'insensitive' } });
  
  if (query) {
    andConditions.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { regimentalNumber: { contains: query, mode: 'insensitive' } }
      ]
    });
  }
  
  if (examId) {
    andConditions.push({
      assignments: {
        none: {
          examId: parseInt(examId)
        }
      }
    });
  }

  if (andConditions.length > 0) {
    baseWhere.AND = andConditions;
  }

  const { cacheGetJson, cacheSetJson } = require("../lib/cache");
  const cacheKey = `cache:users:search:${JSON.stringify(filters)}:${currentUser?.collegeCode || 'ALL'}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const rows = await prisma.user.findMany({
    where: baseWhere,
    select: safeUserSelect(),
    take: 5000 // Limit for preview, increased from 50 since we use it for bulk preview
  });

  const result = {
    users: rows.map(u => ({
      ...sanitizeUser(u),
      college: u.college?.name || u.collegeCode || 'N/A'
    })),
    meta: {
      groupDerivedColleges: groupCollegeCodes.length,
      groupDerivedUsers: groupUserIds.length
    }
  };

  await cacheSetJson(cacheKey, 60, result);
  return result;
}

async function getFilters(currentUser) {
  let collegeWhere = {};
  let cacheKey = "cache:filters:ALL";
  
  if (currentUser?.role === ROLES.INSTRUCTOR) {
    if (currentUser.collegeCode) {
      collegeWhere = { collegeCode: currentUser.collegeCode };
      cacheKey = `cache:filters:${currentUser.collegeCode}`;
    } else {
      const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
      if (instructorRecord?.collegeCode) {
        collegeWhere = { collegeCode: instructorRecord.collegeCode };
        cacheKey = `cache:filters:${instructorRecord.collegeCode}`;
      }
    }
  }

  const { cacheGetJson, cacheSetJson } = require("../lib/cache");
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

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

  const result = {
    wings: wings.map(w => w.wing).filter(Boolean),
    colleges: colleges.map(c => c.college).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)),
    batches: allBatches
  };

  await cacheSetJson(cacheKey, 300, result);
  return result;
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
  await cacheDel(['user:metadata:' + id]).catch(() => {});
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
  bulkUpdateManageExams,
};
