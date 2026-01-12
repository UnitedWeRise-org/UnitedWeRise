const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Validate required environment variable
const databaseUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error('ERROR: Required environment variable not set.');
    console.error('Please set PROD_DATABASE_URL or DATABASE_URL in your environment.');
    console.error('');
    console.error('Example:');
    console.error('  PROD_DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"');
    process.exit(1);
}

// Connect to production database
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
});

async function deleteProductionUser() {
    try {
        console.log('Connecting to database...');

        // Delete the user
        const deletedUser = await prisma.user.delete({
            where: {
                email: 'jeffrey@unitedwerise.org'
            }
        });

        console.log('USER DELETED FROM DATABASE:');
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