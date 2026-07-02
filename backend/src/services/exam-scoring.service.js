/**
 * Pure exam scoring helpers (no I/O). Used when submitting an attempt.
 */

function normalizeAnswer(value) {
  return String(value ?? "").trim();
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Strip correct answers from exam payload for student-facing responses.
 * @param {import("@prisma/client").Exam & { questions: import("@prisma/client").Question[] }} exam
 * @param {number} userId - Used to seed the shuffle deterministically
 */
function stripAnswersFromExam(exam, userId) {
  const sessionSeed = userId ? hashCode(`${userId}-${exam.id}`) : 0;

  return {
    id: exam.id,
    title: exam.title,
    duration: exam.duration,
    questions: exam.questions.map((q) => {
      const shuffledOptions = 
        q.type === 'SUBJECTIVE' || !q.options?.length || !userId
          ? q.options
          : seededShuffle(q.options, hashCode(`${sessionSeed}-${q.id}`));

      return {
        id: q.id,
        question: q.question,
        type: q.type ?? 'MCQ',
        topic: q.topic ?? null,
        options: shuffledOptions,
      };
    }),
  };
}

/**
 * @param {Array<{ id: number; answer: string }>} questions
 * @param {Array<{ questionId?: unknown; selectedAnswer?: unknown }>} answersInput
 * @returns {{ score: number; correct: number; total: number }}
 */
function scoreSubmission(questions, answersInput, examConfig = {}) {
  const {
    negativeMarking = false,
    positiveMarks = 4,
    negativeMarks = 1.0,
  } = examConfig;

  const autoScoredTypes = ['MCQ', 'FILL_IN_THE_BLANK'];
  const autoScoredQuestions = questions.filter(q => autoScoredTypes.includes(q.type ?? 'MCQ'));

  const answerMap = new Map();
  for (const a of answersInput) {
    if (a == null || a.questionId == null) continue;
    answerMap.set(Number(a.questionId), normalizeAnswer(a.selectedAnswer));
  }

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const total = autoScoredQuestions.length;

  for (const q of autoScoredQuestions) {
    const selected = answerMap.get(q.id);
    if (selected !== undefined && selected !== "") {
      const qType = q.type ?? 'MCQ';
      const isCorrect = qType === 'FILL_IN_THE_BLANK'
        ? normalizeAnswer(selected).toLowerCase() === normalizeAnswer(q.answer).toLowerCase()
        : selected === q.answer;

      if (isCorrect) {
        correct++;
      } else {
        wrong++;
      }
    } else {
      skipped++;
    }
  }

  const rawScore = (correct * positiveMarks) - (negativeMarking ? wrong * negativeMarks : 0);
  const maxScore = total * positiveMarks;
  let score = maxScore === 0 ? 0 : Math.round((rawScore / maxScore) * 100);
  if (score < 0) score = 0;

  return { 
    score, 
    correct, 
    wrong, 
    skipped, 
    total, 
    rawScore, 
    maxScore,
    totalQuestions: questions.length,
    totalAutoScored: autoScoredQuestions.length,
    hasPendingSubjective: questions.some(q => q.type === 'SUBJECTIVE')
  };
}

module.exports = {
  normalizeAnswer,
  stripAnswersFromExam,
  scoreSubmission,
};
