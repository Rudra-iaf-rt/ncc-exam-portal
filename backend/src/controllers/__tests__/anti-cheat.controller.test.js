const { violation, heartbeat, flags } = require('../anti-cheat.controller');
const antiCheatService = require('../../services/anti-cheat.service');
const auditLogService = require('../../services/audit-log.service');

jest.mock('../../services/anti-cheat.service');
jest.mock('../../services/audit-log.service');

describe('anti-cheat.controller', () => {
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
      json: jest.fn()
    };
  });

  describe('violation', () => {
    it('should report violation and create audit log', async () => {
      req.body = { type: 'TAB_SWITCH', examId: 10 };
      const payload = { id: 5, status: 'RECORDED' };
      antiCheatService.reportViolation.mockResolvedValueOnce(payload);

      await violation(req, res);

      expect(antiCheatService.reportViolation).toHaveBeenCalledWith(1, req.body);
      expect(auditLogService.recordAudit).toHaveBeenCalledWith(req, {
        action: 'ANTI_CHEAT_VIOLATION',
        entityType: 'ExamViolation',
        entityId: 5,
        statusCode: 201
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it('should handle undefined body', async () => {
      req.body = undefined;
      const payload = { id: 6 };
      antiCheatService.reportViolation.mockResolvedValueOnce(payload);

      await violation(req, res);

      expect(antiCheatService.reportViolation).toHaveBeenCalledWith(1, {});
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('heartbeat', () => {
    it('should process heartbeat', async () => {
      req.body = { examId: 10 };
      const payload = { status: 'OK' };
      antiCheatService.heartbeat.mockResolvedValueOnce(payload);

      await heartbeat(req, res);

      expect(antiCheatService.heartbeat).toHaveBeenCalledWith(1, req.body);
      expect(res.json).toHaveBeenCalledWith(payload);
    });
  });

  describe('flags', () => {
    it('should list flags by exam id', async () => {
      req.params.examId = '10';
      const flagsList = [{ id: 1, type: 'BLUR' }];
      antiCheatService.listFlagsByExam.mockResolvedValueOnce(flagsList);

      await flags(req, res);

      expect(antiCheatService.listFlagsByExam).toHaveBeenCalledWith('10');
      expect(res.json).toHaveBeenCalledWith({ flags: flagsList });
    });
  });
});
