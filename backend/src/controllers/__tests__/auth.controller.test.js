const authController = require('../auth.controller');
const authService = require('../../services/auth.service');
const auditLogService = require('../../services/audit-log.service');
const { issueCsrfToken } = require('../../middleware/csrf');
const { features } = require('../../config/features');

jest.mock('../../services/auth.service');
jest.mock('../../services/audit-log.service');
jest.mock('../../middleware/csrf');

jest.mock('../../config/features', () => ({
  features: { cookieAuth: true }
}));

describe('auth.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 1 },
      body: {},
      params: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
    auditLogService.recordAudit.mockResolvedValue();
  });

  describe('register', () => {
    it('should register student and set cookies', async () => {
      req.body = { email: 'test@test.com' };
      const payload = { user: { id: 2 }, token: 'acc', refreshToken: 'ref' };
      authService.registerStudent.mockResolvedValueOnce(payload);

      await authController.register(req, res);

      expect(authService.registerStudent).toHaveBeenCalledWith(req.body);
      expect(res.cookie).toHaveBeenCalledWith('ncc_access_token', 'acc', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith('ncc_refresh_token', 'ref', expect.any(Object));
      expect(issueCsrfToken).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(payload);
    });
  });

  describe('loginStudent', () => {
    it('should login student and set cookies', async () => {
      req.body = { email: 'test@test.com' };
      const payload = { user: { id: 2 }, token: 'acc', refreshToken: 'ref' };
      authService.loginStudent.mockResolvedValueOnce(payload);

      await authController.loginStudent(req, res);

      expect(authService.loginStudent).toHaveBeenCalledWith(req.body);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(payload);
    });
  });
  
  describe('loginStaff', () => {
    it('should login staff', async () => {
      const payload = { user: { id: 2 }, token: 'acc', refreshToken: 'ref' };
      authService.loginStaff.mockResolvedValueOnce(payload);

      await authController.loginStaff(req, res);

      expect(authService.loginStaff).toHaveBeenCalledWith(req.body);
      expect(res.json).toHaveBeenCalledWith(payload);
    });
  });

  describe('refreshWithToken', () => {
    it('should refresh using cookie token', async () => {
      req.cookies.ncc_refresh_token = 'cookie_token';
      const payload = { user: { id: 2 }, token: 'acc2', refreshToken: 'ref2' };
      authService.refreshSessionWithToken.mockResolvedValueOnce(payload);

      await authController.refreshWithToken(req, res);

      expect(authService.refreshSessionWithToken).toHaveBeenCalledWith('cookie_token');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(payload);
    });
  });

  describe('logout', () => {
    it('should logout and clear cookies', async () => {
      req.cookies.ncc_refresh_token = 'cookie_token';
      authService.logoutWithRefreshToken.mockResolvedValueOnce({ ok: true });

      await authController.logout(req, res);

      expect(authService.logoutWithRefreshToken).toHaveBeenCalledWith('cookie_token');
      expect(res.clearCookie).toHaveBeenCalledWith('ncc_access_token', expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith('ncc_refresh_token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
    
    it('should logout all if no token provided', async () => {
      authService.logoutAllForUser.mockResolvedValueOnce({ ok: true });

      await authController.logout(req, res);

      expect(authService.logoutAllForUser).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  describe('me', () => {
    it('should return me', async () => {
      const user = { id: 1, name: 'Alice' };
      authService.getMe.mockResolvedValueOnce(user);
      await authController.me(req, res);
      expect(authService.getMe).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ user });
    });
  });
});
