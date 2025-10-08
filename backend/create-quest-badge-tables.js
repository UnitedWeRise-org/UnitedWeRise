const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require'
    }
  }
});

async function createTables() {
  try {
    console.log('🔌 Connected to PRODUCTION database\n');

    // Step 1: Create ENUMs (with exception handling for duplicates)
    console.log('📋 Step 1: Creating enums...');

    const enums = [
      {
        name: 'QuestType',
        values: ['DAILY_HABIT', 'DAILY_CIVIC', 'WEEKLY_ENGAGEMENT', 'MONTHLY_CONSISTENCY', 'SPECIAL_EVENT', 'CIVIC_ACTION', 'EDUCATIONAL', 'SOCIAL_ENGAGEMENT']
      },
      {
        name: 'QuestCategory',
        values: ['INFORMATION', 'PARTICIPATION', 'COMMUNITY', 'ADVOCACY', 'EDUCATION', 'SOCIAL']
      },
      {
        name: 'QuestTimeframe',
        values: ['DAILY', 'WEEKLY', 'MONTHLY', 'ONGOING', 'LIMITED_TIME']
      },
      {
        name: 'BadgeCategory',
        values: ['ACTIVITY', 'CIVIC_ENGAGEMENT', 'SOCIAL', 'ACHIEVEMENT', 'SPECIAL']
      },
      {
        name: 'BadgeRarity',
        values: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
      }
    ];

    for (const enumDef of enums) {
      try {
        const values = enumDef.values.map(v => `'${v}'`).join(', ');
        const sql = `DO $$ BEGIN CREATE TYPE "${enumDef.name}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
        await prisma.$executeRawUnsafe(sql);
        console.log(`  ✅ ${enumDef.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${enumDef.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    // Step 2: Create tables
    console.log('\n📋 Step 2: Creating tables...');

    const tables = [
      {
        name: 'Photo',
        sql: `CREATE TABLE IF NOT EXISTS "Photo" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "postId" TEXT,
          "url" TEXT NOT NULL,
          "blobName" TEXT NOT NULL,
          "mimeType" TEXT NOT NULL,
          "originalMimeType" TEXT NOT NULL,
          "originalSize" INTEGER NOT NULL,
          "processedSize" INTEGER NOT NULL,
          "width" INTEGER,
          "height" INTEGER,
          "moderationStatus" TEXT NOT NULL,
          "moderationReason" TEXT,
          "moderationConfidence" DOUBLE PRECISION,
          "moderationType" TEXT,
          "exifStripped" BOOLEAN NOT NULL DEFAULT true,
          "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP(3),
          "photoType" TEXT,
          "gallery" TEXT,
          "caption" TEXT,
          "thumbnailUrl" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Quest',
        sql: `CREATE TABLE IF NOT EXISTS "Quest" (
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
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'UserQuestProgress',
        sql: `CREATE TABLE IF NOT EXISTS "UserQuestProgress" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "questId" TEXT NOT NULL,
          "progress" INTEGER NOT NULL DEFAULT 0,
          "completed" BOOLEAN NOT NULL DEFAULT false,
          "completedAt" TIMESTAMP(3),
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UserQuestProgress_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'UserQuestStreak',
        sql: `CREATE TABLE IF NOT EXISTS "UserQuestStreak" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "questType" "QuestType" NOT NULL,
          "currentStreak" INTEGER NOT NULL DEFAULT 0,
          "longestStreak" INTEGER NOT NULL DEFAULT 0,
          "lastCompletedDate" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "UserQuestStreak_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'Badge',
        sql: `CREATE TABLE IF NOT EXISTS "Badge" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "category" "BadgeCategory" NOT NULL,
          "rarity" "BadgeRarity" NOT NULL,
          "iconUrl" TEXT,
          "requirements" JSONB NOT NULL,
          "displayOrder" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
        )`
      },
      {
        name: 'UserBadge',
        sql: `CREATE TABLE IF NOT EXISTS "UserBadge" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "badgeId" TEXT NOT NULL,
          "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "relatedQuestId" TEXT,
          CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
        )`
      }
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(table.sql);
        console.log(`  ✅ ${table.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${table.name} (already exists)`);
        } else {
          throw error;
        }
      }
    }

    // Step 3: Create unique constraints and indexes
    console.log('\n📋 Step 3: Creating constraints and indexes...');

    const constraints = [
      'ALTER TABLE "Photo" ADD CONSTRAINT IF NOT EXISTS "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
      'CREATE UNIQUE INDEX IF NOT EXISTS "Badge_name_key" ON "Badge"("name")',
      'CREATE INDEX IF NOT EXISTS "UserQuestProgress_userId_idx" ON "UserQuestProgress"("userId")',
      'CREATE INDEX IF NOT EXISTS "UserQuestProgress_questId_idx" ON "UserQuestProgress"("questId")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "UserQuestProgress_userId_questId_key" ON "UserQuestProgress"("userId", "questId")',
      'CREATE INDEX IF NOT EXISTS "UserQuestStreak_userId_idx" ON "UserQuestStreak"("userId")',
      'CREATE INDEX IF NOT EXISTS "UserQuestStreak_questType_idx" ON "UserQuestStreak"("questType")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "UserQuestStreak_userId_questType_key" ON "UserQuestStreak"("userId", "questType")',
      'CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId")',
      'CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId")',
      'CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId")'
    ];

    for (const constraint of constraints) {
      try {
        await prisma.$executeRawUnsafe(constraint);
        console.log(`  ✅ Added constraint/index`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`  ⚠️  Constraint/index already exists (skipped)`);
        } else {
          console.log(`  ⚠️  Skipped: ${error.message.substring(0, 80)}`);
        }
      }
    }

    // Step 4: Verify all tables were created
    console.log('\n📋 Step 4: Verifying tables...');

    const verification = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('Photo', 'Quest', 'Badge', 'UserQuestProgress', 'UserQuestStreak', 'UserBadge')
      ORDER BY table_name
    `;

    console.log(`\n✅ Tables verified (${verification.length}/6):`);
    verification.forEach(t => console.log(`  - ${t.table_name}`));

    if (verification.length === 6) {
      console.log('\n🎉 All Quest/Badge/Photo tables successfully created in PRODUCTION!');
    } else {
      console.error('\n❌ ERROR: Not all tables were created!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();
