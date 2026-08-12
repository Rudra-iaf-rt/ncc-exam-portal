const { getUnitLeaderboard, getStudentUnitRank } = require('../leaderboard.service');
const { prisma } = require('../../lib/prisma');
const { cacheGetJson, cacheSetJson, withCacheLock } = require('../../lib/cache');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    result: { groupBy: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() }
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheGetJson: jest.fn(),
  cacheSetJson: jest.fn(),
  withCacheLock: jest.fn().mockImplementation(async (key, ttl, cb) => cb())
}));

describe('leaderboard.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUnitLeaderboard', () => {
    it('should return empty array if collegeCode is not provided', async () => {
      const res = await getUnitLeaderboard(null);
      expect(res).toEqual([]);
    });

    it('should return cached data if available', async () => {
      cacheGetJson.mockResolvedValueOnce([{ studentId: 1 }]);
      const res = await getUnitLeaderboard('C1');
      expect(res).toEqual([{ studentId: 1 }]);
      expect(withCacheLock).not.toHaveBeenCalled();
    });

    it('should return empty if lock is not acquired', async () => {
      cacheGetJson.mockResolvedValueOnce(null);
      withCacheLock.mockResolvedValueOnce(null); // lock not acquired

      const res = await getUnitLeaderboard('C1');
      expect(res).toEqual([]);
    });

    it('should return fresh cached data if populated during lock wait', async () => {
      cacheGetJson.mockResolvedValueOnce(null); // first check
      withCacheLock.mockImplementationOnce(async (k, t, cb) => {
        cacheGetJson.mockResolvedValueOnce([{ studentId: 2 }]); // double check inside lock
        return cb();
      });

      const res = await getUnitLeaderboard('C1');
      expect(res).toEqual([{ studentId: 2 }]);
      expect(prisma.result.groupBy).not.toHaveBeenCalled();
    });

    it('should build and cache leaderboard for qualified students', async () => {
      cacheGetJson.mockResolvedValueOnce(null); // first check
      cacheGetJson.mockResolvedValueOnce(null); // double check

      // Qualified > 2 exams, Unqualified < 2 exams
      prisma.result.groupBy.mockResolvedValueOnce([
        { studentId: 1, _count: { _all: 3 }, _sum: { score: 270 } }, // 90 avg
        { studentId: 2, _count: { _all: 2 }, _sum: { score: 100 } }, // 50 avg
        { studentId: 3, _count: { _all: 1 }, _sum: { score: 90 } } // not qualified
      ]);

      prisma.user.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Alice', regimentalNumber: 'R1', collegeCode: 'C1' },
        { id: 2, name: 'Bob', regimentalNumber: 'R2', collegeCode: 'C1' }
      ]);

      const res = await getUnitLeaderboard('C1');

      expect(res.length).toBe(2);
      expect(res[0].name).toBe('Alice');
      expect(res[0].averageScore).toBe(90);
      expect(res[0].rank).toBe(1);

      expect(res[1].name).toBe('Bob');
      expect(res[1].averageScore).toBe(50);
      expect(res[1].rank).toBe(2);

      expect(cacheSetJson).toHaveBeenCalledWith('leaderboard:unit:C1', 86400, res, 'leaderboard:unit');
    });

    it('should return empty array if no students qualify', async () => {
      cacheGetJson.mockResolvedValueOnce(null); // first check
      cacheGetJson.mockResolvedValueOnce(null); // double check

      prisma.result.groupBy.mockResolvedValueOnce([
        { studentId: 3, _count: { _all: 1 }, _sum: { score: 90 } } // not qualified
      ]);

      const res = await getUnitLeaderboard('C1');

      expect(res.length).toBe(0);
      expect(cacheSetJson).toHaveBeenCalledWith('leaderboard:unit:C1', 86400, [], 'leaderboard:unit');
    });
  });

  describe('getStudentUnitRank', () => {
    it('should return rank from leaderboard if ranked', async () => {
      cacheGetJson.mockResolvedValueOnce([
        { studentId: 1, rank: 1, name: 'Alice', averageScore: 90 }
      ]);

      const res = await getStudentUnitRank(1, 'C1');

      expect(res.isRanked).toBe(true);
      expect(res.rank).toBe(1);
      expect(res.name).toBe('Alice');
      expect(res.totalRankedCadets).toBe(1);
    });

    it('should fetch personal stats if not ranked', async () => {
      cacheGetJson.mockResolvedValueOnce([
        { studentId: 2, rank: 1, name: 'Bob', averageScore: 90 }
      ]); // Alice is not here

      prisma.user.findUnique.mockResolvedValueOnce({
        results: [{ score: 80 }, { score: 90 }] // avg 85, 2 taken
      });

      const res = await getStudentUnitRank(1, 'C1');

      expect(res.isRanked).toBe(false);
      expect(res.rank).toBeNull();
      expect(res.averageScore).toBe(85);
      expect(res.examsTaken).toBe(2);
      expect(res.examsNeeded).toBe(0); // MIN_EXAMS_REQUIRED is 2
    });

    it('should handle zero exams taken when fetching personal stats', async () => {
      cacheGetJson.mockResolvedValueOnce([]); // empty leaderboard

      prisma.user.findUnique.mockResolvedValueOnce({
        results: [] // avg 0, 0 taken
      });

      const res = await getStudentUnitRank(1, 'C1');

      expect(res.isRanked).toBe(false);
      expect(res.averageScore).toBe(0);
      expect(res.examsTaken).toBe(0);
      expect(res.examsNeeded).toBe(2);
    });

    it('should throw if student not found', async () => {
      cacheGetJson.mockResolvedValueOnce([]);
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(getStudentUnitRank(1, 'C1')).rejects.toThrow('Student not found');
    });
  });
});
