const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");
const { withCacheLock, cacheSetJson, cacheGetJson, trackKey } = require("../lib/cache");

const MIN_EXAMS_REQUIRED = 2;
const LEADERBOARD_TTL = 86400; // 24 hours

/**
 * Calculates and caches the unit leaderboard for a specific college.
 * Uses a DB-level groupBy aggregation (no full user+results in-memory load)
 * and a stampede lock to prevent concurrent cache rebuilds.
 *
 * @param {string} collegeCode - The college/unit code
 */
const getUnitLeaderboard = async (collegeCode) => {
  if (!collegeCode) return [];

  const cacheKey = `leaderboard:unit:${collegeCode}`;

  // 1. Try cache first (wrapped in the timeout guard via cacheGetJson)
  const cached = await cacheGetJson(cacheKey);
  if (cached) return cached;

  // 2. Cache miss — acquire a stampede lock so only one process rebuilds.
  //    Other concurrent requests get null back and we return an empty array
  //    as the lightweight fallback (they'll retry on the next request once
  //    the lock holder has populated the cache).
  const leaderboard = await withCacheLock(
    `leaderboard_rebuild:${collegeCode}`,
    async () => {
      // Double-check: another process may have populated the cache while we
      // were waiting for the lock.
      const freshCached = await cacheGetJson(cacheKey);
      if (freshCached) return freshCached;

      return _buildLeaderboard(collegeCode);
    },
    15 // lock TTL: 15s — enough for the aggregation query to complete
  );

  // Lock not acquired (another rebuild in progress) — return empty as fallback
  if (leaderboard === null) return [];

  return leaderboard;
};

/**
 * Runs the DB aggregation and stores the result in the cache.
 * Separated so it can be called cleanly inside the stampede lock.
 */
async function _buildLeaderboard(collegeCode) {
  // Aggregate scores per student directly in the DB — avoids loading all
  // result rows into Node memory (O(students × exams) vs. O(ranked_students)).
  const isGlobal = collegeCode === "HQ001";

  const studentWhere = {
    role: "STUDENT",
    isActive: true,
    ...(isGlobal ? {} : { collegeCode }),
  };

  // Step 1: Aggregate result counts + sums per student using groupBy
  const aggregated = await prisma.result.groupBy({
    by: ["studentId"],
    where: {
      student: studentWhere,
    },
    _count: { _all: true },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
  });

  // Step 2: Filter to students who have taken the minimum number of exams
  const qualified = aggregated.filter(
    (row) => row._count._all >= MIN_EXAMS_REQUIRED
  );

  if (qualified.length === 0) {
    await cacheSetJson(`leaderboard:unit:${collegeCode}`, LEADERBOARD_TTL, [], "leaderboard:unit");
    return [];
  }

  // Step 3: Fetch only the profile fields we need, for the qualified student IDs
  const qualifiedIds = qualified.map((r) => r.studentId);
  const students = await prisma.user.findMany({
    where: { id: { in: qualifiedIds } },
    select: {
      id: true,
      name: true,
      regimentalNumber: true,
      collegeCode: true,
      wing: true,
    },
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Step 4: Build and rank the leaderboard in memory (only qualified students)
  let leaderboard = qualified
    .map((row) => {
      const student = studentMap.get(row.studentId);
      if (!student) return null;
      const examsTaken = row._count._all;
      const totalScore = row._sum.score ?? 0;
      const averageScore = Math.round(totalScore / examsTaken);
      return {
        studentId: student.id,
        name: student.name,
        regimentalNumber: student.regimentalNumber,
        collegeCode: student.collegeCode,
        wing: student.wing,
        averageScore,
        examsTaken,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      return b.examsTaken - a.examsTaken;
    })
    .map((cadet, index) => ({ rank: index + 1, ...cadet }));

  // Step 5: Cache the result — tracked under the leaderboard:unit namespace
  //         so cacheDelNamespace("leaderboard:unit") can invalidate it on
  //         results publish.
  await cacheSetJson(
    `leaderboard:unit:${collegeCode}`,
    LEADERBOARD_TTL,
    leaderboard,
    "leaderboard:unit"
  );

  return leaderboard;
}

/**
 * Gets the specific rank and stats for a single student in their unit.
 * @param {number} studentId
 * @param {string} collegeCode
 */
const getStudentUnitRank = async (studentId, collegeCode) => {
  const leaderboard = await getUnitLeaderboard(collegeCode);

  const studentStats = leaderboard.find((c) => c.studentId === parseInt(studentId));

  if (studentStats) {
    return {
      isRanked: true,
      ...studentStats,
      totalRankedCadets: leaderboard.length,
    };
  }

  // Not in leaderboard — fetch their personal stats (single small query)
  const student = await prisma.user.findUnique({
    where: { id: parseInt(studentId) },
    select: {
      results: { select: { score: true } },
    },
  });

  if (!student) throw new Error("Student not found");

  const examsTaken = student.results.length;
  let averageScore = 0;
  if (examsTaken > 0) {
    const totalScore = student.results.reduce((sum, res) => sum + res.score, 0);
    averageScore = Math.round(totalScore / examsTaken);
  }

  return {
    isRanked: false,
    rank: null,
    examsTaken,
    averageScore,
    examsNeeded: Math.max(0, MIN_EXAMS_REQUIRED - examsTaken),
    totalRankedCadets: leaderboard.length,
  };
};

module.exports = {
  getUnitLeaderboard,
  getStudentUnitRank,
};
