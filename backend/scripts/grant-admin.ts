/**
 * Script to grant admin privileges to a user
 * Usage: npx ts-node scripts/grant-admin.ts <username>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantAdminPrivileges(username: string) {
  try {
    console.log(`🔍 Looking for user: ${username}`);

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isModerator: true,
        isSuperAdmin: true
      }
    });

    if (!user) {
      console.error(`❌ User '${username}' not found in database`);
      process.exit(1);
    }

    console.log(`\n📋 Current status for ${user.username} (${user.email}):`);
    console.log(`   isAdmin: ${user.isAdmin}`);
    console.log(`   isModerator: ${user.isModerator}`);
    console.log(`   isSuperAdmin: ${user.isSuperAdmin}`);

    if (user.isAdmin && user.isSuperAdmin) {
      console.log(`\n✅ User already has full admin privileges!`);
      process.exit(0);
    }

    console.log(`\n🔄 Granting admin privileges...`);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isAdmin: true,
        isSuperAdmin: true,
        isModerator: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isModerator: true,
        isSuperAdmin: true
      }
    });

    console.log(`\n✅ Admin privileges granted successfully!`);
    console.log(`\n📋 New status for ${updated.username}:`);
    console.log(`   isAdmin: ${updated.isAdmin}`);
    console.log(`   isModerator: ${updated.isModerator}`);
    console.log(`   isSuperAdmin: ${updated.isSuperAdmin}`);

    console.log(`\n🎉 User ${updated.username} is now an admin! Please log out and log back in for changes to take effect.`);

  } catch (error) {
    console.error(`\n❌ Error granting admin privileges:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const username = process.argv[2];

if (!username) {
  console.error('❌ Usage: npx ts-node scripts/grant-admin.ts <username>');
  console.error('   Example: npx ts-node scripts/grant-admin.ts Project2029');
  process.exit(1);
}

grantAdminPrivileges(username);
