const { prisma } = require("../src/lib/prisma");
const { cacheDelPattern, cacheDel } = require("../src/lib/cache");

async function allowReattempt() {
  const regimentalNumbers = ["AP2025SWAF0490313", "AP2024SDAF0490051"];
  const examTitleQuery = "AF_SOP_HH_1";

  console.log(`Looking for exam matching: ${examTitleQuery}...`);
  const exam = await prisma.exam.findFirst({
    where: {
      title: { contains: examTitleQuery, mode: "insensitive" }
    }
  });

  if (!exam) {
    console.error("Exam not found!");
    process.exit(1);
  }

  console.log(`Found Exam: ${exam.title} (ID: ${exam.id})`);

  for (const regNum of regimentalNumbers) {
    const user = await prisma.user.findFirst({
      where: { regimentalNumber: regNum }
    });

    if (!user) {
      console.error(`User not found: ${regNum}`);
      continue;
    }

    console.log(`Found User: ${user.name} (ID: ${user.id})`);

    // Delete Attempt and Result
    try {
      await prisma.$transaction([
        prisma.attempt.deleteMany({
          where: { studentId: user.id, examId: exam.id }
        }),
        prisma.result.deleteMany({
          where: { studentId: user.id, examId: exam.id }
        })
      ]);
      console.log(`Successfully cleared attempt for ${regNum}. They can now retake the exam.`);
      
      // Clear their cache
      await Promise.all([
        cacheDelPattern(`results:student:${user.id}:*`),
        cacheDelPattern(`exams:catalog:STUDENT:${user.id}:*`),
        cacheDel([`stats:dashboard:STUDENT:${user.id}`])
      ]).catch(() => {});

    } catch (err) {
      console.error(`Failed to clear attempt for ${regNum}:`, err.message);
    }
  }

  console.log("Done.");
  await prisma.$disconnect();
}

allowReattempt();
