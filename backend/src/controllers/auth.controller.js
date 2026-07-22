const authService = require("../services/auth.service");
const auditLogService = require("../services/audit-log.service");
const { features } = require("../config/features");
const { issueCsrfToken } = require("../middleware/csrf");

function setAuthCookies(res, payload) {
  const secure = process.env.NODE_ENV === "production";
  const configuredSameSite = String(process.env.AUTH_COOKIE_SAMESITE || "").trim().toLowerCase();
  const sameSite = configuredSameSite === "none" ? "none" : "lax";
  const cookieSecure = sameSite === "none" ? true : secure;
  res.cookie("ncc_access_token", payload.token, {
    httpOnly: true,
    sameSite,
    secure: cookieSecure,
    path: "/",
    maxAge: 60 * 60 * 1000,
  });
  res.cookie("ncc_refresh_token", payload.refreshToken, {
    httpOnly: true,
    sameSite,
    secure: cookieSecure,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  issueCsrfToken(res);
}

function clearAuthCookies(res) {
  const secure = process.env.NODE_ENV === "production";
  const configuredSameSite = String(process.env.AUTH_COOKIE_SAMESITE || "").trim().toLowerCase();
  const sameSite = configuredSameSite === "none" ? "none" : "lax";
  const cookieSecure = sameSite === "none" ? true : secure;
  res.clearCookie("ncc_access_token", { httpOnly: true, sameSite, secure: cookieSecure, path: "/" });
  res.clearCookie("ncc_refresh_token", { httpOnly: true, sameSite, secure: cookieSecure, path: "/api/auth" });
}

async function register(req, res) {
  const payload = await authService.registerStudent(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_REGISTER_STUDENT",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 201,
  });
  if (features.cookieAuth) {
    setAuthCookies(res, payload);
  }
  res.status(201).json(payload);
}

async function loginStudent(req, res) {
  console.log("Payload", req.body)
  const payload = await authService.loginStudent(req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "AUTH_LOGIN_STUDENT",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 200,
  });
  if (features.cookieAuth) {
    setAuthCookies(res, payload);
  }
  res.json(payload);
}

async function loginStaff(req, res) {
  try {
    console.log("[AUTH] Login staff attempt", { email: req.body?.email });
    const payload = await authService.loginStaff(req.body ?? {});
    
    await auditLogService.recordAudit(req, {
      action: "AUTH_LOGIN_STAFF",
      entityType: "User",
      entityId: payload.user.id,
      statusCode: 200,
    }).catch(err => console.error("[AUDIT] Record failed", err));

    if (features.cookieAuth) {
      setAuthCookies(res, payload);
    }
    res.json(payload);
  } catch (error) {
    console.error("[AUTH] Login failed", { email: req.body?.email, error: error.message });
    throw error;
  }
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
  const refreshToken = req.body?.refreshToken || req.cookies?.ncc_refresh_token;
  const payload = await authService.refreshSessionWithToken(refreshToken);
  await auditLogService.recordAudit(req, {
    action: "AUTH_REFRESH_TOKEN_ROTATE",
    entityType: "User",
    entityId: payload.user.id,
    statusCode: 200,
  });
  if (features.cookieAuth) {
    setAuthCookies(res, payload);
  }
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
  const refreshToken = req.body?.refreshToken || req.cookies?.ncc_refresh_token;
  const payload = refreshToken
    ? await authService.logoutWithRefreshToken(refreshToken)
    : await authService.logoutAllForUser(req.user?.id);
  await auditLogService.recordAudit(req, {
    action: "AUTH_LOGOUT",
    entityType: "User",
    entityId: req.user?.id ?? null,
    statusCode: 200,
  });
  if (features.cookieAuth) {
    clearAuthCookies(res);
  }
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

async function verifyResetToken(req, res) {
  const user = await authService.verifyPasswordResetToken(req.body ?? {});
  res.json({ ok: true, user });
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
  verifyResetToken,
  changePassword,
  logout,
};
