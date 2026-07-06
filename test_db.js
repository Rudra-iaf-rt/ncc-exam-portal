const { prisma } = require('./backend/src/lib/prisma.js');

async function main() {
  const exams = await prisma.exam.findMany({
    include: {
      questions: true,
      attempts: true,
      results: true
    },
    take: 3
  });

  for (const exam of exams) {
    console.log(`\n=== EXAM: ${exam.title} (ID: ${exam.id}) ===`);
    const maxPossible = exam.questions.reduce((sum, q) => sum + (q.marks || exam.positiveMarks || 4), 0);
    console.log("exam.positiveMarks:", exam.positiveMarks);
    console.log("maxPossible:", maxPossible);
    console.log("Results count:", exam.results.length);
    if (exam.results.length > 0) {
      console.log("Sample Result 0:", exam.results[0]);
    }
    
    // Simulating analytics.service.js logic
    const scores = exam.results.map(r => r.score).sort((a, b) => a - b);
    const distribution = new Array(10).fill(0);
    scores.forEach(s => {
      let percentage = (s / (maxPossible || 1)) * 100;
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;
      let bucket = Math.floor(percentage / 10);
      if (bucket === 10) bucket = 9;
      distribution[bucket]++;
    });
    console.log("Scores array:", scores);
    console.log("Distribution:", distribution);
  }
}

main().catch(console.error).finally(() => process.exit(0));
