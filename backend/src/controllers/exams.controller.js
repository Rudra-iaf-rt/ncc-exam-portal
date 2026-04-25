const examService = require("../services/exam.service");
const auditLogService = require("../services/audit-log.service");

async function create(req, res) {
  const exam = await examService.createExam(req.user.id, req.body ?? {});
  await auditLogService.recordAudit(req, {
    action: "EXAM_CREATE",
    entityType: "Exam",
    entityId: exam.id,
    statusCode: 201,
  });
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
  await auditLogService.recordAudit(req, {
    action: "EXAM_CREATE_FROM_PDF",
    entityType: "Exam",
    entityId: exam.id,
    statusCode: 201,
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
  await auditLogService.recordAudit(req, {
    action: "EXAM_CREATE_FROM_EXCEL",
    entityType: "Exam",
    entityId: exam.id,
    statusCode: 201,
  });
  res.status(201).json({ exam });
}

async function listCatalog(req, res) {
  const exams = await examService.listExamsCatalog(req.user.id, req.user.role);
  res.json({ exams });
}

async function getOne(req, res) {
  const examId = Number(req.params.id);
  const exam = await examService.getExamForStudent(examId);
  res.json(exam);
}

async function getOneStaff(req, res) {
  const examId = Number(req.params.id);
  const exam = await examService.getExamForStaff(examId);
  res.json({ exam });
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
  await auditLogService.recordAudit(req, {
    action: "ATTEMPT_SUBMIT",
    entityType: "Exam",
    entityId: req.body?.examId ?? null,
    statusCode: 200,
  });
  res.json(payload);
}

async function attemptStatus(req, res) {
  const payload = await examService.getAttemptStatus(req.user.id, req.params.examId);
  res.json(payload);
}

async function attemptDetails(req, res) {
  const payload = await examService.getAttemptDetails(req.user.id, req.params.attemptId);
  res.json(payload);
}

async function updateMeta(req, res) {
  try {
    console.log("Updating exam meta:", req.params.id, req.body);
    const exam = await examService.updateExamMetaByCreator(req.user.id, req.params.id, req.body ?? {});
    console.log("Exam updated in DB, recording audit...");
    await auditLogService.recordAudit(req, {
      action: "EXAM_UPDATE_META",
      entityType: "Exam",
      entityId: exam.id,
      statusCode: 200,
    });
    res.json({ exam });
  } catch (err) {
    console.error("updateMeta error:", err);
    throw err;
  }
}

async function replaceQuestions(req, res) {
  const exam = await examService.replaceExamQuestionsByCreator(
    req.user.id,
    req.params.id,
    req.body ?? {}
  );
  await auditLogService.recordAudit(req, {
    action: "EXAM_REPLACE_QUESTIONS",
    entityType: "Exam",
    entityId: exam.id,
    statusCode: 200,
  });
  res.json({ exam });
}

async function publish(req, res) {
  const exam = await examService.publishExamByCreator(req.user.id, req.params.id);
  await auditLogService.recordAudit(req, {
    action: "EXAM_PUBLISH",
    entityType: "Exam",
    entityId: exam.id,
    statusCode: 200,
  });
  res.json({ exam });
}

async function remove(req, res) {
  const payload = await examService.deleteExamByCreator(req.user.id, req.params.id);
  await auditLogService.recordAudit(req, {
    action: "EXAM_DELETE",
    entityType: "Exam",
    entityId: payload.id,
    statusCode: 200,
  });
  res.json(payload);
}

module.exports = {
  create,
  createFromPdf,
  createFromExcel,
  listCatalog,
  getOne,
  getOneStaff,
  startAttempt,
  saveAnswer,
  submit,
  attemptStatus,
  attemptDetails,
  updateMeta,
  replaceQuestions,
  publish,
  remove,
};
