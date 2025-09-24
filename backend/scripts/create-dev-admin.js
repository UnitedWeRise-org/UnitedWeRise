/**
 * Quick Admin Account Creator for Development
 * Usage: node scripts/create-dev-admin.js jeffrey@unitedwerise.org "password123" "Jeffrey" "Ricciardi"
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminAccount(email, password, firstName, lastName) {
  try {
    console.log(`🔑 Creating admin account: ${email}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log(`⚠️ User already exists. Making admin...`);

      const updatedUser = await prisma.user.update({
        where: { email },
        data: { isAdmin: true }
      });

      console.log(`✅ ${email} is now admin`);
      return true;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create username from email
    const username = email.split('@')[0].toLowerCase();

    // Create admin user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        firstName,
        lastName,
        isAdmin: true,
        isActive: true,
        lastLoginAt: new Date()
      }
    });

    console.log(`🎉 SUCCESS: Admin account created`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`⚡ Admin: YES`);
    console.log(`🌐 Login at: https://dev.unitedwerise.org`);

    return true;

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse arguments
const [email, password, firstName, lastName] = process.argv.slice(2);

if (!email || !password || !firstName || !lastName) {
  console.error('❌ Missing required arguments');
  console.log('Usage: node scripts/create-dev-admin.js EMAIL PASSWORD FIRSTNAME LASTNAME');
  console.log('Example: node scripts/create-dev-admin.js jeffrey@unitedwerise.org "mypassword" "Jeffrey" "Ricciardi"');
  process.exit(1);
}

createAdminAccount(email, password, firstName, lastName).then(success => {
  process.exit(success ? 0 : 1);
});