const express = require("express");
const { prisma } = require("../lib/prisma");
const { authenticate } = require("../middleware/auth");
const { requireStudent, requireStaff } = require("../middleware/roles");

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

/**
 * GET /api/exams
 * List exams with question counts (no correct answers).
 */
router.get("/exams", authenticate, async (req, res) => {
  const exams = await prisma.exam.findMany({
    orderBy: { id: "desc" },
    include: {
      _count: { select: { questions: true } },
    },
  });

  return res.json({
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      duration: e.duration,
      questionCount: e._count.questions,
    })),
  });
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

/**
 * POST /api/attempt/start
 * Body: { examId } — creates IN_PROGRESS attempt or returns existing in-progress exam (no answers).
 */
router.post("/attempt/start", authenticate, requireStudent, async (req, res) => {
  const examIdRaw = req.body?.examId;
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    return res.status(400).json({ error: "examId is required" });
  }

  const studentId = req.user.id;

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
    return res.json({
      attemptId: existing.id,
      exam: stripAnswersFromExam(exam),
    });
  }

  const attempt = await prisma.attempt.create({
    data: {
      studentId,
      examId,
      status: "IN_PROGRESS",
    },
  });

  return res.status(201).json({
    attemptId: attempt.id,
    exam: stripAnswersFromExam(exam),
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

  return res.json({
    score,
    correct,
    total,
  });
}

router.post("/attempt/submit", authenticate, requireStudent, submitExamHandler);
router.post("/exams/submit", authenticate, requireStudent, submitExamHandler);

module.exports = router;
