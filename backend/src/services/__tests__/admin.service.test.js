const { getStats, importUsers, resolveAssignmentTargets, processBulkAssignJob, overrideResult } = require('../admin.service');
const { prisma } = require('../../lib/prisma');
const { cacheGetJson, cacheSetJson, cacheDel, cacheDelNamespace } = require('../../lib/cache');
const { logger } = require('../../utils/logger');
const bcrypt = require('bcrypt');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn(), createMany: jest.fn() },
    exam: { count: jest.fn(), findUnique: jest.fn() },
    attempt: { count: jest.fn() },
    result: { aggregate: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    examViolation: { findMany: jest.fn() },
    examHeartbeat: { count: jest.fn() },
    college: { findMany: jest.fn() },
    batch: { findMany: jest.fn() },
    examAssignment: { createMany: jest.fn() },
    notification: { createMany: jest.fn() }
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheGetJson: jest.fn(),
  cacheSetJson: jest.fn(),
  cacheDel: jest.fn().mockResolvedValue(true),
  cacheDelNamespace: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../utils/logger', () => ({
  logger: { audit: jest.fn() }
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password')
}));

describe('admin.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return cached stats if available', async () => {
      cacheGetJson.mockResolvedValueOnce({ cached: true });
      const stats = await getStats({ role: 'ADMIN', id: 1 });
      expect(stats).toEqual({ cached: true });
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('should calculate global stats for ADMIN', async () => {
      cacheGetJson.mockResolvedValueOnce(null);

      prisma.user.count.mockResolvedValue(100);
      prisma.exam.count.mockResolvedValue(10);
      prisma.attempt.count.mockResolvedValue(5);
      prisma.result.aggregate.mockResolvedValue({ _avg: { score: 85.5 } });
      prisma.result.findMany.mockResolvedValue([]);
      prisma.examViolation.findMany.mockResolvedValue([]);
      prisma.examHeartbeat.count.mockResolvedValue(3);

      const stats = await getStats({ role: 'ADMIN', id: 1 });

      expect(stats.totalStudents).toBe(100);
      expect(stats.averageScore).toBe('85.5%');
      expect(cacheSetJson).toHaveBeenCalledWith('stats:dashboard:ADMIN:1', 60, stats);
    });
  });

  describe('importUsers', () => {
    it('should throw an error for an empty CSV', async () => {
      const emptyBuffer = Buffer.from("");
      await expect(importUsers(emptyBuffer, 'test.csv', 1)).rejects.toThrow(HttpError);
    });

    it('should import valid users and skip duplicates/invalid ones', async () => {
      const csvData = "name,regNo,collegeCode\nJohn,R001,C1\nJane,R001,C1\nBob,R003,INVALID";
      const buffer = Buffer.from(csvData);

      // Existing users
      prisma.user.findMany.mockResolvedValue([{ regimentalNumber: 'R001', email: null }]);
      // Valid colleges/batches
      prisma.college.findMany.mockResolvedValue([{ code: 'C1' }]);
      prisma.batch.findMany.mockResolvedValue([]);
      prisma.user.createMany.mockResolvedValue({ count: 0 }); // Jane and John are invalid/dup, Bob is invalid

      const result = await importUsers(buffer, 'test.csv', 1);

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      // R001 exists, R003 invalid college
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('resolveAssignmentTargets', () => {
    it('should throw if examId is not provided', async () => {
      await expect(resolveAssignmentTargets(null, {}, null, {})).rejects.toThrow(HttpError);
    });

    it('should throw if exam is not found', async () => {
      prisma.exam.findUnique.mockResolvedValueOnce(null);
      await expect(resolveAssignmentTargets('1', {}, null, {})).rejects.toThrow('Exam with ID 1 not found');
    });

    it('should resolve specific user IDs if provided', async () => {
      prisma.exam.findUnique.mockResolvedValueOnce({ id: 1, status: 'PUBLISHED', title: 'Test' });
      prisma.user.findMany.mockResolvedValueOnce([{ id: 10 }, { id: 20 }]);

      const result = await resolveAssignmentTargets('1', {}, [10, 20], { role: 'ADMIN' });
      
      expect(result.targetUserIds).toEqual([10, 20]);
      expect(result.examTitle).toBe('Test');
    });
  });

  describe('processBulkAssignJob', () => {
    it('should chunk users, create assignments, notifications, and clear cache', async () => {
      prisma.examAssignment.createMany.mockResolvedValue({ count: 2 });
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await processBulkAssignJob('1', [10, 20], 99, 'Math Test');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(prisma.examAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 10, examId: 1 },
          { userId: 20, examId: 1 }
        ],
        skipDuplicates: true
      });
      expect(logger.audit).toHaveBeenCalledWith('EXAM_BULK_ASSIGN', { examId: '1', count: 2 }, 99);
      expect(cacheDelNamespace).toHaveBeenCalledWith('assignments');
      expect(cacheDelNamespace).toHaveBeenCalledWith('exams:catalog');
      expect(cacheDel).toHaveBeenCalledWith(['student:assignments:10']);
    });
  });

  describe('overrideResult', () => {
    it('should update result score and flush caches', async () => {
      prisma.result.update.mockResolvedValue({
        id: 5, studentId: 10, examId: 1, 
        student: { name: 'John', regimentalNumber: 'R1' },
        exam: { title: 'Math' }
      });

      const result = await overrideResult(5, 95, 'Manual review', 99);

      expect(result.id).toBe(5);
      expect(prisma.result.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { score: 95 },
        include: expect.any(Object)
      });
      expect(logger.audit).toHaveBeenCalledWith('RESULT_OVERRIDE', { resultId: 5, newScore: 95, reason: 'Manual review' }, 99);
      expect(cacheDelNamespace).toHaveBeenCalledWith('results:student:10');
      expect(cacheDelNamespace).toHaveBeenCalledWith('results:admin');
      expect(cacheDel).toHaveBeenCalledWith(['resultreview:10:1', 'student:results:10']);
    });
  });
});
