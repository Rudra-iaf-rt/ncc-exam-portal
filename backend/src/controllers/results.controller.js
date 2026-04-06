const resultsService = require("../services/results.service");

async function listStudent(req, res) {
  const results = await resultsService.listForStudent(req.user.id, req.query);
  res.json({ results });
}

async function listInstructor(req, res) {
  const data = await resultsService.listForInstructor(req.user.id, req.query);
  res.json(data);
}

async function listAdmin(req, res) {
  const results = await resultsService.listForAdmin(req.query);
  res.json({ results });
}

module.exports = {
  listStudent,
  listInstructor,
  listAdmin,
};
