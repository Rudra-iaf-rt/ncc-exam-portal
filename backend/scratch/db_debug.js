const { prisma } = require("../src/lib/prisma");

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  const exams = await prisma.exam.findMany({ select: { id: true, title: true, status: true } });
  const attempts = await prisma.attempt.findMany({ select: { id: true, studentId: true, examId: true, status: true } });
  const results = await prisma.result.findMany({
    select: {
      id: true,
      studentId: true,
      examId: true,
      score: true,
      exam: { select: { title: true } },
      student: { select: { name: true } }
    }
  });

  console.log("=== DB SUMMARY ===");
  console.log(`Total Users: ${users.length}`);
  console.log(`Total Exams: ${exams.length}`);
  console.log(`Total Attempts: ${attempts.length}`);
  console.log(`Total Results: ${results.length}`);

  console.log("\n=== EXAMS ===");
  console.log(exams);

  console.log("\n=== ATTEMPTS ===");
  console.log(attempts);

  console.log("\n=== RESULTS ===");
  console.log(results.map(r => ({
    id: r.id,
    student: r.student?.name,
    exam: r.exam?.title,
    score: r.score
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
