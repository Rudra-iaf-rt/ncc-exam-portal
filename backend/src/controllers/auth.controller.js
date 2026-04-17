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

module.exports = {
  register,
  loginStudent,
  loginStaff,
  me,
};
