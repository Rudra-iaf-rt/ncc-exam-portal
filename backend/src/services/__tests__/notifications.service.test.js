const { sendNotification, listNotifications } = require('../notifications.service');
const { prisma } = require('../../lib/prisma');
const { HttpError } = require('../../utils/http-error');

jest.mock('../../lib/prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}));

describe('notifications.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should throw HttpError if message is missing', async () => {
      await expect(sendNotification(1, {})).rejects.toThrow('message is required');
      await expect(sendNotification(1, { message: '  ' })).rejects.toThrow('message is required');
    });

    it('should throw HttpError if userId is provided but not a valid number', async () => {
      await expect(sendNotification(1, { message: 'Hello', userId: 'abc' })).rejects.toThrow('userId must be a number');
    });

    it('should create a notification for all users if userId is null/empty', async () => {
      prisma.notification.create.mockResolvedValueOnce({ id: 1, message: 'Hello', userId: null });
      
      const res = await sendNotification(1, { message: ' Hello ' });
      
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          message: 'Hello',
          userId: null,
          sentById: 1
        }
      });
      expect(res.id).toBe(1);
    });

    it('should create a notification for a specific user', async () => {
      prisma.notification.create.mockResolvedValueOnce({ id: 2, message: 'Hi', userId: 42 });
      
      const res = await sendNotification(1, { message: 'Hi', userId: '42' });
      
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          message: 'Hi',
          userId: 42,
          sentById: 1
        }
      });
      expect(res.id).toBe(2);
    });
  });

  describe('listNotifications', () => {
    it('should list notifications with default pagination', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([{ id: 2 }, { id: 1 }]);
      prisma.notification.count.mockResolvedValueOnce(2);

      const res = await listNotifications(42);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { OR: [{ userId: null }, { userId: 42 }] },
        orderBy: { id: 'desc' },
        skip: 0,
        take: 20
      });
      expect(res.notifications.length).toBe(2);
      expect(res.pagination.total).toBe(2);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.limit).toBe(20);
    });

    it('should parse and apply pagination correctly', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([]);
      prisma.notification.count.mockResolvedValueOnce(0);

      await listNotifications(42, { page: '2', limit: '10' });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { OR: [{ userId: null }, { userId: 42 }] },
        orderBy: { id: 'desc' },
        skip: 10,
        take: 10
      });
    });
  });
});
