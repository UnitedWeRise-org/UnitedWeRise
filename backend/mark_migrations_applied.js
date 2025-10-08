const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function markMigrationsApplied() {
  const migrations = [
    '20250809234855_add_device_fingerprint_antibot',
    '20250922_add_post_geographic_fields',
    '20250926_add_image_moderation_system',
    '20251002_nuclear_photo_removal',
    'add_security_events'
  ];
  
  try {
    for (const migration of migrations) {
      // Check if migration record exists
      const existing = await prisma.$queryRaw`
        SELECT * FROM "_prisma_migrations" WHERE migration_name = ${migration};
      `;
      
      if (existing.length === 0) {
        // Insert new migration record as completed
        await prisma.$executeRaw`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
          VALUES (gen_random_uuid()::text, '', NOW(), ${migration}, '', NULL, NOW(), 1);
        `;
        console.log(`✅ Marked ${migration} as applied`);
      } else if (existing[0].finished_at === null) {
        // Update existing record to mark as completed
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" 
          SET finished_at = NOW(), applied_steps_count = 1 
          WHERE migration_name = ${migration} AND finished_at IS NULL;
        `;
        console.log(`✅ Updated ${migration} to completed`);
      } else {
        console.log(`⏭️  ${migration} already applied`);
      }
    }
    console.log('\n✅ All migrations marked as applied');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

markMigrationsApplied();
