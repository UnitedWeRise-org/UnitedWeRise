const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function countPhotos() {
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*) FROM "Photo";`;
    console.log('Photos in production:', count[0].count);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

countPhotos();
