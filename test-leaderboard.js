const { prisma } = require('./backend/src/lib/prisma');
const leaderboardService = require('./backend/src/services/leaderboard.service');

async function main() {
  try {
    // try to fetch an active student
    const student = await prisma.user.findFirst({
      where: { role: 'STUDENT', isActive: true }
    });
    console.log("Student ID:", student.id, typeof student.id, "College:", student.collegeCode);

    // Call service
    const rankData = await leaderboardService.getStudentUnitRank(student.id, student.collegeCode);
    console.log("Rank Data:", rankData);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

main();
