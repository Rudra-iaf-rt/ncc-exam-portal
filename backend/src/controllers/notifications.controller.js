const notificationsService = require("../services/notifications.service");
const auditLogService = require("../services/audit-log.service");

async function send(req, res) {
  const payload = await notificationsService.sendNotification(req.user.id, req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "NOTIFICATION_SEND",
    entityType: "Notification",
    entityId: payload.id,
    statusCode: 201,
  });
  res.status(201).json(payload);
}

async function list(req, res) {
  const data = await notificationsService.listNotifications(req.user.id, req.query);
  res.json(data);
}

module.exports = {
  send,
  list,
};
