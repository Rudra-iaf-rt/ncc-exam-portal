const { PrismaClient } = require("@prisma/client");
const { scoreSubmission } = require("../src/services/exam-scoring.service");
const prisma = new PrismaClient();

async function forceScoreExam() {
  const args = process.argv.slice(2);
  const examId = Number(args[0]);

  if (!examId || isNaN(examId)) {
    console.error("Usage: node force_score_exam.js <examId>");
    process.exit(1);
  }

  console.log(`Starting forced scoring for Exam ID: ${examId}...`);

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) {
      console.error(`Exam ${examId} not found.`);
      process.exit(1);
    }

    const attempts = await prisma.attempt.findMany({
      where: {
        examId,
        status: "IN_PROGRESS",
      },
    });

    if (attempts.length === 0) {
      console.log("No pending IN_PROGRESS attempts found. Everyone is already submitted!");
      process.exit(0);
    }

    console.log(`Found ${attempts.length} IN_PROGRESS attempts. Scoring them now...`);

    let successCount = 0;
    let failCount = 0;

    for (const attempt of attempts) {
      try {
        const studentId = attempt.studentId;
        
        let answersInput = [];
        if (attempt.answers && typeof attempt.answers === "object") {
          answersInput = Object.entries(attempt.answers).map(([qid, selectedAnswer]) => ({
            questionId: Number(qid),
            selectedAnswer: String(selectedAnswer ?? ""),
          }));
        }

        const { score, correct, total } = scoreSubmission(exam.questions, answersInput);

        await prisma.$transaction([
          prisma.attempt.update({
            where: { id: attempt.id },
            data: { status: "SUBMITTED" },
          }),
          prisma.result.upsert({
            where: {
              studentId_examId: { studentId, examId },
            },
            create: { studentId, examId, score },
            update: { score },
          }),
        ]);

        console.log(`Scored student ${studentId}: ${correct}/${total} correct.`);
        successCount++;
      } catch (err) {
        console.error(`Failed to score attempt ID ${attempt.id}:`, err.message);
        failCount++;
      }
    }

    console.log(`\nDONE! Successfully scored: ${successCount}. Failed: ${failCount}.`);
    
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

forceScoreExam();
