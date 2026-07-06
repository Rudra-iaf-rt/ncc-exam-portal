const { prisma } = require("../lib/prisma");
const { redis } = require("../lib/redis");

/**
 * Calculates and caches the unit leaderboard for a specific college
 * @param {string} collegeCode - The college/unit code
 */
const getUnitLeaderboard = async (collegeCode) => {
  if (!collegeCode) return [];

  const cacheKey = `leaderboard:unit:${collegeCode}`;

  try {
    // 1. Try Cache First
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error("[Redis] Cache read error on leaderboard", err);
  }

  // 2. Fetch all students in the unit (or globally if HQ) with their results
  const whereClause = {
    role: 'STUDENT',
    isActive: true
  };
  
  // If collegeCode is HQ001, we want a global leaderboard (no college filter)
  if (collegeCode !== 'HQ001') {
    whereClause.collegeCode = collegeCode;
  }

  const students = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      regimentalNumber: true,
      collegeCode: true,
      wing: true,
      results: {
        select: {
          score: true
        }
      }
    }
  });

  // 3. Calculate metrics and apply threshold (Min 2 Exams)
  const MIN_EXAMS_REQUIRED = 2;
  
  let leaderboard = [];

  students.forEach((student) => {
    const examsTaken = student.results.length;
    
    if (examsTaken >= MIN_EXAMS_REQUIRED) {
      const totalScore = student.results.reduce((sum, res) => sum + res.score, 0);
      const averageScore = Math.round(totalScore / examsTaken);

      leaderboard.push({
        studentId: student.id,
        name: student.name,
        regimentalNumber: student.regimentalNumber,
        collegeCode: student.collegeCode,
        wing: student.wing,
        averageScore,
        examsTaken
      });
    }
  });

  // 4. Sort Leaderboard
  // Primary sort: Average Score (DESC)
  // Secondary sort: Exams Taken (DESC) - Tie breaker
  leaderboard.sort((a, b) => {
    if (b.averageScore === a.averageScore) {
      return b.examsTaken - a.examsTaken;
    }
    return b.averageScore - a.averageScore;
  });

  // 5. Assign Ranks
  leaderboard = leaderboard.map((cadet, index) => ({
    rank: index + 1,
    ...cadet
  }));

  // 6. Cache the result (24 hour TTL)
  try {
    await redis.setex(cacheKey, 86400, JSON.stringify(leaderboard));
  } catch (err) {
    console.error("[Redis] Cache write error on leaderboard", err);
  }

  return leaderboard;
};

/**
 * Gets the specific rank and stats for a single student in their unit
 * @param {number} studentId
 * @param {string} collegeCode
 */
const getStudentUnitRank = async (studentId, collegeCode) => {
  const leaderboard = await getUnitLeaderboard(collegeCode);
  
  const studentStats = leaderboard.find(c => c.studentId === parseInt(studentId));
  
  if (studentStats) {
    return {
      isRanked: true,
      ...studentStats,
      totalRankedCadets: leaderboard.length
    };
  }

  // If not in leaderboard, they haven't met the threshold or don't exist
  const student = await prisma.user.findUnique({
    where: { id: parseInt(studentId) },
    select: {
      results: { select: { score: true } }
    }
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
    examsNeeded: Math.max(0, 2 - examsTaken),
    totalRankedCadets: leaderboard.length
  };
};

module.exports = {
  getUnitLeaderboard,
  getStudentUnitRank
};
