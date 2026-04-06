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

module.exports = {
  mapResultRow,
  listForStudent,
  listForInstructor,
  listForAdmin,
};
