const { HttpError } = require("../utils/http-error");

const violations = [];
const heartbeats = new Map();

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpError(400, `${label} must be a positive number`);
  }
  return n;
}

async function reportViolation(studentId, body = {}) {
  const examId = parsePositiveInt(body.examId, "examId");
  const type = String(body.type || "").trim();
  if (!type) {
    throw new HttpError(400, "type is required");
  }
  const item = {
    id: violations.length + 1,
    studentId,
    examId,
    type,
    message: body.message ? String(body.message) : "",
    createdAt: new Date().toISOString(),
  };
  violations.push(item);
  return item;
}

async function heartbeat(studentId, body = {}) {
  const examId = parsePositiveInt(body.examId, "examId");
  const key = `${studentId}:${examId}`;
  const payload = {
    studentId,
    examId,
    activeQuestionIndex: Number.isFinite(Number(body.activeQuestionIndex))
      ? Math.max(0, Math.floor(Number(body.activeQuestionIndex)))
      : null,
    lastSeenAt: new Date().toISOString(),
  };
  heartbeats.set(key, payload);
  return payload;
}

async function listFlagsByExam(examIdRaw) {
  const examId = parsePositiveInt(examIdRaw, "examId");
  const rows = violations.filter((v) => v.examId === examId);
  return rows;
}

module.exports = {
  reportViolation,
  heartbeat,
  listFlagsByExam,
};
