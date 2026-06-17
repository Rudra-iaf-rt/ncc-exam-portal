require("dotenv").config(); // Load default .env or .env.loadtest based on execution context
const { prisma } = require("../src/lib/prisma");
const { signToken } = require("../src/utils/jwt");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Setting up test data for load test...");

  // Create Staff User for Exam Creation
  let staff = await prisma.user.findFirst({ where: { email: "loadtest_staff@example.com" } });
  if (!staff) {
    staff = await prisma.user.create({
      data: {
        name: "Load Test Staff",
        email: "loadtest_staff@example.com",
        password: "mocked_password",
        role: "ADMIN",
        isActive: true,
      },
    });
  }

  // Create Exam with 200 Questions
  console.log("Creating Exam with 200 questions...");
  const questions = Array.from({ length: 200 }, (_, i) => ({
    question: `Mock Question ${i + 1}?`,
    options: ["A", "B", "C", "D"],
    answer: "A",
  }));

  const exam = await prisma.exam.create({
    data: {
      title: "Load Test Exam 200",
      duration: 120,
      createdBy: staff.id,
      status: "LIVE",
      publishedAt: new Date(),
      questions: {
        create: questions,
      },
    },
  });

  console.log(`Created Exam ID: ${exam.id}`);

  // Create 500 Students
  console.log("Creating 500 mock students and assigning them...");
  const studentData = Array.from({ length: 500 }, (_, i) => ({
    name: `Load Test Student ${i + 1}`,
    regimentalNumber: `LT-${exam.id}-${i + 1}`,
    password: "mocked_password",
    role: "STUDENT",
    isActive: true,
  }));

  await prisma.user.createMany({
    data: studentData,
    skipDuplicates: true,
  });

  const students = await prisma.user.findMany({
    where: { regimentalNumber: { startsWith: `LT-${exam.id}-` } },
  });

  // Assign students to exam
  const assignments = students.map((s) => ({
    userId: s.id,
    examId: exam.id,
  }));
  await prisma.examAssignment.createMany({
    data: assignments,
    skipDuplicates: true,
  });

  // Generate CSV of tokens
  console.log("Generating test_users.csv...");
  const csvLines = ["token,examId"];
  for (const s of students) {
    const token = signToken({ sub: s.id, role: s.role });
    csvLines.push(`${token},${exam.id}`);
  }

  const csvPath = path.join(__dirname, "test_users.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"));
  console.log(`Data setup complete. Output written to ${csvPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
