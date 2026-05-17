const { HttpError } = require("../utils/http-error");
const { prisma } = require("../lib/prisma");

async function sendNotification(senderId, body = {}) {
  const { message, userId } = body;
  if (!message || String(message).trim() === "") {
    throw new HttpError(400, "message is required");
  }
  const parsedUserId =
    userId == null || userId === "" ? null : Number(userId);
  if (parsedUserId != null && !Number.isFinite(parsedUserId)) {
    throw new HttpError(400, "userId must be a number");
  }

  const item = await prisma.notification.create({
    data: {
      message: String(message).trim(),
      userId: parsedUserId,
      sentById: senderId,
    },
  });
  return item;
}

async function listNotifications(userId, query = {}) {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    OR: [{ userId: null }, { userId }],
  };

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  sendNotification,
  listNotifications,
};
