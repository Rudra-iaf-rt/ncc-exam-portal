const { 
  registerStudent, 
  loginStudent, 
  loginStaff, 
  getMe, 
  refreshSession,
  refreshSessionWithToken,
  requestPasswordReset,
  resetPassword,
  changePassword,
  logoutWithRefreshToken,
  logoutAllForUser
} = require('../auth.service');
const { prisma } = require('../../lib/prisma');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { signToken } = require('../../utils/jwt');
const { cacheGetJson, cacheSetJson, cacheDel } = require('../../lib/cache');
const { sendMail } = require('../mailer.service');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    refreshToken: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    passwordResetToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed')
}));

jest.mock('../../utils/jwt', () => ({
  signToken: jest.fn().mockReturnValue('mock_token')
}));

jest.mock('../../lib/cache', () => ({
  cacheGetJson: jest.fn(),
  cacheSetJson: jest.fn(),
  cacheDel: jest.fn()
}));

jest.mock('../mailer.service', () => ({
  sendMail: jest.fn()
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn().mockReturnValue(Buffer.from('random')),
}));

describe('auth.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => {
      if (typeof cb === 'function') {
        return cb(prisma);
      }
      return Promise.all(cb);
    });
  });

  describe('loginStudent', () => {
    it('should throw if user not found', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(loginStudent({ regimentalNumber: 'R1', password: 'pwd' })).rejects.toThrow('Invalid credentials');
    });

    it('should throw if user inactive', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ isActive: false });
      await expect(loginStudent({ regimentalNumber: 'R1', password: 'pwd' })).rejects.toThrow('Account is disabled');
    });

    it('should throw if password mismatch', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ isActive: true, password: 'hash' });
      bcrypt.compare.mockResolvedValueOnce(false);
      await expect(loginStudent({ regimentalNumber: 'R1', password: 'pwd' })).rejects.toThrow('Invalid credentials');
    });

    it('should issue tokens if successful', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 1, isActive: true, password: 'hash', role: 'STUDENT' });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await loginStudent({ regimentalNumber: 'R1', password: 'pwd' });
      
      expect(res.token).toBe('mock_token');
      expect(res.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('loginStaff', () => {
    it('should issue tokens for admin/instructor', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 2, isActive: true, password: 'hash', role: 'ADMIN' });
      bcrypt.compare.mockResolvedValueOnce(true);

      const res = await loginStaff({ email: 'admin@test.com', password: 'pwd' });
      
      expect(res.token).toBe('mock_token');
      expect(res.user.role).toBe('ADMIN');
    });
  });

  describe('getMe', () => {
    it('should return cached user if available', async () => {
      cacheGetJson.mockResolvedValueOnce({ id: 1, name: 'John' });
      const user = await getMe(1);
      expect(user.name).toBe('John');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in cache', async () => {
      cacheGetJson.mockResolvedValueOnce(null);
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, isActive: true, name: 'John' });
      
      const user = await getMe(1);
      expect(user.name).toBe('John');
      expect(cacheSetJson).toHaveBeenCalledWith('auth:me:1', 300, expect.any(Object));
    });
  });

  describe('refreshSessionWithToken', () => {
    it('should throw if token is invalid or expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
      await expect(refreshSessionWithToken('token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw if token expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({ 
        user: { isActive: true }, 
        expiresAt: new Date(Date.now() - 1000) 
      });
      await expect(refreshSessionWithToken('token')).rejects.toThrow('Refresh token expired');
    });

    it('should issue new tokens and revoke old one if valid', async () => {
      prisma.refreshToken.findUnique.mockResolvedValueOnce({ 
        user: { id: 1, isActive: true }, 
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null
      });

      const res = await refreshSessionWithToken('token');
      expect(res.token).toBe('mock_token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled(); // revoke old
      expect(prisma.refreshToken.create).toHaveBeenCalled(); // create new
    });
  });

  describe('registerStudent', () => {
    it('should throw if user already exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 1 });
      await expect(registerStudent({ regimentalNumber: 'R1', name: 'John', password: 'pwd123' })).rejects.toThrow('User already exists');
    });

    it('should create user and issue tokens', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 1, isActive: true, role: 'STUDENT' });

      const res = await registerStudent({ regimentalNumber: 'R1', name: 'John', password: 'pwd123' });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(res.token).toBe('mock_token');
    });
  });

  describe('password reset', () => {
    it('requestPasswordReset should send email if user found', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 1, email: 'test@test.com', name: 'John' });
      await requestPasswordReset({ email: 'test@test.com' });
      
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(sendMail).toHaveBeenCalled();
    });

    it('resetPassword should fail if token invalid', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce(null);
      await expect(resetPassword({ token: 'tk', newPassword: 'newpass' })).rejects.toThrow('Invalid or expired reset token');
    });

    it('resetPassword should succeed if token valid', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValueOnce({ id: 1, userId: 1, expiresAt: new Date(Date.now() + 10000) });
      
      await resetPassword({ token: 'tk', newPassword: 'newpass' });
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.passwordResetToken.update).toHaveBeenCalled(); // marks used
    });
  });

  describe('changePassword', () => {
    it('should fail if old password mismatch', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, password: 'hash' });
      bcrypt.compare.mockResolvedValueOnce(false);

      await expect(changePassword({ userId: 1, oldPassword: 'old', newPassword: 'newpass' })).rejects.toThrow('Invalid current password');
    });

    it('should update password if correct', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, password: 'hash' });
      bcrypt.compare.mockResolvedValueOnce(true);

      await changePassword({ userId: 1, oldPassword: 'old', newPassword: 'newpass' });
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
  
  describe('logout', () => {
    it('logoutWithRefreshToken should revoke token', async () => {
      await logoutWithRefreshToken('token');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('logoutAllForUser should revoke all user tokens', async () => {
      await logoutAllForUser(1);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      });
    });
  });
});
