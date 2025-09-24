// Check production database connection and get user info
const { Client } = require('pg');
require('dotenv').config();

async function getProductionUser() {
    // Use production database URL
    const client = new Client({
        connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const result = await client.query(
            'SELECT id, email, username, "firstName", "lastName", "createdAt", "emailVerified", "isAdmin" FROM "User" WHERE email = $1',
            ['jeffrey@unitedwerise.org']
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('User found in production database:');
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
        console.error('Database error:', error.message);
    } finally {
        await client.end();
    }
}

getProductionUser();