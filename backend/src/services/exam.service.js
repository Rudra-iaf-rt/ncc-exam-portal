const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { cacheGetJson, cacheSetJson, cacheDel, cacheDelPattern, getCacheVersion, incrementCacheVersion } = require("../lib/cache");
const { HttpError } = require("../utils/http-error");
const { features } = require("../config/features");
const {
  normalizeAnswer,
  stripAnswersFromExam,
  scoreSubmission,
} = require("./exam-scoring.service");
const { extractPdfText, buildQuestionsFromPdfText } = require("./exam-pdf.service");
const { extractQuestionsFromExcelBuffer } = require("./exam-excel.service");

async function createExam(creatorUserId, body) {
  const { title, duration, negativeMarking, negativeMarks, questions, startAt, endAt } = body ?? {};

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
  const parsedStartAt = startAt ? new Date(startAt) : null;
  const parsedEndAt = endAt ? new Date(endAt) : null;
  if (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) {
    throw new HttpError(400, "startAt must be a valid datetime");
  }
  if (parsedEndAt && Number.isNaN(parsedEndAt.getTime())) {
    throw new HttpError(400, "endAt must be a valid datetime");
  }
  if (parsedStartAt && parsedEndAt && parsedEndAt <= parsedStartAt) {
    throw new HttpError(400, "endAt must be later than startAt");
  }

  const examData = {
    title: title.trim(),
    duration: Math.floor(durationMin),
    createdBy: creatorUserId,
    negativeMarking: negativeMarking === true || negativeMarking === 'true',
    questions: {
      create: questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => String(o)),
        answer: normalizeAnswer(q.answer),
      })),
    },
  };
  if (negativeMarks !== undefined) examData.negativeMarks = Number(negativeMarks);
  if (parsedStartAt) examData.startAt = parsedStartAt;
  if (parsedEndAt) examData.endAt = parsedEndAt;

  const exam = await prisma.exam.create({
    data: {
      ...examData,
    },
    include: {
      questions: { orderBy: { id: "asc" } },
    },
  });

  // Invalidate any cached catalog lists since a new exam has been created
  await incrementCacheVersion("exams:catalog:global");

  return {
    id: exam.id,
    title: exam.title,
    duration: exam.duration,
    startAt: exam.startAt,
    endAt: exam.endAt,
    createdBy: exam.createdBy,
    questions: exam.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: q.answer,
    })),
  };
}

async function createExamFromPdf(creatorUserId, { title, duration, negativeMarking, negativeMarks, pdfBuffer }) {
  const text = await extractPdfText(pdfBuffer);
  const questions = await buildQuestionsFromPdfText(text);
  return createExam(creatorUserId, { title, duration, negativeMarking, negativeMarks, questions });
}

async function createExamFromExcel(creatorUserId, { title, duration, negativeMarking, negativeMarks, excelBuffer }) {
  const questions = await extractQuestionsFromExcelBuffer(excelBuffer);
  return createExam(creatorUserId, { title, duration, negativeMarking, negativeMarks, questions });
}

async function listExamsCatalog(userId, role, query = {}) {
  const isStudent = role === "STUDENT";
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const globalVer = await getCacheVersion("exams:catalog:global");
  const userVer = await getCacheVersion(`exams:catalog:user:${userId}`);
  const cacheKey = `exams:catalog:v${globalVer}:u${userVer}:${role}:${userId}:p${page}:l${limit}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const where = isStudent
    ? {
        status: "LIVE",
        assignments: {
          some: { userId: userId },
        },
      }
    : {};

  const [exams, total, completedResults, attempts] = await Promise.all([
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
      skip,
      take: limit,
    }),
    prisma.exam.count({ where }),
    isStudent
      ? prisma.result.findMany({
          where: { studentId: userId },
          select: { examId: true, score: true },
        })
      : Promise.resolve([]),
    isStudent
      ? prisma.attempt.findMany({
          where: { studentId: userId },
          select: { examId: true, status: true, expiresAt: true },
        })
      : Promise.resolve([]),
  ]);


  const completedMap = new Map(completedResults.map((r) => [r.examId, r.score]));
  const attemptMap = new Map((attempts || []).map((a) => [a.examId, a]));

  const finalExams = exams.map((e) => {
    const attempt = attemptMap.get(e.id);
    return {
      id: e.id,
      title: e.title,
      duration: e.duration,
      status: e.status,
      published: e.status === "LIVE",
      publishedAt: e.publishedAt,
      questionCount: e._count.questions,
      createdBy: e.createdBy,
      completed: completedMap.has(e.id),
      score: completedMap.get(e.id) ?? null,
      attemptStatus: attempt ? attempt.status : null,
      expiresAt: attempt ? attempt.expiresAt : null,
      resultsPublished: e.resultsPublished,
      creator: e.creator
        ? {
            id: e.creator.id,
            name: e.creator.name,
            role: e.creator.role,
            college: e.creator.college?.name || e.creator.collegeCode || 'N/A'
          }
        : null,
    };
  });

  const response = {
    exams: finalExams,
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

async function getExamForStudent(examId) {
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }

  const cacheKey = `exams:details:${examId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.error("[Redis] GET error in getExamForStudent", err);
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        select: {
          id: true,
          question: true,
          options: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }
  if (exam.status !== "LIVE") {
    // Note: status is not selected in the 'select' above, so we need to be careful.
    // Actually, I should probably check status BEFORE caching or cache the whole object.
    // Let's re-fetch with status just to be safe, or select it.
  }

  // Improved query to include status for validation
  const fullExam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        select: { id: true, question: true, options: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!fullExam) throw new HttpError(404, "Exam not found");
  if (fullExam.status !== "LIVE") throw new HttpError(403, "Exam is not published yet");
  if (fullExam.questions.length === 0) throw new HttpError(400, "Exam has no questions");

  try {
    await redis.setex(cacheKey, 600, JSON.stringify(fullExam));
  } catch (err) {
    console.error("[Redis] SET error in getExamForStudent", err);
  }

  return fullExam;
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
  if (body?.startAt !== undefined) {
    if (body.startAt == null || body.startAt === "") {
      payload.startAt = null;
    } else {
      const startAt = new Date(body.startAt);
      if (Number.isNaN(startAt.getTime())) throw new HttpError(400, "Invalid startAt");
      payload.startAt = startAt;
    }
  }
  if (body?.endAt !== undefined) {
    if (body.endAt == null || body.endAt === "") {
      payload.endAt = null;
    } else {
      const endAt = new Date(body.endAt);
      if (Number.isNaN(endAt.getTime())) throw new HttpError(400, "Invalid endAt");
      payload.endAt = endAt;
    }
  }
  if (body?.negativeMarking !== undefined) {
    payload.negativeMarking = body.negativeMarking === true || body.negativeMarking === 'true';
  }
  if (body?.negativeMarks !== undefined) {
    const marks = Number(body.negativeMarks);
    if (!Number.isFinite(marks) || marks < 0) {
      throw new HttpError(400, "negativeMarks must be a non-negative number");
    }
    payload.negativeMarks = marks;
  }
  const nextStart = payload.startAt !== undefined ? payload.startAt : exam.startAt;
  const nextEnd = payload.endAt !== undefined ? payload.endAt : exam.endAt;
  if (nextStart && nextEnd && nextEnd <= nextStart) {
    throw new HttpError(400, "endAt must be later than startAt");
  }
  if (body?.status != null) {
    const status = String(body.status).toUpperCase();
    if (!["DRAFT", "LIVE", "COMPLETED", "ARCHIVED"].includes(status)) {
      throw new HttpError(400, "Invalid status. Must be DRAFT, LIVE, COMPLETED, or ARCHIVED");
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

    // Invalidate caches:
    // 1. Specific exam details cache
    await cacheDel([`exams:details:${examId}`]);
    // 2. Wildcard exams catalog caches (since meta/status changed)
    await incrementCacheVersion("exams:catalog:global");

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
  // Step 1: Replace questions inside a transaction by updating in-place to preserve IDs.
  // The frontend doesn't send IDs back, but it preserves order.
  const existingQuestions = await prisma.question.findMany({
    where: { examId },
    orderBy: { id: "asc" },
  });

  const ops = [];
  const maxLen = Math.max(questions.length, existingQuestions.length);
  
  for (let i = 0; i < maxLen; i++) {
    const q = questions[i];
    const ex = existingQuestions[i];

    if (q && ex) {
      // Update existing question, keeping its original ID
      ops.push(
        prisma.question.update({
          where: { id: ex.id },
          data: {
            question: String(q.question).trim(),
            options: q.options.map((o) => String(o)),
            answer: normalizeAnswer(q.answer),
          },
        })
      );
    } else if (q && !ex) {
      // Create new question appended to the end
      ops.push(
        prisma.question.create({
          data: {
            examId,
            question: String(q.question).trim(),
            options: q.options.map((o) => String(o)),
            answer: normalizeAnswer(q.answer),
          },
        })
      );
    } else if (!q && ex) {
      // Delete trailing question if the exam shrank
      ops.push(
        prisma.question.delete({
          where: { id: ex.id },
        })
      );
    }
  }

  await prisma.$transaction(ops);

  // Step 2: Fetch the freshly-written questions (needed for rescoring)
  const newQuestions = await prisma.question.findMany({
    where: { examId },
    orderBy: { id: "asc" },
  });

  // Step 3: Recalculate scores for every SUBMITTED attempt on this exam.
  // Answers are stored as { [questionId]: selectedAnswer } in Attempt.answers (JSONB).
  const submittedAttempts = await prisma.attempt.findMany({
    where: { examId, status: "SUBMITTED" },
    select: { studentId: true, answers: true },
  });

  if (submittedAttempts.length > 0) {
    // Score every submitted attempt in memory (pure CPU, no I/O).
    const scoredUpdates = submittedAttempts.map((attempt) => {
      const studentAnswers =
        attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
      const answersArray = Object.entries(studentAnswers).map(([qid, ans]) => ({
        questionId: Number(qid),
        selectedAnswer: String(ans ?? ""),
      }));
      const { score } = scoreSubmission(newQuestions, answersArray, exam);
      return { studentId: attempt.studentId, score };
    });

    // Each update targets a unique studentId_examId row — no cross-row conflicts,
    // so no transaction needed. Promise.all fires all updates concurrently without
    // holding an open interactive transaction, avoiding the 5 000 ms timeout.
    await Promise.all(
      scoredUpdates.map(({ studentId, score }) =>
        prisma.result.update({
          where: { studentId_examId: { studentId, examId } },
          data: { score },
        })
      )
    );

    // Invalidate per-student review caches so the review page shows updated data
    const reviewCacheKeys = submittedAttempts.map(
      (a) => `resultreview:${a.studentId}:${examId}`
    );
    await cacheDel(reviewCacheKeys);
    // Also bust the shared exam review data cache
    await cacheDel([`exam:review_data:${examId}`]);
  }

  // Step 4: Invalidate shared exam caches
  await cacheDel([`exams:details:${examId}`]);
  await incrementCacheVersion("exams:catalog:global");

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
  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      status: "LIVE",
      publishedAt: new Date(),
    },
  });

  // Invalidate caches:
  // 1. Specific exam details cache
  await cacheDel([`exams:details:${examId}`]);
  // 2. Wildcard exams catalog caches (since status changed)
  await incrementCacheVersion("exams:catalog:global");

  return updated;
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

  // Invalidate caches:
  // 1. Specific exam details cache
  await cacheDel([`exams:details:${examId}`]);
  // 2. Wildcard exams catalog caches (since exam is deleted)
  await incrementCacheVersion("exams:catalog:global");

  return { id: examId };
}

async function startAttempt(studentId, examIdRaw, sessionIdRaw) {
  const examId = Number(examIdRaw);
  const sessionId = sessionIdRaw ? String(sessionIdRaw).trim() : null;
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
  if (existing?.status === "TIMED_OUT") {
    throw new HttpError(409, "This exam attempt is already timed out");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { 
      questions: { orderBy: { id: "asc" } },
      ...(studentId ? { assignments: { where: { userId: studentId } } } : {})
    },
  });

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }

  // Security check for Students
  if (studentId) {
    if (exam.status !== "LIVE") {
      throw new HttpError(403, "This exam is not currently live");
    }
    if (!exam.assignments || exam.assignments.length === 0) {
      throw new HttpError(403, "You are not assigned to this exam");
    }
    const now = new Date();
    if (exam.startAt && now < exam.startAt) {
      throw new HttpError(403, "Exam has not started yet");
    }
    if (exam.endAt && now > exam.endAt) {
      throw new HttpError(403, "Exam window has ended");
    }
  }

  if (exam.questions.length === 0) {
    throw new HttpError(400, "Exam has no questions");
  }

  if (existing?.status === "IN_PROGRESS") {
    if (features.strictExamSession && existing.expiresAt && new Date(existing.expiresAt) <= new Date()) {
      await prisma.attempt.update({
        where: { id: existing.id },
        data: { status: "TIMED_OUT" },
      });
      throw new HttpError(409, "Attempt timed out");
    }
    if (features.strictExamSession && existing.sessionId && sessionId && existing.sessionId !== sessionId) {
      throw new HttpError(409, "Attempt already active in another session");
    }
    let answers = existing.answers && typeof existing.answers === "object"
      ? existing.answers
      : {};
    let currentQuestionIndex = existing.currentQuestionIndex ?? 0;

    return {
      status: 200,
      body: {
        attemptId: existing.id,
        exam: stripAnswersFromExam(exam, studentId),
        answers,
        currentQuestionIndex,
        expiresAt: existing.expiresAt,
        sessionId: existing.sessionId,
      },
    };
  }

  const now = Date.now();
  const durationMinutes = Number.isFinite(Number(exam.duration)) ? Number(exam.duration) : 0;
  const expiresAt = durationMinutes > 0 ? new Date(now + durationMinutes * 60 * 1000) : null;
  try {
    const attempt = await prisma.attempt.create({
      data: {
        studentId,
        examId,
        status: "IN_PROGRESS",
        answers: {},
        currentQuestionIndex: 0,
        ...(durationMinutes > 0
          ? { startedAt: new Date(now), expiresAt, lastSavedAt: new Date(now) }
          : {}),
        ...(features.strictExamSession ? { sessionId } : {}),
      },
    });

    return {
      status: 201,
      body: {
        attemptId: attempt.id,
        exam: stripAnswersFromExam(exam, studentId),
        answers: {},
        currentQuestionIndex: 0,
        expiresAt: attempt.expiresAt,
        sessionId: attempt.sessionId,
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
            exam: stripAnswersFromExam(exam, studentId),
            answers: newlyCreated.answers || {},
            currentQuestionIndex: newlyCreated.currentQuestionIndex ?? 0,
            expiresAt: newlyCreated.expiresAt,
            sessionId: newlyCreated.sessionId,
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
  const sessionId = body?.sessionId ? String(body.sessionId) : null;

  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
  }
  
  if (!Number.isFinite(nextQuestionIndex) || nextQuestionIndex < 0) {
    throw new HttpError(400, "nextQuestionIndex must be a non-negative number");
  }

  // 1. Fetch Attempt
  const attempt = await getOrCreateAttempt(studentId, examId, "saving answers");
  if (attempt.status !== "IN_PROGRESS") {
    throw new HttpError(409, "This attempt is already submitted");
  }
  if (features.strictExamSession && attempt.sessionId && sessionId && attempt.sessionId !== sessionId) {
    throw new HttpError(409, "Attempt already active in another session");
  }
  if (features.strictExamSession && attempt.expiresAt && new Date(attempt.expiresAt) <= new Date()) {
    if (features.timeoutAutoClose) {
      await prisma.attempt.update({ where: { id: attempt.id }, data: { status: "TIMED_OUT" } });
    }
    throw new HttpError(403, "Time limit exceeded");
  }

  // 2. Fetch Exam details (Redis-cached)
  const cacheKey = `exams:details:${examId}`;
  let cachedExam = null;
  try {
    const data = await redis.get(cacheKey);
    if (data) cachedExam = JSON.parse(data);
  } catch (err) {
    console.error("[Redis] GET error in saveAttemptAnswer:", err);
  }

  if (!cachedExam) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { id: "asc" } } },
    });
    if (!exam) {
      throw new HttpError(404, "Exam not found");
    }
    cachedExam = {
      id: exam.id,
      duration: exam.duration,
      questions: exam.questions.map((q) => ({ id: q.id })),
    };
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(cachedExam));
    } catch (err) {
      console.error("[Redis] SET error in saveAttemptAnswer:", err);
    }
  }

  // 3. Time Limit Enforcement
  const elapsedMinutes = (Date.now() - new Date(attempt.startedAt || attempt.createdAt).getTime()) / 60000;
  const graceMinutes = 5;
  if (elapsedMinutes > cachedExam.duration + graceMinutes) {
    throw new HttpError(403, "Time limit exceeded. You can no longer save answers.");
  }

  if (Number.isFinite(questionId)) {
    const q = cachedExam.questions.find((x) => x.id === questionId);
    if (!q) {
      throw new HttpError(400, "questionId does not belong to this exam");
    }
  }

  const boundedNext = Math.min(
    Math.max(0, Math.floor(nextQuestionIndex)),
    Math.max(0, cachedExam.questions.length - 1)
  );

  const normalized = questionId ? normalizeAnswer(selectedAnswer) : null;

  let currentAnswers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
  if (questionId && normalized != null) {
    currentAnswers = { ...currentAnswers, [String(questionId)]: normalized };
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { answers: currentAnswers, currentQuestionIndex: boundedNext },
    });
  } else {
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { currentQuestionIndex: boundedNext },
    });
  }

  const answeredCount = Object.keys(currentAnswers).filter(k => k !== "currentQuestionIndex").length;

  return {
    currentQuestionIndex: boundedNext,
    answeredCount,
    totalQuestions: cachedExam.questions.length,
  };
}

async function syncAttemptAnswers(studentId, body) {
  const examId = Number(body?.examId);
  const answers = body?.answers; // Expecting an object of { questionId: selectedAnswer }
  const sessionId = body?.sessionId ? String(body.sessionId) : null;

  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
  }

  // 1. Fetch Attempt
  const attempt = await getOrCreateAttempt(studentId, examId, "saving answers");
  if (attempt.status !== "IN_PROGRESS") {
    throw new HttpError(409, "This attempt is already submitted");
  }
  if (features.strictExamSession && attempt.sessionId && sessionId && attempt.sessionId !== sessionId) {
    throw new HttpError(409, "Attempt already active in another session");
  }
  if (features.strictExamSession && attempt.expiresAt && new Date(attempt.expiresAt) <= new Date()) {
    if (features.timeoutAutoClose) {
      await prisma.attempt.update({ where: { id: attempt.id }, data: { status: "TIMED_OUT" } });
    }
    throw new HttpError(403, "Time limit exceeded");
  }

  // 2. Sync to Postgres (Active State is debounced from frontend, so this is safe)
  if (answers && typeof answers === "object") {
    const currentAnswers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
    const mergedAnswers = { ...currentAnswers };
    for (const [qid, ans] of Object.entries(answers)) {
      if (ans != null) {
        mergedAnswers[String(qid)] = normalizeAnswer(ans);
      }
    }
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: { answers: mergedAnswers },
    });
  }

  return { success: true };
}

async function submitExam(studentId, body) {
  const examId = Number(body?.examId);
  const answers = body?.answers;
  const sessionId = body?.sessionId ? String(body.sessionId) : null;

  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "examId is required");
  }
  const attempt = await getOrCreateAttempt(studentId, examId, "submitting");
  if (attempt.status === "SUBMITTED") {
    const existingResult = await prisma.result.findUnique({
      where: { studentId_examId: { studentId, examId } },
    });
    if (existingResult) {
      return { score: existingResult.score, correct: null, total: null, alreadySubmitted: true };
    }
    throw new HttpError(409, "Already submitted");
  }
  if (attempt.status === "TIMED_OUT") {
    throw new HttpError(409, "Attempt already timed out");
  }
  if (features.strictExamSession && attempt.sessionId && sessionId && attempt.sessionId !== sessionId) {
    throw new HttpError(409, "Attempt already active in another session");
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true },
  });

  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }

  const elapsedMinutes = (Date.now() - new Date(attempt.startedAt || attempt.createdAt).getTime()) / 60000;
  const graceMinutes = 5;
  const isLate = elapsedMinutes > exam.duration + graceMinutes;

  let finalAnswers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};

  if (!isLate && Array.isArray(answers)) {
    // Ensure frontend-provided answers are merged into final storage
    answers.forEach(a => {
      finalAnswers[a.questionId] = a.selectedAnswer;
    });
  }

  const finalAnswersArray = Object.entries(finalAnswers).map(([qid, selectedAnswer]) => ({
    questionId: Number(qid),
    selectedAnswer: String(selectedAnswer ?? ""),
  }));

  const { score, correct, total } = scoreSubmission(exam.questions, finalAnswersArray, exam);

  await prisma.$transaction([
    prisma.attempt.update({
      where: { id: attempt.id },
      data: { 
        status: isLate ? "TIMED_OUT" : "SUBMITTED",
        answers: finalAnswers // Persist final state to Postgres
      },
    }),
    prisma.result.upsert({
      where: {
        studentId_examId: { studentId, examId },
      },
      create: { studentId, examId, score },
      update: { score },
    }),
  ]);

  // Best-effort invalidation (should never block submit response path)
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
    console.error("[Redis Cache Invalidation Failure]", err.message);
  });

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
    expiresAt: attempt.expiresAt ?? null,
    sessionId: attempt.sessionId ?? null,
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
  let answers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
  let currentQuestionIndex = attempt.currentQuestionIndex ?? 0;

  // We no longer pull active state from Redis because active state is in Postgres.

  return {
    id: attempt.id,
    examId: attempt.examId,
    status: attempt.status,
    currentQuestionIndex,
    expiresAt: attempt.expiresAt ?? null,
    sessionId: attempt.sessionId ?? null,
    answers,
    exam: stripAnswersFromExam(attempt.exam, studentId),
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

async function publishResults(userId, examIdRaw) {
  const examId = Number(examIdRaw);
  if (!Number.isFinite(examId)) {
    throw new HttpError(400, "Invalid exam id");
  }

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    throw new HttpError(404, "Exam not found");
  }

  if (exam.status !== "COMPLETED") {
    throw new HttpError(400, "Cannot publish results for an exam that is not COMPLETED");
  }

  await prisma.exam.update({
    where: { id: examId },
    data: { resultsPublished: true },
  });

  // Clear related caches
  try {
    await cacheDelPattern(`results:admin:*`);
    await cacheDelPattern(`results:student:*`);
    await cacheDelPattern(`results:instructor:*`);
    await cacheDelPattern(`leaderboard:unit:*`);
    await cacheDelPattern(`exams:details:${examId}`);
    await cacheDel([`exam:review_data:${examId}`]);
    // Wildcard exams catalog caches (since resultsPublished state changed)
    await incrementCacheVersion("exams:catalog:global");
  } catch (err) {
    console.error("[Redis] Cache invalidation failed during publishResults", err);
  }

  return { success: true, message: "Results published successfully" };
}

async function getOrCreateAttempt(studentId, examId, actionLabel) {
  let attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
  });
  if (!attempt) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { assignments: { where: { userId: studentId } } }
    });
    if (!exam || exam.status !== "LIVE" || !exam.assignments || exam.assignments.length === 0) {
      throw new HttpError(400, `Start the exam before ${actionLabel}`);
    }
    const now = new Date();
    if ((exam.startAt && now < exam.startAt) || (exam.endAt && now > exam.endAt)) {
      throw new HttpError(400, `Start the exam before ${actionLabel}`);
    }
    const durationMinutes = Number.isFinite(Number(exam.duration)) ? Number(exam.duration) : 0;
    const expiresAt = durationMinutes > 0 ? new Date(now.getTime() + durationMinutes * 60 * 1000) : null;
    attempt = await prisma.attempt.create({
      data: {
        studentId,
        examId,
        status: "IN_PROGRESS",
        answers: {},
        currentQuestionIndex: 0,
        ...(durationMinutes > 0 ? { startedAt: new Date(now), expiresAt, lastSavedAt: new Date(now) } : {}),
      }
    });
  }
  return attempt;
}
async function extendTime(studentId, examIdRaw, extraMinutesRaw) {
  const examId = Number(examIdRaw);
  const extraMinutes = Number(extraMinutesRaw);
  if (!Number.isFinite(examId) || !studentId || !Number.isFinite(extraMinutes)) {
    throw new HttpError(400, "Invalid parameters");
  }

  const attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
  });

  if (!attempt) {
    throw new HttpError(404, "Attempt not found");
  }

  if (attempt.status !== "IN_PROGRESS" && attempt.status !== "TIMED_OUT") {
    throw new HttpError(409, "Cannot extend time for an already submitted exam");
  }

  // Extend the time
  const currentExpiresAt = attempt.expiresAt ? new Date(attempt.expiresAt) : new Date();
  const newExpiresAt = new Date(currentExpiresAt.getTime() + extraMinutes * 60000);

  const updated = await prisma.attempt.update({
    where: { id: attempt.id },
    data: { 
      expiresAt: newExpiresAt,
      status: "IN_PROGRESS" 
    }
  });

  return updated;
}

async function terminateSession(staffId, examIdRaw, studentIdRaw, reason) {
  const examId = Number(examIdRaw);
  const studentId = Number(studentIdRaw);
  if (!Number.isFinite(examId) || !Number.isFinite(studentId)) {
    throw new HttpError(400, "Invalid parameters");
  }

  const attempt = await prisma.attempt.findUnique({
    where: { studentId_examId: { studentId, examId } },
  });

  if (!attempt) {
    throw new HttpError(404, "Attempt not found");
  }

  const updated = await prisma.attempt.update({
    where: { id: attempt.id },
    data: { 
      status: "TERMINATED",
      expiresAt: new Date()
    }
  });

  await prisma.examViolation.create({
    data: {
      studentId,
      examId,
      type: "ADMIN_TERMINATION",
      message: reason || "Exam session was terminated by an administrator.",
    },
  });

  return { success: true, message: "Session terminated successfully", attempt: updated };
}

async function resetAttempt(staffId, examIdRaw, studentIdRaw) {
  const examId = Number(examIdRaw);
  const studentId = Number(studentIdRaw);
  if (!Number.isFinite(examId) || !Number.isFinite(studentId)) {
    throw new HttpError(400, "Invalid parameters");
  }

  // Delete Attempt
  await prisma.attempt.deleteMany({
    where: { studentId, examId },
  });

  // Delete Result if any
  await prisma.result.deleteMany({
    where: { studentId, examId },
  });

  // Delete Heartbeats
  await prisma.examHeartbeat.deleteMany({
    where: { studentId, examId },
  });

  // Delete Violations
  await prisma.examViolation.deleteMany({
    where: { studentId, examId },
  });

  return { success: true, message: "Attempt reset successfully" };
}

module.exports = {
  extendTime,
  publishResults,
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
  syncAttemptAnswers,
  submitExam,
  getAttemptStatus,
  getAttemptDetails,
  terminateSession,
  resetAttempt,
};
