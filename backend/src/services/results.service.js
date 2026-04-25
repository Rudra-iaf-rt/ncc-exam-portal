const { prisma } = require("../lib/prisma");
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
    college: r.student?.college ?? null,
    createdAt: r.createdAt,
    exam: r.exam ?? null,
  };
}

function parseOptionalExamId(query) {
  if (query.examId == null || query.examId === "") return null;
  const n = Number(query.examId);
  return Number.isFinite(n) ? n : NaN;
}

function parseOptionalCollege(query) {
  if (typeof query.college !== "string") return null;
  const t = query.college.trim();
  return t === "" ? null : t;
}

const resultInclude = {
  exam: { select: { id: true, title: true } },
  student: {
    select: {
      id: true,
      name: true,
      regimentalNumber: true,
      college: true,
    },
  },
};

async function listForStudent(studentId, query) {
  const examId = parseOptionalExamId(query);
  if (Number.isNaN(examId)) {
    throw new HttpError(400, "Invalid examId query");
  }

  const rows = await prisma.result.findMany({
    where: {
      studentId,
      ...(examId != null ? { examId } : {}),
    },
    orderBy: { id: "desc" },
    include: resultInclude,
  });

  return rows.map(mapResultRow);
}

async function listForInstructor(instructorId, query) {
  const examId = parseOptionalExamId(query);
  if (Number.isNaN(examId)) {
    throw new HttpError(400, "Invalid examId query");
  }

  const me = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { college: true },
  });
  if (!me) {
    throw new HttpError(404, "User not found");
  }

  const collegeParam = parseOptionalCollege(query);
  const college = collegeParam ?? me.college;

  const rows = await prisma.result.findMany({
    where: {
      student: { college },
      ...(examId != null ? { examId } : {}),
    },
    orderBy: { id: "desc" },
    include: resultInclude,
  });

  return { college, results: rows.map(mapResultRow) };
}

async function listForAdmin(query) {
  const examId = parseOptionalExamId(query);
  if (Number.isNaN(examId)) {
    throw new HttpError(400, "Invalid examId query");
  }
  const college = parseOptionalCollege(query);

  const rows = await prisma.result.findMany({
    where: {
      ...(examId != null ? { examId } : {}),
      ...(college != null ? { student: { college } } : {}),
    },
    orderBy: { id: "desc" },
    include: resultInclude,
  });

  return rows.map(mapResultRow);
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
