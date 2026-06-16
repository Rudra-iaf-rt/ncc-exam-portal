const { prisma } = require("../src/lib/prisma");

async function run() {
  const count = await prisma.user.count({
    where: {
      role: 'STUDENT',
    },
  });
  console.log("CADET_COUNT_RESULT:", count);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

