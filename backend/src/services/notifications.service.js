const { HttpError } = require("../utils/http-error");

const notifications = [];

async function sendNotification(senderId, body = {}) {
  const { message, userId } = body;
  if (!message || String(message).trim() === "") {
    throw new HttpError(400, "message is required");
  }
  const item = {
    id: notifications.length + 1,
    message: String(message).trim(),
    userId: userId == null ? null : Number(userId),
    sentBy: senderId,
    createdAt: new Date().toISOString(),
  };
  notifications.push(item);
  return item;
}

async function listNotifications(userId) {
  return notifications.filter((n) => n.userId == null || n.userId === userId);
}

module.exports = {
  sendNotification,
  listNotifications,
};
