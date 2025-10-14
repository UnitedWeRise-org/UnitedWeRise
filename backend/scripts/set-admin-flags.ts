/**
 * Script to set admin and super-admin flags for a user
 * Usage: npx tsx scripts/set-admin-flags.ts <userId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdminFlags(userId: string) {
    try {
        console.log(`Setting isAdmin=true and isSuperAdmin=true for user: ${userId}`);

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                isAdmin: true,
                isSuperAdmin: true
            },
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

        console.log('✅ Successfully updated user:');
        console.log(JSON.stringify(user, null, 2));

    } catch (error) {
        console.error('❌ Failed to update user:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: npx tsx scripts/set-admin-flags.ts <userId>');
    process.exit(1);
}

setAdminFlags(userId);
