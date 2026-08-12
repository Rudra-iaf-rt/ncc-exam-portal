const { reportViolation, heartbeat, listFlagsByExam } = require('../anti-cheat.service');
const { prisma } = require('../../lib/prisma');
const { cacheDelPattern, cacheDel, incrementCacheVersion } = require('../../lib/cache');
const { scoreSubmission } = require('../exam-scoring.service');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    attempt: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn()
    },
    examViolation: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    examHeartbeat: {
      upsert: jest.fn()
    },
    exam: {
      findUnique: jest.fn()
    },
    result: {
      upsert: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheDelPattern: jest.fn().mockResolvedValue(),
  cacheDel: jest.fn().mockResolvedValue(),
  incrementCacheVersion: jest.fn().mockResolvedValue()
}));

jest.mock('../exam-scoring.service', () => ({
  scoreSubmission: jest.fn()
}));

describe('anti-cheat.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => {
      if (Array.isArray(cb)) {
        return Promise.all(cb);
      }
      return cb(prisma);
    });
  });

  describe('reportViolation', () => {
    it('should throw an error if type is missing', async () => {
      await expect(reportViolation(1, { examId: '1' })).rejects.toThrow(HttpError);
    });

    it('should create violation without incrementing count if isPenalty=false', async () => {
      prisma.attempt.findUnique.mockResolvedValueOnce({ warningCount: 0, status: 'IN_PROGRESS' });
      prisma.examViolation.create.mockResolvedValueOnce({ id: 1, type: 'BLUR' });

      const res = await reportViolation(1, { examId: '1', type: 'BLUR', isPenalty: false });
      
      expect(prisma.attempt.updateMany).not.toHaveBeenCalled();
      expect(res.warningCount).toBe(0);
      expect(res.terminate).toBe(false);
    });

    it('should increment count and NOT terminate if under threshold', async () => {
      prisma.attempt.findUnique.mockResolvedValueOnce({ warningCount: 1, status: 'IN_PROGRESS' }); // initial
      prisma.examViolation.create.mockResolvedValueOnce({ id: 2, type: 'TAB_SWITCH' });
      prisma.attempt.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.attempt.findUnique.mockResolvedValueOnce({ warningCount: 2 }); // after increment

      const res = await reportViolation(1, { examId: '1', type: 'TAB_SWITCH' });
      
      expect(prisma.attempt.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ warningCount: { lt: 3 } }),
        data: { warningCount: { increment: 1 } }
      });
      expect(res.warningCount).toBe(2);
      expect(res.terminate).toBe(false);
    });

    it('should increment count and terminate if threshold reached', async () => {
      prisma.attempt.findUnique.mockResolvedValueOnce({ warningCount: 2, status: 'IN_PROGRESS' }); // initial
      prisma.examViolation.create.mockResolvedValueOnce({ id: 3, type: 'TAB_SWITCH' });
      prisma.attempt.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.attempt.findUnique.mockResolvedValueOnce({ warningCount: 3 }); // after increment

      // For autoSubmitOnViolation
      prisma.attempt.findUnique.mockResolvedValueOnce({ id: 5, status: 'IN_PROGRESS', answers: { 1: 'A' } }); // second call to findUnique for attempt
      prisma.exam.findUnique.mockResolvedValueOnce({ id: 1, questions: [{ id: 1 }] });
      scoreSubmission.mockReturnValueOnce({ score: 4 });

      const res = await reportViolation(1, { examId: '1', type: 'TAB_SWITCH' });
      
      expect(res.warningCount).toBe(3);
      expect(res.terminate).toBe(true);

      // Wait a tick for the fire-and-forget promise to resolve
      await new Promise(process.nextTick);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(cacheDelPattern).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('should upsert heartbeat and return attempt status', async () => {
      prisma.examHeartbeat.upsert.mockResolvedValueOnce({ activeQuestionIndex: 2 });
      prisma.attempt.findUnique.mockResolvedValueOnce({ status: 'IN_PROGRESS', expiresAt: new Date() });

      const res = await heartbeat(1, { examId: '1', activeQuestionIndex: 2 });

      expect(res.attemptStatus).toBe('IN_PROGRESS');
      expect(prisma.examHeartbeat.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ activeQuestionIndex: 2 }) })
      );
    });
  });

  describe('listFlagsByExam', () => {
    it('should list flags by examId', async () => {
      prisma.examViolation.findMany.mockResolvedValueOnce([{ id: 1 }]);
      const res = await listFlagsByExam('1');
      expect(res.length).toBe(1);
    });
  });
});
