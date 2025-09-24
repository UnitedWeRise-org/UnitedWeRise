/**
 * Copy Production Account to Development Database
 * Usage: node scripts/copy-prod-account-to-dev.js jeffrey@unitedwerise.org
 */

const { PrismaClient } = require('@prisma/client');

// Production database connection
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PRODUCTION_DATABASE_URL
    }
  }
});

// Development database connection
const devPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function copyAccount(email) {
  try {
    console.log(`🔍 Looking up ${email} in production database...`);

    // Get user from production
    const prodUser = await prodPrisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        politicalProfile: true
      }
    });

    if (!prodUser) {
      console.error(`❌ User ${email} not found in production database`);
      return false;
    }

    console.log(`✅ Found user: ${prodUser.firstName} ${prodUser.lastName} (${prodUser.username})`);
    console.log(`📊 Admin status: ${prodUser.isAdmin ? 'YES' : 'NO'}`);

    // Check if user already exists in dev
    const existingDevUser = await devPrisma.user.findUnique({
      where: { email }
    });

    if (existingDevUser) {
      console.log(`⚠️ User already exists in dev database. Making admin...`);

      const updatedUser = await devPrisma.user.update({
        where: { email },
        data: { isAdmin: true }
      });

      console.log(`✅ ${email} is now admin in dev database`);
      return true;
    }

    // Copy user to dev database
    console.log(`📋 Copying account to development database...`);

    const newDevUser = await devPrisma.user.create({
      data: {
        email: prodUser.email,
        password: prodUser.password, // Same password hash
        username: prodUser.username,
        firstName: prodUser.firstName,
        lastName: prodUser.lastName,
        avatar: prodUser.avatar,
        isAdmin: true, // Always make admin in dev
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: prodUser.createdAt,
        updatedAt: new Date()
      }
    });

    // Copy profile if it exists
    if (prodUser.profile) {
      await devPrisma.profile.create({
        data: {
          userId: newDevUser.id,
          bio: prodUser.profile.bio,
          location: prodUser.profile.location,
          website: prodUser.profile.website,
          birthday: prodUser.profile.birthday,
          phoneNumber: prodUser.profile.phoneNumber
        }
      });
      console.log(`✅ Profile copied`);
    }

    // Copy political profile if it exists
    if (prodUser.politicalProfile) {
      await devPrisma.politicalProfile.create({
        data: {
          userId: newDevUser.id,
          politicalAffiliation: prodUser.politicalProfile.politicalAffiliation,
          interests: prodUser.politicalProfile.interests,
          address: prodUser.politicalProfile.address,
          city: prodUser.politicalProfile.city,
          state: prodUser.politicalProfile.state,
          zipCode: prodUser.politicalProfile.zipCode
        }
      });
      console.log(`✅ Political profile copied`);
    }

    console.log(`🎉 SUCCESS: ${email} copied to dev database with admin privileges`);
    console.log(`🔑 You can now log in to dev.unitedwerise.org with your production credentials`);

    return true;

  } catch (error) {
    console.error('❌ Error copying account:', error);
    return false;
  } finally {
    await prodPrisma.$disconnect();
    await devPrisma.$disconnect();
  }
}

// Run the script
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/copy-prod-account-to-dev.js jeffrey@unitedwerise.org');
  process.exit(1);
}

copyAccount(email).then(success => {
  process.exit(success ? 0 : 1);
});