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

    const { score } = scoreSubmission(exam.questions, finalAnswersArray, exam);

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
  // isPenalty defaults to true — only bypass audit-log calls explicitly set it to false
  const isPenalty = body.isPenalty !== false;
  const MAX_WARNINGS = 3;

  if (!type) {
    throw new HttpError(400, "type is required");
  }

  // Step 1: Read current warningCount BEFORE taking any action.
  // This is the authoritative source for whether we can still penalise.
  const existingAttempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { warningCount: true, status: true },
  });

  const currentCount = existingAttempt?.warningCount ?? 0;

  // Step 2: Always create the ExamViolation record for admin audit visibility —
  // even for non-penalty bypasses and even after the cap, so the flags list is complete.
  const item = await prisma.examViolation.create({
    data: {
      studentId,
      examId,
      type,
      message: body.message ? String(body.message) : null,
    },
  });

  // Step 3: Increment warningCount only when:
  //   a) This is a real penalty (not an audit-only bypass log), AND
  //   b) The cap has not already been reached (prevents 4th+ penalty from slipping in).
  // The WHERE clause adds a DB-level safety net for concurrent requests.
  let warningCount = currentCount;
  if (isPenalty && currentCount < MAX_WARNINGS) {
    await prisma.attempt.updateMany({
      where: {
        studentId,
        examId,
        status: "IN_PROGRESS",
        warningCount: { lt: MAX_WARNINGS }, // DB-level guard against race conditions
      },
      data: { warningCount: { increment: 1 } },
    });
    // Re-read the count from the DB to get the authoritative post-increment value.
    // This corrects any drift if a concurrent request also incremented simultaneously.
    const updated = await prisma.attempt.findUnique({
      where: { studentId_examId: { studentId, examId } },
      select: { warningCount: true },
    });
    warningCount = updated?.warningCount ?? currentCount + 1;
  }

  const terminate = isPenalty && warningCount >= MAX_WARNINGS;

  // Step 4: If threshold reached, auto-submit server-side (fire-and-forget).
  // autoSubmitOnViolation is idempotent — safe to call even if the frontend
  // is simultaneously submitting.
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

  const attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { status: true, expiresAt: true },
  });

  return { 
    ...payload, 
    attemptStatus: attempt?.status, 
    expiresAt: attempt?.expiresAt 
  };
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
