const { prisma } = require("../lib/prisma");
const { HttpError } = require("../utils/http-error");
const {
  normalizeAnswer,
  stripAnswersFromExam,
  scoreSubmission,
} = require("./exam-scoring.service");
const { extractPdfText, buildQuestionsFromPdfText } = require("./exam-pdf.service");
const { extractQuestionsFromExcelBuffer } = require("./exam-excel.service");

async function createExam(creatorUserId, body) {
  const { title, duration, questions } = body ?? {};

  if (!title || typeof title !== "string") {
    throw new HttpError(400, "title is required");
  }
  const durationMin = Number(duration);
  if (!Number.isFinite(durationMin) || durationMin < 1) {
    throw new HttpError(400, "duration must be a positive number (minutes)");
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new HttpError(400, "questions must be a non-empty array");
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q?.question || typeof q.question !== "string") {
      throw new HttpError(400, `questions[${i}].question is required`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new HttpError(400, `questions[${i}].options must have at least 2 strings`);
    }
    if (q.answer == null || String(q.answer).trim() === "") {
      throw new HttpError(400, `questions[${i}].answer is required`);
    }
  }

  const exam = await prisma.exam.create({
    data: {
      title: title.trim(),
      duration: Math.floor(durationMin),
      createdBy: creatorUserId,
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

  return {
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
  };
}

/**
 * Create exam from an instructor PDF: extract text, parse MCQs (OpenAI optional), then persist.
 */
async function createExamFromPdf(creatorUserId, { title, duration, pdfBuffer }) {
  const text = await extractPdfText(pdfBuffer);
  const questions = await buildQuestionsFromPdfText(text);
  return createExam(creatorUserId, { title, duration, questions });
}

/**
 * Create exam from instructor Excel template.
 */
async function createExamFromExcel(creatorUserId, { title, duration, excelBuffer }) {
  const questions = await extractQuestionsFromExcelBuffer(excelBuffer);
  return createExam(creatorUserId, { title, duration, questions });
}

async function listExamsCatalog() {
  const exams = await prisma.exam.findMany({
    orderBy: { id: "desc" },
    include: {
      _count: { select: { questions: true } },
      creator: { select: { id: true, name: true, role: true } },
    },
  });

  return exams.map((e) => ({
    id: e.id,
    title: e.title,
    duration: e.duration,
    questionCount: e._count.questions,
    createdBy: e.createdBy,
    creator: e.creator
      ? {
          id: e.creator.id,
          name: e.creator.name,
          role: e.creator.role,
        }
      : null,
  }));
}

async function getExamForStudent(examId) {
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { id: "asc" } } },
  });

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.questions.length === 0) {
    throw new HttpError(400, "Exam has no questions");
  }

  return stripAnswersFromExam(exam);
}

async function startAttempt(studentId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
  }

  const existing = await prisma.attempt.findUnique({
    where: {
      studentId_examId: { studentId, examId },
    },
  });

  if (existing?.status === "SUBMITTED") {
    throw new HttpError(409, "This exam has already been submitted");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { id: "asc" } } },
  });

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.questions.length === 0) {
    throw new HttpError(400, "Exam has no questions");
  }

  if (existing?.status === "IN_PROGRESS") {
    const answers = existing.answersJson && typeof existing.answersJson === "object"
      ? existing.answersJson
      : {};
    return {
      status: 200,
      body: {
        attemptId: existing.id,
        exam: stripAnswersFromExam(exam),
        answers,
        currentQuestionIndex: existing.currentQuestionIndex ?? 0,
      },
    };
  }

  const attempt = await prisma.attempt.create({
    data: {
      studentId,
      examId,
      status: "IN_PROGRESS",
      answersJson: {},
      currentQuestionIndex: 0,
    },
  });

  return {
    status: 201,
    body: {
      attemptId: attempt.id,
      exam: stripAnswersFromExam(exam),
      answers: {},
      currentQuestionIndex: 0,
    },
  };
}

async function saveAttemptAnswer(studentId, body) {
  const examId = Number(body?.examId);
  const questionId = Number(body?.questionId);
  const selectedAnswer = body?.selectedAnswer;
  const nextQuestionIndex = Number(body?.nextQuestionIndex);

  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
  }
  if (!Number.isFinite(questionId)) {
    throw new HttpError(400, "questionId is required");
  }
  if (selectedAnswer == null || String(selectedAnswer).trim() === "") {
    throw new HttpError(400, "selectedAnswer is required");
  }
  if (!Number.isFinite(nextQuestionIndex) || nextQuestionIndex < 0) {
    throw new HttpError(400, "nextQuestionIndex must be a non-negative number");
  }

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { studentId_examId: { studentId, examId } },
    });
    if (!attempt) {
      throw new HttpError(400, "Start the exam before saving answers");
    }
    if (attempt.status !== "IN_PROGRESS") {
      throw new HttpError(409, "This attempt is already submitted");
    }

    const exam = await tx.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { id: "asc" } } },
    });
    if (!exam) {
      throw new HttpError(404, "Exam not found");
    }

    const q = exam.questions.find((x) => x.id === questionId);
    if (!q) {
      throw new HttpError(400, "questionId does not belong to this exam");
    }

    const answers = attempt.answersJson && typeof attempt.answersJson === "object"
      ? { ...attempt.answersJson }
      : {};

    answers[String(questionId)] = normalizeAnswer(selectedAnswer);

    const boundedNext = Math.min(
      Math.max(0, Math.floor(nextQuestionIndex)),
      Math.max(0, exam.questions.length - 1)
    );

    const updated = await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        answersJson: answers,
        currentQuestionIndex: boundedNext,
      },
    });

    return {
      answers: updated.answersJson ?? {},
      currentQuestionIndex: updated.currentQuestionIndex ?? 0,
      answeredCount: Object.keys(updated.answersJson ?? {}).length,
      totalQuestions: exam.questions.length,
    };
  });

  return result;
}

async function submitExam(studentId, body) {
  const examId = Number(body?.examId);
  const answers = body?.answers;

  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
  }
  const attempt = await prisma.attempt.findUnique({
    where: {
      studentId_examId: { studentId, examId },
    },
  });

  if (!attempt) {
    throw new HttpError(400, "Start the exam before submitting");
  }
  if (attempt.status === "SUBMITTED") {
    throw new HttpError(409, "Already submitted");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true },
  });

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }

  let answersInput = [];
  if (Array.isArray(answers)) {
    answersInput = answers;
  } else if (attempt.answersJson && typeof attempt.answersJson === "object") {
    answersInput = Object.entries(attempt.answersJson).map(([qid, selectedAnswer]) => ({
      questionId: Number(qid),
      selectedAnswer: String(selectedAnswer ?? ""),
    }));
  } else {
    throw new HttpError(400, "answers must be an array");
  }

  const { score, correct, total } = scoreSubmission(exam.questions, answersInput);

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

  return { score, correct, total };
}

module.exports = {
  createExam,
  createExamFromPdf,
  createExamFromExcel,
  listExamsCatalog,
  getExamForStudent,
  startAttempt,
  saveAttemptAnswer,
  submitExam,
};
