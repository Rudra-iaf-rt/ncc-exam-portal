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

async function createExamFromPdf(creatorUserId, { title, duration, pdfBuffer }) {
  const text = await extractPdfText(pdfBuffer);
  const questions = await buildQuestionsFromPdfText(text);
  return createExam(creatorUserId, { title, duration, questions });
}

async function createExamFromExcel(creatorUserId, { title, duration, excelBuffer }) {
  const questions = await extractQuestionsFromExcelBuffer(excelBuffer);
  return createExam(creatorUserId, { title, duration, questions });
}

async function listExamsCatalog(userId, role) {
  const isStudent = role === "STUDENT";

  const where = isStudent
    ? {
        status: "LIVE",
        assignments: {
          some: { userId: userId },
        },
      }
    : {};

  const [exams, completedResults] = await Promise.all([
    prisma.exam.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        _count: { select: { questions: true } },
        creator: { 
          select: { 
            id: true, 
            name: true, 
            role: true,
            collegeCode: true,
            college: { select: { name: true } }
          } 
        },
      },
    }),
    isStudent
      ? prisma.result.findMany({
          where: { studentId: userId },
          select: { examId: true, score: true },
        })
      : Promise.resolve([]),
  ]);

  const completedMap = new Map(completedResults.map((r) => [r.examId, r.score]));

  return exams.map((e) => ({
    id: e.id,
    title: e.title,
    duration: e.duration,
    published: e.status === "LIVE",
    publishedAt: e.publishedAt,
    questionCount: e._count.questions,
    createdBy: e.createdBy,
    completed: completedMap.has(e.id),
    score: completedMap.get(e.id) ?? null,
    creator: e.creator
      ? {
          id: e.creator.id,
          name: e.creator.name,
          role: e.creator.role,
          college: e.creator.college?.name || e.creator.collegeCode || 'N/A'
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
  if (exam.status !== "LIVE") {
    throw new HttpError(403, "Exam is not published yet");
  }
  if (exam.questions.length === 0) {
    throw new HttpError(400, "Exam has no questions");
  }

  return stripAnswersFromExam(exam);
}

async function getExamForStaff(examId) {
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
  return exam;
}

async function updateExamMetaByCreator(userId, examIdRaw, body) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.createdBy !== userId) {
    throw new HttpError(403, "Only exam creator can update this exam");
  }
  const payload = {};
  if (body?.title != null) {
    const title = String(body.title).trim();
    if (!title) throw new HttpError(400, "title cannot be empty");
    payload.title = title;
  }
  if (body?.duration != null) {
    const duration = Number(body.duration);
    if (!Number.isFinite(duration) || duration < 1) {
      throw new HttpError(400, "duration must be a positive number");
    }
    payload.duration = Math.floor(duration);
  }
  if (body?.status != null) {
    const status = String(body.status).toUpperCase();
    if (!["DRAFT", "LIVE", "ARCHIVED"].includes(status)) {
      throw new HttpError(400, "Invalid status. Must be DRAFT, LIVE, or ARCHIVED");
    }
    payload.status = status;
    if (status === "LIVE") {
      payload.publishedAt = new Date();
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new HttpError(400, "Nothing to update");
  }
  try {
    const updated = await prisma.exam.update({
      where: { id: examId },
      data: payload,
      include: { questions: { orderBy: { id: "asc" } } },
    });
    return updated;
  } catch (err) {
    console.error("Prisma update error in updateExamMetaByCreator:", err);
    throw err;
  }
}

async function replaceExamQuestionsByCreator(userId, examIdRaw, body) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.createdBy !== userId) {
    throw new HttpError(403, "Only exam creator can update questions");
  }
  const questions = body?.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new HttpError(400, "questions must be a non-empty array");
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q?.question || !Array.isArray(q.options) || q.options.length < 2 || q.answer == null) {
      throw new HttpError(400, `Invalid question at index ${i}`);
    }
  }
  await prisma.$transaction([
    prisma.question.deleteMany({ where: { examId } }),
    prisma.question.createMany({
      data: questions.map((q) => ({
        examId,
        question: String(q.question).trim(),
        options: q.options.map((o) => String(o)),
        answer: normalizeAnswer(q.answer),
      })),
    }),
  ]);
  return prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { id: "asc" } } },
  });
}

async function publishExamByCreator(userId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { _count: { select: { questions: true } } },
  });
  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.createdBy !== userId) {
    throw new HttpError(403, "Only exam creator can publish this exam");
  }
  if (exam._count.questions === 0) {
    throw new HttpError(400, "Cannot publish exam with no questions");
  }
  return prisma.exam.update({
    where: { id: examId },
    data: {
      status: "LIVE",
      publishedAt: new Date(),
    },
  });
}

async function deleteExamByCreator(userId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.createdBy !== userId) {
    throw new HttpError(403, "Only exam creator can delete this exam");
  }
  await prisma.exam.delete({ where: { id: examId } });
  return { id: examId };
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
    const answers = existing.answers && typeof existing.answers === "object"
      ? existing.answers
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

  try {
    const attempt = await prisma.attempt.create({
      data: {
        studentId,
        examId,
        status: "IN_PROGRESS",
        answers: {},
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
  } catch (err) {
    if (err.code === "P2002") {
      const newlyCreated = await prisma.attempt.findUnique({
        where: { studentId_examId: { studentId, examId } },
      });
      if (newlyCreated) {
        return {
          status: 200,
          body: {
            attemptId: newlyCreated.id,
            exam: stripAnswersFromExam(exam),
            answers: newlyCreated.answers || {},
            currentQuestionIndex: newlyCreated.currentQuestionIndex ?? 0,
          },
        };
      }
    }
    console.error("startAttempt error:", err);
    throw err;
  }
}

async function saveAttemptAnswer(studentId, body) {
  const examId = Number(body?.examId);
  const questionId = Number(body?.questionId);
  const selectedAnswer = body?.selectedAnswer;
  const nextQuestionIndex = Number(body?.nextQuestionIndex);

  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
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

    const answers = attempt.answers && typeof attempt.answers === "object"
      ? { ...attempt.answers }
      : {};

    if (Number.isFinite(questionId)) {
      const q = exam.questions.find((x) => x.id === questionId);
      if (!q) {
        throw new HttpError(400, "questionId does not belong to this exam");
      }
      if (selectedAnswer != null && String(selectedAnswer).trim() !== "") {
        answers[String(questionId)] = normalizeAnswer(selectedAnswer);
      }
    }

    const boundedNext = Math.min(
      Math.max(0, Math.floor(nextQuestionIndex)),
      Math.max(0, exam.questions.length - 1)
    );

    const updated = await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        answers: answers,
        currentQuestionIndex: boundedNext,
      },
    });

    return {
      answers: updated.answers ?? {},
      currentQuestionIndex: updated.currentQuestionIndex ?? 0,
      answeredCount: Object.keys(updated.answers ?? {}).length,
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
  } else if (attempt.answers && typeof attempt.answers === "object") {
    answersInput = Object.entries(attempt.answers).map(([qid, selectedAnswer]) => ({
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

async function getAttemptStatus(studentId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }
  const attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
    include: {
      exam: { include: { _count: { select: { questions: true } } } },
    },
  });
  if (!attempt) {
    throw new HttpError(404, "Attempt not found");
  }
  const answers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
  return {
    attemptId: attempt.id,
    examId: attempt.examId,
    status: attempt.status,
    currentQuestionIndex: attempt.currentQuestionIndex ?? 0,
    answeredCount: Object.keys(answers).length,
    totalQuestions: attempt.exam?._count?.questions ?? 0,
    updatedAt: attempt.updatedAt,
  };
}

async function getAttemptDetails(studentId, attemptIdRaw) {
  const attemptId = Number(attemptIdRaw);
  if (!Number.isFinite(attemptId)) {
    throw new HttpError(400, "Invalid attempt id");
  }
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: { orderBy: { id: "asc" } },
        },
      },
    },
  });
  if (!attempt || attempt.studentId !== studentId) {
    throw new HttpError(404, "Attempt not found");
  }
  const answers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
  return {
    id: attempt.id,
    examId: attempt.examId,
    status: attempt.status,
    currentQuestionIndex: attempt.currentQuestionIndex ?? 0,
    answers,
    exam: stripAnswersFromExam(attempt.exam),
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

module.exports = {
  createExam,
  createExamFromPdf,
  createExamFromExcel,
  listExamsCatalog,
  getExamForStudent,
  getExamForStaff,
  updateExamMetaByCreator,
  replaceExamQuestionsByCreator,
  publishExamByCreator,
  deleteExamByCreator,
  startAttempt,
  saveAttemptAnswer,
  submitExam,
  getAttemptStatus,
  getAttemptDetails,
};
