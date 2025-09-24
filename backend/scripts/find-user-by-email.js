const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findUserByEmail() {
    const email = process.argv[2];

    if (!email) {
        console.log('Usage: node find-user-by-email.js <email>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
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
            console.log('Name:', `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Not set');
            console.log('Created:', user.createdAt);
            console.log('Email Verified:', user.emailVerified);
            console.log('Admin:', user.isAdmin);
        } else {
            console.log('No user found with that email address.');
        }
    } catch (error) {
        console.error('Error finding user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findUserByEmail();