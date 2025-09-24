const { PrismaClient } = require('@prisma/client');

// Connect to production database
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://uwradmin:UWR-Secure2024!@unitedwerise-db.postgres.database.azure.com:5432/postgres?schema=public&sslmode=require"
        }
    }
});

async function deleteProductionUser() {
    try {
        console.log('Connecting to PRODUCTION database...');

        // Delete the user
        const deletedUser = await prisma.user.delete({
            where: {
                email: 'jeffrey@unitedwerise.org'
            }
        });

        console.log('USER DELETED FROM PRODUCTION DATABASE:');
        console.log('=====================================');
        console.log('Deleted ID:', deletedUser.id);
        console.log('Email:', deletedUser.email);
        console.log('Username:', deletedUser.username);
        console.log('=====================================');
        console.log('You can now register with this email again.');

    } catch (error) {
        console.error('Error deleting user:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

deleteProductionUser();