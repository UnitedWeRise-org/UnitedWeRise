/**
 * Populate Election Test Data
 * 
 * Creates realistic elections, offices, candidates, and ballot measures for testing the election system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample election data for various states and levels
const sampleElections = [
  {
    name: "2024 General Election",
    type: "GENERAL",
    level: "FEDERAL",
    date: new Date('2024-11-05'),
    registrationDeadline: new Date('2024-10-15'),
    state: "CA",
    county: null,
    city: null,
    district: null,
    description: "Federal general election for President, Senate, and House of Representatives",
    officialUrl: "https://sos.ca.gov/elections/upcoming-elections"
  },
  {
    name: "2024 California State Elections",
    type: "GENERAL",
    level: "STATE",
    date: new Date('2024-11-05'),
    registrationDeadline: new Date('2024-10-15'),
    state: "CA",
    county: null,
    city: null,
    district: null,
    description: "State-level elections for Governor, State Senate, and Assembly",
    officialUrl: "https://sos.ca.gov/elections/upcoming-elections"
  },
  {
    name: "San Francisco Municipal Elections",
    type: "MUNICIPAL",
    level: "LOCAL",
    date: new Date('2024-11-05'),
    registrationDeadline: new Date('2024-10-15'),
    state: "CA",
    county: "San Francisco",
    city: "San Francisco",
    district: null,
    description: "City and county elections for Mayor, Board of Supervisors, and local ballot measures",
    officialUrl: "https://sfelections.org"
  },
  {
    name: "2025 Primary Election",
    type: "PRIMARY",
    level: "STATE",
    date: new Date('2025-06-03'),
    registrationDeadline: new Date('2025-05-19'),
    state: "IL",
    county: null,
    city: null,
    district: null,
    description: "Illinois state primary elections",
    officialUrl: "https://elections.il.gov"
  },
  {
    name: "Springfield City Council Election",
    type: "MUNICIPAL",
    level: "LOCAL",
    date: new Date('2025-04-01'),
    registrationDeadline: new Date('2025-03-03'),
    state: "IL",
    county: "Sangamon",
    city: "Springfield",
    district: null,
    description: "Springfield city council and mayoral election",
    officialUrl: "https://springfield.il.us/elections"
  },
  {
    name: "New York Special Election",
    type: "SPECIAL",
    level: "FEDERAL",
    date: new Date('2025-03-15'),
    registrationDeadline: new Date('2025-02-23'),
    state: "NY",
    county: "Queens",
    city: "New York",
    district: "NY-14",
    description: "Special election to fill vacant House seat",
    officialUrl: "https://elections.ny.gov"
  }
];

const sampleOffices = [
  // Federal offices
  { title: "President of the United States", level: "FEDERAL", termLength: 4 },
  { title: "U.S. Senator", level: "FEDERAL", termLength: 6 },
  { title: "U.S. Representative", level: "FEDERAL", termLength: 2 },
  
  // State offices
  { title: "Governor", level: "STATE", termLength: 4 },
  { title: "Lieutenant Governor", level: "STATE", termLength: 4 },
  { title: "State Senator", level: "STATE", termLength: 4 },
  { title: "State Assembly Member", level: "STATE", termLength: 2 },
  { title: "Attorney General", level: "STATE", termLength: 4 },
  { title: "Secretary of State", level: "STATE", termLength: 4 },
  
  // Local offices
  { title: "Mayor", level: "LOCAL", termLength: 4 },
  { title: "City Council Member", level: "LOCAL", termLength: 4 },
  { title: "County Supervisor", level: "LOCAL", termLength: 4 },
  { title: "School Board Member", level: "LOCAL", termLength: 4 },
  { title: "District Attorney", level: "LOCAL", termLength: 4 },
  { title: "Sheriff", level: "LOCAL", termLength: 4 }
];

const sampleCandidates = [
  // Presidential candidates
  {
    name: "Sarah Chen",
    party: "Democratic",
    isIncumbent: false,
    platformSummary: "Fighting for working families with bold action on climate, healthcare, and economic equality.",
    keyIssues: ["Healthcare Reform", "Climate Action", "Economic Justice", "Education Funding"],
    campaignWebsite: "https://sarahchen2024.com",
    campaignEmail: "info@sarahchen2024.com",
    campaignPhone: "(555) 123-4567"
  },
  {
    name: "Michael Rodriguez",
    party: "Republican",
    isIncumbent: false,
    platformSummary: "Bringing fiscal responsibility, strong defense, and conservative values to the White House.",
    keyIssues: ["Fiscal Responsibility", "National Security", "Small Business Support", "Constitutional Rights"],
    campaignWebsite: "https://rodriguez2024.com",
    campaignEmail: "campaign@rodriguez2024.com",
    campaignPhone: "(555) 234-5678"
  },
  
  // Senate candidates
  {
    name: "Jennifer Walsh",
    party: "Democratic",
    isIncumbent: true,
    platformSummary: "Continuing the fight for affordable healthcare, climate action, and workers' rights.",
    keyIssues: ["Healthcare Access", "Climate Legislation", "Labor Rights", "Immigration Reform"],
    campaignWebsite: "https://walsh4senate.com",
    campaignEmail: "team@walsh4senate.com",
    campaignPhone: "(555) 345-6789"
  },
  {
    name: "David Thompson",
    party: "Republican",
    isIncumbent: false,
    platformSummary: "Bringing accountability to Washington and defending our constitutional freedoms.",
    keyIssues: ["Government Accountability", "Second Amendment", "Border Security", "Tax Reform"],
    campaignWebsite: "https://thompson4senate.com",
    campaignEmail: "info@thompson4senate.com",
    campaignPhone: "(555) 456-7890"
  },
  
  // House candidates
  {
    name: "Maria Santos",
    party: "Democratic",
    isIncumbent: false,
    platformSummary: "A fresh voice fighting for housing affordability, good jobs, and climate action.",
    keyIssues: ["Affordable Housing", "Clean Energy Jobs", "Healthcare Costs", "Infrastructure"],
    campaignWebsite: "https://santos4congress.com",
    campaignEmail: "maria@santos4congress.com",
    campaignPhone: "(555) 567-8901"
  },
  {
    name: "Robert Kim",
    party: "Republican",
    isIncumbent: true,
    platformSummary: "Delivering results for our district with proven leadership and bipartisan solutions.",
    keyIssues: ["Economic Development", "Infrastructure Investment", "Education Choice", "Public Safety"],
    campaignWebsite: "https://kimforcongress.com",
    campaignEmail: "contact@kimforcongress.com",
    campaignPhone: "(555) 678-9012"
  },
  
  // Governor candidates
  {
    name: "Lisa Johnson",
    party: "Democratic",
    isIncumbent: false,
    platformSummary: "Building a California that works for everyone with affordable housing and quality education.",
    keyIssues: ["Housing Crisis", "Public Education", "Healthcare Access", "Environmental Protection"],
    campaignWebsite: "https://johnson4governor.com",
    campaignEmail: "team@johnson4governor.com",
    campaignPhone: "(555) 789-0123"
  },
  {
    name: "James Miller",
    party: "Republican",
    isIncumbent: false,
    platformSummary: "Reforming state government with fiscal discipline and business-friendly policies.",
    keyIssues: ["Tax Reform", "Business Growth", "Government Efficiency", "Public Safety"],
    campaignWebsite: "https://miller4governor.com",
    campaignEmail: "info@miller4governor.com",
    campaignPhone: "(555) 890-1234"
  },
  
  // Local candidates
  {
    name: "Alex Rivera",
    party: "Nonpartisan",
    isIncumbent: false,
    platformSummary: "Bringing transparency and accountability to city government with a focus on community needs.",
    keyIssues: ["Transparent Governance", "Community Safety", "Economic Development", "Infrastructure"],
    campaignWebsite: "https://rivera4mayor.com",
    campaignEmail: "alex@rivera4mayor.com",
    campaignPhone: "(555) 901-2345"
  },
  {
    name: "Patricia Lee",
    party: "Nonpartisan",
    isIncumbent: true,
    platformSummary: "Continuing proven leadership with four more years of progress for our city.",
    keyIssues: ["Economic Growth", "Public Services", "Community Development", "Fiscal Management"],
    campaignWebsite: "https://lee4mayor.com",
    campaignEmail: "patricia@lee4mayor.com",
    campaignPhone: "(555) 012-3456"
  }
];

const sampleBallotMeasures = [
  {
    title: "Proposition A: Affordable Housing Bond",
    description: "Authorizes $3 billion in bonds to fund affordable housing development and homelessness prevention programs.",
    type: "BOND",
    number: "A",
    fullText: "This measure would authorize the city to issue $3 billion in general obligation bonds to fund the construction of affordable housing units, provide rental assistance programs, and support homeless services. The bonds would be repaid through property taxes over a 30-year period, with an estimated cost of $15 per $100,000 of assessed property value annually.",
    fiscalImpact: "Annual property tax increase of approximately $15 per $100,000 of assessed value for 30 years.",
    arguments: {
      pro: ["Address housing crisis", "Create affordable homes", "Reduce homelessness", "Economic benefits"],
      con: ["Property tax increase", "Government spending", "Better private solutions", "Debt burden"]
    }
  },
  {
    title: "Proposition B: Public Safety Parcel Tax",
    description: "Establishes a parcel tax to fund additional police officers, firefighters, and emergency services.",
    type: "TAX",
    number: "B",
    fullText: "This measure would establish an annual parcel tax of $125 per residential unit and $0.10 per square foot for commercial properties to fund public safety services. Revenue would be used exclusively for hiring additional police officers and firefighters, purchasing emergency equipment, and enhancing 911 response capabilities.",
    fiscalImpact: "Annual cost of $125 per residential unit, estimated $0.10 per square foot for commercial properties.",
    arguments: {
      pro: ["Faster emergency response", "Community safety", "Professional staffing", "Modern equipment"],
      con: ["Tax burden", "Fixed income impact", "Government growth", "Private alternatives"]
    }
  },
  {
    title: "Measure C: Cannabis Business Tax",
    description: "Establishes a tax on cannabis businesses to fund city services and infrastructure.",
    type: "TAX",
    number: "C",
    fullText: "This measure would establish a business tax on cannabis retail, manufacturing, and cultivation operations within city limits. Tax rates would be 5% of gross receipts for retail, 2.5% for manufacturing, and 1% for cultivation. Revenue would support general city services, infrastructure maintenance, and public health programs.",
    fiscalImpact: "Estimated $2-4 million annually depending on number of licensed businesses.",
    arguments: {
      pro: ["New revenue source", "Regulate industry", "Public health programs", "Infrastructure funding"],
      con: ["Business burden", "Increased costs", "Regulatory complexity", "Industry impact"]
    }
  },
  {
    title: "Proposition D: Climate Action Plan",
    description: "Commits the city to carbon neutrality by 2030 and authorizes climate action programs.",
    type: "ORDINANCE",
    number: "D",
    fullText: "This measure would commit the city to achieving carbon neutrality by 2030 through renewable energy adoption, building electrification, transportation improvements, and waste reduction. The measure authorizes the city council to implement necessary programs and regulations to meet these goals, including potential future fees or taxes on high-carbon activities.",
    fiscalImpact: "Implementation costs to be determined; potential future fees or taxes may be imposed.",
    arguments: {
      pro: ["Climate leadership", "Clean air", "Energy savings", "Future generations"],
      con: ["Economic costs", "Business impact", "Regulatory burden", "Implementation challenges"]
    }
  },
  {
    title: "Measure E: Library Services Enhancement",
    description: "Renews existing library parcel tax and expands services including extended hours and digital resources.",
    type: "TAX",
    number: "E",
    fullText: "This measure would renew and increase the existing library parcel tax from $24 to $36 annually per residential unit. Additional revenue would fund extended library hours, expanded digital resources, children's programs, job training services, and facility improvements. The tax would continue for 10 years with annual inflation adjustments not to exceed 3%.",
    fiscalImpact: "Annual cost increase from $24 to $36 per residential unit, with inflation adjustments up to 3% annually.",
    arguments: {
      pro: ["Extended hours", "Digital access", "Community programs", "Educational support"],
      con: ["Tax increase", "Digital alternatives", "Private options", "Budget priorities"]
    }
  }
];

async function populateElectionData() {
  console.log('🗳️ Starting election data population...');

  try {
    // Get test users for candidates
    const testUsers = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: 'asc' }
    });

    if (testUsers.length === 0) {
      console.log('❌ No users found. Please run user population script first.');
      return;
    }

    console.log(`✅ Found ${testUsers.length} test users for election data`);

    // Create elections
    console.log('🗳️ Creating sample elections...');
    const createdElections = [];
    
    for (const electionData of sampleElections) {
      try {
        const election = await prisma.election.create({
          data: electionData
        });
        createdElections.push(election);
        console.log(`   ✓ Created election: "${electionData.name}"`);
      } catch (error: any) {
        console.log(`   ❌ Failed to create election "${electionData.name}": ${error.message}`);
      }
    }

    // Create offices for each election
    console.log('🏛️ Creating sample offices...');
    const createdOffices = [];
    
    for (const election of createdElections) {
      // Determine which offices are appropriate for this election level
      let appropriateOffices = [];
      
      if (election.level === 'FEDERAL') {
        appropriateOffices = sampleOffices.filter(o => o.level === 'FEDERAL');
      } else if (election.level === 'STATE') {
        appropriateOffices = sampleOffices.filter(o => o.level === 'STATE');
      } else if (election.level === 'LOCAL') {
        appropriateOffices = sampleOffices.filter(o => o.level === 'LOCAL');
      }

      // Create 2-4 offices per election
      const officesToCreate = appropriateOffices.slice(0, Math.min(4, appropriateOffices.length));
      
      for (const officeData of officesToCreate) {
        try {
          const office = await prisma.office.create({
            data: {
              title: officeData.title,
              level: officeData.level as any,
              description: `${officeData.title} for ${election.name}`,
              state: election.state,
              district: election.district,
              jurisdiction: election.city || election.county || election.state,
              electionId: election.id,
              termLength: officeData.termLength,
              salary: officeData.level === 'FEDERAL' ? 174000 : officeData.level === 'STATE' ? 85000 : 65000
            }
          });
          createdOffices.push(office);
          console.log(`   ✓ Created office: "${officeData.title}" for ${election.name}`);
        } catch (error: any) {
          console.log(`   ❌ Failed to create office "${officeData.title}": ${error.message}`);
        }
      }
    }

    // Create candidates for each office
    console.log('👥 Creating sample candidates...');
    let candidateIndex = 0;
    
    for (const office of createdOffices) {
      // Create 2-3 candidates per office
      const candidatesPerOffice = Math.min(3, Math.max(2, Math.floor(Math.random() * 3) + 2));
      
      for (let i = 0; i < candidatesPerOffice && candidateIndex < sampleCandidates.length; i++) {
        const candidateData = sampleCandidates[candidateIndex];
        const user = testUsers[candidateIndex % testUsers.length];
        
        try {
          const candidate = await prisma.candidate.create({
            data: {
              name: candidateData.name,
              party: candidateData.party,
              isIncumbent: candidateData.isIncumbent,
              campaignWebsite: candidateData.campaignWebsite,
              campaignEmail: candidateData.campaignEmail,
              campaignPhone: candidateData.campaignPhone,
              platformSummary: candidateData.platformSummary,
              keyIssues: candidateData.keyIssues,
              isVerified: Math.random() > 0.3, // 70% verified
              userId: user.id,
              officeId: office.id
            }
          });

          // Create financial data for some candidates
          if (Math.random() > 0.4) { // 60% have financial data
            await prisma.financialData.create({
              data: {
                candidateId: candidate.id,
                totalRaised: Math.floor(Math.random() * 500000) + 50000,
                totalSpent: Math.floor(Math.random() * 300000) + 20000,
                cashOnHand: Math.floor(Math.random() * 200000) + 10000,
                individualDonations: Math.floor(Math.random() * 300000) + 30000,
                pacDonations: Math.floor(Math.random() * 100000),
                selfFunding: Math.floor(Math.random() * 50000)
              }
            });
          }

          console.log(`   ✓ Created candidate: "${candidateData.name}" for ${office.title}`);
          candidateIndex++;
        } catch (error: any) {
          console.log(`   ❌ Failed to create candidate "${candidateData.name}": ${error.message}`);
          candidateIndex++;
        }
      }
    }

    // Create ballot measures for some elections
    console.log('📋 Creating sample ballot measures...');
    const electionsWithMeasures = createdElections.filter(e => 
      e.level === 'STATE' || e.level === 'LOCAL'
    );
    
    let measureIndex = 0;
    for (const election of electionsWithMeasures) {
      // Create 1-3 ballot measures per election
      const measuresPerElection = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
      
      for (let i = 0; i < measuresPerElection && measureIndex < sampleBallotMeasures.length; i++) {
        const measureData = sampleBallotMeasures[measureIndex];
        
        try {
          await prisma.ballotMeasure.create({
            data: {
              title: measureData.title,
              description: measureData.description,
              type: measureData.type as any,
              number: measureData.number,
              fullText: measureData.fullText,
              fiscalImpact: measureData.fiscalImpact,
              arguments: measureData.arguments,
              state: election.state,
              county: election.county,
              city: election.city,
              electionId: election.id
            }
          });
          console.log(`   ✓ Created ballot measure: "${measureData.title}" for ${election.name}`);
          measureIndex++;
        } catch (error: any) {
          console.log(`   ❌ Failed to create ballot measure "${measureData.title}": ${error.message}`);
          measureIndex++;
        }
      }
    }

    // Summary
    const totalElections = await prisma.election.count();
    const totalOffices = await prisma.office.count();
    const totalCandidates = await prisma.candidate.count();
    const totalBallotMeasures = await prisma.ballotMeasure.count();

    console.log('\n🎉 Election data population complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total elections: ${totalElections}`);
    console.log(`   - Total offices: ${totalOffices}`);
    console.log(`   - Total candidates: ${totalCandidates}`);
    console.log(`   - Total ballot measures: ${totalBallotMeasures}`);
    console.log(`   - Ready for frontend integration! 🚀`);

  } catch (error) {
    console.error('❌ Error populating election data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateElectionData();