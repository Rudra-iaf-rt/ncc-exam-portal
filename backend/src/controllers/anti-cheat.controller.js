const antiCheatService = require("../services/anti-cheat.service");
const auditLogService = require("../services/audit-log.service");

async function violation(req, res) {
  const payload = await antiCheatService.reportViolation(req.user.id, req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "ANTI_CHEAT_VIOLATION",
    entityType: "ExamViolation",
    entityId: payload.id,
    statusCode: 201,
  });
  res.status(201).json(payload);
}

async function heartbeat(req, res) {
  const payload = await antiCheatService.heartbeat(req.user.id, req.body ?? {});
  res.json(payload);
}

async function flags(req, res) {
  const payload = await antiCheatService.listFlagsByExam(req.params.examId);
  res.json({ flags: payload });
}

module.exports = {
  violation,
  heartbeat,
  flags,
};
