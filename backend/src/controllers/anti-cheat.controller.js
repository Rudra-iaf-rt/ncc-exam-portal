const antiCheatService = require("../services/anti-cheat.service");

async function violation(req, res) {
  const payload = await antiCheatService.reportViolation(req.user.id, req.body ?? {});
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
