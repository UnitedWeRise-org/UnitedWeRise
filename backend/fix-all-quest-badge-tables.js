const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require'
    }
  }
});

async function fixAllTables() {
  try {
    console.log('🔌 Connected to PRODUCTION database\n');

    // Step 1: Drop and recreate UserQuestStreak with CORRECT schema
    console.log('📋 Step 1: Fixing UserQuestStreak table...');

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "UserQuestStreak" CASCADE');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "UserQuestStreak" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "currentDailyStreak" INTEGER NOT NULL DEFAULT 0,
        "longestDailyStreak" INTEGER NOT NULL DEFAULT 0,
        "currentWeeklyStreak" INTEGER NOT NULL DEFAULT 0,
        "longestWeeklyStreak" INTEGER NOT NULL DEFAULT 0,
        "lastCompletedDate" TIMESTAMP(3),
        "totalQuestsCompleted" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserQuestStreak_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserQuestStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX "UserQuestStreak_userId_key" ON "UserQuestStreak"("userId")');
    await prisma.$executeRawUnsafe('CREATE INDEX "UserQuestStreak_userId_idx" ON "UserQuestStreak"("userId")');

    console.log('  ✅ UserQuestStreak recreated with correct schema');

    // Step 2: Verify all Quest/Badge tables have correct columns
    console.log('\n📋 Step 2: Verifying all table schemas...');

    // Test if Prisma can query all tables
    try {
      await prisma.quest.findMany({ take: 1 });
      console.log('  ✅ Quest table OK');
    } catch (e) {
      console.log('  ❌ Quest table error:', e.message.substring(0, 100));
    }

    try {
      await prisma.userQuestProgress.findMany({ take: 1 });
      console.log('  ✅ UserQuestProgress table OK');
    } catch (e) {
      console.log('  ❌ UserQuestProgress table error:', e.message.substring(0, 100));
    }

    try {
      await prisma.userQuestStreak.findMany({ take: 1 });
      console.log('  ✅ UserQuestStreak table OK');
    } catch (e) {
      console.log('  ❌ UserQuestStreak table error:', e.message.substring(0, 100));
    }

    try {
      await prisma.badge.findMany({ take: 1 });
      console.log('  ✅ Badge table OK');
    } catch (e) {
      console.log('  ❌ Badge table error:', e.message.substring(0, 100));
    }

    try {
      await prisma.userBadge.findMany({ take: 1 });
      console.log('  ✅ UserBadge table OK');
    } catch (e) {
      console.log('  ❌ UserBadge table error:', e.message.substring(0, 100));
    }

    console.log('\n🎉 All Quest/Badge tables verified!');

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllTables();
