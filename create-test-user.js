/**
 * Quick script to create a test user for local development
 * Run with: node create-test-user.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Hash a simple password
    const hashedPassword = await bcrypt.hash('test123', 12);
    
    const testUser = await prisma.user.create({
      data: {
        email: 'test@test.com',
        username: 'testuser',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        verificationStatus: 'NOT_REQUIRED'
      }
    });
    
    console.log('✅ Test user created successfully!');
    console.log('Login credentials:');
    console.log('Email: test@test.com');
    console.log('Password: test123');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('Test user already exists - you can use:');
      console.log('Email: test@test.com');
      console.log('Password: test123');
    } else {
      console.error('Error creating test user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();