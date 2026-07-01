// Mock dependencies before importing the service to prevent hoisting initialization errors
jest.mock("../../lib/prisma", () => {
  const mockResult = {
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const mockUser = {
    findUnique: jest.fn(),
  };
  const mockExam = {
    findUnique: jest.fn(),
  };
  const mockAttempt = {
    findMany: jest.fn(),
  };
  const mockPrisma = {
    result: mockResult,
    user: mockUser,
    exam: mockExam,
    attempt: mockAttempt,
  };
  return { prisma: mockPrisma };
});

jest.mock("../../lib/redis", () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

const resultsService = require("../results.service");
const { prisma } = require("../../lib/prisma");
const { redis } = require("../../lib/redis");
const { HttpError } = require("../../utils/http-error");

describe("Results Service Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("listForStudent", () => {
    const studentId = 12;
    const query = { page: "1", limit: "10", examId: "5" };

    it("should return cached results from Redis if available", async () => {
      const mockCachedResponse = {
        results: [{ id: 1, score: 90, examTitle: "Mock Exam" }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      redis.get.mockResolvedValue(JSON.stringify(mockCachedResponse));

      const res = await resultsService.listForStudent(studentId, query);

      expect(redis.get).toHaveBeenCalledWith("results:student:12:5:p1:l10");
      expect(res).toEqual(mockCachedResponse);
      expect(prisma.result.findMany).not.toHaveBeenCalled();
    });

    it("should query DB, set Redis cache and return data on cache miss", async () => {
      redis.get.mockResolvedValue(null);
      prisma.attempt.findMany.mockResolvedValue([]);
      prisma.result.findMany.mockResolvedValue([
        {
          id: 1,
          score: 85,
          examId: 5,
          studentId: 12,
          createdAt: new Date(),
          exam: { id: 5, title: "NCC A-Cert Exam" },
          student: {
            id: 12,
            name: "John Cadet",
            regimentalNumber: "REG-01",
            collegeCode: "COL-01",
            college: { name: "Cadet Academy" },
          },
        },
      ]);
      prisma.result.count.mockResolvedValue(1);

      const res = await resultsService.listForStudent(studentId, query);

      expect(prisma.result.findMany).toHaveBeenCalled();
      expect(prisma.result.count).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith(
        "results:student:12:5:p1:l10",
        60,
        expect.any(String)
      );
      expect(res.results[0].studentName).toBe("John Cadet");
    });
  });

  describe("listForInstructor", () => {
    const instructorId = 2;
    const query = { page: "1", limit: "10" };

    it("should resolve collegeCode from Redis metadata cache on instructor metadata hit", async () => {
      redis.get
        .mockResolvedValueOnce("MIT") // metadata cache hit for user collegeCode
        .mockResolvedValueOnce(
          JSON.stringify({
            results: [{ id: 1, score: 95 }],
            pagination: { total: 1 },
          })
        ); // results cache hit

      const res = await resultsService.listForInstructor(instructorId, query);

      expect(redis.get).toHaveBeenNthCalledWith(1, "user:metadata:2");
      expect(redis.get).toHaveBeenNthCalledWith(2, "results:instructor:2:MIT:all:none:p1:l10");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(res.results[0].score).toBe(95);
    });

    it("should resolve collegeCode from DB if Redis metadata is missing, then cache it", async () => {
      redis.get.mockResolvedValue(null); // misses both metadata and results
      prisma.user.findUnique.mockResolvedValue({ id: 2, collegeCode: "MIT" });
      prisma.result.findMany.mockResolvedValue([]);
      prisma.result.count.mockResolvedValue(0);

      await resultsService.listForInstructor(instructorId, query);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: instructorId },
        select: { collegeCode: true },
      });
      expect(redis.setex).toHaveBeenCalledWith("user:metadata:2", 300, "MIT");
      expect(redis.setex).toHaveBeenCalledWith(
        "results:instructor:2:MIT:all:none:p1:l10",
        30,
        expect.any(String)
      );
    });
  });

  describe("examSummary", () => {
    it("should calculate attempts, average, highest and lowest scores properly", async () => {
      prisma.exam.findUnique.mockResolvedValue({
        id: 10,
        title: "Test Exam",
        results: [
          { score: 50 },
          { score: 80 },
          { score: 110 },
        ],
      });

      const summary = await resultsService.examSummary(10);

      expect(summary).toEqual({
        examId: 10,
        title: "Test Exam",
        attempts: 3,
        averageScore: 80.0,
        highestScore: 110,
        lowestScore: 50,
      });
    });

    it("should throw HttpError 404 if exam is not found", async () => {
      prisma.exam.findUnique.mockResolvedValue(null);

      await expect(resultsService.examSummary(99)).rejects.toThrow(
        new HttpError(404, "Exam not found")
      );
    });
  });

  describe("exportExamResultsCsv", () => {
    it("should format exam results correctly as CSV string", async () => {
      prisma.result.findMany.mockResolvedValue([
        {
          id: 1,
          examId: 5,
          studentId: 12,
          score: 85,
          exam: { title: "Excel Exam" },
          student: {
            id: 12,
            name: "John Cadet",
            regimentalNumber: "REG-01",
            collegeCode: "COL-01",
            college: { name: "Cadet Academy" },
          },
        },
      ]);

      const csv = await resultsService.exportExamResultsCsv(5);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("resultId,examId,examTitle,studentId,studentName,regimentalNumber,college,score");
      expect(lines[1]).toBe('"1","5","Excel Exam","12","John Cadet","REG-01","Cadet Academy","85"');
    });
  });
});
