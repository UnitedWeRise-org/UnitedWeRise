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

async function markMigration() {
  try {
    // Check if migration already tracked
    const existing = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations" WHERE migration_name = '20251003_add_photo_quest_badge_tables';
    `;
    
    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (gen_random_uuid()::text, '', NOW(), '20251003_add_photo_quest_badge_tables', '', NULL, NOW(), 1);
      `;
      console.log('✅ Migration 20251003_add_photo_quest_badge_tables marked as applied');
    } else {
      console.log('⏭️  Migration already tracked');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

markMigration();
