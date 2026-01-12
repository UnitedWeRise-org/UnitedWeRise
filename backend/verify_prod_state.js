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
  datasources: { db: { url: databaseUrl } }
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
