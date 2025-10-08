const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require'
    }
  }
});

async function applyMigration() {
  try {
    console.log('🔌 Connected to PRODUCTION database');

    // Read and execute the migration SQL as a raw transaction
    const migrationSQL = fs.readFileSync('prisma/migrations/20251003_add_photo_quest_badge_tables/migration.sql', 'utf8');

    console.log('📄 Executing migration SQL...');

    // Use $executeRawUnsafe to run the entire migration as one block
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✅ Migration executed successfully');

    // Verify tables were created
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Quest', 'Badge', 'UserQuestProgress', 'UserQuestStreak', 'UserBadge')
      ORDER BY table_name
    `;

    console.log(`\n✅ Tables created (${tables.length}/5):`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    if (tables.length !== 5) {
      console.error('\n❌ ERROR: Not all tables were created!');
      process.exit(1);
    }

    console.log('\n🎉 Quest/Badge tables successfully created in PRODUCTION!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
