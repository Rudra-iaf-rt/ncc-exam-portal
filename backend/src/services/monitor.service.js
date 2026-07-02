const { prisma } = require("../lib/prisma");
const { parsePositiveInt } = require("../utils/validation");
const { HttpError } = require("../utils/http-error");

/**
 * Returns a live view of an active exam for the Monitor Wall.
 * Combines Attempt statuses, recent Heartbeats, and active Violations.
 */
async function getLiveMonitorData(examIdRaw) {
  const examId = parsePositiveInt(examIdRaw, "examId");

  const [attempts, violations] = await Promise.all([
    prisma.attempt.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, name: true, regimentalNumber: true } },
      },
    }),
    prisma.examViolation.findMany({
      where: { examId },
      select: {
        studentId: true,
        type: true,
        createdAt: true,
      }
    })
  ]);

  // Aggregate violations by student
  const violationCounts = {};
  violations.forEach(v => {
    if (!violationCounts[v.studentId]) {
      violationCounts[v.studentId] = { count: 0, latestType: null };
    }
    violationCounts[v.studentId].count += 1;
    // As it's unordered, we just take the first we see or we can sort them, but usually we just want count
    violationCounts[v.studentId].latestType = v.type;
  });

  // Get heartbeats
  const heartbeats = await prisma.examHeartbeat.findMany({
    where: { examId }
  });

  const heartbeatMap = {};
  heartbeats.forEach(h => {
    heartbeatMap[h.studentId] = h;
  });

  const activeSessions = attempts.map(attempt => {
    const hb = heartbeatMap[attempt.studentId];
    const vc = violationCounts[attempt.studentId];
    return {
      studentId: attempt.student.id,
      name: attempt.student.name,
      regimentalNumber: attempt.student.regimentalNumber,
      status: attempt.status,
      expiresAt: attempt.expiresAt,
      lastSeenAt: hb ? hb.lastSeenAt : null,
      activeQuestionIndex: hb ? hb.activeQuestionIndex : 0,
      warnings: vc ? vc.count : 0,
      latestWarningType: vc ? vc.latestType : null,
      score: attempt.score
    };
  });

  return { activeSessions };
}

module.exports = {
  getLiveMonitorData
};
