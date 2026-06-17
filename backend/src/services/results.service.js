const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { cacheGetJson, cacheSetJson } = require("../lib/cache");
const { HttpError } = require("../utils/http-error");

function mapResultRow(r, violationCountMap = {}) {
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
    resultsPublished: r.exam?.resultsPublished ?? false,
    violationCount: violationCountMap[`${r.studentId}:${r.examId}`] ?? 0,
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
  exam: { select: { id: true, title: true, resultsPublished: true } },
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

/**
 * Batch-fetch warningCount from Attempt for a list of result rows.
 * Returns a map keyed by "studentId:examId".
 */
async function buildViolationCountMap(rows) {
  if (!rows.length) return {};
  const keys = rows.map(r => ({ studentId: r.studentId, examId: r.examId }));
  // Fetch all relevant attempts in one query using OR
  const attempts = await prisma.attempt.findMany({
    where: {
      OR: keys.map(k => ({ studentId: k.studentId, examId: k.examId })),
    },
    select: { studentId: true, examId: true, warningCount: true },
  });
  const map = {};
  for (const a of attempts) {
    map[`${a.studentId}:${a.examId}`] = a.warningCount ?? 0;
  }
  return map;
}

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

  const violationCountMap = await buildViolationCountMap(rows);

  const finalResults = rows.map((r) => {
    const mapped = mapResultRow(r, violationCountMap);
    if (!mapped.resultsPublished) {
      mapped.score = null;
    }
    return mapped;
  });
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

  const cacheKey = `results:instructor:${instructorId}:${collegeCode}:${examId || 'all'}:${query.search || 'none'}:p${page}:l${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("[Redis] GET error in listForInstructor", err);
  }

  const where = {
    student: { collegeCode: collegeCode === "NONE" ? null : collegeCode },
    ...(examId != null ? { examId } : {}),
  };

  if (query.search && String(query.search).trim() !== "") {
    const term = String(query.search).trim();
    where.student = {
      ...where.student,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { regimentalNumber: { contains: term, mode: "insensitive" } }
      ]
    };
  }

  const [rows, total] = await Promise.all([
    prisma.result.findMany({
      where,
      orderBy: { id: "desc" },
      include: resultInclude,
      skip,
      take: limit,
    }),
    prisma.result.count({
      where,
    }),
  ]);

  const violationCountMap = await buildViolationCountMap(rows);
  const finalResults = rows.map(r => mapResultRow(r, violationCountMap));
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

  const sortParam = query.sort === "score_desc" ? "score_desc" : "default";
  const statusParam = ["distinction", "qualified", "not_clear"].includes(query.status) ? query.status : "all";

  const cacheKey = `results:admin:${examId || 'all'}:${collegeCode || 'all'}:${query.search || 'none'}:s${sortParam}:t${statusParam}:p${page}:l${limit}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const where = {
    ...(examId != null ? { examId } : {}),
    ...(collegeCode != null ? { student: { collegeCode } } : {}),
  };

  if (statusParam === "distinction") {
    where.score = { gte: 70 };
  } else if (statusParam === "qualified") {
    // 40 to 69
    where.score = { gte: 40, lt: 70 };
  } else if (statusParam === "not_clear") {
    where.score = { lt: 40 };
  }

  if (query.search && String(query.search).trim() !== "") {
    const term = String(query.search).trim();
    where.student = {
      ...where.student,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { regimentalNumber: { contains: term, mode: "insensitive" } }
      ]
    };
  }

  const orderBy = sortParam === "score_desc" ? { score: "desc" } : { id: "desc" };

  const [rows, total] = await Promise.all([
    prisma.result.findMany({
      where,
      orderBy,
      include: resultInclude,
      skip,
      take: limit,
    }),
    prisma.result.count({
      where,
    }),
  ]);

  const violationCountMap = await buildViolationCountMap(rows);
  const finalResults = rows.map(r => mapResultRow(r, violationCountMap));
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

async function getReviewForStudent(studentId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid examId");
  }

  const cacheKey = `resultreview:${studentId}:${examId}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  // 1. Verify the attempt exists and belongs to this student
  const attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { status: true, answers: true, updatedAt: true },
  });

  if (!attempt) {
    throw new HttpError(404, "No attempt found for this exam");
  }

  // 2. Hard gate — correct answers must never be returned for in-progress exams
  if (attempt.status !== "SUBMITTED") {
    throw new HttpError(403, "Exam review is only available after submission");
  }

  // 3. Fetch the student's result
  const result = await prisma.result.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { score: true, createdAt: true },
  });

  // 3.1 Fetch or cache the Exam + questions globally to prevent thundering herd
  const examReviewCacheKey = `exam:review_data:${examId}`;
  let exam = await cacheGetJson(examReviewCacheKey);
  if (!exam) {
    exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          select: { id: true, question: true, options: true, answer: true },
          orderBy: { id: "asc" },
        },
      },
    });
    if (exam) {
      await cacheSetJson(examReviewCacheKey, 3600, exam);
    }
  }

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }

  if (!exam.resultsPublished) {
    throw new HttpError(403, "Results are not published yet");
  }

  // 4. Build the student answer map from the JSONB blob
  const studentAnswers =
    attempt.answers && typeof attempt.answers === "object"
      ? attempt.answers
      : {};

  // 5. Compute per-question review — pure, no I/O
  let correct = 0;
  let skipped = 0;

  const { normalizeAnswer } = require("./exam-scoring.service");

  const questions = exam.questions.map((q) => {
    const studentAnswer = studentAnswers[String(q.id)] ?? null;
    const correctAnswer = normalizeAnswer(q.answer);
    const normalizedStudent = studentAnswer ? normalizeAnswer(studentAnswer) : null;

    const isSkipped = normalizedStudent === null || normalizedStudent === "";
    const isCorrect = !isSkipped && normalizedStudent === correctAnswer;

    if (isCorrect) correct++;
    if (isSkipped) skipped++;

    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      correctAnswer,
      studentAnswer: normalizedStudent,
      isCorrect,
      isSkipped,
    };
  });

  const total = exam.questions.length;
  const incorrect = total - correct - skipped;

  const response = {
    examId,
    examTitle: exam.title,
    score: result?.score ?? 0,
    correct,
    incorrect,
    skipped,
    total,
    submittedAt: result?.createdAt ?? attempt.updatedAt,
    questions,
  };

  // 6. Cache for 5 minutes — data is immutable after submission
  await cacheSetJson(cacheKey, 300, response);

  return response;
}

module.exports = {
  mapResultRow,
  listForStudent,
  listForInstructor,
  listForAdmin,
  examSummary,
  exportExamResultsCsv,
  getReviewForStudent,
};
