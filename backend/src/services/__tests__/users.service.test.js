const { 
  createUser, updateUser, listUsers, listInstructors, 
  createInstructor, bulkImportCadets, searchUsers, 
  getFilters, getUserById, deleteUserById, 
  adminResetUserPassword, bulkUpdateManageExams, bulkDisableUsers 
} = require('../users.service');
const { prisma } = require('../../lib/prisma');
const { cacheDel, cacheGetJson, cacheSetJson } = require('../../lib/cache');
const bcrypt = require('bcrypt');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    result: { deleteMany: jest.fn() },
    attempt: { deleteMany: jest.fn() },
    examAssignment: { deleteMany: jest.fn() },
    batch: { findMany: jest.fn() },
    candidateGroup: { findMany: jest.fn() },
    $transaction: jest.fn()
  }
}));

jest.mock('../../lib/cache', () => ({
  cacheDel: jest.fn().mockResolvedValue(),
  cacheGetJson: jest.fn().mockResolvedValue(null),
  cacheSetJson: jest.fn().mockResolvedValue()
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password')
}));

jest.mock('../../config/features', () => ({
  features: { softDeleteUsers: false }
}));

const mockSanitizedUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

jest.mock('../auth.service', () => ({
  sanitizeUser: jest.fn().mockImplementation((user) => {
    if (!user) return user;
    const { password, ...rest } = user;
    return rest;
  })
}));

describe('users.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => cb(prisma));
  });

  describe('createUser', () => {
    it('should create a student user', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 1, name: 'Alice', regimentalNumber: 'R1', collegeCode: 'C1', password: 'hashed' });

      const res = await createUser({ name: 'Alice', regimentalNumber: 'R1', college: 'C1' }, { role: 'ADMIN' });
      
      expect(prisma.user.create).toHaveBeenCalled();
      expect(res.id).toBe(1);
      expect(res.name).toBe('Alice');
      expect(res.password).toBeUndefined(); // Sanitize check
      expect(cacheDel).toHaveBeenCalledWith(['cache:colleges:active', 'cache:colleges:all']);
    });

    it('should throw if regimental number or email exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 2 });
      await expect(createUser({ name: 'Alice', regimentalNumber: 'R1' })).rejects.toThrow('User with this Regimental Number or Email already exists');
    });

    it('should handle creation by instructor', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 5, collegeCode: 'C5' }); // Instructor record
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 1, collegeCode: 'C5' });

      const res = await createUser({ name: 'Alice', regimentalNumber: 'R1' }, { id: 5, role: 'INSTRUCTOR' });
      
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          collegeCode: 'C5',
          role: 'STUDENT'
        })
      }));
    });
  });

  describe('updateUser', () => {
    it('should update user and handle password hashing', async () => {
      prisma.user.update.mockResolvedValueOnce({ id: 1, name: 'Alice Updated', isActive: true });

      await updateUser(1, { name: 'Alice Updated', password: 'newpass' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(cacheDel).toHaveBeenCalledWith(['user:metadata:1']);
    });

    it('should revoke sessions if deactivated', async () => {
      prisma.user.update.mockResolvedValueOnce({ id: 1, isActive: false });

      await updateUser(1, { isActive: false });

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      });
    });

    it('should throw if regimental number conflict on update', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 2 }); // Conflict
      await expect(updateUser(1, { regimentalNumber: 'R1' })).rejects.toThrow('Regimental Number or Email already in use');
    });
  });

  describe('bulkImportCadets', () => {
    it('should import cadets and skip existing', async () => {
      prisma.user.findMany.mockResolvedValueOnce([{ regimentalNumber: 'R1' }]); // R1 exists
      prisma.user.createMany.mockResolvedValueOnce({ count: 1 });

      const payload = [
        { name: 'Alice', regimentalNumber: 'R1', collegeCode: 'C1' }, // Exists
        { name: 'Bob', regimentalNumber: 'R2', collegeCode: 'C1' },   // Will insert
        { name: 'Invalid' } // Missing fields
      ];

      const res = await bulkImportCadets(payload, { role: 'ADMIN' });
      
      expect(res.success).toBe(1);
      expect(res.failed).toBe(2);
      expect(res.errors.length).toBe(2);
      expect(prisma.user.createMany).toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination and search', async () => {
      prisma.user.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Alice', collegeCode: 'C1' }
      ]);
      prisma.user.count.mockResolvedValueOnce(1);

      const res = await listUsers({ search: 'Ali', page: '1', limit: '10' });
      
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { OR: expect.any(Array) }
          ])
        })
      }));
      expect(res.users.length).toBe(1);
      expect(res.pagination.total).toBe(1);
    });
  });

  describe('deleteUserById', () => {
    it('should hard delete if softDelete is false', async () => {
      const { features } = require('../../config/features');
      features.softDeleteUsers = false;

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });

      await deleteUserById(1);

      expect(prisma.result.deleteMany).toHaveBeenCalledWith({ where: { studentId: 1 } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should soft delete if softDelete is true', async () => {
      const { features } = require('../../config/features');
      features.softDeleteUsers = true;

      prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });

      const res = await deleteUserById(1);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false }
      });
      expect(res.softDeleted).toBe(true);
      
      // reset for other tests
      features.softDeleteUsers = false;
    });
  });
  
  describe('bulkDisableUsers', () => {
    it('should disable multiple users and revoke sessions', async () => {
      prisma.user.updateMany.mockResolvedValueOnce({ count: 2 });
      
      const res = await bulkDisableUsers([1, 2]);
      
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { isActive: false }
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: { in: [1, 2] }, revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      });
      expect(res).toBe(2);
    });
  });
});
