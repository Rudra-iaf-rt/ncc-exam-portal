// Mock dependencies before importing the service to prevent hoisting initialization errors
jest.mock("../../lib/prisma", () => {
  const mockExam = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const mockQuestion = {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };
  const mockAttempt = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockResult = {
    findMany: jest.fn(),
    upsert: jest.fn(),
  };
  const mockPrisma = {
    exam: mockExam,
    question: mockQuestion,
    attempt: mockAttempt,
    result: mockResult,
    $executeRaw: jest.fn(),
    // $queryRaw is a tagged template — wrap it so it works as both tagged template and function
    $queryRaw: Object.assign(
      jest.fn().mockResolvedValue([]),
      { [Symbol.for("jest.asymmetricMatch")]: undefined }
    ),
  };
  mockPrisma.$transaction = jest.fn((cb) => {
    if (typeof cb === "function") {
      return cb(mockPrisma);
    }
    return Promise.resolve(cb);
  });
  return { prisma: mockPrisma };
});

jest.mock("../../lib/redis", () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock("../exam-pdf.service", () => ({
  extractPdfText: jest.fn(),
  buildQuestionsFromPdfText: jest.fn(),
}));

jest.mock("../exam-excel.service", () => ({
  extractQuestionsFromExcelBuffer: jest.fn(),
}));

// Now require the mocked services and the system under test
const examService = require("../exam.service");
const { prisma } = require("../../lib/prisma");
const { redis } = require("../../lib/redis");
const { HttpError } = require("../../utils/http-error");
const mockPdfService = require("../exam-pdf.service");
const mockExcelService = require("../exam-excel.service");

describe("Exam Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createExam", () => {
    const creatorUserId = 1;
    const validBody = {
      title: "  NCC C-Certificate Exam 2026 ",
      duration: "60",
      questions: [
        {
          question: "What is the motto of NCC?",
          options: ["Unity and Discipline", "Service Before Self", "Duty First", "Valour"],
          answer: "Unity and Discipline",
        },
      ],
    };

    it("should throw HttpError 400 if title is missing or not a string", async () => {
      await expect(examService.createExam(creatorUserId, { ...validBody, title: null })).rejects.toThrow(
        new HttpError(400, "title is required")
      );
      await expect(examService.createExam(creatorUserId, { ...validBody, title: 123 })).rejects.toThrow(
        new HttpError(400, "title is required")
      );
    });

    it("should throw HttpError 400 if duration is invalid or less than 1", async () => {
      await expect(examService.createExam(creatorUserId, { ...validBody, duration: "invalid" })).rejects.toThrow(
        new HttpError(400, "duration must be a positive number (minutes)")
      );
      await expect(examService.createExam(creatorUserId, { ...validBody, duration: 0 })).rejects.toThrow(
        new HttpError(400, "duration must be a positive number (minutes)")
      );
    });

    it("should throw HttpError 400 if questions list is invalid or empty", async () => {
      await expect(examService.createExam(creatorUserId, { ...validBody, questions: null })).rejects.toThrow(
        new HttpError(400, "questions must be a non-empty array")
      );
      await expect(examService.createExam(creatorUserId, { ...validBody, questions: [] })).rejects.toThrow(
        new HttpError(400, "questions must be a non-empty array")
      );
    });

    it("should throw HttpError 400 if any question body or answer is missing", async () => {
      const badQuestion1 = { ...validBody, questions: [{ options: ["A", "B"], answer: "A" }] };
      await expect(examService.createExam(creatorUserId, badQuestion1)).rejects.toThrow(
        new HttpError(400, "questions[0].question is required")
      );

      const badQuestion2 = { ...validBody, questions: [{ question: "Q", options: ["A"], answer: "A" }] };
      await expect(examService.createExam(creatorUserId, badQuestion2)).rejects.toThrow(
        new HttpError(400, "questions[0].options must have at least 2 strings")
      );

      const badQuestion3 = { ...validBody, questions: [{ question: "Q", options: ["A", "B"], answer: "" }] };
      await expect(examService.createExam(creatorUserId, badQuestion3)).rejects.toThrow(
        new HttpError(400, "questions[0].answer is required")
      );
    });

    it("should successfully create an exam when payload is valid", async () => {
      const createdExamData = {
        id: 10,
        title: "NCC C-Certificate Exam 2026",
        duration: 60,
        createdBy: creatorUserId,
        questions: [
          {
            id: 101,
            question: "What is the motto of NCC?",
            options: ["Unity and Discipline", "Service Before Self", "Duty First", "Valour"],
            answer: "Unity and Discipline",
          },
        ],
      };

      prisma.exam.create.mockResolvedValue(createdExamData);

      const result = await examService.createExam(creatorUserId, validBody);

      expect(prisma.exam.create).toHaveBeenCalledWith({
        data: {
          title: "NCC C-Certificate Exam 2026",
          duration: 60,
          negativeMarking: false,
          createdBy: creatorUserId,
          questions: {
            create: [
              {
                question: "What is the motto of NCC?",
                options: ["Unity and Discipline", "Service Before Self", "Duty First", "Valour"],
                answer: "Unity and Discipline",
              },
            ],
          },
        },
        include: {
          questions: { orderBy: { id: "asc" } },
        },
      });
      expect(result).toEqual({
        id: 10,
        title: "NCC C-Certificate Exam 2026",
        duration: 60,
        createdBy: creatorUserId,
        questions: [
          {
            id: 101,
            question: "What is the motto of NCC?",
            options: ["Unity and Discipline", "Service Before Self", "Duty First", "Valour"],
            answer: "Unity and Discipline",
          },
        ],
      });
    });
  });

  describe("createExamFromPdf", () => {
    it("should extract text, parse questions and call createExam", async () => {
      const creatorUserId = 2;
      const pdfBuffer = Buffer.from("pdf-data");
      const mockQuestions = [{ question: "PQ", options: ["A", "B"], answer: "A" }];

      mockPdfService.extractPdfText.mockResolvedValue("mocked pdf text");
      mockPdfService.buildQuestionsFromPdfText.mockResolvedValue(mockQuestions);
      prisma.exam.create.mockResolvedValue({
        id: 20,
        title: "PDF Exam",
        duration: 45,
        createdBy: creatorUserId,
        questions: [{ id: 201, question: "PQ", options: ["A", "B"], answer: "A" }],
      });

      const result = await examService.createExamFromPdf(creatorUserId, {
        title: "PDF Exam",
        duration: 45,
        pdfBuffer,
      });

      expect(mockPdfService.extractPdfText).toHaveBeenCalledWith(pdfBuffer);
      expect(mockPdfService.buildQuestionsFromPdfText).toHaveBeenCalledWith("mocked pdf text");
      expect(result.id).toBe(20);
    });
  });

  describe("createExamFromExcel", () => {
    it("should extract questions and create exam", async () => {
      const creatorUserId = 2;
      const excelBuffer = Buffer.from("excel-data");
      const mockQuestions = [{ question: "EQ", options: ["1", "2"], answer: "1" }];

      mockExcelService.extractQuestionsFromExcelBuffer.mockResolvedValue(mockQuestions);
      prisma.exam.create.mockResolvedValue({
        id: 30,
        title: "Excel Exam",
        duration: 30,
        createdBy: creatorUserId,
        questions: [{ id: 301, question: "EQ", options: ["1", "2"], answer: "1" }],
      });

      const result = await examService.createExamFromExcel(creatorUserId, {
        title: "Excel Exam",
        duration: 30,
        excelBuffer,
      });

      expect(mockExcelService.extractQuestionsFromExcelBuffer).toHaveBeenCalledWith(excelBuffer);
      expect(result.id).toBe(30);
    });
  });

  describe("listExamsCatalog", () => {
    const userId = 12;

    it("should return cached catalog from Redis if available", async () => {
      const mockCachedResponse = {
        exams: [{ id: 1, title: "Cached Exam", duration: 30, questionCount: 5 }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      redis.get.mockResolvedValue(JSON.stringify(mockCachedResponse));

      const result = await examService.listExamsCatalog(userId, "STUDENT");

      expect(redis.get).toHaveBeenCalledWith(expect.any(String));
      expect(prisma.exam.findMany).not.toHaveBeenCalled();
      expect(result).toEqual(mockCachedResponse);
    });

    it("should fetch from DB, set to Redis, and return catalog on Redis cache miss for a STUDENT", async () => {
      redis.get.mockResolvedValue(null);
      prisma.exam.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Exam 1",
          duration: 30,
          status: "LIVE",
          publishedAt: new Date("2026-01-01"),
          createdBy: 3,
          _count: { questions: 10 },
          creator: {
            id: 3,
            name: "Officer Ajay",
            role: "STAFF",
            collegeCode: "COL01",
            college: { name: "NCC Unit 1" },
          },
        },
      ]);
      prisma.exam.count.mockResolvedValue(1);
      prisma.result.findMany.mockResolvedValue([{ examId: 1, score: 85 }]);

      const result = await examService.listExamsCatalog(userId, "STUDENT");

      expect(prisma.exam.findMany).toHaveBeenCalledWith({
        where: {
          status: "LIVE",
          assignments: { some: { userId } },
        },
        orderBy: { id: "desc" },
        include: {
          _count: { select: { questions: true } },
          creator: {
            select: {
              id: true,
              name: true,
              role: true,
              collegeCode: true,
              college: { select: { name: true } },
            },
          },
        },
        skip: 0,
        take: 20,
      });

      expect(result.exams[0].completed).toBe(true);
      expect(result.exams[0].score).toBe(85);
      expect(result.exams[0].status).toBe("LIVE");
      expect(redis.setex).toHaveBeenCalledWith(
        expect.any(String),
        60,
        expect.any(String)
      );
    });

    it("should bypass Redis errors gracefully and read from DB", async () => {
      redis.get.mockRejectedValue(new Error("Redis disconnect"));
      prisma.exam.findMany.mockResolvedValue([]);
      prisma.exam.count.mockResolvedValue(0);

      const result = await examService.listExamsCatalog(userId, "ADMIN");

      expect(console.error).toHaveBeenCalledWith("[Redis] GET error", expect.any(Error));
      expect(prisma.exam.findMany).toHaveBeenCalled();
      expect(result.exams).toEqual([]);
    });
  });

  describe("getExamForStudent", () => {
    const examId = 5;

    it("should throw HttpError 400 for invalid exam id", async () => {
      await expect(examService.getExamForStudent("bad-id")).rejects.toThrow(
        new HttpError(400, "Invalid exam id")
      );
    });

    it("should return cached details from Redis if available", async () => {
      const mockCachedExam = { id: 5, title: "Cached Details Exam", questions: [] };
      redis.get.mockResolvedValue(JSON.stringify(mockCachedExam));

      const result = await examService.getExamForStudent(examId);

      expect(redis.get).toHaveBeenCalledWith("exams:details:5");
      expect(prisma.exam.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(mockCachedExam);
    });

    it("should throw HttpError 404 if exam does not exist in DB", async () => {
      redis.get.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(examService.getExamForStudent(examId)).rejects.toThrow(
        new HttpError(404, "Exam not found")
      );
    });

    it("should throw HttpError 403 if exam is not LIVE status", async () => {
      redis.get.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue({
        id: 5,
        status: "DRAFT",
        questions: [{ id: 1 }],
      });

      await expect(examService.getExamForStudent(examId)).rejects.toThrow(
        new HttpError(403, "Exam is not published yet")
      );
    });

    it("should throw HttpError 400 if exam has no questions", async () => {
      redis.get.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue({
        id: 5,
        status: "LIVE",
        questions: [],
      });

      await expect(examService.getExamForStudent(examId)).rejects.toThrow(
        new HttpError(400, "Exam has no questions")
      );
    });

    it("should successfully fetch, cache, and return the exam for a student", async () => {
      const liveExam = {
        id: 5,
        title: "NCC Exam",
        status: "LIVE",
        questions: [{ id: 50, question: "Q1", options: ["A", "B"] }],
      };
      redis.get.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue(liveExam);

      const result = await examService.getExamForStudent(examId);

      expect(result).toEqual(liveExam);
      expect(redis.setex).toHaveBeenCalledWith("exams:details:5", 600, JSON.stringify(liveExam));
    });
  });

  describe("getExamForStaff", () => {
    it("should return the exam regardless of live status and not throw on draft", async () => {
      const draftExam = {
        id: 6,
        status: "DRAFT",
        questions: [],
      };
      prisma.exam.findUnique.mockResolvedValue(draftExam);

      const result = await examService.getExamForStaff(6);

      expect(result).toEqual(draftExam);
    });

    it("should throw HttpError 404 if exam does not exist for staff", async () => {
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(examService.getExamForStaff(999)).rejects.toThrow(
        new HttpError(404, "Exam not found")
      );
    });
  });

  describe("updateExamMetaByCreator", () => {
    const creatorId = 1;
    const examId = 8;

    it("should throw 403 if user is not the creator of the exam", async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 8, createdBy: 99 });

      await expect(
        examService.updateExamMetaByCreator(creatorId, examId, { title: "New Title" })
      ).rejects.toThrow(new HttpError(403, "Only exam creator can update this exam"));
    });

    it("should throw 400 if title is provided but empty", async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 8, createdBy: creatorId, status: "DRAFT" });

      await expect(examService.updateExamMetaByCreator(creatorId, examId, { title: " " })).rejects.toThrow(
        new HttpError(400, "title cannot be empty")
      );
    });

    it("should throw 400 if status is invalid", async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 8, createdBy: creatorId, status: "DRAFT" });

      await expect(
        examService.updateExamMetaByCreator(creatorId, examId, { status: "INVALID_STATUS" })
      ).rejects.toThrow(new HttpError(400, "Invalid status. Must be DRAFT, LIVE, COMPLETED, or ARCHIVED"));
    });

    it("should throw 400 if there is nothing to update", async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 8, createdBy: creatorId, status: "DRAFT" });

      await expect(examService.updateExamMetaByCreator(creatorId, examId, {})).rejects.toThrow(
        new HttpError(400, "Nothing to update")
      );
    });

    it("should successfully update metadata when body is valid", async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 8, createdBy: creatorId, status: "DRAFT" });
      prisma.exam.update.mockResolvedValue({ id: 8, title: "Updated Title", status: "LIVE" });

      const result = await examService.updateExamMetaByCreator(creatorId, examId, {
        title: "Updated Title",
        duration: 90,
        status: "LIVE",
      });

      expect(prisma.exam.update).toHaveBeenCalledWith({
        where: { id: examId },
        data: {
          title: "Updated Title",
          duration: 90,
          status: "LIVE",
          publishedAt: expect.any(Date),
        },
        include: { questions: { orderBy: { id: "asc" } } },
      });
      expect(result.title).toBe("Updated Title");
    });
  });

  describe("replaceExamQuestionsByCreator", () => {
    const creatorId = 1;
    const examId = 8;

    it("should successfully replace questions inside transaction", async () => {
      prisma.exam.findUnique.mockResolvedValueOnce({ id: 8, createdBy: creatorId, status: "DRAFT" });
      prisma.question.findMany.mockResolvedValueOnce([{ id: 101, question: "Old Q", options: ["X"], answer: "X" }]);
      prisma.attempt.findMany.mockResolvedValueOnce([]);
      prisma.exam.findUnique.mockResolvedValueOnce({
        id: 8,
        questions: [{ id: 101, question: "New Q" }],
      });
      prisma.$transaction.mockResolvedValueOnce([]);

      const body = {
        questions: [{ question: "New Q", options: ["A", "B"], answer: "A" }],
      };

      const result = await examService.replaceExamQuestionsByCreator(creatorId, examId, body);

      expect(prisma.question.findMany).toHaveBeenCalledWith({ where: { examId: 8 }, orderBy: { id: "asc" } });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.questions.length).toBe(1);
    });
  });

  describe("publishExamByCreator", () => {
    const creatorId = 2;
    const examId = 10;

    it("should throw HttpError 400 if exam has no questions", async () => {
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        createdBy: creatorId,
        _count: { questions: 0 },
      });

      await expect(examService.publishExamByCreator(creatorId, examId)).rejects.toThrow(
        new HttpError(400, "Cannot publish exam with no questions")
      );
    });

    it("should update status to LIVE and set publishedAt timestamp", async () => {
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        createdBy: creatorId,
        _count: { questions: 5 },
      });
      prisma.exam.update.mockResolvedValue({ id: 10, status: "LIVE" });

      const result = await examService.publishExamByCreator(creatorId, examId);

      expect(prisma.exam.update).toHaveBeenCalledWith({
        where: { id: examId },
        data: {
          status: "LIVE",
          publishedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe("LIVE");
    });
  });

  describe("deleteExamByCreator", () => {
    it("should delete the exam if user is creator", async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 100, createdBy: 1 });
      prisma.exam.delete.mockResolvedValue({ id: 100 });

      const result = await examService.deleteExamByCreator(1, 100);

      expect(prisma.exam.delete).toHaveBeenCalledWith({ where: { id: 100 } });
      expect(result).toEqual({ id: 100 });
    });
  });

  describe("startAttempt", () => {
    const studentId = 5;
    const examId = 10;

    it("should throw HttpError 409 if attempt was already submitted", async () => {
      prisma.attempt.findUnique.mockResolvedValue({ id: 1, status: "SUBMITTED" });

      await expect(examService.startAttempt(studentId, examId)).rejects.toThrow(
        new HttpError(409, "This exam has already been submitted")
      );
    });

    it("should throw HttpError 403 if student is not assigned to the exam", async () => {
      prisma.attempt.findUnique.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        status: "LIVE",
        assignments: [], // Empty assignments
      });

      await expect(examService.startAttempt(studentId, examId)).rejects.toThrow(
        new HttpError(403, "You are not assigned to this exam")
      );
    });

    it("should return existing attempt details if already IN_PROGRESS", async () => {
      const inProgressAttempt = {
        id: 123,
        status: "IN_PROGRESS",
        answers: { 50: "A" },
        currentQuestionIndex: 2,
      };
      prisma.attempt.findUnique.mockResolvedValue(inProgressAttempt);
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        status: "LIVE",
        questions: [{ id: 50, question: "Q", options: ["A", "B"], answer: "A" }],
        assignments: [{ userId: studentId }],
      });

      const result = await examService.startAttempt(studentId, examId);

      expect(result.status).toBe(200);
      expect(result.body.attemptId).toBe(123);
      expect(result.body.answers).toEqual({ 50: "A" });
      expect(result.body.currentQuestionIndex).toBe(2);
    });

    it("should successfully create a new attempt", async () => {
      prisma.attempt.findUnique.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        status: "LIVE",
        duration: 60,
        questions: [{ id: 50, question: "Q", options: ["A", "B"], answer: "A" }],
        assignments: [{ userId: studentId }],
      });
      prisma.attempt.create.mockResolvedValue({
        id: 999,
        status: "IN_PROGRESS",
        answers: {},
        currentQuestionIndex: 0,
      });

      const result = await examService.startAttempt(studentId, examId);

      expect(result.status).toBe(201);
      expect(result.body.attemptId).toBe(999);
      expect(prisma.attempt.create).toHaveBeenCalledWith({
        data: {
          studentId,
          examId,
          status: "IN_PROGRESS",
          answers: {},
          currentQuestionIndex: 0,
          sessionId: null,
          startedAt: expect.any(Date),
          expiresAt: expect.any(Date),
          lastSavedAt: expect.any(Date),
        },
      });
    });

    it("should recover from DB P2002 duplicate key constraint during race condition", async () => {
      prisma.attempt.findUnique.mockResolvedValue(null);
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        status: "LIVE",
        duration: 60,
        questions: [{ id: 50, question: "Q", options: ["A", "B"], answer: "A" }],
        assignments: [{ userId: studentId }],
      });

      // Simulate Prisma error code P2002 (unique constraint violation)
      const p2002Error = new Error("Unique constraint violation");
      p2002Error.code = "P2002";
      prisma.attempt.create.mockRejectedValue(p2002Error);

      const existingRecordFromRace = {
        id: 888,
        answers: { 50: "B" },
        currentQuestionIndex: 1,
      };
      prisma.attempt.findUnique.mockResolvedValue(existingRecordFromRace);

      const result = await examService.startAttempt(studentId, examId);

      expect(result.status).toBe(200);
      expect(result.body.attemptId).toBe(888);
      expect(result.body.answers).toEqual({ 50: "B" });
      expect(result.body.currentQuestionIndex).toBe(1);
    });
  });

  describe("saveAttemptAnswer", () => {
    const studentId = 5;
    const validBody = {
      examId: 10,
      questionId: 50,
      selectedAnswer: "A",
      nextQuestionIndex: 2,
    };

    it("should throw HttpError 403 if time limit (+ 5min grace period) is exceeded", async () => {
      prisma.attempt.findUnique.mockResolvedValue({
        id: 123,
        status: "IN_PROGRESS",
        createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      });
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        duration: 20, // 20 min + 5 min grace = 25 min max
        questions: [{ id: 50 }],
      });

      await expect(examService.saveAttemptAnswer(studentId, validBody)).rejects.toThrow(
        new HttpError(403, "Time limit exceeded. You can no longer save answers.")
      );
    });

    it("should throw HttpError 400 if questionId does not belong to the exam", async () => {
      prisma.attempt.findUnique.mockResolvedValue({
        id: 123,
        status: "IN_PROGRESS",
        createdAt: new Date(),
      });
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        duration: 60,
        questions: [{ id: 99 }], // questionId 50 is not here
      });

      await expect(examService.saveAttemptAnswer(studentId, validBody)).rejects.toThrow(
        new HttpError(400, "questionId does not belong to this exam")
      );
    });

    it("should execute JSONB merge updates successfully and return status", async () => {
      prisma.attempt.findUnique.mockResolvedValueOnce({
        id: 123,
        status: "IN_PROGRESS",
        createdAt: new Date(),
      });
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        duration: 60,
        questions: [{ id: 50 }, { id: 51 }],
      });

      prisma.$executeRaw.mockResolvedValue(1);
      prisma.attempt.findUnique.mockResolvedValueOnce({
        answers: { 50: "A" },
        currentQuestionIndex: 1,
      });

      const result = await examService.saveAttemptAnswer(studentId, validBody);

      expect(prisma.attempt.update).toHaveBeenCalled();
      expect(result).toEqual({
        answeredCount: 1,
        totalQuestions: 2,
        currentQuestionIndex: 1,
      });
    });
  });

  describe("submitExam", () => {
    const studentId = 5;
    const validBody = {
      examId: 10,
      answers: [{ questionId: 50, selectedAnswer: "A" }],
    };

    it("should accept user answers if submitted within time limit (+ grace)", async () => {
      prisma.attempt.findUnique.mockResolvedValue({
        id: 123,
        status: "IN_PROGRESS",
        createdAt: new Date(), // Just started
      });
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        duration: 30,
        questions: [{ id: 50, answer: "A" }],
      });

      prisma.attempt.update.mockResolvedValue({ id: 123, status: "SUBMITTED" });
      prisma.result.upsert.mockResolvedValue({ id: 1 });

      const result = await examService.submitExam(studentId, validBody);

      expect(result.score).toBe(100);
      expect(result.correct).toBe(1);
      expect(result.total).toBe(1);

      // Verify Redis invalidate deletes keys
      expect(redis.del).toHaveBeenCalledWith("stats:dashboard:STUDENT:5");
    });

    it("should ignore user inputs and auto-submit with DB answers if submission is late", async () => {
      prisma.attempt.findUnique.mockResolvedValue({
        id: 123,
        status: "IN_PROGRESS",
        createdAt: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
        answers: { 50: "B" }, // Already saved answer is B
      });
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        duration: 30, // 30 mins + 5 mins grace = 35 mins allowed. 40 minutes is late!
        questions: [{ id: 50, answer: "A" }],
      });

      prisma.attempt.update.mockResolvedValue({ id: 123, status: "SUBMITTED" });
      prisma.result.upsert.mockResolvedValue({ id: 1 });

      // Client submits "A" (which is correct), but since it is late, it should score "B" (incorrect)
      const result = await examService.submitExam(studentId, {
        examId: 10,
        answers: [{ questionId: 50, selectedAnswer: "A" }],
      });

      expect(result.score).toBe(0);
      expect(result.correct).toBe(0);
      expect(result.total).toBe(1);
    });
  });

  describe("getAttemptStatus", () => {
    it("should return mapped status, questionCount, and answerCount", async () => {
      prisma.attempt.findUnique.mockResolvedValue({
        id: 123,
        examId: 10,
        status: "IN_PROGRESS",
        currentQuestionIndex: 1,
        answers: { 50: "A", 51: "B" },
        exam: { _count: { questions: 10 } },
        updatedAt: new Date(),
      });

      const result = await examService.getAttemptStatus(5, 10);

      expect(result.attemptId).toBe(123);
      expect(result.answeredCount).toBe(2);
      expect(result.totalQuestions).toBe(10);
    });
  });

  describe("getAttemptDetails", () => {
    it("should throw HttpError 404 if attempt is owned by another student", async () => {
      prisma.attempt.findUnique.mockResolvedValue({
        id: 123,
        studentId: 99, // Owned by 99
      });

      await expect(examService.getAttemptDetails(5, 123)).rejects.toThrow(
        new HttpError(404, "Attempt not found")
      );
    });
  });
});
