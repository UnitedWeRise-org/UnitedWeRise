import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Political content templates
const POLITICAL_POSTS = [
  "Universal healthcare is a human right. No one should go bankrupt from medical bills.",
  "Free market solutions drive innovation in healthcare. Competition lowers costs.",
  "We need healthcare reform that balances access with fiscal responsibility.",
  "Climate action can't wait. We need the Green New Deal now to save our planet.",
  "Economic growth and environmental protection can coexist through innovation, not regulation.",
  "Practical climate solutions should include both renewable energy and transitional fuels.",
  "Tax the wealthy to fund social programs. Income inequality is destroying America.",
  "Lower taxes stimulate growth. Government spending is out of control.",
  "Smart tax policy should incentivize growth while funding essential services.",
  "America is a nation of immigrants. We need comprehensive immigration reform with a path to citizenship.",
  "Secure borders are essential for national security. We must enforce existing immigration laws.",
  "Immigration reform should balance humanitarian concerns with border security.",
  "Free college education is an investment in our future. Cancel student debt now.",
  "School choice empowers parents. Competition improves educational outcomes.",
  "Education reform should make college affordable while maintaining quality standards.",
  "Common sense gun laws save lives. We need universal background checks and assault weapon bans.",
  "The Second Amendment protects our freedom. Law-abiding citizens shouldn't be punished.",
  "We can respect gun rights while implementing reasonable safety measures.",
  "End mass incarceration. Focus on rehabilitation, not punishment.",
  "Law and order keeps communities safe. Support our police.",
  "Criminal justice reform should balance public safety with rehabilitation.",
  "Massive public investment in green infrastructure will create jobs and fight climate change.",
  "Private-public partnerships deliver infrastructure more efficiently than government alone.",
  "Infrastructure investment should be bipartisan - roads and bridges aren't political.",
  "Diplomacy first. Military intervention should be a last resort.",
  "Peace through strength. A strong military deters aggression.",
  "Smart foreign policy combines diplomatic engagement with military readiness.",
  "Love is love. Trans rights are human rights. Equality for all.",
  "Traditional values built this nation. Protect religious freedom.",
  "Respect individual rights while preserving community values.",
  "Local elections matter just as much as federal ones. Vote in every election!",
  "Our city council needs to address the housing crisis with affordable development.",
  "Public transportation investment is key to reducing traffic and pollution.",
  "Small businesses are the backbone of our economy. We need to support them better.",
  "Mental health services need more funding in our schools and communities.",
  "Voter registration should be automatic and accessible to all eligible citizens."
];

async function addTestPosts() {
  console.log('🚀 Adding test posts...');
  
  try {
    // Get existing users (test accounts with testuser emails)
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'testuser' } },
          { email: { contains: '@unitedwerise.org' } }
        ]
      },
      take: 20 // Just use 20 users
    });

    console.log(`Found ${testUsers.length} test users`);

    if (testUsers.length === 0) {
      console.log('No test users found. Please create test users first.');
      return;
    }

    let postsCreated = 0;

    // Create 3-5 posts per user
    for (const user of testUsers) {
      const postCount = Math.floor(Math.random() * 3) + 3; // 3-5 posts
      
      for (let i = 0; i < postCount; i++) {
        const content = POLITICAL_POSTS[Math.floor(Math.random() * POLITICAL_POSTS.length)];
        
        try {
          await prisma.post.create({
            data: {
              content,
              authorId: user.id,
              isPolitical: true,
              likesCount: Math.floor(Math.random() * 50), // 0-49 likes
              commentsCount: Math.floor(Math.random() * 20), // 0-19 comments
              createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Within last 7 days
            }
          });
          
          postsCreated++;
          console.log(`✅ Created post ${postsCreated} for ${user.username}: ${content.substring(0, 50)}...`);
        } catch (error) {
          console.error(`❌ Failed to create post for ${user.username}:`, error);
        }
      }
    }

    console.log(`\n🎉 Created ${postsCreated} test posts!`);
    console.log('Now the AI trending system should have enough content to analyze.');
    
  } catch (error) {
    console.error('❌ Error adding test posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPosts();