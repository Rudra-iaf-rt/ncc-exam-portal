const { prisma } = require("../lib/prisma");
const { parsePositiveInt } = require("../utils/validation");
const { HttpError } = require("../utils/http-error");
const { cacheGetJson, cacheSetJson } = require("../lib/cache");
const { normalizeAnswer } = require("./exam-scoring.service");

async function getExamAnalytics(examIdRaw) {
  const examId = parsePositiveInt(examIdRaw, "examId");
  
  const cacheKey = `analytics:exam:${examId}`;
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { 
      positiveMarks: true, 
      questions: true 
    }
  });

  if (!exam) throw new HttpError(404, "Exam not found");

  const [agg, resultsData, attemptsData] = await Promise.all([
    prisma.result.aggregate({
      where: { examId },
      _count: { _all: true },
      _avg: { score: true },
      _max: { score: true },
      _min: { score: true },
    }),
    prisma.result.findMany({
      where: { examId },
      select: { score: true }
    }),
    prisma.attempt.findMany({
      where: { examId, status: { in: ["SUBMITTED", "TIMED_OUT", "TERMINATED"] } },
      select: { answers: true }
    })
  ]);

  const maxPossible = exam.questions.reduce((sum, q) => sum + (q.marks || exam.positiveMarks || 4), 0);
  const totalAttempts = attemptsData.length;

  if (totalAttempts === 0) {
    const emptyStats = {
      overview: { totalAttempts: 0, averageScore: 0, highestScore: 0, lowestScore: 0, maxPossible },
      topicPerformance: [],
      scoreDistribution: [],
      qdi: [],
      topPerformers: []
    };
    cacheSetJson(cacheKey, 300, emptyStats);
    return emptyStats;
  }

  // Score Distribution Histogram (ranges of 10%)
  const distribution = new Array(10).fill(0);
  resultsData.forEach(r => {
    let percentage = r.score;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    let bucket = Math.floor(percentage / 10);
    if (bucket === 10) bucket = 9;
    distribution[bucket]++;
  });

  const scoreDistribution = distribution.map((count, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    count
  }));

  const questionStats = {};
  exam.questions.forEach(q => {
    questionStats[q.id] = {
      id: q.id,
      text: q.question || "",
      topic: q.topic || "General",
      options: q.options || [],
      answer: q.answer || "",
      correctCount: 0,
      attempts: 0
    };
  });

  attemptsData.forEach(attempt => {
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
      topic: stat.topic,
      text: stat.text,
      options: stat.options,
      answer: stat.answer,
      attempts: stat.attempts,
      correctCount: stat.correctCount
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

  // Top 5% Cadets Leaderboard - explicit fast query
  const totalResults = agg._count._all || 1;
  const top5PercentCount = Math.max(5, Math.ceil(totalResults * 0.05));
  const topPerformersData = await prisma.result.findMany({
    where: { examId },
    take: top5PercentCount,
    orderBy: { score: 'desc' },
    select: {
      score: true,
      student: { select: { name: true, regimentalNumber: true } }
    }
  });

  const topPerformers = topPerformersData.map(r => ({
    name: r.student.name,
    regimentalNumber: r.student.regimentalNumber,
    score: r.score
  }));

  const responsePayload = {
    overview: {
      totalAttempts,
      averageScore: Math.round(agg._avg.score || 0),
      highestScore: agg._max.score || 0,
      lowestScore: agg._min.score || 0,
      maxPossible
    },
    topPerformers,
    topicPerformance,
    scoreDistribution,
    qdi: qdiList.sort((a, b) => a.qdi - b.qdi)
  };

  // Cache for 5 minutes
  cacheSetJson(cacheKey, 300, responsePayload);

  return responsePayload;
}

module.exports = {
  getExamAnalytics
};
