/**
 * Script to audit all admin accounts
 *
 * Purpose: Display comprehensive view of all privileged accounts in the system,
 * including admin, moderator, and super-admin status.
 *
 * Usage: npx ts-node scripts/audit-admins.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PrivilegedUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
}

async function auditAdmins() {
  try {
    console.log('🔍 Admin Account Audit');
    console.log('='.repeat(80));
    console.log(`Audit Date: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Query all privileged users
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
      orderBy: [
        { isSuperAdmin: 'desc' },
        { isAdmin: 'desc' },
        { isModerator: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    if (privilegedUsers.length === 0) {
      console.log('\n⚠️  No privileged users found in database');
      console.log('   This is unusual - at least one admin account should exist');
      return;
    }

    // Calculate statistics
    const stats = {
      totalPrivileged: privilegedUsers.length,
      admins: privilegedUsers.filter(u => u.isAdmin).length,
      moderators: privilegedUsers.filter(u => u.isModerator).length,
      superAdmins: privilegedUsers.filter(u => u.isSuperAdmin).length,
      adminOnly: privilegedUsers.filter(u => u.isAdmin && !u.isModerator && !u.isSuperAdmin).length,
      moderatorOnly: privilegedUsers.filter(u => !u.isAdmin && u.isModerator && !u.isSuperAdmin).length,
      superAdminOnly: privilegedUsers.filter(u => !u.isAdmin && !u.isModerator && u.isSuperAdmin).length,
      multiplePrivileges: privilegedUsers.filter(u =>
        [u.isAdmin, u.isModerator, u.isSuperAdmin].filter(Boolean).length > 1
      ).length
    };

    // Display detailed table
    console.log('\n📋 Privileged Accounts');
    console.log('='.repeat(80));
    console.log(
      padRight('Username', 20) +
      padRight('Email', 30) +
      padRight('Admin', 8) +
      padRight('Mod', 8) +
      padRight('Super', 8)
    );
    console.log('-'.repeat(80));

    privilegedUsers.forEach((user: PrivilegedUser) => {
      console.log(
        padRight(user.username, 20) +
        padRight(user.email, 30) +
        padRight(user.isAdmin ? '✓' : '✗', 8) +
        padRight(user.isModerator ? '✓' : '✗', 8) +
        padRight(user.isSuperAdmin ? '✓' : '✗', 8)
      );
    });

    // Display statistics
    console.log('\n📊 Statistics');
    console.log('='.repeat(80));
    console.log(`Total Privileged Accounts:     ${stats.totalPrivileged}`);
    console.log('');
    console.log('Privilege Breakdown:');
    console.log(`  Admins (isAdmin=true):       ${stats.admins}`);
    console.log(`  Moderators (isMod=true):     ${stats.moderators}`);
    console.log(`  Super Admins (isSuper=true): ${stats.superAdmins}`);
    console.log('');
    console.log('Single Privilege Accounts:');
    console.log(`  Admin only:                  ${stats.adminOnly}`);
    console.log(`  Moderator only:              ${stats.moderatorOnly}`);
    console.log(`  Super Admin only:            ${stats.superAdminOnly}`);
    console.log('');
    console.log(`Accounts with Multiple Flags:  ${stats.multiplePrivileges}`);

    // Recommendations
    console.log('\n💡 Recommendations');
    console.log('='.repeat(80));

    if (stats.multiplePrivileges > 0) {
      console.log('⚠️  WARNING: Accounts with multiple privilege flags detected');
      console.log('   Best practice: Use isAdmin=true only for standard admins');
      console.log('   Reserve isSuperAdmin and isModerator for specific roles');
    }

    if (stats.superAdmins === 0) {
      console.log('✅ No super admin accounts (good - reserve for emergency use)');
    }

    if (stats.admins > 0) {
      console.log(`✅ ${stats.admins} admin account(s) configured`);
    }

    // Specific account checks
    console.log('\n🔍 Key Account Verification');
    console.log('='.repeat(80));

    const unitedWeRise = privilegedUsers.find(u => u.username === 'UnitedWeRise');
    const project2029 = privilegedUsers.find(u => u.username === 'Project2029');

    if (unitedWeRise) {
      console.log('✅ UnitedWeRise account found:');
      console.log(`   isAdmin: ${unitedWeRise.isAdmin}`);
      console.log(`   isModerator: ${unitedWeRise.isModerator}`);
      console.log(`   isSuperAdmin: ${unitedWeRise.isSuperAdmin}`);

      if (unitedWeRise.isAdmin) {
        console.log('   ✓ Has admin dashboard access');
      } else {
        console.log('   ✗ WARNING: Missing admin flag!');
      }
    } else {
      console.log('⚠️  UnitedWeRise account not found in privileged users');
    }

    if (project2029) {
      console.log('\n✅ Project2029 account found:');
      console.log(`   isAdmin: ${project2029.isAdmin}`);
      console.log(`   isModerator: ${project2029.isModerator}`);
      console.log(`   isSuperAdmin: ${project2029.isSuperAdmin}`);

      const isCorrect = project2029.isAdmin && !project2029.isModerator && !project2029.isSuperAdmin;
      if (isCorrect) {
        console.log('   ✓ Privileges correctly set (admin only)');
      } else {
        console.log('   ✗ WARNING: Incorrect privilege configuration!');
        console.log('   Expected: isAdmin=true, isModerator=false, isSuperAdmin=false');
      }
    } else {
      console.log('\n⚠️  Project2029 account not found in privileged users');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Audit completed successfully');

  } catch (error) {
    console.error('\n❌ Error during audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Pad string to right with spaces
 */
function padRight(str: string, length: number): string {
  return str.padEnd(length, ' ');
}

auditAdmins();
