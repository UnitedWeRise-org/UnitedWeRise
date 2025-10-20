/**
 * Script to fix over-privileged admin accounts
 *
 * Purpose: Correct privilege escalation where accounts were granted all three flags
 * (isAdmin, isSuperAdmin, isModerator) when they should only have isAdmin.
 *
 * Usage: npx ts-node scripts/fix-admin-privileges.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminPrivileges() {
  try {
    console.log('🔍 Admin Privilege Fix Tool');
    console.log('=' .repeat(60));

    // Step 1: Query all privileged users
    console.log('\n📋 Step 1: Identifying all privileged accounts...\n');

    const privilegedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { isAdmin: true },
          { isModerator: true },
          { isSuperAdmin: true }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isModerator: true,
        isSuperAdmin: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (privilegedUsers.length === 0) {
      console.log('✅ No privileged users found in database');
      return;
    }

    console.log(`Found ${privilegedUsers.length} privileged account(s):\n`);

    privilegedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   isAdmin: ${user.isAdmin}`);
      console.log(`   isModerator: ${user.isModerator}`);
      console.log(`   isSuperAdmin: ${user.isSuperAdmin}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Step 2: Identify Project2029 account (may not be in privileged users list yet)
    console.log('📋 Step 2: Locating Project2029 account...\n');

    let project2029 = privilegedUsers.find(u => u.username === 'Project2029');

    if (!project2029) {
      // Check if Project2029 exists in database but has no privileges
      console.log('   Project2029 not found in privileged users');
      console.log('   Checking if account exists in database...\n');

      const project2029User = await prisma.user.findUnique({
        where: { username: 'Project2029' },
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          isModerator: true,
          isSuperAdmin: true,
          createdAt: true
        }
      });

      if (!project2029User) {
        console.log('❌ Project2029 account does not exist in database');
        console.log('   No fix needed for this account');
      } else {
        console.log('✅ Found Project2029 account:');
        console.log(`   Email: ${project2029User.email}`);
        console.log(`   Current privileges:`);
        console.log(`     isAdmin: ${project2029User.isAdmin}`);
        console.log(`     isModerator: ${project2029User.isModerator}`);
        console.log(`     isSuperAdmin: ${project2029User.isSuperAdmin}`);

        if (!project2029User.isAdmin) {
          console.log('\n⚠️  Project2029 has NO admin privileges!');
          console.log('🔄 Step 3: Granting admin privileges to Project2029...\n');

          const updated = await prisma.user.update({
            where: { id: project2029User.id },
            data: {
              isAdmin: true,
              isSuperAdmin: false,
              isModerator: false
            },
            select: {
              username: true,
              email: true,
              isAdmin: true,
              isModerator: true,
              isSuperAdmin: true
            }
          });

          console.log('✅ Admin privileges granted to Project2029 successfully!');
          console.log('\nBefore:');
          console.log(`   isAdmin: ${project2029User.isAdmin}`);
          console.log(`   isModerator: ${project2029User.isModerator}`);
          console.log(`   isSuperAdmin: ${project2029User.isSuperAdmin}`);
          console.log('\nAfter:');
          console.log(`   isAdmin: ${updated.isAdmin}`);
          console.log(`   isModerator: ${updated.isModerator}`);
          console.log(`   isSuperAdmin: ${updated.isSuperAdmin}`);

          project2029 = updated as any; // For summary
        } else {
          console.log('\n✅ Project2029 already has correct privileges!');
          project2029 = project2029User as any;
        }
      }
    } else {
      console.log('✅ Found Project2029 account:');
      console.log(`   Email: ${project2029.email}`);
      console.log(`   Current privileges:`);
      console.log(`     isAdmin: ${project2029.isAdmin}`);
      console.log(`     isModerator: ${project2029.isModerator}`);
      console.log(`     isSuperAdmin: ${project2029.isSuperAdmin}`);

      // Check if fix is needed
      const needsFix = project2029.isSuperAdmin || project2029.isModerator;

      if (!needsFix) {
        console.log('\n✅ Project2029 privileges are already correct!');
      } else {
        console.log('\n🔄 Step 3: Fixing Project2029 privileges...\n');

        const updated = await prisma.user.update({
          where: { id: project2029.id },
          data: {
            isAdmin: true,
            isSuperAdmin: false,
            isModerator: false
          },
          select: {
            username: true,
            email: true,
            isAdmin: true,
            isModerator: true,
            isSuperAdmin: true
          }
        });

        console.log('✅ Project2029 privileges corrected successfully!');
        console.log('\nBefore:');
        console.log(`   isAdmin: ${project2029.isAdmin}`);
        console.log(`   isModerator: ${project2029.isModerator}`);
        console.log(`   isSuperAdmin: ${project2029.isSuperAdmin}`);
        console.log('\nAfter:');
        console.log(`   isAdmin: ${updated.isAdmin}`);
        console.log(`   isModerator: ${updated.isModerator}`);
        console.log(`   isSuperAdmin: ${updated.isSuperAdmin}`);
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Total privileged accounts: ${privilegedUsers.length}`);
    console.log(`Project2029 fixed: ${project2029 && (project2029.isSuperAdmin || project2029.isModerator) ? 'Yes' : 'No'}`);
    console.log('\n✅ Admin privilege fix completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run audit-admins.ts to verify all privileges');
    console.log('   2. Have affected users log out and log back in');

  } catch (error) {
    console.error('\n❌ Error fixing admin privileges:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPrivileges();
