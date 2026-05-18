const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { cacheGetJson, cacheSetJson } = require("../lib/cache");
const { HttpError } = require("../utils/http-error");

function mapResultRow(r) {
  return {
    id: r.id,
    score: r.score,
    examId: r.examId,
    examTitle: r.exam?.title ?? null,
    studentId: r.studentId,
    studentName: r.student?.name ?? null,
    regimentalNumber: r.student?.regimentalNumber ?? null,
    college: r.student?.college?.name || r.student?.collegeCode || null,
    createdAt: r.createdAt,
    exam: r.exam ?? null,
  };
}

function parseOptionalExamId(query) {
  if (query.examId == null || query.examId === "") return null;
  const n = Number(query.examId);
  return Number.isFinite(n) ? n : NaN;
}

function parseOptionalCollegeCode(query) {
  if (typeof query.collegeCode !== "string") return null;
  const t = query.collegeCode.trim();
  return t === "" ? null : t;
}

const resultInclude = {
  exam: { select: { id: true, title: true } },
  student: {
    select: {
      id: true,
      name: true,
      regimentalNumber: true,
      collegeCode: true,
      college: { select: { name: true } }
    },
  },
};

async function listForStudent(studentId, query) {
  const examId = parseOptionalExamId(query);
  if (Number.isNaN(examId)) {
    throw new HttpError(400, "Invalid examId query");
  }

  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const cacheKey = `results:student:${studentId}:${examId || 'all'}:p${page}:l${limit}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const [rows, total] = await Promise.all([
    prisma.result.findMany({
      where: {
        studentId,
        ...(examId != null ? { examId } : {}),
      },
      orderBy: { id: "desc" },
      include: resultInclude,
      skip,
      take: limit,
    }),
    prisma.result.count({
      where: {
        studentId,
        ...(examId != null ? { examId } : {}),
      },
    }),
  ]);

  const finalResults = rows.map(mapResultRow);
  const response = {
    results: finalResults,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  await cacheSetJson(cacheKey, 60, response);

  return response;
}

async function listForInstructor(instructorId, query) {
  const examId = parseOptionalExamId(query);
  if (Number.isNaN(examId)) {
    throw new HttpError(400, "Invalid examId query");
  }

  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  // We should cache instructor metadata to avoid hitting the DB every time just to get collegeCode
  const instructorCacheKey = `user:metadata:${instructorId}`;
  let collegeCode = null;
  try {
    const cachedCollegeCode = await redis.get(instructorCacheKey);
    if (cachedCollegeCode) {
      collegeCode = cachedCollegeCode;
    }
  } catch (err) {
    console.error("[Redis] GET error in instructor metadata", err);
  }

  if (!collegeCode) {
    const me = await prisma.user.findUnique({
      where: { id: instructorId },
      select: { collegeCode: true },
    });
    if (!me) {
      throw new HttpError(404, "User not found");
    }
    collegeCode = me.collegeCode || "NONE";
    try {
      await redis.setex(instructorCacheKey, 300, collegeCode); // Cache instructor info for 5 mins
    } catch (err) {
      console.error("[Redis] SET error in instructor metadata", err);
    }
  }

  const cacheKey = `results:instructor:${instructorId}:${collegeCode}:${examId || 'all'}:p${page}:l${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("[Redis] GET error in listForInstructor", err);
  }

  const [rows, total] = await Promise.all([
    prisma.result.findMany({
      where: {
        student: { collegeCode: collegeCode === "NONE" ? null : collegeCode },
        ...(examId != null ? { examId } : {}),
      },
      orderBy: { id: "desc" },
      include: resultInclude,
      skip,
      take: limit,
    }),
    prisma.result.count({
      where: {
        student: { collegeCode: collegeCode === "NONE" ? null : collegeCode },
        ...(examId != null ? { examId } : {}),
      },
    }),
  ]);

  const finalResults = rows.map(mapResultRow);
  const response = {
    collegeCode: collegeCode === "NONE" ? null : collegeCode,
    results: finalResults,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  try {
    await redis.setex(cacheKey, 30, JSON.stringify(response)); // Cache results for 30s
  } catch (err) {
    console.error("[Redis] SET error in listForInstructor", err);
  }

  return response;
}

async function listForAdmin(query) {
  const examId = parseOptionalExamId(query);
  if (Number.isNaN(examId)) {
    throw new HttpError(400, "Invalid examId query");
  }
  const collegeCode = parseOptionalCollegeCode(query);

  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const cacheKey = `results:admin:${examId || 'all'}:${collegeCode || 'all'}:p${page}:l${limit}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const [rows, total] = await Promise.all([
    prisma.result.findMany({
      where: {
        ...(examId != null ? { examId } : {}),
        ...(collegeCode != null ? { student: { collegeCode } } : {}),
      },
      orderBy: { id: "desc" },
      include: resultInclude,
      skip,
      take: limit,
    }),
    prisma.result.count({
      where: {
        ...(examId != null ? { examId } : {}),
        ...(collegeCode != null ? { student: { collegeCode } } : {}),
      },
    }),
  ]);

  const finalResults = rows.map(mapResultRow);
  const response = {
    results: finalResults,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  await cacheSetJson(cacheKey, 30, response);

  return response;
}

async function examSummary(examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid examId");
  }
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { results: true },
  });
  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  const scores = exam.results.map((r) => r.score);
  const attempts = scores.length;
  const averageScore =
    attempts > 0
      ? Number((scores.reduce((sum, s) => sum + s, 0) / attempts).toFixed(2))
      : 0;
  const highestScore = attempts > 0 ? Math.max(...scores) : 0;
  const lowestScore = attempts > 0 ? Math.min(...scores) : 0;
  return {
    examId: exam.id,
    title: exam.title,
    attempts,
    averageScore,
    highestScore,
    lowestScore,
  };
}

async function exportExamResultsCsv(examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid examId");
  }
  const rows = await prisma.result.findMany({
    where: { examId },
    include: resultInclude,
    orderBy: { id: "asc" },
  });
  const header = [
    "resultId",
    "examId",
    "examTitle",
    "studentId",
    "studentName",
    "regimentalNumber",
    "college",
    "score",
  ];
  const dataRows = rows.map((r) => {
    const mapped = mapResultRow(r);
    return [
      mapped.id,
      mapped.examId,
      mapped.examTitle ?? "",
      mapped.studentId,
      mapped.studentName ?? "",
      mapped.regimentalNumber ?? "",
      mapped.college ?? "",
      mapped.score,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...dataRows].join("\n");
}

module.exports = {
  mapResultRow,
  listForStudent,
  listForInstructor,
  listForAdmin,
  examSummary,
  exportExamResultsCsv,
};
