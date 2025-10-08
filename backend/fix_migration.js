const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixMigration() {
  try {
    // Mark the stuck migration as completed
    const result = await prisma.$executeRaw`
      UPDATE "_prisma_migrations" 
      SET finished_at = NOW(), 
          applied_steps_count = 1 
      WHERE migration_name = '20250809004127_initial' 
        AND finished_at IS NULL;
    `;
    console.log(`Updated ${result} migration record(s)`);
    console.log('✅ Migration 20250809004127_initial marked as complete');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixMigration();
