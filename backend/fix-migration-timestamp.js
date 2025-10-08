const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require'
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
