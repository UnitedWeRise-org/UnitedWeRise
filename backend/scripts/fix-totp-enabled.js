/**
 * Fix TOTP Enabled Flag
 * Sets totpEnabled=true for user with existing TOTP secret
 * Usage: node scripts/fix-totp-enabled.js jeffrey@unitedwerise.org
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTOTPEnabled(email) {
  try {
    console.log(`🔧 Fixing TOTP enabled flag for ${email}...`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        totpSecret: true,
        totpEnabled: true,
        totpSetupAt: true
      }
    });

    if (!user) {
      console.error(`❌ User ${email} not found`);
      return false;
    }

    if (!user.totpSecret) {
      console.error(`❌ User ${email} has no TOTP secret - TOTP not configured`);
      return false;
    }

    if (user.totpEnabled) {
      console.log(`✅ ${email} already has TOTP enabled`);
      return true;
    }

    console.log(`📊 Current status:`);
    console.log(`   TOTP Secret: ${user.totpSecret ? 'SET' : 'NOT SET'}`);
    console.log(`   TOTP Enabled: ${user.totpEnabled ? 'YES' : 'NO'}`);
    console.log(`   Setup Date: ${user.totpSetupAt ? user.totpSetupAt.toISOString() : 'NOT SET'}`);

    console.log(`🚀 Enabling TOTP flag...`);

    // Create some default backup codes (typical TOTP setup)
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    await prisma.user.update({
      where: { email },
      data: {
        totpEnabled: true,
        totpBackupCodes: backupCodes
      }
    });

    console.log(`🎉 SUCCESS: TOTP enabled for ${email}`);
    console.log(`✅ Generated ${backupCodes.length} backup codes`);
    console.log(`🔐 TOTP is now fully functional`);

    return true;

  } catch (error) {
    console.error('❌ Error fixing TOTP:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse arguments
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/fix-totp-enabled.js jeffrey@unitedwerise.org');
  process.exit(1);
}

fixTOTPEnabled(email).then(success => {
  process.exit(success ? 0 : 1);
});