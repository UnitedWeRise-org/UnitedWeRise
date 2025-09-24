/**
 * Create Super-Admin Role and Assign to User
 * Usage: node scripts/create-super-admin.js jeffrey@unitedwerise.org
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSuperAdmin(email) {
  try {
    console.log(`🔍 Looking up ${email}...`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        isSuperAdmin: true
      }
    });

    if (!user) {
      console.error(`❌ User ${email} not found in database`);
      console.log(`💡 Please ensure the user has an account first`);
      return false;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.username})`);
    console.log(`📊 Current status:`);
    console.log(`   Admin: ${user.isAdmin ? 'YES' : 'NO'}`);
    console.log(`   Super-Admin: ${user.isSuperAdmin ? 'YES' : 'NO'}`);

    if (user.isSuperAdmin) {
      console.log(`🎉 ${email} is already a Super-Admin!`);
      return true;
    }

    // Promote to Super-Admin (and Admin if not already)
    console.log(`🚀 Promoting ${email} to Super-Admin...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        isAdmin: true,      // Ensure admin status
        isSuperAdmin: true  // Grant super-admin status
      }
    });

    console.log(`🎉 SUCCESS: ${email} is now a Super-Admin!`);
    console.log(`⚡ Privileges granted:`);
    console.log(`   ✅ Full administrative access`);
    console.log(`   ✅ User management capabilities`);
    console.log(`   ✅ System configuration access`);
    console.log(`   ✅ Database management tools`);
    console.log(`   ✅ Advanced debugging features`);
    console.log(`   ✅ Production system control`);

    return true;

  } catch (error) {
    console.error('❌ Error creating Super-Admin:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse arguments
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/create-super-admin.js jeffrey@unitedwerise.org');
  process.exit(1);
}

createSuperAdmin(email).then(success => {
  process.exit(success ? 0 : 1);
});