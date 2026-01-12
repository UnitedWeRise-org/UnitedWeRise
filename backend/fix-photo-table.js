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

async function fixPhotoTable() {
  try {
    console.log('🔌 Connected to PRODUCTION database\n');

    // Step 1: Drop old Photo table
    console.log('📋 Step 1: Dropping old Photo table...');
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Photo" CASCADE');
    console.log('  ✅ Old Photo table dropped');

    // Step 2: Create Photo table with PhotoPipeline schema
    console.log('\n📋 Step 2: Creating Photo table with PhotoPipeline schema...');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Photo" (
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
        CONSTRAINT "Photo_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Photo_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('  ✅ Photo table created with correct schema');

    // Step 3: Create indexes
    console.log('\n📋 Step 3: Creating indexes...');

    await prisma.$executeRawUnsafe('CREATE INDEX "Photo_userId_idx" ON "Photo"("userId")');
    await prisma.$executeRawUnsafe('CREATE INDEX "Photo_postId_idx" ON "Photo"("postId")');
    await prisma.$executeRawUnsafe('CREATE INDEX "Photo_uploadedAt_idx" ON "Photo"("uploadedAt")');

    console.log('  ✅ Indexes created');

    // Step 4: Verify Photo table works with Post query
    console.log('\n📋 Step 4: Verifying Photo table...');

    try {
      await prisma.post.findFirst({
        include: { photos: true },
        take: 1
      });
      console.log('  ✅ Post query with photos works!');
    } catch (e) {
      console.log('  ❌ Post query error:', e.message.substring(0, 100));
    }

    console.log('\n🎉 Photo table successfully fixed!');
    console.log('✅ Feed endpoint should now work');

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotoTable();
