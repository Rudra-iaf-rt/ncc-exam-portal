const examsController = require('../exams.controller');
const examService = require('../../services/exam.service');
const auditLogService = require('../../services/audit-log.service');

jest.mock('../../services/exam.service');
jest.mock('../../services/audit-log.service');

describe('exams.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1, role: 'INSTRUCTOR' },
      body: {},
      params: {},
      query: {},
      file: undefined
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    auditLogService.recordAudit.mockResolvedValue();
  });

  describe('create', () => {
    it('should create an exam', async () => {
      examService.createExam.mockResolvedValueOnce({ id: 10 });
      req.body = { title: 'Test' };
      
      await examsController.create(req, res);
      
      expect(examService.createExam).toHaveBeenCalledWith(1, { title: 'Test' });
      expect(auditLogService.recordAudit).toHaveBeenCalledWith(req, expect.objectContaining({ action: 'EXAM_CREATE' }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ exam: { id: 10 } });
    });
  });

  describe('createFromPdf', () => {
    it('should handle missing pdf', async () => {
      await examsController.createFromPdf(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create from pdf', async () => {
      req.file = { buffer: Buffer.from('pdf') };
      req.body = { title: 'PDF Exam', duration: '60', negativeMarking: 'true', negativeMarks: '0.25' };
      examService.createExamFromPdf.mockResolvedValueOnce({ id: 11 });
      
      await examsController.createFromPdf(req, res);
      
      expect(examService.createExamFromPdf).toHaveBeenCalledWith(1, {
        title: 'PDF Exam',
        duration: '60',
        negativeMarking: true,
        negativeMarks: 0.25,
        pdfBuffer: req.file.buffer
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('createFromExcel', () => {
    it('should handle missing excel', async () => {
      await examsController.createFromExcel(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should create from excel', async () => {
      req.file = { buffer: Buffer.from('excel') };
      req.body = { title: 'Excel Exam' };
      examService.createExamFromExcel.mockResolvedValueOnce({ id: 12 });
      
      await examsController.createFromExcel(req, res);
      expect(examService.createExamFromExcel).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listCatalog', () => {
    it('should return catalog', async () => {
      examService.listExamsCatalog.mockResolvedValueOnce([{ id: 1 }]);
      await examsController.listCatalog(req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", expect.any(String));
      expect(examService.listExamsCatalog).toHaveBeenCalledWith(1, 'INSTRUCTOR', {});
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe('getOne', () => {
    it('should get exam for student', async () => {
      req.params.id = '1';
      examService.getExamForStudent.mockResolvedValueOnce({ id: 1 });
      await examsController.getOne(req, res);
      expect(examService.getExamForStudent).toHaveBeenCalledWith(1);
    });
  });

  describe('getOneStaff', () => {
    it('should get exam for staff', async () => {
      req.params.id = '1';
      examService.getExamForStaff.mockResolvedValueOnce({ id: 1 });
      await examsController.getOneStaff(req, res);
      expect(examService.getExamForStaff).toHaveBeenCalledWith(1);
    });
  });

  describe('startAttempt', () => {
    it('should start attempt', async () => {
      examService.startAttempt.mockResolvedValueOnce({ status: 200, body: { ok: true } });
      await examsController.startAttempt(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('saveAnswer', () => {
    it('should save answer', async () => {
      examService.saveAttemptAnswer.mockResolvedValueOnce({ saved: true });
      await examsController.saveAnswer(req, res);
      expect(res.json).toHaveBeenCalledWith({ saved: true });
    });
  });

  describe('submit', () => {
    it('should submit exam', async () => {
      examService.submitExam.mockResolvedValueOnce({ submitted: true });
      await examsController.submit(req, res);
      expect(res.json).toHaveBeenCalledWith({ submitted: true });
    });
  });

  describe('publish', () => {
    it('should publish exam', async () => {
      req.params.id = '1';
      examService.publishExamByCreator.mockResolvedValueOnce({ id: 1, status: 'LIVE' });
      await examsController.publish(req, res);
      expect(examService.publishExamByCreator).toHaveBeenCalledWith(1, '1');
    });

    it('should update status if provided', async () => {
      req.params.id = '1';
      req.body = { status: 'ARCHIVED' };
      examService.updateExamMetaByCreator.mockResolvedValueOnce({ id: 1, status: 'ARCHIVED' });
      await examsController.publish(req, res);
      expect(examService.updateExamMetaByCreator).toHaveBeenCalledWith(1, '1', { status: 'ARCHIVED' });
    });
  });

  describe('bulkStatus', () => {
    it('should validate inputs', async () => {
      await examsController.bulkStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should bulk update status', async () => {
      req.body = { examIds: [1, 2], status: 'ARCHIVED' };
      examService.bulkUpdateStatusByCreator.mockResolvedValueOnce({ count: 2 });
      await examsController.bulkStatus(req, res);
      expect(examService.bulkUpdateStatusByCreator).toHaveBeenCalledWith(1, [1, 2], 'ARCHIVED');
    });
  });
});
