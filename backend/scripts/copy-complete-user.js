/**
 * Copy Complete User Record (ALL fields)
 * Copies every single field from production to development
 * Usage: node scripts/copy-complete-user.js jeffrey@unitedwerise.org
 */

const { PrismaClient } = require('@prisma/client');

// Production database configuration
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require"
    }
  }
});

// Development database configuration
const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db-dev.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require"
    }
  }
});

async function copyCompleteUser(email) {
  try {
    console.log(`🔍 Fetching COMPLETE production user record for ${email}...`);

    // Get EVERY field from production user
    const prodUser = await prodPrisma.user.findUnique({
      where: { email }
    });

    if (!prodUser) {
      console.error(`❌ Production user ${email} not found`);
      return false;
    }

    console.log(`✅ Found production user with ${Object.keys(prodUser).length} fields`);
    console.log(`📋 All production fields:`);
    Object.keys(prodUser).forEach(field => {
      const value = prodUser[field];
      if (field.toLowerCase().includes('secret') || field.toLowerCase().includes('password')) {
        console.log(`   ${field}: [SENSITIVE DATA]`);
      } else if (Array.isArray(value)) {
        console.log(`   ${field}: Array(${value.length})`);
      } else if (value instanceof Date) {
        console.log(`   ${field}: ${value.toISOString()}`);
      } else {
        console.log(`   ${field}: ${value}`);
      }
    });

    // Delete existing dev user if exists
    const existingDevUser = await devPrisma.user.findUnique({
      where: { email }
    });

    if (existingDevUser) {
      console.log(`🔄 Deleting existing development user...`);
      await devPrisma.user.delete({ where: { id: existingDevUser.id } });
      console.log(`🗑️ Existing user deleted`);
    }

    // Copy EVERYTHING - no field selection, complete record transfer
    console.log(`🚀 Creating development user with COMPLETE production data...`);

    const devUser = await devPrisma.user.create({
      data: prodUser  // Copy EVERY SINGLE FIELD exactly as-is
    });

    console.log(`🎉 SUCCESS: Complete user record copied!`);
    console.log(`✅ Development user has ${Object.keys(devUser).length} fields`);
    console.log(`🔐 All TOTP, auth, and profile data preserved exactly`);

    return true;

  } catch (error) {
    console.error('❌ Error copying complete user:', error);
    return false;
  } finally {
    await prodPrisma.$disconnect();
    await devPrisma.$disconnect();
  }
}

// Parse arguments
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/copy-complete-user.js jeffrey@unitedwerise.org');
  process.exit(1);
}

copyCompleteUser(email).then(success => {
  process.exit(success ? 0 : 1);
});