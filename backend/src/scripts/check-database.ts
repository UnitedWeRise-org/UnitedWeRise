import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection and data...');
    console.log(`📍 Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')}`);
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`👥 Total users in database: ${userCount}`);
    
    // Check for test users
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'testuser'
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true
      },
      take: 5
    });
    
    console.log(`🧪 Test users found: ${testUsers.length}`);
    if (testUsers.length > 0) {
      console.log('📋 Sample test users:');
      testUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.username}) - Created: ${user.createdAt}`);
      });
    }
    
    // Count posts
    const postCount = await prisma.post.count();
    console.log(`📝 Total posts in database: ${postCount}`);
    
    // Check recent posts
    const recentPosts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log(`📰 Recent posts (${recentPosts.length}):`);
    recentPosts.forEach(post => {
      console.log(`   - By ${post.author.username}: "${post.content.substring(0, 50)}..."`);
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch(console.error);