const { prisma } = require("../lib/prisma");
const { parsePositiveInt } = require("../utils/validation");
const { HttpError } = require("../utils/http-error");

/**
 * Get comprehensive analytics for a specific exam.
 */
async function getExamAnalytics(examIdRaw) {
  const examId = parsePositiveInt(examIdRaw, "examId");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: true,
      attempts: {
        where: { status: "COMPLETED" },
        include: { student: { select: { id: true, name: true, regimentalNumber: true } } }
      }
    }
  });

  if (!exam) throw new HttpError(404, "Exam not found");

  const maxPossible = exam.questions.reduce((sum, q) => sum + (q.marks || exam.positiveMarks || 4), 0);

  const totalAttempts = exam.attempts.length;
  if (totalAttempts === 0) {
    return {
      overview: { totalAttempts: 0, averageScore: 0, highestScore: 0, lowestScore: 0, maxPossible },
      topicPerformance: [],
      scoreDistribution: [],
      qdi: []
    };
  }

  // Calculate Overview
  const scores = exam.attempts.map(a => a.score || 0).sort((a, b) => a - b);
  const averageScore = scores.reduce((sum, s) => sum + s, 0) / totalAttempts;
  
  // Create Score Distribution Histogram (ranges of 10%)
  const distribution = new Array(10).fill(0);
  
  scores.forEach(s => {
    let percentage = (s / (maxPossible || 1)) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    let bucket = Math.floor(percentage / 10);
    if (bucket === 10) bucket = 9; // 100% goes into the 90-100 bucket
    distribution[bucket]++;
  });

  const scoreDistribution = distribution.map((count, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    count
  }));

  const { normalizeAnswer } = require("./exam-scoring.service");

  const questionStats = {};
  exam.questions.forEach(q => {
    questionStats[q.id] = {
      id: q.id,
      text: q.question || "",
      topic: q.topic || "General",
      correctCount: 0,
      attempts: 0
    };
  });

  exam.attempts.forEach(attempt => {
    const answers = typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : (attempt.answers || {});
    
    exam.questions.forEach(q => {
      const studentAnswer = answers[String(q.id)];
      if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== "") {
        questionStats[q.id].attempts++;
        const correctAnswer = normalizeAnswer(q.answer);
        const normalizedStudent = normalizeAnswer(studentAnswer);

        if (normalizedStudent === correctAnswer) {
          questionStats[q.id].correctCount++;
        }
      }
    });
  });

  const qdiList = [];
  const topicMap = {};

  Object.values(questionStats).forEach(stat => {
    const qdi = stat.attempts > 0 ? (stat.correctCount / stat.attempts) : 0;
    qdiList.push({
      questionId: stat.id,
      qdi: parseFloat(qdi.toFixed(2)),
      topic: stat.topic
    });

    if (!topicMap[stat.topic]) {
      topicMap[stat.topic] = { totalQDI: 0, count: 0 };
    }
    topicMap[stat.topic].totalQDI += qdi;
    topicMap[stat.topic].count += 1;
  });

  const topicPerformance = Object.keys(topicMap).map(topic => ({
    topic,
    averageQDI: parseFloat((topicMap[topic].totalQDI / topicMap[topic].count).toFixed(2)),
    performancePercentage: parseFloat(((topicMap[topic].totalQDI / topicMap[topic].count) * 100).toFixed(1))
  }));

  return {
    overview: {
      totalAttempts,
      averageScore: parseFloat(averageScore.toFixed(2)),
      highestScore: scores[scores.length - 1],
      lowestScore: scores[0],
      maxPossible
    },
    topicPerformance,
    scoreDistribution,
    qdi: qdiList.sort((a, b) => a.qdi - b.qdi) // Sort by hardest first
  };
}

module.exports = {
  getExamAnalytics
};
