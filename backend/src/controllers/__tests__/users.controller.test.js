const usersController = require('../users.controller');
const usersService = require('../../services/users.service');
const auditLogService = require('../../services/audit-log.service');

jest.mock('../../services/users.service', () => ({
  createUser: jest.fn(),
  listUsers: jest.fn(),
  searchUsers: jest.fn(),
  getFilters: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUserById: jest.fn(),
  adminResetUserPassword: jest.fn(),
  listInstructors: jest.fn(),
  createInstructor: jest.fn(),
  bulkImportCadets: jest.fn(),
  bulkUpdateManageExams: jest.fn(),
  bulkDisableUsers: jest.fn(),
}));

jest.mock('../../services/audit-log.service');

describe('users.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    auditLogService.recordAudit.mockResolvedValue();
  });

  describe('createUser', () => {
    it('should create user', async () => {
      req.body = { name: 'Test' };
      usersService.createUser.mockResolvedValueOnce({ id: 2, regimentalNumber: '123' });
      await usersController.createUser(req, res);
      
      expect(usersService.createUser).toHaveBeenCalledWith(req.body, req.user);
      expect(auditLogService.recordAudit).toHaveBeenCalledWith(req, expect.objectContaining({ action: 'USER_CREATE' }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 2, regimentalNumber: '123' });
    });
  });

  describe('listAll', () => {
    it('should list all users', async () => {
      usersService.listUsers.mockResolvedValueOnce([{ id: 2 }]);
      await usersController.listAll(req, res);
      
      expect(usersService.listUsers).toHaveBeenCalledWith({}, req.user);
      expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      usersService.searchUsers.mockResolvedValueOnce([{ id: 2 }]);
      await usersController.searchUsers(req, res);
      
      expect(usersService.searchUsers).toHaveBeenCalledWith({}, req.user);
      expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
    });
  });

  describe('getFilters', () => {
    it('should get filters', async () => {
      usersService.getFilters.mockResolvedValueOnce({ colleges: [] });
      await usersController.getFilters(req, res);
      
      expect(usersService.getFilters).toHaveBeenCalledWith(req.user);
      expect(res.json).toHaveBeenCalledWith({ colleges: [] });
    });
  });

  describe('getById', () => {
    it('should get by id', async () => {
      req.params.id = '2';
      usersService.getUserById.mockResolvedValueOnce({ id: 2 });
      await usersController.getById(req, res);
      
      expect(usersService.getUserById).toHaveBeenCalledWith('2');
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      req.params.id = '2';
      req.body = { name: 'Updated' };
      usersService.updateUser.mockResolvedValueOnce({ id: 2 });
      await usersController.updateUser(req, res);
      
      expect(usersService.updateUser).toHaveBeenCalledWith('2', req.body);
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe('removeById', () => {
    it('should reject deleting self', async () => {
      req.params.id = '1';
      await usersController.removeById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should remove by id', async () => {
      req.params.id = '2';
      usersService.deleteUserById.mockResolvedValueOnce({ id: 2 });
      await usersController.removeById(req, res);
      
      expect(usersService.deleteUserById).toHaveBeenCalledWith('2');
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      req.params.id = '2';
      req.body = { newPassword: 'password' };
      usersService.adminResetUserPassword.mockResolvedValueOnce({ id: 2 });
      await usersController.resetPassword(req, res);
      
      expect(usersService.adminResetUserPassword).toHaveBeenCalledWith('2', 'password');
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe('listInstructors', () => {
    it('should list instructors', async () => {
      usersService.listInstructors.mockResolvedValueOnce([{ id: 3 }]);
      await usersController.listInstructors(req, res);
      
      expect(usersService.listInstructors).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([{ id: 3 }]);
    });
  });

  describe('createInstructor', () => {
    it('should create instructor', async () => {
      req.body = { name: 'Inst' };
      usersService.createInstructor.mockResolvedValueOnce({ id: 3 });
      await usersController.createInstructor(req, res);
      
      expect(usersService.createInstructor).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 3 });
    });
  });

  describe('bulkImportCadets', () => {
    it('should bulk import cadets', async () => {
      req.body = { cadets: [] };
      usersService.bulkImportCadets.mockResolvedValueOnce({ success: 1, failed: 0 });
      await usersController.bulkImportCadets(req, res);
      
      expect(usersService.bulkImportCadets).toHaveBeenCalledWith([], req.user);
      expect(res.json).toHaveBeenCalledWith({ success: 1, failed: 0 });
    });
  });

  describe('bulkUpdateManageExams', () => {
    it('should bulk update', async () => {
      req.body = { enable: true };
      usersService.bulkUpdateManageExams.mockResolvedValueOnce(5);
      await usersController.bulkUpdateManageExams(req, res);
      
      expect(usersService.bulkUpdateManageExams).toHaveBeenCalledWith(true);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 5 }));
    });
  });

  describe('bulkDisable', () => {
    it('should validate inputs', async () => {
      await usersController.bulkDisable(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should bulk disable', async () => {
      req.body = { userIds: [1, 2] };
      usersService.bulkDisableUsers.mockResolvedValueOnce(2);
      await usersController.bulkDisable(req, res);
      
      expect(usersService.bulkDisableUsers).toHaveBeenCalledWith([1, 2]);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
    });
  });
});
