const { prisma } = require('./src/lib/prisma');

async function check() {
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      college: true,
      results: true
    }
  });
  console.log("Students:");
  console.log(users.map(u => ({
    id: u.id,
    name: u.name,
    collegeCode: u.collegeCode,
    collegeId: u.collegeId,
    resultsCount: u.results.length
  })));

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' }
  });
  console.log("Admins:");
  console.log(admins.map(a => ({
    id: a.id,
    collegeCode: a.collegeCode,
    collegeId: a.collegeId
  })));
}

check().finally(() => prisma.$disconnect());
