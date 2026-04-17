/**
 * Pure exam scoring helpers (no I/O). Used when submitting an attempt.
 */

function normalizeAnswer(value) {
  return String(value ?? "").trim();
}

/**
 * Strip correct answers from exam payload for student-facing responses.
 * @param {import("@prisma/client").Exam & { questions: import("@prisma/client").Question[] }} exam
 */
function stripAnswersFromExam(exam) {
  return {
    id: exam.id,
    title: exam.title,
    duration: exam.duration,
    questions: exam.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
  };
}

/**
 * @param {Array<{ id: number; answer: string }>} questions
 * @param {Array<{ questionId?: unknown; selectedAnswer?: unknown }>} answersInput
 * @returns {{ score: number; correct: number; total: number }}
 */
function scoreSubmission(questions, answersInput) {
  const answerMap = new Map();
  for (const a of answersInput) {
    if (a == null || a.questionId == null) continue;
    answerMap.set(Number(a.questionId), normalizeAnswer(a.selectedAnswer));
  }

  let correct = 0;
  const total = questions.length;

  for (const q of questions) {
    const selected = answerMap.get(q.id);
    if (selected !== undefined && selected === normalizeAnswer(q.answer)) {
      correct++;
    }
  }

  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { score, correct, total };
}

module.exports = {
  normalizeAnswer,
  stripAnswersFromExam,
  scoreSubmission,
};
