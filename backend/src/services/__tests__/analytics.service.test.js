const { getExamAnalytics } = require('../analytics.service');
const { prisma } = require('../../lib/prisma');
const { cacheGetJson, cacheSetJson } = require('../../lib/cache');
const { HttpError } = require('../../utils/http-error');
const { mockDeep, mockReset } = require('jest-mock-extended');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    exam: {
      findUnique: jest.fn()
    },
    result: {
      aggregate: jest.fn(),
      findMany: jest.fn()
    },
    attempt: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheGetJson: jest.fn(),
  cacheSetJson: jest.fn()
}));

jest.mock('../../utils/validation', () => ({
  parsePositiveInt: jest.fn()
}));

describe('analytics.service - getExamAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const { parsePositiveInt } = require('../../utils/validation');
    parsePositiveInt.mockImplementation((val) => {
      const num = Number(val);
      if (!Number.isFinite(num) || num <= 0) throw new HttpError(400, 'Invalid');
      return num;
    });
  });

  it('should return cached analytics if available', async () => {
    const cachedData = { overview: { totalAttempts: 10 } };
    cacheGetJson.mockResolvedValueOnce(cachedData);

    const result = await getExamAnalytics('1');

    expect(cacheGetJson).toHaveBeenCalledWith('analytics:exam:1');
    expect(result).toEqual(cachedData);
    expect(prisma.exam.findUnique).not.toHaveBeenCalled();
  });

  it('should throw HttpError 404 if exam is not found', async () => {
    cacheGetJson.mockResolvedValueOnce(null);
    prisma.exam.findUnique.mockResolvedValueOnce(null);

    await expect(getExamAnalytics('1')).rejects.toThrow(HttpError);
    await expect(getExamAnalytics('1')).rejects.toThrow('Exam not found');
  });

  it('should return empty stats if exam exists but has zero attempts', async () => {
    cacheGetJson.mockResolvedValueOnce(null);
    prisma.exam.findUnique.mockResolvedValueOnce({
      positiveMarks: 4,
      questions: [{ id: 1, marks: 4 }, { id: 2, marks: 2 }] // max possible = 6
    });
    prisma.result.aggregate.mockResolvedValueOnce({ _count: { _all: 0 }, _avg: {}, _max: {}, _min: {} });
    prisma.result.findMany.mockResolvedValueOnce([]);
    prisma.attempt.findMany.mockResolvedValueOnce([]); // 0 attempts

    const result = await getExamAnalytics('1');

    expect(result.overview.totalAttempts).toBe(0);
    expect(result.overview.maxPossible).toBe(6);
    expect(cacheSetJson).toHaveBeenCalledWith('analytics:exam:1', 300, result);
  });

  it('should calculate QDI, distribution, and topic performance correctly', async () => {
    cacheGetJson.mockResolvedValueOnce(null);
    
    // Exam with 2 questions
    prisma.exam.findUnique.mockResolvedValueOnce({
      positiveMarks: 4,
      questions: [
        { id: 101, topic: 'Math', answer: 'A' },
        { id: 102, topic: 'Science', answer: 'B' }
      ]
    });

    prisma.result.aggregate.mockResolvedValueOnce({
      _count: { _all: 2 },
      _avg: { score: 75 },
      _max: { score: 100 },
      _min: { score: 50 },
    });

    prisma.result.findMany.mockResolvedValueOnce([
      { score: 100 }, { score: 50 }
    ]);

    prisma.attempt.findMany.mockResolvedValueOnce([
      { answers: '{"101":"A","102":"B"}' }, // 100% correct
      { answers: { "101": "B", "102": "B" } } // 50% correct (101 wrong, 102 right)
    ]);

    // This handles the top performers query
    prisma.result.findMany.mockResolvedValueOnce([
      { score: 100, student: { name: 'Alice', regimentalNumber: 'REG01' } }
    ]);

    const result = await getExamAnalytics('1');

    // Overview
    expect(result.overview.totalAttempts).toBe(2);
    expect(result.overview.averageScore).toBe(75);
    expect(result.overview.highestScore).toBe(100);
    expect(result.overview.lowestScore).toBe(50);

    // Distribution (100% goes to bucket 9, 50% goes to bucket 5)
    expect(result.scoreDistribution[5].count).toBe(1);
    expect(result.scoreDistribution[9].count).toBe(1);
    expect(result.scoreDistribution[0].count).toBe(0);

    // QDI
    // Q101: 1 correct out of 2 attempts -> QDI = 0.5
    // Q102: 2 correct out of 2 attempts -> QDI = 1.0
    const qdi101 = result.qdi.find(q => q.questionId === 101);
    expect(qdi101.qdi).toBe(0.5);
    
    const qdi102 = result.qdi.find(q => q.questionId === 102);
    expect(qdi102.qdi).toBe(1);

    // Topic performance
    const mathTopic = result.topicPerformance.find(t => t.topic === 'Math');
    expect(mathTopic.averageQDI).toBe(0.5);

    const scienceTopic = result.topicPerformance.find(t => t.topic === 'Science');
    expect(scienceTopic.averageQDI).toBe(1.0);

    // Top performers
    expect(result.topPerformers.length).toBe(1);
    expect(result.topPerformers[0].name).toBe('Alice');

    expect(cacheSetJson).toHaveBeenCalledWith('analytics:exam:1', 300, result);
  });
});
