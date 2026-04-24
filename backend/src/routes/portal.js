const express = require("express");
const { prisma } = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { requireStudent, requireStaff } = require("../middleware/roles");
const { logger } = require("../utils/logger");

const router = express.Router();

function normalizeAnswer(value) {
  return String(value ?? "").trim();
}

function stripAnswersFromExam(exam) {
  return {
    id: exam.id,
    title: exam.title,
    duration: exam.duration,
    questions: exam.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
  };
}

/**
 * POST /api/exams/create
 * Body: { title, duration (minutes), questions: [{ question, options[], answer }] }
 */
router.post(
  "/exams/create",
  authenticate,
  requireStaff,
  async (req, res) => {
    const { title, duration, questions } = req.body ?? {};

    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    const durationMin = Number(duration);
    if (!Number.isFinite(durationMin) || durationMin < 1) {
      return res.status(400).json({ error: "duration must be a positive number (minutes)" });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "questions must be a non-empty array" });
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q?.question || typeof q.question !== "string") {
        return res.status(400).json({ error: `questions[${i}].question is required` });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({
          error: `questions[${i}].options must have at least 2 strings`,
        });
      }
      if (q.answer == null || String(q.answer).trim() === "") {
        return res.status(400).json({ error: `questions[${i}].answer is required` });
      }
    }

    const exam = await prisma.exam.create({
      data: {
        title: title.trim(),
        duration: Math.floor(durationMin),
        createdBy: req.user.id,
        questions: {
          create: questions.map((q) => ({
            question: q.question.trim(),
            options: q.options.map((o) => String(o)),
            answer: normalizeAnswer(q.answer),
          })),
        },
      },
      include: {
        questions: { orderBy: { id: "asc" } },
      },
    });

    logger.audit('EXAM_CREATED', { examId: exam.id, title: exam.title, questionCount: questions.length }, req.user.id);

    return res.status(201).json({
      exam: {
        id: exam.id,
        title: exam.title,
        duration: exam.duration,
        createdBy: exam.createdBy,
        questions: exam.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          answer: q.answer,
        })),
      },
    });
  }
);

router.get("/exams", authenticate, async (req, res) => {
  const isStudent = req.user.role === "STUDENT";

  const where = isStudent ? {
    status: "LIVE",
    assignments: {
      some: { userId: req.user.id }
    }
  } : {};

  const [exams, completedResults] = await Promise.all([
    prisma.exam.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        _count: { select: { questions: true } },
      },
    }),
    isStudent
      ? prisma.result.findMany({
          where: { studentId: req.user.id },
          select: { examId: true, score: true },
        })
      : Promise.resolve([]),
  ]);

  const completedMap = new Map(completedResults.map(r => [r.examId, r.score]));

  return res.json({
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      duration: e.duration,
      status: e.status,
      questionCount: e._count.questions,
      completed: completedMap.has(e.id),
      score: completedMap.get(e.id) ?? null,
    })),
  });
});


/**
 * PATCH /api/exams/:id/status
 * Staff only: Toggle exam status (DRAFT | LIVE | ARCHIVED)
 */
router.patch("/exams/:id/status", authenticate, requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!["DRAFT", "LIVE", "ARCHIVED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const exam = await prisma.exam.update({
      where: { id },
      data: { status }
    });
    logger.audit('EXAM_STATUS_CHANGE', { examId: id, newStatus: status }, req.user.id);
    res.json(exam);
  } catch (_error) {
    res.status(500).json({ error: "Failed to update exam status" });
  }
});

router.delete("/exams/:id", authenticate, requireStaff, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid exam ID" });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.result.deleteMany({ where: { examId: id } });
      await tx.attempt.deleteMany({ where: { examId: id } });
      await tx.examAssignment.deleteMany({ where: { examId: id } });
      await tx.question.deleteMany({ where: { examId: id } });
      
      await tx.exam.delete({ where: { id } });
    });

    logger.audit('EXAM_DELETED', { examId: id }, req.user.id);
    res.json({ success: true, message: "Exam and all related data purged" });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Exam not found" });
    logger.error("EXAM_DELETE_ERROR", { error: error.message, id });
    res.status(500).json({ error: "Failed to delete exam record" });
  }
});

/**
 * GET /api/exams/:id
 * Single exam with questions (no correct answers). Students only.
 */
router.get("/exams/:id", authenticate, requireStudent, async (req, res) => {
  const examId = Number(req.params.id);
  if (!Number.isFinite(examId)) {
    return res.status(400).json({ error: "Invalid exam id" });
  }

  const assignment = await prisma.examAssignment.findUnique({
    where: {
      userId_examId: {
        userId: req.user.id,
        examId: examId
      }
    }
  });

  if (!assignment) {
    return res.status(403).json({ error: "You are not assigned to this exam" });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { id: "asc" } } },
  });

  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }
  if (exam.questions.length === 0) {
    return res.status(400).json({ error: "Exam has no questions" });
  }

  return res.json(stripAnswersFromExam(exam));
});

router.post("/attempt/start", authenticate, requireStudent, async (req, res) => {
  const examIdRaw = req.body?.examId;
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    return res.status(400).json({ error: "examId is required" });
  }

  const studentId = req.user.id;
  
  // Check assignment
  const assignment = await prisma.examAssignment.findUnique({
    where: {
      userId_examId: { userId: studentId, examId }
    }
  });

  if (!assignment) {
    return res.status(403).json({ error: "You are not assigned to this exam" });
  }

  const existing = await prisma.attempt.findUnique({
    where: {
      studentId_examId: { studentId, examId },
    },
  });

  if (existing?.status === "SUBMITTED") {
    return res.status(409).json({ error: "This exam has already been submitted" });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { id: "asc" } } },
  });

  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }
  if (exam.questions.length === 0) {
    return res.status(400).json({ error: "Exam has no questions" });
  }

  if (existing?.status === "IN_PROGRESS") {
    const elapsedSeconds = Math.floor((Date.now() - new Date(existing.startedAt).getTime()) / 1000);
    const remainingSeconds = Math.max(0, exam.duration * 60 - elapsedSeconds);
    return res.json({
      attemptId: existing.id,
      exam: stripAnswersFromExam(exam),
      answers: Array.isArray(existing.answers) ? existing.answers : [],
      remainingSeconds,
    });
  }

  const attempt = await prisma.attempt.create({
    data: {
      studentId,
      examId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  logger.info('EXAM_START', { examId, studentId }, studentId);

  return res.status(201).json({
    attemptId: attempt.id,
    exam: stripAnswersFromExam(exam),
    answers: [],
    remainingSeconds: exam.duration * 60,
  });
});

/**
 * POST /api/attempt/submit
 * POST /api/exams/submit
 * Body: { examId, answers: [{ questionId, selectedAnswer }] }
 * Computes score (0–100), saves Result, marks Attempt SUBMITTED.
 */
async function submitExamHandler(req, res) {
  const examIdRaw = req.body?.examId;
  const answers = req.body?.answers;
  const examId = Number(examIdRaw);

  if (!Number.isFinite(examId)) {
    return res.status(400).json({ error: "examId is required" });
  }
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: "answers must be an array" });
  }

  const studentId = req.user.id;

  const attempt = await prisma.attempt.findUnique({
    where: {
      studentId_examId: { studentId, examId },
    },
  });

  if (!attempt) {
    return res.status(400).json({ error: "Start the exam before submitting" });
  }
  if (attempt.status === "SUBMITTED") {
    return res.status(409).json({ error: "Already submitted" });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true },
  });

  if (!exam) {
    return res.status(404).json({ error: "Exam not found" });
  }

  const answerMap = new Map();
  for (const a of answers) {
    if (a == null || a.questionId == null) continue;
    answerMap.set(Number(a.questionId), normalizeAnswer(a.selectedAnswer));
  }

  let correct = 0;
  const total = exam.questions.length;

  for (const q of exam.questions) {
    const selected = answerMap.get(q.id);
    if (selected !== undefined && selected === normalizeAnswer(q.answer)) {
      correct++;
    }
  }

  const score = total === 0 ? 0 : Math.round((correct / total) * 100);

  await prisma.$transaction([
    prisma.attempt.update({
      where: { id: attempt.id },
      data: { status: "SUBMITTED" },
    }),
    prisma.result.upsert({
      where: {
        studentId_examId: { studentId, examId },
      },
      create: { studentId, examId, score },
      update: { score },
    }),
  ]);

  logger.audit('EXAM_SUBMIT', { examId, score, correct, total }, studentId);

  return res.json({
    score,
    correct,
    total,
  });
}

router.post("/attempt/submit", authenticate, requireStudent, submitExamHandler);
router.post("/exams/submit", authenticate, requireStudent, submitExamHandler);

/**
 * POST /api/attempt/:id/answer
 * Body: { questionId, selectedAnswer }
 * Autosaves a single answer.
 */
router.post("/attempt/:id/answer", authenticate, requireStudent, async (req, res) => {
  const attemptId = Number(req.params.id);
  const { questionId, selectedAnswer } = req.body ?? {};

  if (!Number.isFinite(attemptId)) {
    return res.status(400).json({ error: "Invalid attempt id" });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt) {
    return res.status(404).json({ error: "Attempt not found" });
  }
  if (attempt.studentId !== req.user.id) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return res.status(400).json({ error: "Attempt is not in progress" });
  }

  // Update or create answer in a JSON field or separate table?
  // Current schema has 'answers' as Json in Attempt.
  const currentAnswers = Array.isArray(attempt.answers) ? attempt.answers : [];
  
  // Update existing or add new
  const existingIdx = currentAnswers.findIndex(a => a.questionId === Number(questionId));
  const newAnswer = { questionId: Number(questionId), selectedAnswer: normalizeAnswer(selectedAnswer), timestamp: new Date() };

  if (existingIdx > -1) {
    currentAnswers[existingIdx] = newAnswer;
  } else {
    currentAnswers.push(newAnswer);
  }

  await prisma.attempt.update({
    where: { id: attemptId },
    data: { answers: currentAnswers }
  });

  return res.json({ success: true });
});

/**
 * POST /api/attempt/:id/violation
 * Record a proctoring violation server-side (tab switch, fullscreen exit, screen share stop).
 * Returns updated warningCount and a terminate flag when threshold is reached.
 */
router.post("/attempt/:id/violation", authenticate, requireStudent, async (req, res) => {
  const attemptId = Number(req.params.id);
  const { type } = req.body ?? {};
  const MAX_WARNINGS = 3;

  if (!Number.isFinite(attemptId)) {
    return res.status(400).json({ error: "Invalid attempt id" });
  }

  try {
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });

    if (!attempt) return res.status(404).json({ error: "Attempt not found" });
    if (attempt.studentId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    if (attempt.status !== "IN_PROGRESS") return res.status(400).json({ error: "Attempt not in progress" });

    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: { warningCount: { increment: 1 } },
      select: { warningCount: true },
    });

    const terminate = updated.warningCount >= MAX_WARNINGS;

    logger.warn('PROCTOR_VIOLATION', {
      attemptId,
      warningCount: updated.warningCount,
      violationType: type || 'UNKNOWN',
      terminate,
    }, req.user.id);

    return res.json({ warningCount: updated.warningCount, terminate });
  } catch (error) {
    logger.error("VIOLATION_RECORD_FAILED", { error: error.message, attemptId });
    return res.status(500).json({ error: "Failed to record violation" });
  }
});

/**
 * GET /api/results
 * List results for the logged-in student, or all for staff.
 */
router.get("/results", authenticate, async (req, res) => {
  const isStudent = req.user.role === "STUDENT";
  
  const where = isStudent ? { studentId: req.user.id } : {};

  const results = await prisma.result.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      exam: {
        select: { id: true, title: true }
      }
    }
  });

  return res.json({ results });
});

/**
 * GET /api/materials
 * List study materials.
 */
router.get("/materials", authenticate, async (req, res) => {
  const materials = await prisma.material.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      exam: { select: { title: true } }
    }
  });

  return res.json({ materials });
});

module.exports = router;
