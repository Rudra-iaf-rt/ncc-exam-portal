const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const studentId = 1;
    let examId = 69;

    const attempts = await prisma.attempt.findMany({ take: 1 });
    if (!attempts.length) { console.log('no attempt'); return; }
    const attempt = attempts[0];
    examId = attempt.examId;

    const data = {
      where: { id: attempt.id },
      data: { 
        status: 'SUBMITTED',
        answers: { '1': null, '2': 'A', '3': undefined } // Testing undefined explicitly!
      }
    };
    await prisma.attempt.update(data);
    console.log('Attempt update successful');

    const resultData = {
      where: { studentId_examId: { studentId: attempt.studentId, examId } },
      create: { studentId: attempt.studentId, examId, score: 50, rawScore: 2, maxScore: 4, timeTaken: 120 },
      update: { score: 50, rawScore: 2, maxScore: 4, timeTaken: 120 },
    };
    await prisma.result.upsert(resultData);
    console.log('Result upsert successful');
  } catch(e) {
    console.error('ERROR TYPE:', e.constructor.name);
    console.error('ERROR MESSAGE:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
