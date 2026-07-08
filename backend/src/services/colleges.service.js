const { prisma } = require('../lib/prisma');
const { cacheGetJson, cacheSetJson, cacheDel } = require('../lib/cache');
const { HttpError } = require('../utils/http-error');
const userService = require('./users.service');

/**
 * Auto-generates a college code from the name.
 * "Maharaja Institute of Technology" → "MIT"
 * Then appended with zero-padded ID after creation.
 * If name has < 3 words, use first 4 chars of name.
 */
function deriveCodePrefix(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return words.map(w => w[0].toUpperCase()).join('');
  }
  return name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
}

async function attachCountsToColleges(colleges) {
  if (!colleges || colleges.length === 0) return [];

  // Group and count instructors/students per college code in a single query
  const counts = await prisma.user.groupBy({
    by: ['collegeCode', 'role'],
    where: {
      role: { in: ['INSTRUCTOR', 'STUDENT'] },
      collegeCode: { not: null },
    },
    _count: {
      _all: true,
    },
  });

  // Build lookup map for O(1) matching
  const lookup = {};
  for (const item of counts) {
    if (!item.collegeCode) continue;
    if (!lookup[item.collegeCode]) {
      lookup[item.collegeCode] = { officerCount: 0, cadetCount: 0 };
    }
    const countVal = (item._count && typeof item._count === 'object')
      ? (item._count._all ?? item._count.id ?? 0)
      : (item._count || 0);

    if (item.role === 'INSTRUCTOR') {
      lookup[item.collegeCode].officerCount = countVal;
    } else if (item.role === 'STUDENT') {
      lookup[item.collegeCode].cadetCount = countVal;
    }
  }

  return colleges.map((c) => {
    const countsForCollege = lookup[c.code] || { officerCount: 0, cadetCount: 0 };
    return {
      ...c,
      officerCount: countsForCollege.officerCount,
      cadetCount: countsForCollege.cadetCount,
    };
  });
}

async function clearCollegesCache() {
  // cacheDel is wrapped with the 120ms timeout guard and consistent error handling.
  await cacheDel(['cache:colleges:active', 'cache:colleges:all']);
}

async function listColleges() {
  const cacheKey = 'cache:colleges:active';
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const colleges = await prisma.college.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const result = await attachCountsToColleges(colleges);
  await cacheSetJson(cacheKey, 60, result);
  return result;
}

async function listCollegesAll() {
  const cacheKey = 'cache:colleges:all';
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const colleges = await prisma.college.findMany({
    orderBy: { name: 'asc' },
  });

  const result = await attachCountsToColleges(colleges);
  await cacheSetJson(cacheKey, 60, result);
  return result;
}

async function createCollege(body) {
  const { name, code: rawCode, address, city, state, pincode, nccContactName, nccContactEmail, nccContactPhone, oicId, newOic } = body;

  if (!name || !name.trim()) {
    throw new HttpError(400, 'College name is required');
  }

  // Check for duplicate name
  const existingName = await prisma.college.findUnique({ where: { name: name.trim() } });
  if (existingName) throw new HttpError(409, 'A college with this name already exists');

  let code = rawCode ? rawCode.trim().toUpperCase() : null;

  if (code) {
    const existingCode = await prisma.college.findUnique({ where: { code } });
    if (existingCode) throw new HttpError(409, `College code "${code}" is already in use`);
  } else {
    // Auto-generate: prefix + next available suffix
    const prefix = deriveCodePrefix(name);
    const count = await prisma.college.count({
      where: { code: { startsWith: prefix } },
    });
    code = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    // Ensure uniqueness
    const taken = await prisma.college.findUnique({ where: { code } });
    if (taken) {
      code = `${prefix}-${String(count + 2).padStart(3, '0')}`;
    }
  }

  // Use OIC data for contact fields if provided
  let finalContactName = nccContactName;
  let finalContactEmail = nccContactEmail;
  let finalContactPhone = nccContactPhone;

  if (newOic && newOic.name && newOic.email) {
    finalContactName = newOic.name;
    finalContactEmail = newOic.email;
  } else if (oicId) {
    const user = await prisma.user.findUnique({ where: { id: Number(oicId) } });
    if (user) {
      finalContactName = user.name;
      finalContactEmail = user.email;
      finalContactPhone = user.mobile || finalContactPhone;
    }
  }

  const college = await prisma.$transaction(async (tx) => {
    const college = await tx.college.create({
      data: {
        name: name.trim(),
        code,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        pincode: pincode?.trim() || null,
        nccContactName: finalContactName?.trim() || null,
        nccContactEmail: finalContactEmail?.trim().toLowerCase() || null,
        nccContactPhone: finalContactPhone?.trim() || null,
      },
    });

    // Handle OIC Creation/Linking
    if (newOic && newOic.name && newOic.email) {
      await userService.createInstructor({
        name: newOic.name,
        email: newOic.email,
        college: college.code,
        mobile: finalContactPhone,
      }, tx);
    } else if (oicId) {
      await userService.updateUser(oicId, { college: college.code }, tx);
    }

    return college;
  });

  await clearCollegesCache();
  return college;
}

async function updateCollege(idRaw, body) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid college ID');

  const existing = await prisma.college.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'College not found');

  const { name, code, address, city, state, pincode, nccContactName, nccContactEmail, nccContactPhone, isActive, oicId, newOic } = body;

  // If code is being changed, check no users currently assigned
  if (code && code !== existing.code) {
    const usersOnCode = await prisma.user.count({ where: { collegeCode: existing.code } });
    if (usersOnCode > 0) {
      throw new HttpError(409, `Cannot change college code: ${usersOnCode} user(s) are assigned to code "${existing.code}"`);
    }
    const codeTaken = await prisma.college.findFirst({ where: { code: code.toUpperCase(), id: { not: id } } });
    if (codeTaken) throw new HttpError(409, `Code "${code.toUpperCase()}" is already in use`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Handle OIC Linking
    let finalContactName = name || nccContactName;
    let finalContactEmail = nccContactEmail;
    let finalContactPhone = nccContactPhone;

    if (newOic && newOic.name && newOic.email) {
      await userService.createInstructor({
        name: newOic.name,
        email: newOic.email,
        college: code || existing.code,
        mobile: nccContactPhone || existing.nccContactPhone,
      }, tx);
      finalContactName = newOic.name;
      finalContactEmail = newOic.email;
    } else if (oicId) {
      const user = await userService.updateUser(oicId, { college: code || existing.code }, tx);
      finalContactName = user.name;
      finalContactEmail = user.email;
      finalContactPhone = user.mobile || finalContactPhone;
    }

    const updated = await tx.college.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        code: code ? code.trim().toUpperCase() : existing.code,
        address: address?.trim() ?? existing.address,
        city: city?.trim() ?? existing.city,
        state: state?.trim() ?? existing.state,
        pincode: pincode?.trim() ?? existing.pincode,
        nccContactName: finalContactName?.trim() ?? existing.nccContactName,
        nccContactEmail: finalContactEmail?.trim().toLowerCase() ?? existing.nccContactEmail,
        nccContactPhone: finalContactPhone?.trim() ?? existing.nccContactPhone,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    });

    return updated;
  });

  await clearCollegesCache();
  return updated;
}

async function deactivateCollege(idRaw) {
  const id = Number(idRaw);
  if (!Number.isFinite(id)) throw new HttpError(400, 'Invalid college ID');

  const existing = await prisma.college.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'College not found');

  const updated = await prisma.college.update({
    where: { id },
    data: { isActive: false },
  });

  await clearCollegesCache();
  return updated;
}

module.exports = { 
  listColleges, 
  listCollegesAll, 
  createCollege, 
  updateCollege, 
  deactivateCollege,
  clearCollegesCache
};
