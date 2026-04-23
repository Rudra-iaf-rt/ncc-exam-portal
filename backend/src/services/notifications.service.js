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

async function listNotifications(userId) {
  return prisma.notification.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
    },
    orderBy: { id: "desc" },
  });
}

module.exports = {
  sendNotification,
  listNotifications,
};
