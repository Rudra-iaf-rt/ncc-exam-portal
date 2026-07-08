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
  const [instructorRecord, totalStudents, totalExams, activeAttempts, resultAgg, recentActivity] =
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
      })
    ]);

  // If this is an instructor, re-run the scoped queries with their collegeCode.
  // We only do a second round if we actually have a collegeCode to scope by;
  // otherwise the broad numbers above are used (matching the previous behavior).
  let finalStudents = totalStudents;
  let finalAttempts = activeAttempts;
  let finalAgg = resultAgg;
  let finalActivity = recentActivity;

  if (isInstructor) {
    if (!cc && instructorRecord?.collegeCode) cc = instructorRecord.collegeCode;
    if (cc) {
      const scopedWhere = { student: { collegeCode: cc } };
    const [s, a, agg, act] = await Promise.all([
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
      })
    ]);
      finalStudents = s;
      finalAttempts = a;
      finalAgg = agg;
      finalActivity = act;
    }
  }

  const result = {
    totalStudents: finalStudents,
    totalExams,
    activeExams: finalAttempts,
    averageScore: finalAgg._avg.score ? `${finalAgg._avg.score.toFixed(1)}%` : "0%",
    recentActivity: finalActivity.map(r => ({
      studentName: r.student.name,
      examTitle: r.exam.title,
      score: r.score,
      date: r.createdAt.toISOString()
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

async function bulkAssign(examId, filters, userIds, currentUser) {
  if (!examId) {
    throw new HttpError(400, "Exam ID is required");
  }

  const examExists = await prisma.exam.findUnique({
    where: { id: parseInt(examId) },
    select: { id: true }
  });

  if (!examExists) {
    throw new HttpError(404, `Exam with ID ${examId} not found`);
  }

  let targetUserIds = [];
  const adminId = currentUser.id;
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
    const { wing, collegeCode, batch } = filters;
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

  const assignmentsData = targetUserIds.map(uid => ({
    userId: uid,
    examId: parseInt(examId)
  }));

  const created = await prisma.examAssignment.createMany({
    data: assignmentsData,
    skipDuplicates: true
  });

  logger.audit('EXAM_BULK_ASSIGN', { examId, count: created.count }, adminId);
  return { success: true, count: created.count };
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
  return result;
}

module.exports = {
  getStats,
  importUsers,
  bulkAssign,
  overrideResult
};
