const authService = require("../services/auth.service");

async function register(req, res) {
  const { token, user } = await authService.registerStudent(req.body ?? {});
  res.status(201).json({ token, user });
}

async function loginStudent(req, res) {
  const { token, user } = await authService.loginStudent(req.body ?? {});
  res.json({ token, user });
}

async function loginStaff(req, res) {
  const { token, user } = await authService.loginStaff(req.body ?? {});
  res.json({ token, user });
}

async function me(req, res) {
  const user = await authService.getMe(req.user.id);
  res.json({ user });
}

async function refresh(req, res) {
  const payload = await authService.refreshSession(req.user.id);
  res.json(payload);
}

async function forgotPassword(req, res) {
  await authService.requestPasswordReset(req.body ?? {});
  res.json({ ok: true });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body ?? {});
  res.json({ ok: true });
}

module.exports = {
  register,
  loginStudent,
  loginStaff,
  me,
  refresh,
  forgotPassword,
  resetPassword,
};
