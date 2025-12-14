const { PrismaClient } = require('@prisma/client');

// Script to fix corrupted production migration state
// Used to clean up ghost migration entries and mark failed migrations as applied
// Run with: DATABASE_URL="<prod-url>" node fix_production_migrations.js

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixProductionMigrations() {
  try {
    console.log('🔍 Checking current migration state...\n');

    // First, show current state
    const currentState = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at, applied_steps_count
      FROM "_prisma_migrations"
      ORDER BY started_at;
    `;
    console.log('Current migrations:');
    currentState.forEach(m => {
      const status = m.finished_at ? '✅' : '❌';
      console.log(`  ${status} ${m.migration_name}`);
    });
    console.log('');

    // Step 1: Delete ghost entries (old naming convention)
    console.log('🗑️  Removing ghost migration entries...');
    const deleteResult = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations"
      WHERE migration_name LIKE '%001_add_unified_messaging%';
    `;
    console.log(`   Deleted ${deleteResult} ghost entry/entries\n`);

    // Step 2: Check if 20250809010000_add_unified_messaging exists
    const unified = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations"
      WHERE migration_name = '20250809010000_add_unified_messaging';
    `;

    if (unified.length === 0) {
      // Insert as completed
      console.log('📝 Inserting 20250809010000_add_unified_messaging as applied...');
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES (gen_random_uuid()::text, '', NOW(), '20250809010000_add_unified_messaging', '', NULL, NOW(), 1);
      `;
      console.log('   ✅ Inserted as applied\n');
    } else if (unified[0].finished_at === null) {
      // Update to mark as completed
      console.log('📝 Marking 20250809010000_add_unified_messaging as completed...');
      await prisma.$executeRaw`
        UPDATE "_prisma_migrations"
        SET finished_at = NOW(), applied_steps_count = 1
        WHERE migration_name = '20250809010000_add_unified_messaging' AND finished_at IS NULL;
      `;
      console.log('   ✅ Updated to completed\n');
    } else {
      console.log('⏭️  20250809010000_add_unified_messaging already marked as applied\n');
    }

    // Show final state
    console.log('🔍 Final migration state:\n');
    const finalState = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at, applied_steps_count
      FROM "_prisma_migrations"
      ORDER BY started_at;
    `;
    finalState.forEach(m => {
      const status = m.finished_at ? '✅' : '❌';
      console.log(`  ${status} ${m.migration_name}`);
    });

    console.log('\n✅ Production migration fix complete');
    console.log('   Next step: Run "npx prisma migrate deploy" to apply pending migrations');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductionMigrations();
