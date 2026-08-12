const { getLiveMonitorData } = require('../monitor.service');
const { prisma } = require('../../lib/prisma');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    attempt: { findMany: jest.fn() },
    examViolation: { findMany: jest.fn() },
    examHeartbeat: { findMany: jest.fn() }
  }
}));

describe('monitor.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLiveMonitorData', () => {
    it('should throw HttpError if examId is invalid', async () => {
      await expect(getLiveMonitorData('invalid')).rejects.toThrow(HttpError);
    });

    it('should aggregate active sessions from attempts, violations, and heartbeats', async () => {
      prisma.attempt.findMany.mockResolvedValueOnce([
        {
          studentId: 1,
          status: 'IN_PROGRESS',
          expiresAt: new Date('2025-01-01T12:00:00Z'),
          student: { id: 1, name: 'Alice', regimentalNumber: 'R1' }
        },
        {
          studentId: 2,
          status: 'SUBMITTED',
          score: 80,
          expiresAt: new Date('2025-01-01T12:00:00Z'),
          student: { id: 2, name: 'Bob', regimentalNumber: 'R2' }
        }
      ]);

      prisma.examViolation.findMany.mockResolvedValueOnce([
        { studentId: 1, type: 'TAB_SWITCH' },
        { studentId: 1, type: 'BLUR' }
      ]);

      prisma.examHeartbeat.findMany.mockResolvedValueOnce([
        { studentId: 1, lastSeenAt: new Date('2025-01-01T11:00:00Z'), activeQuestionIndex: 5 }
      ]);

      const res = await getLiveMonitorData('1');

      expect(res.activeSessions.length).toBe(2);

      const alice = res.activeSessions.find(s => s.studentId === 1);
      expect(alice.name).toBe('Alice');
      expect(alice.status).toBe('IN_PROGRESS');
      expect(alice.warnings).toBe(2); // Two violations
      expect(alice.latestWarningType).toBe('BLUR'); // Last one aggregated
      expect(alice.activeQuestionIndex).toBe(5);

      const bob = res.activeSessions.find(s => s.studentId === 2);
      expect(bob.name).toBe('Bob');
      expect(bob.status).toBe('SUBMITTED');
      expect(bob.score).toBe(80);
      expect(bob.warnings).toBe(0);
      expect(bob.activeQuestionIndex).toBe(0);
    });
  });
});
