import { PoliticalProfileType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

// Major US cities with coordinates for geographic diversity
const US_LOCATIONS = [
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060, zipCode: '10001' },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437, zipCode: '90001' },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298, zipCode: '60601' },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698, zipCode: '77001' },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740, zipCode: '85001' },
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652, zipCode: '19101' },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936, zipCode: '78201' },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611, zipCode: '92101' },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970, zipCode: '75201' },
  { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431, zipCode: '78701' },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557, zipCode: '32099' },
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194, zipCode: '94101' },
  { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988, zipCode: '43215' },
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431, zipCode: '28201' },
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581, zipCode: '46201' },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321, zipCode: '98101' },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903, zipCode: '80201' },
  { city: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589, zipCode: '02101' },
  { city: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816, zipCode: '37201' },
  { city: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458, zipCode: '48201' },
  { city: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784, zipCode: '97201' },
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398, zipCode: '89101' },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.0490, zipCode: '38103' },
  { city: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585, zipCode: '40201' },
  { city: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065, zipCode: '53201' },
  { city: 'Albuquerque', state: 'NM', lat: 35.0853, lng: -106.6056, zipCode: '87101' },
  { city: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747, zipCode: '85701' },
  { city: 'Fresno', state: 'CA', lat: 36.7378, lng: -119.7871, zipCode: '93701' },
  { city: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944, zipCode: '95814' },
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786, zipCode: '64101' },
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880, zipCode: '30301' },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918, zipCode: '33101' },
  { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382, zipCode: '27601' },
  { city: 'Omaha', state: 'NE', lat: 41.2565, lng: -95.9345, zipCode: '68102' },
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650, zipCode: '55401' },
  { city: 'Tulsa', state: 'OK', lat: 36.1540, lng: -95.9928, zipCode: '74103' },
  { city: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944, zipCode: '44101' },
  { city: 'Wichita', state: 'KS', lat: 37.6872, lng: -97.3301, zipCode: '67201' },
  { city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715, zipCode: '70112' },
  { city: 'Arlington', state: 'VA', lat: 38.8816, lng: -77.0910, zipCode: '22201' }
];

// Political viewpoints for diversity
const POLITICAL_LEANINGS = [
  'Progressive', 'Liberal', 'Moderate', 'Conservative', 'Libertarian',
  'Independent', 'Green Party', 'Socialist', 'Centrist', 'Populist'
];

// Sample post topics for political discourse
const POST_TEMPLATES = [
  // Healthcare
  { 
    progressive: "Universal healthcare is a human right. No one should go bankrupt from medical bills.",
    conservative: "Free market solutions drive innovation in healthcare. Competition lowers costs.",
    moderate: "We need healthcare reform that balances access with fiscal responsibility."
  },
  // Climate
  {
    progressive: "Climate action can't wait. We need the Green New Deal now to save our planet.",
    conservative: "Economic growth and environmental protection can coexist through innovation, not regulation.",
    moderate: "Practical climate solutions should include both renewable energy and transitional fuels."
  },
  // Economy
  {
    progressive: "Tax the wealthy to fund social programs. Income inequality is destroying America.",
    conservative: "Lower taxes stimulate growth. Government spending is out of control.",
    moderate: "Smart tax policy should incentivize growth while funding essential services."
  },
  // Immigration
  {
    progressive: "America is a nation of immigrants. We need comprehensive immigration reform with a path to citizenship.",
    conservative: "Secure borders are essential for national security. We must enforce existing immigration laws.",
    moderate: "Immigration reform should balance humanitarian concerns with border security."
  },
  // Education
  {
    progressive: "Free college education is an investment in our future. Cancel student debt now.",
    conservative: "School choice empowers parents. Competition improves educational outcomes.",
    moderate: "Education reform should make college affordable while maintaining quality standards."
  },
  // Gun Control
  {
    progressive: "Common sense gun laws save lives. We need universal background checks and assault weapon bans.",
    conservative: "The Second Amendment protects our freedom. Law-abiding citizens shouldn't be punished.",
    moderate: "We can respect gun rights while implementing reasonable safety measures."
  },
  // Criminal Justice
  {
    progressive: "End mass incarceration. Focus on rehabilitation, not punishment.",
    conservative: "Law and order keeps communities safe. Support our police.",
    moderate: "Criminal justice reform should balance public safety with rehabilitation."
  },
  // Infrastructure
  {
    progressive: "Massive public investment in green infrastructure will create jobs and fight climate change.",
    conservative: "Private-public partnerships deliver infrastructure more efficiently than government alone.",
    moderate: "Infrastructure investment should be bipartisan - roads and bridges aren't political."
  },
  // Foreign Policy
  {
    progressive: "Diplomacy first. Military intervention should be a last resort.",
    conservative: "Peace through strength. A strong military deters aggression.",
    moderate: "Smart foreign policy combines diplomatic engagement with military readiness."
  },
  // Social Issues
  {
    progressive: "Love is love. Trans rights are human rights. Equality for all.",
    conservative: "Traditional values built this nation. Protect religious freedom.",
    moderate: "Respect individual rights while preserving community values."
  }
];

// Generate a random political post based on user's leaning
function generatePost(leaning: string): string {
  const template = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
  
  if (leaning === 'Progressive' || leaning === 'Liberal' || leaning === 'Socialist' || leaning === 'Green Party') {
    return template.progressive;
  } else if (leaning === 'Conservative' || leaning === 'Libertarian') {
    return template.conservative;
  } else {
    return template.moderate;
  }
}

async function generateTestUsers() {
  console.log('🚀 Starting test user generation...');
  
  const hashedPassword = await bcrypt.hash('TestUser123!', 10);
  const users = [];
  const posts = [];
  
  // Generate 100 diverse test users
  for (let i = 0; i < 100; i++) {
    const location = US_LOCATIONS[Math.floor(Math.random() * US_LOCATIONS.length)];
    const politicalLeaning = POLITICAL_LEANINGS[Math.floor(Math.random() * POLITICAL_LEANINGS.length)];
    const gender = faker.person.sex();
    const firstName = faker.person.firstName(gender as any);
    const lastName = faker.person.lastName();
    
    const user = {
      email: `testuser${i + 1}@unitedwerise.org`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
      password: hashedPassword,
      firstName,
      lastName,
      streetAddress: faker.location.streetAddress(),
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
      location: `${location.city}, ${location.state}`,
      politicalParty: politicalLeaning,
      bio: `${politicalLeaning} voter from ${location.city}, ${location.state}. Passionate about making a difference in my community.`,
      politicalProfileType: PoliticalProfileType.CITIZEN,
      emailVerified: true,
      verified: false,
      createdAt: faker.date.past({ years: 1 })
    };
    
    users.push(user);
  }
  
  // Create users in database
  console.log('📝 Creating users in database...');
  const createdUsers = [];
  
  for (const userData of users) {
    try {
      const user = await prisma.user.create({
        data: userData
      });
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username}`);
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.username}:`, error);
    }
  }
  
  console.log(`\n✅ Created ${createdUsers.length} test users`);
  
  // Generate posts for each user
  console.log('\n🖊️ Generating posts for users...');
  
  for (const user of createdUsers) {
    // Each user creates 2-5 posts
    const postCount = Math.floor(Math.random() * 4) + 2;
    
    for (let j = 0; j < postCount; j++) {
      const postContent = generatePost(user.politicalParty || 'Moderate');
      
      try {
        const post = await prisma.post.create({
          data: {
            content: postContent,
            authorId: user.id,
            isPolitical: true,
            likesCount: Math.floor(Math.random() * 100),
            commentsCount: Math.floor(Math.random() * 30),
            createdAt: faker.date.recent({ days: 30 })
          }
        });
        
        posts.push(post);
        console.log(`✅ Created post for ${user.username}`);
      } catch (error) {
        console.error(`❌ Failed to create post for ${user.username}:`, error);
      }
    }
  }
  
  console.log(`\n✅ Created ${posts.length} test posts`);
  
  // Create some interactions (likes, follows)
  console.log('\n💬 Creating user interactions...');
  
  // Random follows
  for (let i = 0; i < 200; i++) {
    const follower = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const following = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    
    if (follower.id !== following.id) {
      try {
        await prisma.follow.create({
          data: {
            followerId: follower.id,
            followingId: following.id
          }
        });
        console.log(`✅ ${follower.username} now follows ${following.username}`);
      } catch (error) {
        // Ignore duplicate follows
      }
    }
  }
  
  // Random likes
  for (let i = 0; i < 500; i++) {
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const post = posts[Math.floor(Math.random() * posts.length)];
    
    try {
      await prisma.like.create({
        data: {
          userId: user.id,
          postId: post.id
        }
      });
      console.log(`✅ ${user.username} liked a post`);
    } catch (error) {
      // Ignore duplicate likes
    }
  }
  
  console.log('\n🎉 Test data generation complete!');
  console.log(`📊 Summary:`);
  console.log(`   - ${createdUsers.length} users created`);
  console.log(`   - ${posts.length} posts created`);
  console.log(`   - Interactions generated`);
  console.log(`\n💡 Users can log in with:`);
  console.log(`   Email: testuser[1-100]@unitedwerise.org`);
  console.log(`   Password: TestUser123!`);
}

// Run the script
generateTestUsers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });