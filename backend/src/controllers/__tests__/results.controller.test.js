const resultsController = require('../results.controller');
const resultsService = require('../../services/results.service');

jest.mock('../../services/results.service', () => ({
  listForStudent: jest.fn(),
  listForInstructor: jest.fn(),
  listForAdmin: jest.fn(),
  examSummary: jest.fn(),
  exportExamResultsCsv: jest.fn(),
  exportBulkExamResultsCsv: jest.fn(),
  getReviewForStudent: jest.fn(),
  getReviewForAdmin: jest.fn(),
  bulkDeleteResults: jest.fn(),
  bulkEmailResults: jest.fn(),
}));

describe('results.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1, role: 'STUDENT' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
  });

  describe('listAll', () => {
    it('should list for student', async () => {
      resultsService.listForStudent.mockResolvedValueOnce([{ id: 1 }]);
      await resultsController.listAll(req, res);
      expect(resultsService.listForStudent).toHaveBeenCalledWith(1, {});
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('should list for instructor', async () => {
      req.user.role = 'INSTRUCTOR';
      resultsService.listForInstructor.mockResolvedValueOnce([{ id: 1 }]);
      await resultsController.listAll(req, res);
      expect(resultsService.listForInstructor).toHaveBeenCalledWith(1, {});
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('should list for admin', async () => {
      req.user.role = 'ADMIN';
      resultsService.listForAdmin.mockResolvedValueOnce([{ id: 1 }]);
      await resultsController.listAll(req, res);
      expect(resultsService.listForAdmin).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('should return 403 for unknown role', async () => {
      req.user.role = 'UNKNOWN';
      await resultsController.listAll(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('summary', () => {
    it('should return summary', async () => {
      req.params.examId = '1';
      resultsService.examSummary.mockResolvedValueOnce({ avg: 50 });
      await resultsController.summary(req, res);
      expect(resultsService.examSummary).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ avg: 50 });
    });
  });

  describe('exportCsv', () => {
    it('should export csv', async () => {
      req.params.examId = '1';
      resultsService.exportExamResultsCsv.mockResolvedValueOnce('a,b,c');
      await resultsController.exportCsv(req, res);
      expect(resultsService.exportExamResultsCsv).toHaveBeenCalledWith('1');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith('a,b,c');
    });
  });

  describe('exportBulkCsv', () => {
    it('should export bulk csv', async () => {
      resultsService.exportBulkExamResultsCsv.mockResolvedValueOnce('d,e,f');
      await resultsController.exportBulkCsv(req, res);
      expect(resultsService.exportBulkExamResultsCsv).toHaveBeenCalledWith(req.user, req.query);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.send).toHaveBeenCalledWith('d,e,f');
    });
  });

  describe('getReview', () => {
    it('should get review', async () => {
      req.params.examId = '1';
      resultsService.getReviewForStudent.mockResolvedValueOnce({ id: 1 });
      await resultsController.getReview(req, res);
      expect(resultsService.getReviewForStudent).toHaveBeenCalledWith(1, '1');
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('getAdminReview', () => {
    it('should get admin review', async () => {
      req.params.examId = '1';
      req.params.studentId = '2';
      resultsService.getReviewForAdmin.mockResolvedValueOnce({ id: 1 });
      await resultsController.getAdminReview(req, res);
      expect(resultsService.getReviewForAdmin).toHaveBeenCalledWith(2, '1');
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('bulkDelete', () => {
    it('should validate inputs', async () => {
      await resultsController.bulkDelete(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should bulk delete', async () => {
      req.body = { resultIds: [1, 2] };
      resultsService.bulkDeleteResults.mockResolvedValueOnce({ count: 2 });
      await resultsController.bulkDelete(req, res);
      expect(resultsService.bulkDeleteResults).toHaveBeenCalledWith([1, 2]);
      expect(res.json).toHaveBeenCalledWith({ count: 2 });
    });
  });

  describe('bulkEmail', () => {
    it('should validate inputs', async () => {
      await resultsController.bulkEmail(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should bulk email', async () => {
      req.body = { resultIds: [1, 2] };
      resultsService.bulkEmailResults.mockResolvedValueOnce({ count: 2 });
      await resultsController.bulkEmail(req, res);
      expect(resultsService.bulkEmailResults).toHaveBeenCalledWith([1, 2]);
      expect(res.json).toHaveBeenCalledWith({ count: 2 });
    });
  });
});
