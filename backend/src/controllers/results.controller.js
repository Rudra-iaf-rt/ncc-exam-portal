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

async function summary(req, res) {
  const payload = await resultsService.examSummary(req.params.examId);
  res.json(payload);
}

async function exportCsv(req, res) {
  const csv = await resultsService.exportExamResultsCsv(req.params.examId);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="exam-${encodeURIComponent(req.params.examId)}-results.csv"`
  );
  res.send(csv);
}

async function listAll(req, res) {
  const role = req.user.role;
  if (role === "STUDENT") {
    return listStudent(req, res);
  } else if (role === "INSTRUCTOR") {
    return listInstructor(req, res);
  } else if (role === "ADMIN") {
    return listAdmin(req, res);
  }
  res.status(403).json({ error: "Unauthorized role" });
}

module.exports = {
  listStudent,
  listInstructor,
  listAdmin,
  summary,
  exportCsv,
  listAll,
};
