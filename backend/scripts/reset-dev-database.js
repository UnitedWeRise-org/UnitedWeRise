/**
 * Reset Development Database
 * Clears all data from development database for fresh start
 * Usage: node scripts/reset-dev-database.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🚨 RESETTING DEVELOPMENT DATABASE...');
    console.log('⚠️ This will delete ALL data in the development database');

    // Delete all data in order (respecting foreign key constraints)
    console.log('🗑️ Deleting user data...');

    // Delete user-related data first
    await prisma.post.deleteMany({});
    console.log('✅ Posts deleted');

    await prisma.comment.deleteMany({});
    console.log('✅ Comments deleted');

    await prisma.like.deleteMany({});
    console.log('✅ Likes deleted');

    await prisma.follow.deleteMany({});
    console.log('✅ Follows deleted');

    await prisma.friendship.deleteMany({});
    console.log('✅ Friendships deleted');

    await prisma.subscription.deleteMany({});
    console.log('✅ Subscriptions deleted');

    await prisma.notification.deleteMany({});
    console.log('✅ Notifications deleted');

    await prisma.message.deleteMany({});
    console.log('✅ Messages deleted');

    await prisma.conversation.deleteMany({});
    console.log('✅ Conversations deleted');

    await prisma.reportPost.deleteMany({});
    console.log('✅ Post reports deleted');

    await prisma.reportUser.deleteMany({});
    console.log('✅ User reports deleted');

    await prisma.politicalProfile.deleteMany({});
    console.log('✅ Political profiles deleted');

    await prisma.profile.deleteMany({});
    console.log('✅ User profiles deleted');

    await prisma.candidate.deleteMany({});
    console.log('✅ Candidates deleted');

    await prisma.payment.deleteMany({});
    console.log('✅ Payments deleted');

    // Delete users last
    await prisma.user.deleteMany({});
    console.log('✅ Users deleted');

    // Delete system data
    await prisma.politicalOfficial.deleteMany({});
    console.log('✅ Political officials deleted');

    await prisma.election.deleteMany({});
    console.log('✅ Elections deleted');

    await prisma.office.deleteMany({});
    console.log('✅ Offices deleted');

    // Reset any auto-increment sequences (if needed)
    console.log('🔄 Resetting sequences...');

    console.log('🎉 SUCCESS: Development database reset complete');
    console.log('📋 Next steps:');
    console.log('1. Create your account on production: https://www.unitedwerise.org');
    console.log('2. Run: node scripts/copy-prod-account-to-dev.js jeffrey@unitedwerise.org');
    console.log('3. Login to dev.unitedwerise.org with your production credentials');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmation check
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log('🚨 WARNING: This will delete ALL data in the development database');
  console.log('To confirm, run: node scripts/reset-dev-database.js --confirm');
  process.exit(1);
}

resetDatabase().catch(error => {
  console.error('❌ Database reset failed:', error);
  process.exit(1);
});