const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Validate required environment variable
const databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: Required environment variable not set.');
  console.error('Please set PROD_DATABASE_URL or DATABASE_URL in your environment.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

(async () => {
  try {
    await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW()
      WHERE migration_name = '20251003_add_photo_quest_badge_tables'
      AND finished_at IS NULL
    `;
    console.log('✅ Migration tracking timestamp updated');
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
