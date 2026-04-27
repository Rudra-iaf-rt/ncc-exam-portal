const authService = require("../services/auth.service");
const auditLogService = require("../services/audit-log.service");

async function register(req, res) {
  const payload = await authService.registerStudent(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_REGISTER_STUDENT",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 201,
  });
  res.status(201).json(payload);
}

async function loginStudent(req, res) {
  const payload = await authService.loginStudent(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_LOGIN_STUDENT",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 200,
  });
  res.json(payload);
}

async function loginStaff(req, res) {
  const payload = await authService.loginStaff(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_LOGIN_STAFF",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 200,
  });
  res.json(payload);
}

async function me(req, res) {
  const user = await authService.getMe(req.user.id);
  res.json({ user });
}

async function refresh(req, res) {
  const payload = await authService.refreshSession(req.user.id);
  await auditLogService.recordAudit(req, {
    action: "AUTH_REFRESH",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 200,
  });
  res.json(payload);
}

async function refreshWithToken(req, res) {
  const payload = await authService.refreshSessionWithToken(req.body?.refreshToken);
  await auditLogService.recordAudit(req, {
    action: "AUTH_REFRESH_TOKEN_ROTATE",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 200,
  });
  res.json(payload);
}

async function forgotPassword(req, res) {
  await authService.requestPasswordReset(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_FORGOT_PASSWORD",
    entityType: "User",
    entityId: null,
    statusCode: 200,
  });
  res.json({ ok: true });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_RESET_PASSWORD",
    entityType: "User",
    entityId: null,
    statusCode: 200,
  });
  res.json({ ok: true });
}

async function logout(req, res) {
  const payload = await authService.logoutWithRefreshToken(req.body?.refreshToken);
  await auditLogService.recordAudit(req, {
    action: "AUTH_LOGOUT",
    entityType: "User",
    entityId: req.user?.id ?? null,
    statusCode: 200,
  });
  res.json(payload);
}
async function changePassword(req, res) {
  await authService.changePassword({
    userId: req.user.id,
    ...(req.body ?? {}),
  });
  await auditLogService.recordAudit(req, {
    action: "AUTH_CHANGE_PASSWORD",
    entityType: "User",
    entityId: req.user.id,
    statusCode: 200,
  });
  res.json({ ok: true });
}

module.exports = {
  register,
  loginStudent,
  loginStaff,
  me,
  refresh,
  refreshWithToken,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
};
