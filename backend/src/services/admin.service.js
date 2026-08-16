const { prisma } = require("../lib/prisma");
const { logger } = require("../utils/logger");
const { cacheGetJson, cacheSetJson } = require("../lib/cache");
const bcrypt = require("bcrypt");
const csv = require("csv-parser");
const { Readable } = require("stream");
const { z } = require("zod");
const { HttpError } = require("../utils/http-error");

const userSchema = z.object({
  name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters"),
  regimentalNumber: z.string({ required_error: "Regimental Number is required" }).min(5, "Regimental Number must be at least 5 characters"),
  collegeCode: z.string({ required_error: "College code is required" }).min(2, "College code is too short"),
  password: z.string().optional().default("cadet123"),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  role: z.enum(["STUDENT", "ADMIN", "INSTRUCTOR"]).optional().default("STUDENT"),
  wing: z.enum(["ARMY", "NAVY", "AIR"]).optional().nullable(),
  batch: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

async function getStats(currentUser) {
  const cacheKey = `stats:dashboard:${currentUser?.role || 'none'}:${currentUser?.id || 'none'}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  // Fetch instructor's collegeCode in the same parallel block as all other
  // queries — previously it was a sequential round-trip that added ~2s to
  // every cold stats load for INSTRUCTOR users.
  const isInstructor = currentUser?.role === "INSTRUCTOR";
  let cc = isInstructor ? currentUser?.collegeCode : null;
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const now = new Date();

  const [instructorRecord, totalStudents, totalExams, activeAttempts, resultAgg, recentActivity, recentViolations, activeConnections, pendingActions, upcomingExams] =
    await Promise.all([
      (isInstructor && !cc)
        ? prisma.user.findUnique({ where: { id: currentUser.id }, select: { collegeCode: true } })
        : Promise.resolve(null),
      prisma.user.count({ where: { role: "STUDENT" } }), // refined below after collegeCode is known
      prisma.exam.count(),
      prisma.attempt.count({ where: { status: "IN_PROGRESS" } }),
      prisma.result.aggregate({ _avg: { score: true } }),
      prisma.result.findMany({
        take: 5,
        orderBy: { id: 'desc' },
        include: {
          student: { select: { name: true } },
          exam: { select: { title: true } }
        }
      }),
      prisma.examViolation.findMany({
        take: 5,
        orderBy: { id: 'desc' },
        include: {
          student: { select: { name: true, regimentalNumber: true } },
          exam: { select: { title: true } }
        }
      }),
      prisma.examHeartbeat.count({
        where: { lastSeenAt: { gte: fiveMinsAgo } }
      }),
      prisma.exam.count({
        where: {
          resultsPublished: false,
          OR: [{ status: 'COMPLETED' }, { endAt: { lt: now } }]
        }
      }),
      prisma.exam.count({
        where: { startAt: { gt: now }, status: 'PUBLISHED' }
      })
    ]);

  // If this is an instructor, re-run the scoped queries with their collegeCode.
  // We only do a second round if we actually have a collegeCode to scope by;
  // otherwise the broad numbers above are used (matching the previous behavior).
  let finalStudents = totalStudents;
  let finalAttempts = activeAttempts;
  let finalAgg = resultAgg;
  let finalActivity = recentActivity;
  let finalViolations = recentViolations;
  let finalActiveConnections = activeConnections;
  let finalPendingActions = pendingActions;
  let finalUpcomingExams = upcomingExams;

  if (isInstructor) {
    if (!cc && instructorRecord?.collegeCode) cc = instructorRecord.collegeCode;
    if (cc) {
      const scopedWhere = { student: { collegeCode: cc } };
    const [s, a, agg, act, v, ac, pa, ue] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", collegeCode: cc } }),
      prisma.attempt.count({ where: { status: "IN_PROGRESS", ...scopedWhere } }),
      prisma.result.aggregate({ where: scopedWhere, _avg: { score: true } }),
      prisma.result.findMany({
        where: scopedWhere,
        take: 5,
        orderBy: { id: 'desc' },
        include: {
          student: { select: { name: true } },
          exam: { select: { title: true } }
        }
      }),
      prisma.examViolation.findMany({
        where: scopedWhere,
        take: 5,
        orderBy: { id: 'desc' },
        include: {
          student: { select: { name: true, regimentalNumber: true } },
          exam: { select: { title: true } }
        }
      }),
      prisma.examHeartbeat.count({
        where: { lastSeenAt: { gte: fiveMinsAgo }, ...scopedWhere }
      }),
      prisma.exam.count({
        where: {
          createdBy: currentUser.id,
          resultsPublished: false,
          OR: [{ status: 'COMPLETED' }, { endAt: { lt: now } }]
        }
      }),
      prisma.exam.count({
        where: { createdBy: currentUser.id, startAt: { gt: now }, status: 'PUBLISHED' }
      })
    ]);
      finalStudents = s;
      finalAttempts = a;
      finalAgg = agg;
      finalActivity = act;
      finalViolations = v;
      finalActiveConnections = ac;
      finalPendingActions = pa;
      finalUpcomingExams = ue;
    }
  }

  const result = {
    totalStudents: finalStudents,
    totalExams,
    activeExams: finalAttempts,
    activeConnections: finalActiveConnections,
    pendingActions: finalPendingActions,
    upcomingExams: finalUpcomingExams,
    averageScore: finalAgg._avg.score ? `${finalAgg._avg.score.toFixed(1)}%` : "0%",
    recentActivity: finalActivity.map(r => ({
      studentName: r.student.name,
      examTitle: r.exam.title,
      score: r.score,
      date: r.createdAt.toISOString()
    })),
    recentViolations: finalViolations.map(v => ({
      id: v.id,
      studentName: v.student.name,
      regimentalNumber: v.student.regimentalNumber,
      examTitle: v.exam.title,
      type: v.type,
      message: v.message,
      date: v.createdAt.toISOString()
    }))
  };

  // Cache for 60s — these are aggregated counts, not live data.
  await cacheSetJson(cacheKey, 60, result);

  return result;
}

async function importUsers(fileBuffer, originalName, adminId) {
  const results = [];
  const stream = Readable.from(fileBuffer);

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim(),
        mapValues: ({ value }) => value.trim()
      }))
      .on("data", (data) => results.push(data))
      .on("error", reject)
      .on("end", resolve);
  });

  if (results.length === 0) {
    throw new HttpError(400, "CSV file is empty or headers mismatch");
  }

  const errors = [];
  const validUsers = [];
  
  const csvRegNos = new Set();
  const csvEmails = new Set();
  
  for (const row of results) {
    const regNo = row.regimentalNumber || row.RegimentalNumber || row.regNo || row.RegNo;
    const email = row.email || row.Email || row.EMAIL;
    if (regNo) csvRegNos.add(regNo);
    if (email) csvEmails.add(email.toLowerCase());
  }

  // Fetch only existing users that match the CSV
  const orConditions = [];
  if (csvRegNos.size > 0) orConditions.push({ regimentalNumber: { in: Array.from(csvRegNos) } });
  if (csvEmails.size > 0) orConditions.push({ email: { in: Array.from(csvEmails) } });

  const existingUsers = orConditions.length > 0 
    ? await prisma.user.findMany({
        where: { OR: orConditions },
        select: { regimentalNumber: true, email: true }
      })
    : [];
    
  const existingRegNos = new Set(existingUsers.map(u => u.regimentalNumber).filter(Boolean));

  // Fetch all colleges and batches to validate against
  const [colleges, batches] = await Promise.all([
    prisma.college.findMany({ select: { code: true } }),
    prisma.batch.findMany({ select: { name: true } })
  ]);
  const validCollegeCodes = new Set(colleges.map(c => c.code.toUpperCase()));
  const validBatchNames = new Set(batches.map(b => b.name));

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    const rawData = {
      name: row.name || row.Name || row.NAME,
      regimentalNumber: row.regimentalNumber || row.RegimentalNumber || row.regNo || row.RegNo,
      collegeCode: (row.collegeCode || row.CollegeCode || row.college || row.College)?.toUpperCase(),
      wing: (row.wing || row.Wing || row.WING)?.toUpperCase() || null,
      batch: row.batch || row.Batch || row.BATCH || null,
      email: row.email || row.Email || row.EMAIL || null,
      password: "cadet123"
    };

    const parsed = userSchema.safeParse(rawData);
    if (!parsed.success) {
      errors.push({ row: i + 1, error: "Validation failed" });
      continue;
    }

    if (existingRegNos.has(parsed.data.regimentalNumber)) {
      errors.push({ row: i + 1, regNo: parsed.data.regimentalNumber, error: "Already exists" });
      continue;
    }

    if (rawData.collegeCode && !validCollegeCodes.has(rawData.collegeCode)) {
      errors.push({ row: i + 1, error: `Invalid College Code: "${rawData.collegeCode}". Please check available College Codes.` });
      continue;
    }

    if (rawData.batch && !validBatchNames.has(rawData.batch)) {
      errors.push({ row: i + 1, error: `Invalid Batch: "${rawData.batch}". Please create the batch first in Batch Management.` });
      continue;
    }

    validUsers.push(parsed.data);
  }

  if (validUsers.length > 0) {
    const hashedUsers = await Promise.all(validUsers.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, 10),
      role: "STUDENT"
    })));

    const created = await prisma.user.createMany({
      data: hashedUsers,
      skipDuplicates: true,
    });

    return {
      success: true,
      count: created.count,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  return { success: true, count: 0, errors };
}

async function resolveAssignmentTargets(examId, filters, userIds, currentUser) {
  if (!examId) {
    throw new HttpError(400, "Exam ID is required");
  }

  const examExists = await prisma.exam.findUnique({
    where: { id: parseInt(examId) },
    select: { id: true, status: true, title: true }
  });

  if (!examExists) {
    throw new HttpError(404, `Exam with ID ${examId} not found`);
  }

  if (examExists.status === 'COMPLETED' || examExists.status === 'ARCHIVED') {
    throw new HttpError(400, `Cannot schedule exam with status ${examExists.status}`);
  }

  let targetUserIds = [];
  let enforcedCollegeCode = undefined;

  if (currentUser?.role === "INSTRUCTOR") {
    if (currentUser.collegeCode) {
      enforcedCollegeCode = currentUser.collegeCode;
    } else {
      const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
      if (!instructorRecord || !instructorRecord.collegeCode) {
        throw new HttpError(403, "Instructor must be assigned to a college to assign exams");
      }
      enforcedCollegeCode = instructorRecord.collegeCode;
    }
  }

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    const where = { id: { in: userIds.map(id => parseInt(id)) } };
    if (enforcedCollegeCode) where.collegeCode = enforcedCollegeCode;
    
    const validUsers = await prisma.user.findMany({ where, select: { id: true } });
    targetUserIds = validUsers.map(u => u.id);
  } else {
    const { wing, collegeCode, batch } = filters || {};
    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        wing: wing || undefined,
        collegeCode: enforcedCollegeCode || collegeCode || undefined,
        batch: batch || undefined,
      },
      select: { id: true }
    });
    targetUserIds = users.map(u => u.id);
  }

  if (targetUserIds.length === 0) {
    throw new HttpError(404, "No eligible cadets found");
  }

  return { targetUserIds, examTitle: examExists.title };
}

async function processBulkAssignJob(examId, targetUserIds, adminId, examTitle) {
  // FIX: Parse once here so parseInt(examId) is never called on a stale
  // string across multiple chunks — avoids NaN if examId arrived as "abc".
  const parsedExamId = parseInt(examId, 10);
  if (isNaN(parsedExamId)) {
    throw new Error(`Invalid examId passed to processBulkAssignJob: ${examId}`);
  }

  const CHUNK_SIZE = 500;
  let totalAssigned = 0;
  // Track which user IDs were truly new assignments so we only notify those.
  const newlyAssignedUserIds = [];

  try {
    for (let i = 0; i < targetUserIds.length; i += CHUNK_SIZE) {
      const chunk = targetUserIds.slice(i, i + CHUNK_SIZE);

      // --- Step 1: Create Assignments ---
      // FIX: Find which users are already assigned BEFORE inserting, so we
      // know exactly who is new. skipDuplicates silently drops them so we
      // can't rely on created.count to identify which UIDs were skipped.
      const alreadyAssigned = await prisma.examAssignment.findMany({
        where: { examId: parsedExamId, userId: { in: chunk } },
        select: { userId: true }
      });
      const alreadyAssignedSet = new Set(alreadyAssigned.map(a => a.userId));
      const trulyNewUserIds = chunk.filter(uid => !alreadyAssignedSet.has(uid));

      if (trulyNewUserIds.length > 0) {
        await prisma.examAssignment.createMany({
          data: trulyNewUserIds.map(uid => ({ userId: uid, examId: parsedExamId })),
          skipDuplicates: true // belt-and-suspenders for race conditions
        });
        totalAssigned += trulyNewUserIds.length;
        newlyAssignedUserIds.push(...trulyNewUserIds);

        // --- Step 2: Create Notifications ONLY for newly assigned users ---
        // FIX: Notification model has no @@unique([userId, examId]) so
        // skipDuplicates does nothing. We only insert for new assignments.
        await prisma.notification.createMany({
          data: trulyNewUserIds.map(uid => ({
            userId: uid,
            sentById: adminId,
            message: `You have been scheduled for exam: ${examTitle}`
          }))
        });
      }
    }
  } catch (err) {
    logger.error({
      action: 'exam_bulk_assign_failed',
      examId: parsedExamId,
      adminId,
      assignedSoFar: totalAssigned,
      error_code: 'SRV_001',
      message: err instanceof Error ? err.message : 'unknown error'
    });
    throw err;
  }

  logger.audit('EXAM_BULK_ASSIGN', { examId: parsedExamId, count: totalAssigned }, adminId);

  // --- Step 3: Cache invalidation ---
  const { cacheDelNamespace, cacheDel } = require('../lib/cache');
  await Promise.all([
    cacheDelNamespace('assignments'),
    // FIX: Instead of N individual cacheDel() calls (one per student = up to
    // 3,000 Redis commands), batch ALL student keys into a single DEL command.
    // cacheDel accepts an array and calls redis.del(...keys) as one operation.
    newlyAssignedUserIds.length > 0
      ? cacheDel(newlyAssignedUserIds.map(uid => `student:assignments:${uid}`))
      : Promise.resolve(),
    cacheDelNamespace('exams:catalog'),
  ]).catch(() => {});

  return { success: true, count: totalAssigned };
}

async function overrideResult(resultId, score, reason, adminId) {
  const result = await prisma.result.update({
    where: { id: resultId },
    data: { score },
    include: {
      student: { select: { name: true, regimentalNumber: true } },
      exam: { select: { title: true } }
    }
  });

  logger.audit('RESULT_OVERRIDE', { resultId, newScore: score, reason }, adminId);

  const { cacheDelNamespace, cacheDel } = require('../lib/cache');
  await Promise.all([
    cacheDelNamespace(`results:student:${result.studentId}`),
    cacheDelNamespace('results:admin'),
    cacheDelNamespace('results:instructor'),
    cacheDelNamespace('leaderboard:unit'),
    cacheDel([
      `resultreview:${result.studentId}:${result.examId}`,
      // Bust the new per-student result slice so the dashboard reflects the override.
      `student:results:${result.studentId}`,
    ])
  ]).catch(() => {});

  return result;
}

module.exports = {
  getStats,
  importUsers,
  resolveAssignmentTargets,
  processBulkAssignJob,
  overrideResult
};
