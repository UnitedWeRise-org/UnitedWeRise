const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkMigrations() {
  try {
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at, applied_steps_count 
      FROM "_prisma_migrations" 
      ORDER BY finished_at DESC 
      LIMIT 10;
    `;
    console.log('Recent migrations:', JSON.stringify(migrations, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();
