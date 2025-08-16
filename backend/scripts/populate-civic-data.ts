/**
 * Populate Civic Organizing Test Data
 * 
 * Creates realistic petitions and events for testing the civic organizing system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample civic organizing data
const samplePetitions = [
  {
    title: "Fund Public Transportation in Downtown Area",
    description: "Our city's downtown area desperately needs improved public transportation. Current bus routes are infrequent and don't serve key business districts. This petition calls for the city council to allocate $2.5 million in next year's budget for expanded bus routes, improved bus stops with shelters, and more frequent service during peak hours. Better public transit will reduce traffic congestion, lower emissions, and help working families access jobs and services. Studies show every $1 invested in public transit generates $3 in economic activity.",
    petitionType: "PETITION",
    category: "TRANSPORTATION",
    geographicScope: "LOCAL",
    targetOfficials: ["Mayor Jennifer Walsh", "City Council Transportation Committee"],
    signatureGoal: 1500,
    location: {
      address: "City Hall, Main Street",
      city: "Springfield",
      state: "Illinois",
      coordinates: { lat: 39.7817, lon: -89.6501 }
    }
  },
  {
    title: "Require Climate Impact Assessments for New Developments",
    description: "As extreme weather events become more frequent, we need to ensure new housing and commercial developments are designed to withstand climate change impacts and minimize environmental harm. This petition urges the state legislature to pass the Climate Resilient Development Act, requiring environmental impact assessments for all developments over 50 units or 100,000 sq ft. Assessments would evaluate flood risk, heat island effects, energy efficiency, and carbon footprint. Developments failing to meet standards would be required to implement mitigation measures or pay into a climate adaptation fund.",
    petitionType: "PETITION",
    category: "ENVIRONMENT",
    geographicScope: "STATE",
    targetOfficials: ["State Environmental Committee", "Representative Sarah Johnson"],
    signatureGoal: 5000,
    location: {
      address: "State Capitol Building",
      city: "Springfield",
      state: "Illinois",
      coordinates: { lat: 39.7817, lon: -89.6501 }
    }
  },
  {
    title: "Expand Medicare to Include Dental and Vision Coverage",
    description: "Millions of seniors cannot afford dental and vision care because Medicare doesn't cover these essential health services. Poor oral health is linked to heart disease, diabetes, and other serious conditions. Without vision coverage, many seniors go without glasses or eye exams, affecting their safety and quality of life. This petition calls on Congress to expand Medicare to include comprehensive dental, vision, and hearing coverage. Studies estimate this would cost $358 billion over 10 years but would save money by preventing more expensive health problems and emergency room visits.",
    petitionType: "PETITION",
    category: "HEALTHCARE",
    geographicScope: "NATIONAL",
    targetOfficials: ["House Ways and Means Committee", "Senator Elizabeth Warren", "Representative Pramila Jayapal"],
    signatureGoal: 50000,
    location: {
      address: "U.S. Capitol Building",
      city: "Washington",
      state: "DC",
      coordinates: { lat: 38.8897, lon: -77.0089 }
    }
  },
  {
    title: "Referendum: Increase Property Tax for Education Funding",
    description: "Our school district has faced budget cuts for three consecutive years, resulting in larger class sizes, reduced arts programs, and outdated textbooks. This referendum would increase property taxes by $180 annually for the median home value ($250,000) to generate $8.2 million for education. Funds would go toward: hiring 25 additional teachers, updating science labs and computer equipment, restoring music and art programs, and providing free breakfast and lunch programs. Independent analysis shows this would place our district in the top 25% statewide for per-pupil funding.",
    petitionType: "REFERENDUM",
    category: "EDUCATION",
    geographicScope: "LOCAL",
    targetOfficials: ["School Board", "County Election Commission"],
    signatureGoal: 2500,
    location: {
      address: "Lincoln Elementary School",
      city: "Riverside",
      state: "California",
      coordinates: { lat: 33.9533, lon: -117.3961 }
    }
  },
  {
    title: "Create Affordable Housing Trust Fund",
    description: "Housing costs have increased 40% in our county over the past five years while median income has grown only 12%. Teachers, firefighters, and service workers can no longer afford to live where they work. This petition establishes a $50 million Affordable Housing Trust Fund through a 1% transfer tax on luxury home sales over $1 million. The fund would provide down payment assistance, preserve existing affordable units, and incentivize developers to include affordable housing in new projects. Similar programs in neighboring counties have created over 2,000 affordable units.",
    petitionType: "PETITION",
    category: "HOUSING",
    geographicScope: "COUNTY",
    targetOfficials: ["County Board of Supervisors", "Housing Authority"],
    signatureGoal: 3000,
    location: {
      address: "County Administration Building",
      city: "San Mateo",
      state: "California",
      coordinates: { lat: 37.5630, lon: -122.3255 }
    }
  }
];

const sampleEvents = [
  {
    title: "Town Hall: Discuss Downtown Revitalization Project",
    description: "Join Mayor Walsh and the City Planning Commission for a community discussion about the proposed $15 million downtown revitalization project. The plan includes new pedestrian walkways, updated lighting, green spaces, and support for local businesses. We want to hear your thoughts, concerns, and suggestions before the city council votes next month. Topics will include: traffic impact, parking solutions, support for existing businesses during construction, timeline and phasing, and long-term maintenance plans. All residents and business owners are welcome.",
    eventType: "TOWN_HALL",
    category: "CIVIC_ENGAGEMENT",
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
    location: {
      address: "Springfield Community Center, 123 Oak Street",
      city: "Springfield",
      state: "Illinois",
      coordinates: { lat: 39.7817, lon: -89.6501 },
      venue: "Main Auditorium"
    },
    capacity: 200,
    organizerInfo: {
      name: "Springfield City Planning Department",
      contact: "planning@springfield.gov",
      organization: "City of Springfield",
      website: "https://springfield.gov/planning"
    },
    requirements: "Open to all residents. Sign-in required."
  },
  {
    title: "Climate Action Forum: Community Solutions Workshop",
    description: "Learn about practical steps our community can take to address climate change and build resilience. This interactive workshop features presentations from local environmental groups, renewable energy experts, and sustainable agriculture advocates. Sessions include: home energy audits and weatherization programs, community solar projects and green energy cooperatives, sustainable transportation options, local food systems and community gardens, flood preparedness and green infrastructure. Participants will break into working groups to develop actionable proposals for city council consideration.",
    eventType: "ISSUE_FORUM",
    category: "EDUCATIONAL",
    scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    location: {
      address: "University of Illinois Extension Office, 456 Campus Drive",
      city: "Springfield",
      state: "Illinois",
      coordinates: { lat: 39.7817, lon: -89.6501 },
      venue: "Conference Center"
    },
    capacity: 150,
    organizerInfo: {
      name: "Central Illinois Climate Alliance",
      contact: "events@cilclimate.org",
      organization: "CICA",
      website: "https://cilclimate.org"
    },
    requirements: "Free event. Registration encouraged but not required."
  },
  {
    title: "Voter Registration Drive at Spring Festival",
    description: "Help register new voters at the annual Spring Festival! We'll have registration tables set up throughout the festival grounds to make it easy for eligible residents to register to vote or update their registration. Volunteers will help festival-goers understand the registration process, key upcoming elections, and voting options including mail-in ballots and early voting. We'll also provide information about local candidates and ballot measures. This is a non-partisan effort focused on increasing civic participation across our community.",
    eventType: "VOTER_REGISTRATION",
    category: "CIVIC_ENGAGEMENT",
    scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 hours later
    location: {
      address: "Riverside Park, Festival Grounds",
      city: "Riverside",
      state: "California",
      coordinates: { lat: 33.9533, lon: -117.3961 },
      venue: "Main Pavilion Area"
    },
    capacity: null, // Open event
    organizerInfo: {
      name: "League of Women Voters Riverside",
      contact: "info@lwvriverside.org",
      organization: "League of Women Voters",
      website: "https://lwvriverside.org"
    },
    requirements: "Open to all. Volunteers welcome - sign up at lwvriverside.org"
  },
  {
    title: "Healthcare Rally: Save Our Community Hospital",
    description: "Join hundreds of community members calling on County Health Services to reverse the planned closure of Riverside Community Hospital. The hospital has served our area for 45 years and is the only emergency facility within 25 miles. Its closure would force residents to travel over an hour for emergency care, disproportionately affecting seniors, families with children, and those without reliable transportation. Speakers include local doctors, nurses, patient advocates, and family members whose lives have been saved by RCH. We'll march from the hospital to County headquarters to deliver 5,000 signatures demanding the hospital remain open.",
    eventType: "RALLY",
    category: "ADVOCACY",
    scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    location: {
      address: "Riverside Community Hospital, 789 Healthcare Drive",
      city: "Riverside",
      state: "California",
      coordinates: { lat: 33.9533, lon: -117.3961 },
      venue: "Hospital Front Plaza"
    },
    capacity: 1000,
    organizerInfo: {
      name: "Save Our Hospital Coalition",
      contact: "saveRCH@email.com",
      organization: "Community Health Advocates",
      website: "https://saverch.org"
    },
    requirements: "All ages welcome. Bring signs, water, and comfortable shoes for march."
  },
  {
    title: "School Board Candidate Forum",
    description: "Meet the candidates running for three open seats on the Riverside Unified School District Board. Each candidate will have 5 minutes for opening remarks, followed by questions on key issues: budget priorities and teacher retention, technology and infrastructure needs, student mental health and counseling services, special education programs and resources, parent and community engagement strategies, diversity, equity and inclusion initiatives. The forum will be moderated by the League of Women Voters with questions submitted by community members. This is your chance to learn about the candidates' positions before the November election.",
    eventType: "CANDIDATE_FORUM",
    category: "ELECTORAL",
    scheduledDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000), // 2.5 hours later
    location: {
      address: "Riverside High School Auditorium, 321 Scholar Way",
      city: "Riverside",
      state: "California",
      coordinates: { lat: 33.9533, lon: -117.3961 },
      venue: "Main Auditorium"
    },
    capacity: 400,
    organizerInfo: {
      name: "League of Women Voters Riverside",
      contact: "candidates@lwvriverside.org",
      organization: "League of Women Voters",
      website: "https://lwvriverside.org/candidate-forums"
    },
    requirements: "Free and open to all voters. Questions can be submitted in advance or during the event."
  },
  {
    title: "Community Workshop: Understanding Your Rights as a Tenant",
    description: "Learn about tenant rights, rent control policies, and resources for housing issues. This workshop is designed for renters who want to understand their legal protections and know how to address problems with landlords. Topics covered include: lease agreements and security deposits, rent increases and eviction procedures, habitability standards and repair requests, fair housing laws and discrimination protection, tenant unions and collective bargaining, legal aid resources and tenant hotlines. Legal aid attorneys will be available for individual consultations after the main session.",
    eventType: "WORKSHOP",
    category: "EDUCATIONAL",
    scheduledDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours later
    location: {
      address: "San Mateo Public Library, 100 Library Lane",
      city: "San Mateo",
      state: "California",
      coordinates: { lat: 37.5630, lon: -122.3255 },
      venue: "Community Room A"
    },
    capacity: 75,
    organizerInfo: {
      name: "Peninsula Tenants Union",
      contact: "workshops@pentenantsunion.org",
      organization: "Peninsula Tenants Union",
      website: "https://pentenantsunion.org"
    },
    requirements: "Free event. Materials provided in English and Spanish. Childcare available with advance notice.",
    rsvpRequired: true
  }
];

async function populateCivicData() {
  console.log('🏛️ Starting civic organizing data population...');

  try {
    // Get test users (first 6 users from existing data)
    const testUsers = await prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: 'asc' }
    });

    if (testUsers.length === 0) {
      console.log('❌ No users found. Please run user population script first.');
      return;
    }

    console.log(`✅ Found ${testUsers.length} test users for civic data`);

    // Create petitions
    console.log('📝 Creating sample petitions...');
    const createdPetitions = [];
    
    for (let i = 0; i < samplePetitions.length; i++) {
      const petition = samplePetitions[i];
      const creator = testUsers[i % testUsers.length];
      
      // Calculate expiry date (60 days from now for active petitions)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      try {
        const createdPetition = await prisma.petition.create({
          data: {
            title: petition.title,
            description: petition.description,
            petitionType: petition.petitionType as any,
            category: petition.category as any,
            geographicScope: petition.geographicScope as any,
            targetOfficials: petition.targetOfficials,
            signatureGoal: petition.signatureGoal,
            location: JSON.stringify(petition.location),
            createdBy: creator.id,
            expiresAt: expiresAt
          }
        });

        createdPetitions.push(createdPetition);
        console.log(`   ✓ Created petition: "${petition.title}"`);

        // Add some signatures to make it realistic
        const signatureCount = Math.floor(Math.random() * Math.min(petition.signatureGoal * 0.3, 100)) + 5;
        
        for (let j = 0; j < signatureCount; j++) {
          const signer = testUsers[Math.floor(Math.random() * testUsers.length)];
          
          try {
            await prisma.petitionSignature.create({
              data: {
                petitionId: createdPetition.id,
                userId: signer.id,
                isVerified: true,
                signedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
              }
            });
          } catch (error) {
            // Skip if user already signed (unique constraint)
          }
        }

        // Update petition signature count
        const actualSignatures = await prisma.petitionSignature.count({
          where: { petitionId: createdPetition.id }
        });

        await prisma.petition.update({
          where: { id: createdPetition.id },
          data: { currentSignatures: actualSignatures }
        });

        console.log(`   ✓ Added ${actualSignatures} signatures to "${petition.title}"`);

      } catch (error: any) {
        console.log(`   ❌ Failed to create petition "${petition.title}": ${error.message}`);
      }
    }

    // Create events
    console.log('📅 Creating sample events...');
    const createdEvents = [];

    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      const creator = testUsers[i % testUsers.length];

      try {
        const createdEvent = await prisma.civicEvent.create({
          data: {
            title: event.title,
            description: event.description,
            eventType: event.eventType as any,
            category: event.category as any,
            scheduledDate: event.scheduledDate,
            endDate: event.endDate,
            location: JSON.stringify(event.location),
            capacity: event.capacity,
            organizerInfo: JSON.stringify(event.organizerInfo),
            requirements: event.requirements,
            rsvpRequired: event.rsvpRequired || false,
            createdBy: creator.id
          }
        });

        createdEvents.push(createdEvent);
        console.log(`   ✓ Created event: "${event.title}"`);

        // Add some RSVPs to make it realistic
        const rsvpCount = Math.floor(Math.random() * Math.min(event.capacity || 50, 30)) + 3;
        
        for (let j = 0; j < rsvpCount; j++) {
          const attendee = testUsers[Math.floor(Math.random() * testUsers.length)];
          const rsvpStatus = Math.random() > 0.8 ? 'MAYBE' : 'ATTENDING';
          
          try {
            await prisma.eventRSVP.create({
              data: {
                eventId: createdEvent.id,
                userId: attendee.id,
                rsvpStatus: rsvpStatus,
                rsvpedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last 7 days
              }
            });
          } catch (error) {
            // Skip if user already RSVP'd (unique constraint)
          }
        }

        // Update event RSVP count
        const actualRSVPs = await prisma.eventRSVP.count({
          where: { 
            eventId: createdEvent.id,
            rsvpStatus: 'ATTENDING'
          }
        });

        await prisma.civicEvent.update({
          where: { id: createdEvent.id },
          data: { currentRSVPs: actualRSVPs }
        });

        console.log(`   ✓ Added ${actualRSVPs} RSVPs to "${event.title}"`);

      } catch (error: any) {
        console.log(`   ❌ Failed to create event "${event.title}": ${error.message}`);
      }
    }

    // Summary
    const totalPetitions = await prisma.petition.count();
    const totalEvents = await prisma.civicEvent.count();
    const totalSignatures = await prisma.petitionSignature.count();
    const totalRSVPs = await prisma.eventRSVP.count();

    console.log('\n🎉 Civic organizing data population complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total petitions: ${totalPetitions}`);
    console.log(`   - Total events: ${totalEvents}`);
    console.log(`   - Total signatures: ${totalSignatures}`);
    console.log(`   - Total RSVPs: ${totalRSVPs}`);
    console.log(`   - Ready for frontend integration! 🚀`);

  } catch (error) {
    console.error('❌ Error populating civic data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateCivicData();