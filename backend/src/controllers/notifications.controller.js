const notificationsService = require("../services/notifications.service");

async function send(req, res) {
  const payload = await notificationsService.sendNotification(req.user.id, req.body ?? {});
  res.status(201).json(payload);
}

async function list(req, res) {
  const payload = await notificationsService.listNotifications(req.user.id);
  res.json({ notifications: payload });
}

module.exports = {
  send,
  list,
};
