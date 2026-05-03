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
  collegeCode: z.string({ required_error: "College code is required" }).min(2, "College code is too short"),
  password: z.string().optional().default("cadet123"),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  role: z.enum(["STUDENT", "ADMIN", "INSTRUCTOR"]).optional().default("STUDENT"),
  wing: z.enum(["ARMY", "NAVY", "AIR"]).optional().nullable(),
  batch: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

async function getStats(currentUser) {
  let userWhere = { role: "STUDENT" };
  let attemptWhere = { status: "IN_PROGRESS" };
  let resultWhere = {};

  if (currentUser?.role === "INSTRUCTOR") {
    const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (instructorRecord?.collegeCode) {
      userWhere.collegeCode = instructorRecord.collegeCode;
      attemptWhere.student = { collegeCode: instructorRecord.collegeCode };
      resultWhere.student = { collegeCode: instructorRecord.collegeCode };
    }
  }

  const [totalStudents, totalExams, activeAttempts, resultAgg, recentActivity] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.exam.count(),
    prisma.attempt.count({ where: attemptWhere }),
    prisma.result.aggregate({ where: resultWhere, _avg: { score: true } }),
    prisma.result.findMany({
      where: resultWhere,
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
  
  // Fetch existing users to check uniqueness
  const existingUsers = await prisma.user.findMany({
    select: { regimentalNumber: true, email: true }
  });
  const existingRegNos = new Set(existingUsers.map(u => u.regimentalNumber).filter(Boolean));

  // Fetch all batches to validate against
  const batches = await prisma.batch.findMany({ select: { name: true } });
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
  let targetUserIds = [];
  const adminId = currentUser.id;
  let enforcedCollegeCode = undefined;

  if (currentUser?.role === "INSTRUCTOR") {
    const instructorRecord = await prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!instructorRecord || !instructorRecord.collegeCode) {
      throw new HttpError(403, "Instructor must be assigned to a college to assign exams");
    }
    enforcedCollegeCode = instructorRecord.collegeCode;
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
