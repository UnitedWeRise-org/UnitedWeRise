/**
 * Make existing user admin
 * Usage: node scripts/make-admin.js jeffrey@unitedwerise.org
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeAdmin(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`❌ User ${email} not found`);
      console.log(`💡 To create admin account, run:`);
      console.log(`node scripts/create-dev-admin.js ${email} "password123" "First" "Last"`);
      return false;
    }

    if (user.isAdmin) {
      console.log(`✅ ${email} is already admin`);
      return true;
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    });

    console.log(`🎉 SUCCESS: ${email} is now admin`);
    console.log(`🌐 You can now access dev.unitedwerise.org with admin privileges`);

    return true;

  } catch (error) {
    console.error('❌ Error making user admin:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/make-admin.js jeffrey@unitedwerise.org');
  process.exit(1);
}

makeAdmin(email).then(success => {
  process.exit(success ? 0 : 1);
});