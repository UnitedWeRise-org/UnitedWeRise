const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require'
    }
  }
});

async function recreateTables() {
  try {
    console.log('🔌 Connected to PRODUCTION database\n');

    // Step 1: Drop existing tables (if they exist)
    console.log('📋 Step 1: Dropping existing tables...');

    const dropTables = [
      'DROP TABLE IF EXISTS "UserBadge" CASCADE',
      'DROP TABLE IF EXISTS "UserQuestProgress" CASCADE',
      'DROP TABLE IF EXISTS "UserQuestStreak" CASCADE',
      'DROP TABLE IF EXISTS "Badge" CASCADE',
      'DROP TABLE IF EXISTS "Quest" CASCADE'
    ];

    for (const dropSql of dropTables) {
      await prisma.$executeRawUnsafe(dropSql);
      console.log(`  ✅ ${dropSql.split('"')[1]} dropped`);
    }

    // Step 2: Create tables with FULL schema matching schema.prisma
    console.log('\n📋 Step 2: Creating tables with complete schema...');

    // Quest table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Quest" (
        "id" TEXT NOT NULL,
        "type" "QuestType" NOT NULL,
        "category" "QuestCategory" NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "shortDescription" TEXT,
        "requirements" JSONB NOT NULL,
        "rewards" JSONB NOT NULL,
        "timeframe" "QuestTimeframe" NOT NULL,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "repeatable" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ✅ Quest table created');

    // UserQuestProgress table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "UserQuestProgress" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "questId" TEXT NOT NULL,
        "progress" JSONB NOT NULL DEFAULT '{}',
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserQuestProgress_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserQuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "UserQuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('  ✅ UserQuestProgress table created');

    // UserQuestStreak table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "UserQuestStreak" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "questType" "QuestType" NOT NULL,
        "currentStreak" INTEGER NOT NULL DEFAULT 0,
        "longestStreak" INTEGER NOT NULL DEFAULT 0,
        "lastCompletedDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserQuestStreak_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserQuestStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('  ✅ UserQuestStreak table created');

    // Badge table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Badge" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "imageUrl" TEXT NOT NULL,
        "qualificationCriteria" JSONB NOT NULL,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isAutoAwarded" BOOLEAN NOT NULL DEFAULT true,
        "maxAwards" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdBy" TEXT,
        CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ✅ Badge table created');

    // UserBadge table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "UserBadge" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "badgeId" TEXT NOT NULL,
        "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isDisplayed" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER,
        "awardedBy" TEXT,
        "awardReason" TEXT,
        CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('  ✅ UserBadge table created');

    // Step 3: Create indexes and constraints
    console.log('\n📋 Step 3: Creating indexes and constraints...');

    const indexes = [
      'CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name")',
      'CREATE INDEX "Badge_isActive_idx" ON "Badge"("isActive")',
      'CREATE INDEX "Badge_name_idx" ON "Badge"("name")',
      'CREATE INDEX "UserQuestProgress_userId_idx" ON "UserQuestProgress"("userId")',
      'CREATE INDEX "UserQuestProgress_questId_idx" ON "UserQuestProgress"("questId")',
      'CREATE INDEX "UserQuestProgress_completed_idx" ON "UserQuestProgress"("completed")',
      'CREATE UNIQUE INDEX "UserQuestProgress_userId_questId_key" ON "UserQuestProgress"("userId", "questId")',
      'CREATE UNIQUE INDEX "UserQuestStreak_userId_key" ON "UserQuestStreak"("userId")',
      'CREATE INDEX "UserQuestStreak_userId_idx" ON "UserQuestStreak"("userId")',
      'CREATE INDEX "UserQuestStreak_questType_idx" ON "UserQuestStreak"("questType")',
      'CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId")',
      'CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId")',
      'CREATE INDEX "UserBadge_isDisplayed_idx" ON "UserBadge"("isDisplayed")',
      'CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId")'
    ];

    for (const indexSql of indexes) {
      try {
        await prisma.$executeRawUnsafe(indexSql);
        console.log(`  ✅ Index created`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  Index already exists (skipped)`);
        } else {
          console.log(`  ⚠️  Failed: ${error.message.substring(0, 60)}`);
        }
      }
    }

    // Step 4: Verify all tables
    console.log('\n📋 Step 4: Verifying tables...');

    const verification = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Quest', 'Badge', 'UserQuestProgress', 'UserQuestStreak', 'UserBadge')
      ORDER BY table_name
    `;

    console.log(`\n✅ Tables verified (${verification.length}/5):`);
    verification.forEach(t => console.log(`  - ${t.table_name}`));

    if (verification.length === 5) {
      console.log('\n🎉 All Quest/Badge tables successfully recreated with FULL schema!');
    } else {
      console.error('\n❌ ERROR: Not all tables were created!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Recreation failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

recreateTables();
