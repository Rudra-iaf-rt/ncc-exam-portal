const groupController = require('../group.controller');
const { prisma } = require('../../lib/prisma');
const { cacheGetJson, cacheSetJson, cacheDel } = require('../../lib/cache');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    candidateGroup: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    }
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheGetJson: jest.fn(),
  cacheSetJson: jest.fn(),
  cacheDel: jest.fn()
}));

describe('group.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  describe('listGroups', () => {
    it('should return cached groups', async () => {
      cacheGetJson.mockResolvedValueOnce([{ id: 1 }]);
      await groupController.listGroups(req, res);
      
      expect(cacheGetJson).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ groups: [{ id: 1 }] });
      expect(prisma.candidateGroup.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from db and cache if not cached', async () => {
      cacheGetJson.mockResolvedValueOnce(null);
      prisma.candidateGroup.findMany.mockResolvedValueOnce([{
        id: 1, name: 'G1', _count: { colleges: 1 }, colleges: [{ collegeCode: 'C1' }], members: [], createdBy: { name: 'Admin' }
      }]);
      prisma.user.count.mockResolvedValueOnce(10); // 10 cadets

      await groupController.listGroups(req, res);

      expect(prisma.candidateGroup.findMany).toHaveBeenCalled();
      expect(prisma.user.count).toHaveBeenCalled();
      expect(cacheSetJson).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        groups: [
          expect.objectContaining({ id: 1, memberCount: 10 })
        ]
      });
    });
  });

  describe('getGroup', () => {
    it('should throw if group not found', async () => {
      req.params.id = '1';
      prisma.candidateGroup.findUnique.mockResolvedValueOnce(null);
      
      await groupController.getGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return group', async () => {
      req.params.id = '1';
      prisma.candidateGroup.findUnique.mockResolvedValueOnce({ id: 1 });
      
      await groupController.getGroup(req, res);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('createGroup', () => {
    it('should validate inputs', async () => {
      req.body = { name: '' };
      await groupController.createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(500); // zod error goes to 500 in this catch block since no custom status mapping is fully generic
    });

    it('should reject duplicate name', async () => {
      req.body = { name: 'Group A' };
      prisma.candidateGroup.findUnique.mockResolvedValueOnce({ id: 1 });
      
      await groupController.createGroup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create group and clear cache', async () => {
      req.body = { name: 'Group A', memberIds: [2], collegeCodes: ['C1'] };
      prisma.candidateGroup.findUnique.mockResolvedValueOnce(null);
      prisma.candidateGroup.create.mockResolvedValueOnce({ id: 2 });
      
      await groupController.createGroup(req, res);
      
      expect(prisma.candidateGroup.create).toHaveBeenCalled();
      expect(cacheDel).toHaveBeenCalledWith(["cache:groups:list"]);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe('updateGroup', () => {
    it('should update group and clear cache', async () => {
      req.params.id = '1';
      req.body = { name: 'Group B', memberIds: [], collegeCodes: [] };
      prisma.candidateGroup.findFirst.mockResolvedValueOnce(null);
      prisma.candidateGroup.update.mockResolvedValueOnce({ id: 1 });
      
      await groupController.updateGroup(req, res);
      
      expect(prisma.candidateGroup.update).toHaveBeenCalled();
      expect(cacheDel).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('deleteGroup', () => {
    it('should delete group and clear cache', async () => {
      req.params.id = '1';
      await groupController.deleteGroup(req, res);
      
      expect(prisma.candidateGroup.delete).toHaveBeenCalled();
      expect(cacheDel).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('bulkDisable', () => {
    it('should validate inputs', async () => {
      await groupController.bulkDisable(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should disable groups and clear cache', async () => {
      req.body = { groupIds: [1, 2] };
      await groupController.bulkDisable(req, res);
      
      expect(prisma.candidateGroup.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { isActive: false }
      });
      expect(cacheDel).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 2 });
    });
  });

  describe('bulkEnable', () => {
    it('should enable groups and clear cache', async () => {
      req.body = { groupIds: [1, 2] };
      await groupController.bulkEnable(req, res);
      
      expect(prisma.candidateGroup.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { isActive: true }
      });
      expect(cacheDel).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 2 });
    });
  });
});
