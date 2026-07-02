require('dotenv').config();
const { prisma } = require('../src/lib/prisma');
const xlsx = require('xlsx');
const inquirer = require('inquirer');
const fs = require('fs');

async function main() {
  // Fetch all exams
  const exams = await prisma.exam.findMany({
    include: {
      _count: {
        select: { questions: true }
      }
    },
    orderBy: { id: "desc" }
  });

  if (exams.length === 0) {
    console.log("No exams found.");
    return;
  }

  // Create choices for the arrow-key menu
  const choices = exams.map(exam => ({
    name: `Exam ID: ${exam.id} | Title: "${exam.title}" | Questions: ${exam._count.questions}`,
    value: exam.id
  }));

  const { selectedExamId } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedExamId",
      message: "Use arrow keys to select which exam you want to update answers for:",
      choices: choices,
      pageSize: 15 
    }
  ]);
  
  const { excelPath } = await inquirer.prompt([
    {
      type: "input",
      name: "excelPath",
      message: "Enter the absolute path to the Excel file containing the correct answers:",
      validate: (input) => {
        if (fs.existsSync(input.replace(/['"]/g, ''))) return true;
        return "File does not exist. Please enter a valid path.";
      }
    }
  ]);

  const cleanPath = excelPath.replace(/['"]/g, '');
  console.log(`\nReading Excel file from: ${cleanPath}...`);
  
  const workbook = xlsx.readFile(cleanPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  // fetch exam
  const exam = await prisma.exam.findUnique({
    where: { id: selectedExamId },
    include: { questions: true }
  });
  
  if (!exam) {
    console.error('Exam not found');
    return;
  }
  
  console.log('Exam found with ID:', exam.id);
  console.log('Number of questions in DB:', exam.questions.length);
  console.log('Number of rows in Excel:', rows.length);
  
  let updated = 0;
  
  function pick(row, keys) {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(row, k) && row[k] != null && String(row[k]).trim() !== '') {
        return String(row[k]).trim();
      }
    }
    return null;
  }
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qText = pick(row, ['question', 'Question', 'QUESTION', 'Q', 'Questions']);
    if (!qText) continue;
    
    const dbQuestion = exam.questions.find(q => {
      const dbText = String(q.question || '').toLowerCase().trim();
      let xlText = String(qText || '').toLowerCase().trim();
      xlText = xlText.replace(/^\d+[\.\)]\s*/, '');
      return dbText === xlText || (xlText.includes(dbText) && dbText.length > 10) || (dbText.includes(xlText) && xlText.length > 10);
    });
    
    if (!dbQuestion) {
      console.log('Question not found in DB:', qText);
      continue;
    }
    
    const answerRaw = pick(row, ['answer', 'Answer', 'ANSWER', 'correct', 'Correct']);
    if (!answerRaw) {
      console.log('No answer for row:', qText);
      continue;
    }
    
    let answerText = answerRaw;
    const letter = answerRaw.match(/^([A-D])$/i);
    if (letter) {
      const idx = letter[1].toUpperCase().charCodeAt(0) - 65;
      answerText = dbQuestion.options[idx] || answerRaw;
    } else {
      const loose = dbQuestion.options.find(o => o.toLowerCase() === answerRaw.toLowerCase() || answerRaw.includes(o) || o.includes(answerRaw));
      if (loose) answerText = loose;
    }
    
    if (dbQuestion.answer !== answerText) {
      console.log('Updating Q:', dbQuestion.id);
      console.log('  Old answer:', dbQuestion.answer);
      console.log('  New answer:', answerText);
      await prisma.question.update({
        where: { id: dbQuestion.id },
        data: { answer: answerText }
      });
      updated++;
    }
  }
  
  console.log('Total questions updated:', updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
