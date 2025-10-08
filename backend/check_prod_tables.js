const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `;
    console.log('Production tables:', tables.map(t => t.tablename));
    
    // Check for Photo table specifically
    const photoExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Photo'
      );
    `;
    console.log('Photo table exists:', photoExists[0].exists);
    
    // Check for Quest tables
    const questExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Quest'
      );
    `;
    console.log('Quest table exists:', questExists[0].exists);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
