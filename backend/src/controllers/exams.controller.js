const examService = require("../services/exam.service");

async function create(req, res) {
  const exam = await examService.createExam(req.user.id, req.body ?? {});
  res.status(201).json({ exam });
}

async function createFromPdf(req, res) {
  const file = req.file;
  if (!file?.buffer) {
    return res.status(400).json({ error: "PDF file is required (field name: pdf)" });
  }
  const title = req.body?.title;
  const duration = req.body?.duration;
  const exam = await examService.createExamFromPdf(req.user.id, {
    title,
    duration,
    pdfBuffer: file.buffer,
  });
  res.status(201).json({ exam });
}

async function createFromExcel(req, res) {
  const file = req.file;
  if (!file?.buffer) {
    return res.status(400).json({ error: "Excel file is required (field name: file)" });
  }
  const title = req.body?.title;
  const duration = req.body?.duration;
  const exam = await examService.createExamFromExcel(req.user.id, {
    title,
    duration,
    excelBuffer: file.buffer,
  });
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

async function saveAnswer(req, res) {
  const payload = await examService.saveAttemptAnswer(req.user.id, req.body ?? {});
  res.json(payload);
}

async function submit(req, res) {
  const payload = await examService.submitExam(req.user.id, req.body ?? {});
  res.json(payload);
}

module.exports = {
  create,
  createFromPdf,
  createFromExcel,
  listCatalog,
  getOne,
  startAttempt,
  saveAnswer,
  submit,
};
