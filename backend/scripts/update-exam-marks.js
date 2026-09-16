const { prisma } = require("../src/lib/prisma");
const { scoreSubmission } = require("../src/services/exam-scoring.service");
const inquirer = require("inquirer");

async function main() {
  console.log("Loading exams with submitted attempts...\n");

  const exams = await prisma.exam.findMany({
    where: {
      attempts: { some: { status: "SUBMITTED" } }
    },
    include: {
      _count: { select: { attempts: { where: { status: "SUBMITTED" } } } }
    },
    orderBy: { id: "desc" }
  });

  if (exams.length === 0) {
    console.log("No exams found with submitted attempts.");
    return;
  }

  const choices = exams.map(exam => ({
    name: `Exam ID: ${exam.id} | Title: "${exam.title}" | Marks: +${exam.positiveMarks}/-${exam.negativeMarks} | Submissions: ${exam._count.attempts}`,
    value: exam
  }));

  const { selectedExam } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedExam",
      message: "Select which exam to update and rescore:",
      choices: choices,
      pageSize: 15
    }
  ]);

  const { newPositiveMarks, newNegativeMarks } = await inquirer.prompt([
    {
      type: "number",
      name: "newPositiveMarks",
      message: `Enter new marks for correct answer (currently ${selectedExam.positiveMarks}):`,
      default: selectedExam.positiveMarks,
    },
    {
      type: "number",
      name: "newNegativeMarks",
      message: `Enter new marks deducted for incorrect (currently ${selectedExam.negativeMarks}):`,
      default: selectedExam.negativeMarks,
    }
  ]);

  const { confirmUpdate } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmUpdate",
      message: `Are you sure you want to update Exam ${selectedExam.id} to +${newPositiveMarks}/-${newNegativeMarks} and rescore ${selectedExam._count.attempts} attempts?`,
      default: false
    }
  ]);

  if (!confirmUpdate) {
    console.log("Operation cancelled.");
    return;
  }

  console.log("\nUpdating exam metadata in database...");
  await prisma.exam.update({
    where: { id: selectedExam.id },
    data: {
      positiveMarks: newPositiveMarks,
      negativeMarks: newNegativeMarks,
    }
  });

  // Re-fetch the updated exam to pass into the scoring function
  const updatedExam = await prisma.exam.findUnique({
    where: { id: selectedExam.id },
    include: { questions: { orderBy: { id: "asc" } } }
  });

  const submittedAttempts = await prisma.attempt.findMany({
    where: { examId: selectedExam.id, status: "SUBMITTED" },
  });

  console.log(`\nFound ${submittedAttempts.length} submitted attempt(s). Recalculating scores...`);

  let updatedCount = 0;
  for (const attempt of submittedAttempts) {
    const questions = updatedExam.questions;
    
    const studentAnswers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
    const answersArray = Object.entries(studentAnswers).map(([qid, ans]) => ({
      questionId: Number(qid),
      selectedAnswer: String(ans ?? ""),
    }));

    // Calculate new score using the updated logic
    const { score, rawScore, maxScore } = scoreSubmission(questions, answersArray, updatedExam);

    await prisma.result.update({
      where: {
        studentId_examId: {
          studentId: attempt.studentId,
          examId: attempt.examId,
        }
      },
      data: { score, rawScore, maxScore },
    });

    console.log(`  -> Updated student ${attempt.studentId} to Score: ${score}%`);
    updatedCount++;
  }

  try {
    const { cacheDelNamespace, cacheDel } = require("../src/lib/cache");
    await cacheDelNamespace("exams:catalog");
    await cacheDel([`exams:details:${selectedExam.id}`]);
    await cacheDel([`exam:review_data:${selectedExam.id}`]); // IMPORTANT: Invalidate global exam review cache
    
    // Invalidate cadet and admin review caches for each attempt
    const reviewCacheKeys = submittedAttempts.flatMap(a => [
      `resultreview:${a.studentId}:${selectedExam.id}`,
      `resultreview:admin:${a.studentId}:${selectedExam.id}`
    ]);
    await cacheDel(reviewCacheKeys);
    console.log("Invalidated relevant caches.");
  } catch (e) {
    console.log("Could not automatically invalidate caches (you may need to flush redis manually if changes don't appear).");
  }

  console.log(`\n✅ Successfully updated exam marks and rescored ${updatedCount} attempt(s)!\n`);
}

main()
  .catch((e) => {
    console.error("Error during rescore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
