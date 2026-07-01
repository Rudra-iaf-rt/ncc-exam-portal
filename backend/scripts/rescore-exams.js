const { prisma } = require("../src/lib/prisma");
const { scoreSubmission } = require("../src/services/exam-scoring.service");
const inquirer = require("inquirer");

async function main() {
  console.log("Loading exams with submitted attempts...\n");

  // Fetch all exams that have at least one SUBMITTED attempt
  const exams = await prisma.exam.findMany({
    where: {
      attempts: {
        some: { status: "SUBMITTED" }
      }
    },
    include: {
      _count: {
        select: {
          attempts: {
            where: { status: "SUBMITTED" }
          }
        }
      }
    },
    orderBy: { id: "desc" }
  });

  if (exams.length === 0) {
    console.log("No exams found with submitted attempts.");
    return;
  }

  // Create choices for the arrow-key menu
  const choices = exams.map(exam => ({
    name: `Exam ID: ${exam.id} | Title: "${exam.title}" | Submissions: ${exam._count.attempts}`,
    value: exam.id
  }));

  // Add an option to rescore ALL exams
  choices.unshift({
    name: "--- RESCORE ALL EXAMS ---",
    value: "ALL"
  });

  // Prompt the user to select an exam using arrow keys
  const { selectedExamId } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedExamId",
      message: "Use arrow keys to select which exam you want to rescore:",
      choices: choices,
      pageSize: 15 
    }
  ]);

  const where = { status: "SUBMITTED" };
  if (selectedExamId !== "ALL") {
    where.examId = selectedExamId;
    console.log(`\nSelected Exam ID: ${selectedExamId}`);
  } else {
    console.log(`\nSelected ALL Exams`);
  }

  const submittedAttempts = await prisma.attempt.findMany({
    where,
    include: {
      exam: {
        include: {
          questions: { orderBy: { id: "asc" } },
        },
      },
    },
  });

  console.log(`\nFound ${submittedAttempts.length} submitted attempt(s). Recalculating scores...`);

  let updatedCount = 0;

  const updatePromises = submittedAttempts.map(async (attempt) => {
    const questions = attempt.exam.questions;
    
    // Format answers exactly as scoreSubmission expects
    const studentAnswers = attempt.answers && typeof attempt.answers === "object" ? attempt.answers : {};
    const answersArray = Object.entries(studentAnswers).map(([qid, ans]) => ({
      questionId: Number(qid),
      selectedAnswer: String(ans ?? ""),
    }));

    // Calculate new score using the updated logic
    const { score } = scoreSubmission(questions, answersArray);

    // Update Result table
    await prisma.result.update({
      where: {
        studentId_examId: {
          studentId: attempt.studentId,
          examId: attempt.examId,
        }
      },
      data: { score },
    });

    console.log(`  -> Updated student ${attempt.studentId} on exam ${attempt.examId} to Score: ${score}%`);
  });

  await Promise.all(updatePromises);
  updatedCount = submittedAttempts.length;

  console.log(`\n✅ Successfully rescored ${updatedCount} attempt(s)!\n`);
}

main()
  .catch((e) => {
    console.error("Error during rescore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
