const { prisma } = require('../src/lib/prisma');

async function main() {
  console.log('--- Starting Batch Standardization Migration ---');

  try {
    // 1. Get all unique batch values currently in the User table
    const users = await prisma.user.findMany({
      select: { batch: true },
      distinct: ['batch'],
      where: {
        batch: { not: null }
      }
    });

    const uniqueUserBatches = users.map(u => u.batch).filter(Boolean);
    console.log(`Found ${uniqueUserBatches.length} unique batch strings in use.`);

    // 2. Get existing standardized batches
    const existingBatches = await prisma.batch.findMany();
    const existingNames = new Set(existingBatches.map(b => b.name));

    // 3. Create missing batches
    let createdCount = 0;
    for (const batchName of uniqueUserBatches) {
      if (!existingNames.has(batchName)) {
        await prisma.batch.create({
          data: {
            name: batchName,
            isActive: true
          }
        });
        console.log(`[CREATED] Standardized batch: "${batchName}"`);
        createdCount++;
      } else {
        console.log(`[EXISTS] Batch "${batchName}" is already standardized.`);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Total missing batches created: ${createdCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
