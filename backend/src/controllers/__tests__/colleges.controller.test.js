const { list, create, update, deactivate } = require('../colleges.controller');
const collegesService = require('../../services/colleges.service');

jest.mock('../../services/colleges.service');

describe('colleges.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { role: 'INSTRUCTOR' },
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('list', () => {
    it('should list active colleges for instructors', async () => {
      req.user.role = 'INSTRUCTOR';
      const collegesList = [{ id: 1, name: 'C1' }];
      collegesService.listColleges.mockResolvedValueOnce(collegesList);

      await list(req, res);

      expect(collegesService.listColleges).toHaveBeenCalled();
      expect(collegesService.listCollegesAll).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ colleges: collegesList });
    });

    it('should list all colleges for admins', async () => {
      req.user.role = 'ADMIN';
      const collegesList = [{ id: 1, name: 'C1' }, { id: 2, name: 'C2', isActive: false }];
      collegesService.listCollegesAll.mockResolvedValueOnce(collegesList);

      await list(req, res);

      expect(collegesService.listCollegesAll).toHaveBeenCalled();
      expect(collegesService.listColleges).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ colleges: collegesList });
    });
  });

  describe('create', () => {
    it('should create a college', async () => {
      req.body = { name: 'C1', code: 'C01' };
      const college = { id: 1, name: 'C1' };
      collegesService.createCollege.mockResolvedValueOnce(college);

      await create(req, res);

      expect(collegesService.createCollege).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ college });
    });
  });

  describe('update', () => {
    it('should update a college', async () => {
      req.params.id = '1';
      req.body = { name: 'C1 Updated' };
      const college = { id: 1, name: 'C1 Updated' };
      collegesService.updateCollege.mockResolvedValueOnce(college);

      await update(req, res);

      expect(collegesService.updateCollege).toHaveBeenCalledWith('1', req.body);
      expect(res.json).toHaveBeenCalledWith({ college });
    });
  });

  describe('deactivate', () => {
    it('should deactivate a college', async () => {
      req.params.id = '1';
      const college = { id: 1, isActive: false };
      collegesService.deactivateCollege.mockResolvedValueOnce(college);

      await deactivate(req, res);

      expect(collegesService.deactivateCollege).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ college });
    });
  });
});
