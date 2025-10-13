/**
 * Script to check admin flags for a user
 * Usage: npx tsx scripts/check-admin-flags.ts <userId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminFlags(userId: string) {
    try {
        console.log(`Checking admin flags for user: ${userId}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
            console.error('❌ User not found');
            process.exit(1);
        }

        console.log('✅ User found:');
        console.log(JSON.stringify(user, null, 2));

    } catch (error) {
        console.error('❌ Failed to check user:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

const userId = process.argv[2];

if (!userId) {
    console.error('Usage: npx tsx scripts/check-admin-flags.ts <userId>');
    process.exit(1);
}

checkAdminFlags(userId);
