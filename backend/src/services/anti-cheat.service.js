const { HttpError } = require("../utils/http-error");
const { prisma } = require("../lib/prisma");

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpError(400, `${label} must be a positive number`);
  }
  return n;
}

async function reportViolation(studentId, body = {}) {
  const examId = parsePositiveInt(body.examId, "examId");
  const type = String(body.type || "").trim();
  if (!type) {
    throw new HttpError(400, "type is required");
  }
  const item = await prisma.examViolation.create({
    data: {
      studentId,
      examId,
      type,
      message: body.message ? String(body.message) : null,
    },
  });
  return item;
}

async function heartbeat(studentId, body = {}) {
  const examId = parsePositiveInt(body.examId, "examId");
  const activeQuestionIndex = Number.isFinite(Number(body.activeQuestionIndex))
    ? Math.max(0, Math.floor(Number(body.activeQuestionIndex)))
    : null;

  const payload = await prisma.examHeartbeat.upsert({
    where: {
      studentId_examId: {
        studentId,
        examId,
      },
    },
    create: {
      studentId,
      examId,
      activeQuestionIndex,
    },
    update: {
      activeQuestionIndex,
    },
  });
  return payload;
}

async function listFlagsByExam(examIdRaw) {
  const examId = parsePositiveInt(examIdRaw, "examId");
  const rows = await prisma.examViolation.findMany({
    where: { examId },
    orderBy: { id: "desc" },
  });
  return rows;
}

module.exports = {
  reportViolation,
  heartbeat,
  listFlagsByExam,
};
