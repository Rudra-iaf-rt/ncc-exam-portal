const { prisma } = require("../lib/prisma");
const { logger } = require("../utils/logger");
const bcrypt = require("bcrypt");
const csv = require("csv-parser");
const { Readable } = require("stream");
const { z } = require("zod");
const { HttpError } = require("../utils/http-error");

const userSchema = z.object({
  name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters"),
  regimentalNumber: z.string({ required_error: "Regimental Number is required" }).min(5, "Regimental Number must be at least 5 characters"),
  college: z.string({ required_error: "College name is required" }).min(2, "College name is too short"),
  password: z.string().optional().default("cadet123"),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  role: z.enum(["STUDENT", "ADMIN", "INSTRUCTOR"]).optional().default("STUDENT"),
  wing: z.enum(["ARMY", "NAVY", "AIR"]).optional().nullable(),
  batch: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

async function getStats() {
  const [totalStudents, totalExams, activeAttempts, resultAgg, recentActivity] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
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

  return {
    totalStudents,
    totalExams,
    activeExams: activeAttempts,
    averageScore: resultAgg._avg.score ? `${resultAgg._avg.score.toFixed(1)}%` : "0%",
    recentActivity: recentActivity.map(r => ({
      studentName: r.student.name,
      examTitle: r.exam.title,
      score: r.score,
      date: r.createdAt.toISOString()
    }))
  };
}

async function importUsers(fileBuffer, originalName, adminId) {
  const results = [];
  const errors = [];
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

  const validUsers = [];
  const existingUsers = await prisma.user.findMany({
    where: { 
      OR: [
        { regimentalNumber: { not: null } },
        { email: { not: null } }
      ]
    },
    select: { regimentalNumber: true, email: true }
  });

  const existingRegNos = new Set(existingUsers.map(u => u.regimentalNumber).filter(Boolean));
  const existingEmails = new Set(existingUsers.map(u => u.email).filter(Boolean));

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    const rawData = {
      name: row.name || row.Name || row.NAME,
      regimentalNumber: row.regimentalNumber || row.RegimentalNumber || row.regNo || row.RegNo,
      college: row.college || row.College || row.COLLEGE,
      wing: (row.wing || row.Wing || row.WING)?.toUpperCase() || null,
      batch: row.batch || row.Batch || row.BATCH || null,
      email: row.email || row.Email || row.EMAIL || null,
      password: "cadet123"
    };

    const parsed = userSchema.safeParse(rawData);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const summary = Object.entries(fieldErrors)
        .map(([field, msgs]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${msgs.join(', ')}`)
        .join(" | ");

      errors.push({ row: i + 1, error: summary });
      continue;
    }

    if (existingRegNos.has(parsed.data.regimentalNumber)) {
      errors.push({ row: i + 1, regNo: parsed.data.regimentalNumber, error: "Regimental Number already exists" });
      continue;
    }

    if (parsed.data.email && existingEmails.has(parsed.data.email)) {
      errors.push({ row: i + 1, email: parsed.data.email, error: "Email already exists" });
      continue;
    }

    if (validUsers.some(u => u.regimentalNumber === parsed.data.regimentalNumber)) {
      errors.push({ row: i + 1, regNo: parsed.data.regimentalNumber, error: "Duplicate Regimental Number in file" });
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

    logger.audit('USERS_BULK_IMPORT', { 
      count: created.count, 
      errors: errors.length,
      totalProcessed: results.length 
    }, adminId);

    return {
      success: true,
      count: created.count,
      totalProcessed: results.length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  return {
    success: true,
    count: 0,
    totalProcessed: results.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function bulkAssign(examId, filters, userIds, adminId) {
  let targetUserIds = [];

  if (userIds && Array.isArray(userIds) && userIds.length > 0) {
    targetUserIds = userIds.map(id => parseInt(id));
  } else {
    const { wing, college, batch } = filters;
    const users = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        wing: wing || undefined,
        college: college || undefined,
        batch: batch || undefined,
      },
      select: { id: true }
    });
    targetUserIds = users.map(u => u.id);
  }

  if (targetUserIds.length === 0) {
    throw new HttpError(404, "No eligible cadets found for these parameters");
  }

  const assignmentsData = targetUserIds.map(uid => ({
    userId: uid,
    examId: parseInt(examId)
  }));

  const created = await prisma.examAssignment.createMany({
    data: assignmentsData,
    skipDuplicates: true
  });

  logger.audit('EXAM_BULK_ASSIGN', { examId, count: created.count, filters }, adminId);
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

  logger.audit('RESULT_OVERRIDE', { 
    resultId, 
    newScore: score, 
    reason, 
    student: result.student.regimentalNumber,
    exam: result.exam.title 
  }, adminId);

  return result;
}

module.exports = {
  getStats,
  importUsers,
  bulkAssign,
  overrideResult
};
