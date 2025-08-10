// Seed script to create dummy candidates and positions for testing
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

// Dummy election and office data
const elections = [
  {
    name: '2024 General Election',
    type: 'GENERAL',
    level: 'FEDERAL',
    date: new Date('2024-11-05'),
    state: 'IL',
    description: 'General Election for federal, state, and local offices'
  },
  {
    name: '2024 Primary Election',
    type: 'PRIMARY', 
    level: 'STATE',
    date: new Date('2024-06-18'),
    state: 'IL',
    description: 'Primary Election for state and local offices'
  },
  {
    name: '2024 Municipal Elections',
    type: 'LOCAL',
    level: 'LOCAL',
    date: new Date('2024-04-02'),
    state: 'IL',
    description: 'Local municipal elections'
  }
];

const offices = [
  // Federal
  { title: 'President of the United States', level: 'FEDERAL', state: 'IL', electionIndex: 0, termLength: 4 },
  { title: 'U.S. Senator', level: 'FEDERAL', state: 'IL', electionIndex: 0, termLength: 6 },
  { title: 'U.S. Representative District 13', level: 'FEDERAL', state: 'IL', district: '13', electionIndex: 0, termLength: 2 },
  { title: 'U.S. Representative District 15', level: 'FEDERAL', state: 'IL', district: '15', electionIndex: 0, termLength: 2 },
  
  // State
  { title: 'Governor', level: 'STATE', state: 'IL', electionIndex: 1, termLength: 4 },
  { title: 'State Senator District 48', level: 'STATE', state: 'IL', district: '48', electionIndex: 1, termLength: 4 },
  { title: 'State Representative District 95', level: 'STATE', state: 'IL', district: '95', electionIndex: 1, termLength: 2 },
  { title: 'Attorney General', level: 'STATE', state: 'IL', electionIndex: 1, termLength: 4 },
  { title: 'Secretary of State', level: 'STATE', state: 'IL', electionIndex: 1, termLength: 4 },
  
  // Local
  { title: 'Mayor', level: 'LOCAL', state: 'IL', jurisdiction: 'Springfield', electionIndex: 2, termLength: 4 },
  { title: 'City Council Ward 1', level: 'LOCAL', state: 'IL', jurisdiction: 'Springfield', district: '1', electionIndex: 2, termLength: 4 },
  { title: 'City Council Ward 7', level: 'LOCAL', state: 'IL', jurisdiction: 'Springfield', district: '7', electionIndex: 2, termLength: 4 },
  { title: 'School Board District 186', level: 'LOCAL', state: 'IL', jurisdiction: 'Springfield', district: '186', electionIndex: 2, termLength: 4 },
  { title: 'County Sheriff', level: 'LOCAL', state: 'IL', jurisdiction: 'Sangamon County', electionIndex: 2, termLength: 4 }
];

// Generate realistic candidate data
const politicalParties = ['Democratic', 'Republican', 'Green', 'Libertarian', 'Independent'];
const campaignSlogans = [
  'Together We Rise',
  'Building Tomorrow',
  'Your Voice, Your Future',
  'Progress for All',
  'Common Sense Solutions',
  'Unity in Action',
  'Change We Need',
  'Stronger Communities',
  'Forward Together',
  'Real Solutions',
  'A New Direction',
  'Working for You',
  'Proven Leadership',
  'Fresh Ideas',
  'People First'
];

const policyIssues = [
  'Healthcare Reform',
  'Education Funding',
  'Economic Development',
  'Infrastructure',
  'Climate Change',
  'Public Safety',
  'Housing Affordability',
  'Transportation',
  'Veterans Affairs',
  'Small Business Support',
  'Tax Reform',
  'Government Transparency',
  'Rural Development',
  'Technology Innovation',
  'Social Justice'
];

function generateCandidate(office, election, isIncumbent = false) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const name = `${firstName} ${lastName}`;
  const party = faker.helpers.arrayElement(politicalParties);
  const slogan = faker.helpers.arrayElement(campaignSlogans);
  const issues = faker.helpers.arrayElements(policyIssues, { min: 3, max: 7 });
  
  return {
    name,
    party,
    isIncumbent,
    campaignWebsite: `https://www.${firstName.toLowerCase()}${lastName.toLowerCase()}.com`,
    campaignEmail: `campaign@${firstName.toLowerCase()}${lastName.toLowerCase()}.com`,
    campaignPhone: faker.phone.number('(###) ###-####'),
    platformSummary: `${name} is committed to ${issues.slice(0, 3).join(', ')} and bringing real change to ${office.jurisdiction || office.state}. With ${faker.number.int({ min: 5, max: 25 })} years of experience in ${faker.helpers.arrayElement(['community service', 'business leadership', 'public service', 'advocacy', 'education'])}, ${firstName} offers the leadership we need.`,
    keyIssues: issues,
    isVerified: faker.datatype.boolean({ probability: 0.8 }),
    isWithdrawn: faker.datatype.boolean({ probability: 0.05 })
  };
}

async function seedDummyCandidates() {
  try {
    console.log('🌱 Starting candidate seeding process...');
    
    // Clean existing data
    console.log('🧹 Cleaning existing election data...');
    await prisma.candidate.deleteMany();
    await prisma.office.deleteMany();
    await prisma.election.deleteMany();
    
    // Create elections
    console.log('🗳️ Creating elections...');
    const createdElections = [];
    for (const electionData of elections) {
      const election = await prisma.election.create({
        data: electionData
      });
      createdElections.push(election);
      console.log(`   ✅ Created: ${election.name}`);
    }
    
    // Create offices
    console.log('🏛️ Creating offices...');
    const createdOffices = [];
    for (const officeData of offices) {
      const { electionIndex, ...rest } = officeData;
      const office = await prisma.office.create({
        data: {
          ...rest,
          electionId: createdElections[electionIndex].id
        }
      });
      createdOffices.push(office);
      console.log(`   ✅ Created: ${office.title}`);
    }
    
    // Create candidates for each office
    console.log('👥 Creating candidates...');
    let totalCandidates = 0;
    
    for (const office of createdOffices) {
      const election = createdElections.find(e => e.id === office.electionId);
      
      // Determine number of candidates based on office level
      let numCandidates;
      if (office.level === 'FEDERAL') {
        numCandidates = faker.number.int({ min: 2, max: 6 }); // Major races have more candidates
      } else if (office.level === 'STATE') {
        numCandidates = faker.number.int({ min: 2, max: 4 });
      } else {
        numCandidates = faker.number.int({ min: 1, max: 3 }); // Local races might be uncontested
      }
      
      console.log(`   📋 Creating ${numCandidates} candidates for ${office.title}...`);
      
      for (let i = 0; i < numCandidates; i++) {
        const isIncumbent = i === 0 && faker.datatype.boolean({ probability: 0.3 });
        const candidateData = generateCandidate(office, election, isIncumbent);
        
        const candidate = await prisma.candidate.create({
          data: {
            ...candidateData,
            officeId: office.id
          }
        });
        
        totalCandidates++;
        console.log(`      ✨ Created: ${candidate.name} (${candidate.party}) - ${candidate.isIncumbent ? 'Incumbent' : 'Challenger'}`);
        
        // Create some financial data for verified candidates
        if (candidate.isVerified && !candidate.isWithdrawn && faker.datatype.boolean({ probability: 0.6 })) {
          const totalRaised = faker.number.float({ min: 5000, max: 2000000, fractionDigits: 2 });
          const totalSpent = faker.number.float({ min: 1000, max: totalRaised * 0.8, fractionDigits: 2 });
          
          await prisma.financialData.create({
            data: {
              candidateId: candidate.id,
              totalRaised,
              totalSpent,
              cashOnHand: totalRaised - totalSpent,
              individualDonations: totalRaised * faker.number.float({ min: 0.4, max: 0.8, fractionDigits: 2 }),
              pacDonations: totalRaised * faker.number.float({ min: 0.1, max: 0.3, fractionDigits: 2 }),
              selfFunding: totalRaised * faker.number.float({ min: 0.0, max: 0.2, fractionDigits: 2 }),
              reportingPeriod: 'Q3 2024',
              sourceUrl: `https://fec.gov/candidate/${faker.string.alphanumeric(8)}`
            }
          });
        }
      }
    }
    
    // Create some ballot measures
    console.log('📋 Creating ballot measures...');
    const ballotMeasures = [
      {
        title: 'School Infrastructure Bond',
        description: 'Bond measure to fund school facility improvements and technology upgrades',
        type: 'BOND_MEASURE',
        number: 'Proposition A',
        fullText: 'This measure would authorize the issuance of $50 million in bonds to fund critical infrastructure improvements in local schools, including technology upgrades, HVAC systems, and accessibility improvements.',
        fiscalImpact: 'Estimated property tax increase of $25 per $100,000 assessed value',
        state: 'IL',
        electionId: createdElections[2].id // Local election
      },
      {
        title: 'Clean Energy Initiative',
        description: 'Constitutional amendment to prioritize renewable energy development',
        type: 'CONSTITUTIONAL_AMENDMENT',
        number: 'Amendment 1',
        fullText: 'This constitutional amendment would establish renewable energy as a fundamental right and require the state to achieve carbon neutrality by 2035.',
        fiscalImpact: 'Unknown - depends on implementation costs',
        state: 'IL',
        electionId: createdElections[0].id // General election
      }
    ];
    
    for (const measureData of ballotMeasures) {
      const measure = await prisma.ballotMeasure.create({
        data: measureData
      });
      console.log(`   ✅ Created ballot measure: ${measure.title}`);
    }
    
    console.log('\\n🎉 Seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   Elections created: ${createdElections.length}`);
    console.log(`   Offices created: ${createdOffices.length}`);
    console.log(`   Candidates created: ${totalCandidates}`);
    console.log(`   Ballot measures created: ${ballotMeasures.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding dummy candidates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedDummyCandidates()
    .then(() => {
      console.log('✨ Seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDummyCandidates };