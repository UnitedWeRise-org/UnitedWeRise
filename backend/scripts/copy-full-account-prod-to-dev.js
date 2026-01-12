/**
 * Copy Complete Production Account to Development Database
 * Preserves TOTP keys, user ID, and all account data for seamless cross-environment access
 * Usage: node scripts/copy-full-account-prod-to-dev.js jeffrey@unitedwerise.org cmfx7z2jn00084o08xhyc5leo
 *
 * Required environment variables:
 *   PROD_DATABASE_URL - Production database connection string
 *   DEV_DATABASE_URL  - Development database connection string
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Validate required environment variables
const prodUrl = process.env.PROD_DATABASE_URL;
const devUrl = process.env.DEV_DATABASE_URL;

if (!prodUrl || !devUrl) {
  console.error('ERROR: Required environment variables not set.');
  console.error('');
  console.error('Please set the following in your environment or .env file:');
  if (!prodUrl) console.error('  - PROD_DATABASE_URL');
  if (!devUrl) console.error('  - DEV_DATABASE_URL');
  console.error('');
  console.error('Example:');
  console.error('  PROD_DATABASE_URL="postgresql://user:pass@prod-host:5432/db?sslmode=require"');
  console.error('  DEV_DATABASE_URL="postgresql://user:pass@dev-host:5432/db?sslmode=require"');
  process.exit(1);
}

// Production database configuration
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: prodUrl
    }
  }
});

// Development database configuration
const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: devUrl
    }
  }
});

async function copyFullAccount(email, userId) {
  try {
    console.log(`🔍 Fetching complete production account for ${email} (${userId})...`);

    // Get complete production user data (just user table - essential data only)
    const prodUser = await prodPrisma.user.findUnique({
      where: { email }
    });

    if (!prodUser) {
      console.error(`❌ Production user ${email} not found`);
      return false;
    }

    if (prodUser.id !== userId) {
      console.error(`❌ User ID mismatch! Expected: ${userId}, Found: ${prodUser.id}`);
      return false;
    }

    console.log(`✅ Found production user: ${prodUser.firstName} ${prodUser.lastName}`);
    console.log(`📊 Production account status:`);
    console.log(`   Admin: ${prodUser.isAdmin ? 'YES' : 'NO'}`);
    console.log(`   Super-Admin: ${prodUser.isSuperAdmin ? 'YES' : 'NO'}`);
    console.log(`   TOTP Enabled: ${prodUser.totpSecret ? 'YES' : 'NO'}`);

    // Check if user already exists in development
    const existingDevUser = await devPrisma.user.findUnique({
      where: { email }
    });

    if (existingDevUser) {
      console.log(`🔄 Deleting existing development user to prevent conflicts...`);

      try {
        // Delete user (database cascading should handle related records)
        await devPrisma.user.delete({ where: { id: existingDevUser.id } });
        console.log(`🗑️ Existing development user deleted`);
      } catch (error) {
        console.log(`⚠️ Note: Some related data may need manual cleanup: ${error.message}`);
        // Continue anyway - we'll create with the new ID
      }
    }

    // Create user in development with exact same data
    console.log(`🚀 Creating development user with production data...`);

    const devUser = await devPrisma.user.create({
      data: {
        // Use exact same ID and core data
        id: prodUser.id,
        email: prodUser.email,
        username: prodUser.username,
        password: prodUser.password, // Preserve hashed password

        // Profile Information
        firstName: prodUser.firstName,
        lastName: prodUser.lastName,
        avatar: prodUser.avatar,
        backgroundImage: prodUser.backgroundImage,
        bio: prodUser.bio,
        website: prodUser.website,
        location: prodUser.location,

        // Address & Location
        streetAddress: prodUser.streetAddress,
        streetAddress2: prodUser.streetAddress2,
        city: prodUser.city,
        state: prodUser.state,
        zipCode: prodUser.zipCode,
        latitude: prodUser.latitude,
        longitude: prodUser.longitude,
        h3Index: prodUser.h3Index,

        // Political Profile
        politicalProfileType: prodUser.politicalProfileType,
        verificationStatus: prodUser.verificationStatus,
        office: prodUser.office,
        officialTitle: prodUser.officialTitle,
        campaignWebsite: prodUser.campaignWebsite,

        // Reputation System
        reputation: prodUser.reputation,
        reputationLastUpdated: prodUser.reputationLastUpdated,

        // Social Metrics
        followersCount: prodUser.followersCount,
        followingCount: prodUser.followingCount,

        // Account Status
        emailVerified: prodUser.emailVerified,
        phoneVerified: prodUser.phoneVerified,
        accountStatus: prodUser.accountStatus,
        moderationStatus: prodUser.moderationStatus,

        // Role & Permission System (CRITICAL - preserve all privileges)
        isModerator: prodUser.isModerator,
        isAdmin: prodUser.isAdmin,
        isSuperAdmin: prodUser.isSuperAdmin,
        isSuspended: prodUser.isSuspended,

        // TOTP Settings (CRITICAL - preserve 2FA)
        totpSecret: prodUser.totpSecret, // Preserve TOTP secret key
        totpSetupAt: prodUser.totpSetupAt,

        // Authentication
        resetToken: prodUser.resetToken,
        resetExpiry: prodUser.resetExpiry,
        isOnline: prodUser.isOnline,
        lastSeenAt: prodUser.lastSeenAt,

        // Onboarding & Preferences
        onboardingData: prodUser.onboardingData,
        onboardingCompleted: prodUser.onboardingCompleted,
        interests: prodUser.interests,
        politicalExperience: prodUser.politicalExperience,

        // Timestamps (preserve creation date)
        createdAt: prodUser.createdAt,
        updatedAt: new Date()
      }
    });

    console.log(`🎉 SUCCESS: Complete account copied to development!`);
    console.log(`✅ Development account details:`);
    console.log(`   ID: ${devUser.id}`);
    console.log(`   Email: ${devUser.email}`);
    console.log(`   Username: ${devUser.username}`);
    console.log(`   Admin: ${devUser.isAdmin ? 'YES' : 'NO'}`);
    console.log(`   Super-Admin: ${devUser.isSuperAdmin ? 'YES' : 'NO'}`);
    console.log(`   TOTP Secret: ${devUser.totpSecret ? 'PRESERVED' : 'NOT SET'}`);
    console.log(`   TOTP Setup Date: ${devUser.totpSetupAt ? devUser.totpSetupAt.toISOString() : 'N/A'}`);

    console.log(`\n🌐 Development Environment Access:`);
    console.log(`   URL: https://dev.unitedwerise.org`);
    console.log(`   Email: ${devUser.email}`);
    console.log(`   Password: Your production password (same as production)`);
    console.log(`   2FA: Your existing TOTP app will work seamlessly`);

    return true;

  } catch (error) {
    console.error('❌ Error copying account:', error);
    return false;
  } finally {
    await prodPrisma.$disconnect();
    await devPrisma.$disconnect();
  }
}

// Parse arguments
const email = process.argv[2];
const userId = process.argv[3];

if (!email || !userId) {
  console.error('❌ Please provide email and user ID');
  console.log('Usage: node scripts/copy-full-account-prod-to-dev.js jeffrey@unitedwerise.org cmfx7z2jn00084o08xhyc5leo');
  process.exit(1);
}

copyFullAccount(email, userId).then(success => {
  process.exit(success ? 0 : 1);
});