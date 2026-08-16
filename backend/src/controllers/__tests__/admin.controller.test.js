const adminController = require('../admin.controller');
const adminService = require('../../services/admin.service');
const monitorService = require('../../services/monitor.service');
const analyticsService = require('../../services/analytics.service');
const { prisma } = require('../../lib/prisma');
const { cacheGetJson, cacheSetJson, cacheDelNamespace } = require('../../lib/cache');
const { ROLES } = require('../../middleware/roles');

jest.mock('../../services/admin.service');
jest.mock('../../services/monitor.service');
jest.mock('../../services/analytics.service');
jest.mock('../../services/leaderboard.service');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), updateMany: jest.fn() },
    examAssignment: { findMany: jest.fn(), delete: jest.fn() },
    batch: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
    result: { findMany: jest.fn() },
    $transaction: jest.fn()
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheGetJson: jest.fn(),
  cacheSetJson: jest.fn(),
  cacheDelNamespace: jest.fn().mockResolvedValue()
}));

describe('admin.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1, role: ROLES.ADMIN },
      body: {},
      params: {},
      file: undefined
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
  });

  describe('getStats', () => {
    it('should return admin stats', async () => {
      adminService.getStats.mockResolvedValueOnce({ users: 10 });
      await adminController.getStats(req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      expect(adminService.getStats).toHaveBeenCalledWith(req.user);
      expect(res.json).toHaveBeenCalledWith({ users: 10 });
    });
  });

  describe('importUsers', () => {
    it('should handle missing file', async () => {
      await adminController.importUsers(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
    });

    it('should process import for admin', async () => {
      req.file = { buffer: Buffer.from('test'), originalname: 'test.csv' };
      adminService.importUsers.mockResolvedValueOnce({ success: 2 });
      await adminController.importUsers(req, res);
      
      expect(adminService.importUsers).toHaveBeenCalledWith(req.file.buffer, req.file.originalname, 1);
      expect(res.json).toHaveBeenCalledWith({ success: 2 });
    });

    it('should reject non-admin', async () => {
      req.user.role = ROLES.INSTRUCTOR;
      await adminController.importUsers(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('listAssignments', () => {
    it('should return cached assignments', async () => {
      cacheGetJson.mockResolvedValueOnce([{ id: 1 }]);
      await adminController.listAssignments(req, res);
      
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
      expect(prisma.examAssignment.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache assignments', async () => {
      cacheGetJson.mockResolvedValueOnce(null);
      prisma.examAssignment.findMany.mockResolvedValueOnce([
        { id: 1, user: { name: 'Alice', collegeCode: 'C1' } }
      ]);

      await adminController.listAssignments(req, res);
      
      expect(prisma.examAssignment.findMany).toHaveBeenCalled();
      expect(cacheSetJson).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 1 })
      ]));
    });
  });

  describe('createAssignments', () => {
    it('should queue assignments in background', async () => {
      req.body = { examId: 10, userIds: [2, 3] };
      adminService.resolveAssignmentTargets.mockResolvedValueOnce({ targetUserIds: [2, 3], examTitle: 'Exam 1' });
      adminService.processBulkAssignJob.mockResolvedValueOnce({ count: 2 });

      await adminController.createAssignments(req, res);
      
      expect(adminService.processBulkAssignJob).toHaveBeenCalledWith(
        10, [2, 3], 1, 'Exam 1'
      );
      
      expect(res.status).toHaveBeenCalledWith(202);
    });
  });

  describe('listBatches', () => {
    it('should fetch batches', async () => {
      prisma.batch.findMany.mockResolvedValueOnce([{ name: '2025' }]);
      await adminController.listBatches(req, res);
      expect(res.json).toHaveBeenCalledWith([{ name: '2025' }]);
    });
  });

  describe('createBatch', () => {
    it('should create batch', async () => {
      req.body = { name: ' 2026 ' };
      prisma.batch.create.mockResolvedValueOnce({ id: 1, name: '2026' });
      await adminController.createBatch(req, res);
      
      expect(prisma.batch.create).toHaveBeenCalledWith({ data: { name: '2026' } });
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: '2026' });
    });
  });
  
  describe('overrideResult', () => {
    it('should override result', async () => {
      req.params.id = '1';
      req.body = { score: 90, reason: 'test' };
      adminService.overrideResult.mockResolvedValueOnce({ ok: true });
      await adminController.overrideResult(req, res);
      
      expect(adminService.overrideResult).toHaveBeenCalledWith(1, 90, 'test', 1);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('getUserStats', () => {
    it('should calculate stats correctly', async () => {
      req.params.id = '2';
      prisma.result.findMany.mockResolvedValueOnce([
        { score: 80 }, { score: 90 }
      ]);
      const leaderboardService = require('../../services/leaderboard.service');
      prisma.user.findUnique.mockResolvedValueOnce({ collegeCode: 'C1' }); // For cadet
      leaderboardService.getStudentUnitRank.mockResolvedValueOnce({ rank: 5 });

      await adminController.getUserStats(req, res);

      expect(res.json).toHaveBeenCalledWith({
        examsTaken: 2,
        avgScore: 85,
        bestScore: 90,
        globalRank: '#5'
      });
    });
  });
});
