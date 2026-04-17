const examService = require("../services/exam.service");

async function create(req, res) {
  const exam = await examService.createExam(req.user.id, req.body ?? {});
  res.status(201).json({ exam });
}

async function listCatalog(_req, res) {
  const exams = await examService.listExamsCatalog();
  res.json({ exams });
}

async function getOne(req, res) {
  const examId = Number(req.params.id);
  const exam = await examService.getExamForStudent(examId);
  res.json(exam);
}

async function startAttempt(req, res) {
  const result = await examService.startAttempt(req.user.id, req.body?.examId);
  res.status(result.status).json(result.body);
}

async function submit(req, res) {
  const payload = await examService.submitExam(req.user.id, req.body ?? {});
  res.json(payload);
}

module.exports = {
  create,
  listCatalog,
  getOne,
  startAttempt,
  submit,
};
