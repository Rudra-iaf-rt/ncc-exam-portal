const { HttpError } = require("../utils/http-error");
const { prisma } = require("../lib/prisma");
const { scoreSubmission } = require("./exam-scoring.service");
const {
  cacheDelPattern,
  cacheDel,
  incrementCacheVersion,
} = require("../lib/cache");

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpError(400, `${label} must be a positive number`);
  }
  return n;
}

/**
 * Auto-submit a student's exam when they hit the violation threshold.
 * Uses the same scoring logic as the normal submitExam flow.
 */
async function autoSubmitOnViolation(studentId, examId) {
  try {
    // Only auto-submit if the attempt is still in progress
    const attempt = await prisma.attempt.findUnique({
      where: { studentId_examId: { studentId, examId } },
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") return;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) return;

    const finalAnswers =
      attempt.answers && typeof attempt.answers === "object"
        ? attempt.answers
        : {};

    const finalAnswersArray = Object.entries(finalAnswers).map(
      ([qid, selectedAnswer]) => ({
        questionId: Number(qid),
        selectedAnswer: String(selectedAnswer ?? ""),
      })
    );

    const { score } = scoreSubmission(exam.questions, finalAnswersArray);

    await prisma.$transaction([
      prisma.attempt.update({
        where: { id: attempt.id },
        data: {
          status: "SUBMITTED",
          answers: finalAnswers,
        },
      }),
      prisma.result.upsert({
        where: { studentId_examId: { studentId, examId } },
        create: { studentId, examId, score },
        update: { score },
      }),
    ]);

    // Invalidate caches (best-effort)
    await Promise.all([
      cacheDelPattern(`results:student:${studentId}:*`),
      cacheDelPattern(`results:admin:*`),
      cacheDelPattern(`results:instructor:*`),
      incrementCacheVersion(`exams:catalog:user:${studentId}`),
      cacheDel([
        `stats:dashboard:STUDENT:${studentId}`,
        `stats:dashboard:ADMIN:all`,
      ]),
    ]).catch((err) => {
      console.error("[AntiCheat] Cache invalidation error on auto-submit:", err.message);
    });
  } catch (err) {
    // Never block the violation response — log and continue
    console.error("[AntiCheat] autoSubmitOnViolation failed:", err.message);
  }
}

async function reportViolation(studentId, body = {}) {
  const examId = parsePositiveInt(body.examId, "examId");
  const type = String(body.type || "").trim();
  const MAX_WARNINGS = 3;

  if (!type) {
    throw new HttpError(400, "type is required");
  }

  const [item] = await prisma.$transaction([
    prisma.examViolation.create({
      data: {
        studentId,
        examId,
        type,
        message: body.message ? String(body.message) : null,
      },
    }),
    prisma.attempt.updateMany({
      where: { studentId, examId, status: "IN_PROGRESS" },
      data: { warningCount: { increment: 1 } },
    }),
  ]);

  const attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { warningCount: true },
  });

  const warningCount = attempt?.warningCount || 0;
  const terminate = warningCount >= MAX_WARNINGS;

  // If threshold reached, auto-submit the exam server-side (fire-and-forget)
  if (terminate) {
    autoSubmitOnViolation(studentId, examId);
  }

  return { ...item, warningCount, terminate };
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
    include: {
      student: {
        select: { id: true, name: true, regimentalNumber: true },
      },
    },
  });
  return rows;
}

module.exports = {
  reportViolation,
  heartbeat,
  listFlagsByExam,
};
