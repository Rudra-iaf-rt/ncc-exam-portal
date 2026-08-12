const notificationsController = require('../notifications.controller');
const notificationsService = require('../../services/notifications.service');
const auditLogService = require('../../services/audit-log.service');

jest.mock('../../services/notifications.service');
jest.mock('../../services/audit-log.service');

describe('notifications.controller', () => {
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

  describe('send', () => {
    it('should send notification', async () => {
      req.body = { message: 'Test' };
      notificationsService.sendNotification.mockResolvedValueOnce({ id: 1 });
      await notificationsController.send(req, res);
      
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(1, req.body);
      expect(auditLogService.recordAudit).toHaveBeenCalledWith(req, expect.objectContaining({ action: 'NOTIFICATION_SEND' }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('list', () => {
    it('should list notifications', async () => {
      notificationsService.listNotifications.mockResolvedValueOnce([{ id: 1 }]);
      await notificationsController.list(req, res);
      
      expect(notificationsService.listNotifications).toHaveBeenCalledWith(1, {});
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });
});
