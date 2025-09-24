const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findJeffrey() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'jeffrey@unitedwerise.org' },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                emailVerified: true,
                isAdmin: true
            }
        });

        if (user) {
            console.log('User found:');
            console.log('ID:', user.id);
            console.log('Email:', user.email);
            console.log('Username:', user.username || 'Not set');
            console.log('Name:', (user.firstName || '') + ' ' + (user.lastName || ''));
            console.log('Created:', user.createdAt);
            console.log('Email Verified:', user.emailVerified);
            console.log('Admin:', user.isAdmin);
        } else {
            console.log('No user found with email: jeffrey@unitedwerise.org');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findJeffrey();