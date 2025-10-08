const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://uwradmin:UWR-Secure2024\!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require' } }
});

async function verify() {
  try {
    console.log('=== PRODUCTION DATABASE STATE ===\n');
    const migrations = await prisma.\;
    console.log('Migration Tracking:');
    migrations.forEach(m => console.log(\));
    console.log('\nTable Existence:');
    const tables = ['Photo', 'Quest', 'Badge', 'UserQuestProgress', 'UserQuestStreak', 'UserBadge'];
    for (const table of tables) {
      const exists = await prisma.\;
      console.log(\);
    }
  } catch (error) { console.error('Error:', error.message); }
  finally { await prisma.\(); }
}
verify();
