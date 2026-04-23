const usersService = require("../services/users.service");

async function createInstructor(req, res) {
  const user = await usersService.createInstructor(req.body ?? {});
  res.status(201).json({ user });
}

async function listInstructors(_req, res) {
  const users = await usersService.listUsers({ role: "INSTRUCTOR" });
  res.json({ users });
}

async function listAll(req, res) {
  const users = await usersService.listUsers(req.query ?? {});
  res.json({ users });
}

async function getById(req, res) {
  const user = await usersService.getUserById(req.params.id);
  res.json({ user });
}

async function removeById(req, res) {
  const payload = await usersService.deleteUserById(req.params.id);
  res.json(payload);
}

async function resetPassword(req, res) {
  const payload = await usersService.adminResetUserPassword(
    req.params.id,
    req.body?.newPassword
  );
  res.json(payload);
}

module.exports = {
  createInstructor,
  listInstructors,
  listAll,
  getById,
  removeById,
  resetPassword,
};
