const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
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

async function updateMigrationTracking() {
  try {
    console.log('🔌 Connected to PRODUCTION database\n');

    // Read migration file to generate checksum
    const migrationSQL = fs.readFileSync('prisma/migrations/20251003_add_photo_quest_badge_tables/migration.sql', 'utf8');
    const checksum = crypto.createHash('sha256').update(migrationSQL).digest('hex');

    const migrationName = '20251003_add_photo_quest_badge_tables';

    // Check if migration is already tracked
    const existing = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations"
      WHERE migration_name = ${migrationName}
    `;

    if (existing.length > 0) {
      console.log('✅ Migration already tracked in database');
      console.log('   Migration name:', migrationName);
      console.log('   Applied at:', existing[0].finished_at);
    } else {
      console.log('📋 Marking migration as applied...');

      // Insert migration record
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        ) VALUES (
          ${crypto.randomUUID()},
          ${checksum},
          NOW(),
          ${migrationName},
          NULL,
          NULL,
          NOW(),
          1
        )
      `;

      console.log('✅ Migration marked as applied in tracking table');
    }

    console.log('\n🎉 Migration tracking updated successfully!');

  } catch (error) {
    console.error('\n❌ Failed to update migration tracking:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateMigrationTracking();
