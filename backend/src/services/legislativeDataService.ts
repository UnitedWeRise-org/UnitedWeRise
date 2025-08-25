import { prisma } from '../lib/prisma';
;
import { ApiCacheService } from './apiCache';

// Using singleton prisma from lib/prisma.ts

// API Configuration
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const OPEN_STATES_API_KEY = process.env.OPEN_STATES_API_KEY;
const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY;

export interface VotingRecord {
  voteId: string;
  billNumber?: string;
  question: string;
  date: string;
  position: 'YEA' | 'NAY' | 'PRESENT' | 'NOT_VOTING' | 'ABSTAIN';
  chamber: 'HOUSE' | 'SENATE';
  passed: boolean;
  yesCount: number;
  noCount: number;
}

export interface LegislatorProfile {
  bioguideId?: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'HOUSE' | 'SENATE';
  termStart: string;
  termEnd?: string;
  leadership?: string;
  votingRecords?: VotingRecord[];
}

export interface Bill {
  externalId: string;
  number: string;
  title: string;
  summary?: string;
  status: string;
  introducedDate: string;
  lastActionDate?: string;
  sponsors: string[];
  subjects: string[];
}

export class LegislativeDataService {
  /**
   * Sync federal legislators from Congress.gov API
   */
  static async syncFederalLegislators(forceRefresh: boolean = false): Promise<void> {
    if (!CONGRESS_API_KEY) {
      console.warn('Congress.gov API key not configured');
      return;
    }

    const cacheKey = 'federal_legislators_118th';
    
    // Check cache first
    if (!forceRefresh) {
      const cached = await ApiCacheService.get('legislative_data', cacheKey);
      if (cached) {
        console.log('Using cached federal legislators data');
        return;
      }
    }

    try {
      // Get current Congress session (118th Congress)
      const congressResponse = await fetch(
        `https://api.congress.gov/v3/congress/118/member?api_key=${CONGRESS_API_KEY}&format=json&limit=550`
      );

      if (!congressResponse.ok) {
        throw new Error(`Congress API error: ${congressResponse.status}`);
      }

      const data = await congressResponse.json();
      
      // Create or update 118th Congress legislature record
      const legislature = await prisma.legislature.upsert({
        where: {
          level_state_session: {
            level: 'FEDERAL',
            state: null,
            session: '118th'
          }
        },
        create: {
          name: '118th Congress',
          level: 'FEDERAL',
          session: '118th',
          startDate: new Date('2023-01-03'),
          endDate: new Date('2025-01-03'),
          isActive: true
        },
        update: {
          name: '118th Congress',
          isActive: true
        }
      });

      // Process legislators
      const apiData = data as { members?: any[] };
      for (const member of apiData.members || []) {
        await this.processFederalLegislator(member, legislature.id);
      }

      // Cache the result for 24 hours
      await ApiCacheService.set('legislative_data', cacheKey, { synced: true }, 24 * 60);
      
      console.log(`Synced ${apiData.members?.length || 0} federal legislators`);
    } catch (error) {
      console.error('Failed to sync federal legislators:', error);
    }
  }

  /**
   * Sync state legislators from Open States API
   */
  static async syncStateLegislators(state: string, forceRefresh: boolean = false): Promise<void> {
    if (!OPEN_STATES_API_KEY) {
      console.warn('Open States API key not configured');
      return;
    }

    const cacheKey = `state_legislators_${state}_2025`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = await ApiCacheService.get('legislative_data', cacheKey);
      if (cached) {
        console.log(`Using cached ${state} legislators data`);
        return;
      }
    }

    try {
      // Get current state session
      const peopleResponse = await fetch(
        `https://v3.openstates.org/people?jurisdiction=${state}&page=1&per_page=200`,
        {
          headers: {
            'X-API-KEY': OPEN_STATES_API_KEY
          }
        }
      );

      if (!peopleResponse.ok) {
        throw new Error(`Open States API error: ${peopleResponse.status}`);
      }

      const data = await peopleResponse.json();
      
      // Create or update state legislature record
      const legislature = await prisma.legislature.upsert({
        where: {
          level_state_session: {
            level: 'STATE',
            state: state,
            session: '2025'
          }
        },
        create: {
          name: `${state} 2025 Session`,
          level: 'STATE',
          state: state,
          session: '2025',
          startDate: new Date('2025-01-01'),
          isActive: true
        },
        update: {
          name: `${state} 2025 Session`,
          isActive: true
        }
      });

      // Process legislators
      const stateData = data as { results?: any[] };
      for (const person of stateData.results || []) {
        await this.processStateLegislator(person, legislature.id, state);
      }

      // Cache the result for 24 hours
      await ApiCacheService.set('legislative_data', cacheKey, { synced: true }, 24 * 60);
      
      console.log(`Synced ${stateData.results?.length || 0} ${state} legislators`);
    } catch (error) {
      console.error(`Failed to sync ${state} legislators:`, error);
    }
  }

  /**
   * Get voting records for a specific legislator
   */
  static async getVotingRecords(
    bioguideId: string, 
    limit: number = 50
  ): Promise<VotingRecord[]> {
    if (!CONGRESS_API_KEY) {
      return [];
    }

    const cacheKey = `voting_records_${bioguideId}_${limit}`;
    
    // Check cache first
    const cached = await ApiCacheService.get('voting_records', cacheKey);
    if (cached) {
      return cached as VotingRecord[];
    }

    try {
      // Get votes from Congress API
      const votesResponse = await fetch(
        `https://api.congress.gov/v3/member/${bioguideId}/votes?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`
      );

      if (!votesResponse.ok) {
        throw new Error(`Congress API error: ${votesResponse.status}`);
      }

      const data = await votesResponse.json();
      const votesData = data as { votes?: any[] };
      const votingRecords: VotingRecord[] = [];

      for (const vote of votesData.votes || []) {
        votingRecords.push({
          voteId: vote.rollCall?.number || vote.url.split('/').pop(),
          billNumber: vote.bill?.number,
          question: vote.description || vote.question,
          date: vote.date,
          position: this.mapVotePosition(vote.position),
          chamber: vote.chamber === 'House of Representatives' ? 'HOUSE' : 'SENATE',
          passed: vote.result?.includes('Passed') || false,
          yesCount: vote.yesCount || 0,
          noCount: vote.noCount || 0
        });
      }

      // Cache for 1 hour
      await ApiCacheService.set('voting_records', cacheKey, votingRecords, 60);
      
      return votingRecords;
    } catch (error) {
      console.error('Failed to get voting records:', error);
      return [];
    }
  }

  /**
   * Sync voting records for all legislators
   */
  static async syncVotingRecords(chamber?: 'HOUSE' | 'SENATE'): Promise<void> {
    if (!CONGRESS_API_KEY) {
      console.warn('Congress.gov API key not configured');
      return;
    }

    try {
      // Get recent roll call votes
      const year = new Date().getFullYear();
      let apiUrl = `https://api.congress.gov/v3/vote/${year}?api_key=${CONGRESS_API_KEY}&format=json&limit=100`;
      
      if (chamber) {
        apiUrl += `&chamber=${chamber.toLowerCase()}`;
      }

      const votesResponse = await fetch(apiUrl);

      if (!votesResponse.ok) {
        throw new Error(`Congress API error: ${votesResponse.status}`);
      }

      const data = await votesResponse.json();

      const syncVotesData = data as { votes?: any[] };
      for (const vote of syncVotesData.votes || []) {
        await this.processVote(vote);
      }

      console.log(`Synced ${syncVotesData.votes?.length || 0} voting records`);
    } catch (error) {
      console.error('Failed to sync voting records:', error);
    }
  }

  /**
   * Get bills and legislation
   */
  static async syncBills(congress: string = '118', limit: number = 100): Promise<void> {
    if (!CONGRESS_API_KEY) {
      console.warn('Congress.gov API key not configured');
      return;
    }

    const cacheKey = `bills_${congress}_recent`;
    
    try {
      const billsResponse = await fetch(
        `https://api.congress.gov/v3/bill/${congress}?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`
      );

      if (!billsResponse.ok) {
        throw new Error(`Congress API error: ${billsResponse.status}`);
      }

      const data = await billsResponse.json();

      // Get legislature record
      const legislature = await prisma.legislature.findFirst({
        where: {
          level: 'FEDERAL',
          session: `${congress}th`
        }
      });

      if (!legislature) {
        console.warn(`Legislature record not found for ${congress}th Congress`);
        return;
      }

      const billsData = data as { bills?: any[] };
      for (const bill of billsData.bills || []) {
        await this.processBill(bill, legislature.id);
      }

      console.log(`Synced ${billsData.bills?.length || 0} bills`);
    } catch (error) {
      console.error('Failed to sync bills:', error);
    }
  }

  /**
   * Calculate voting statistics for a legislator
   */
  static async calculateVotingStatistics(membershipId: string): Promise<void> {
    try {
      const membership = await prisma.legislativeMembership.findUnique({
        where: { id: membershipId },
        include: { votes: true }
      });

      if (!membership) {
        console.warn(`Membership ${membershipId} not found`);
        return;
      }

      const votes = membership.votes;
      const totalVotes = votes.length;
      
      if (totalVotes === 0) {
        return;
      }

      const yesVotes = votes.filter(v => v.position === 'YEA').length;
      const noVotes = votes.filter(v => v.position === 'NAY').length;
      const presentVotes = votes.filter(v => v.position === 'PRESENT').length;
      const notVotingCount = votes.filter(v => v.position === 'NOT_VOTING').length;
      const abstainVotes = votes.filter(v => v.position === 'ABSTAIN').length;

      const participationRate = ((totalVotes - notVotingCount) / totalVotes) * 100;

      // Update or create voting summary
      await prisma.votingRecordSummary.upsert({
        where: { membershipId },
        create: {
          membershipId,
          totalVotes,
          yesVotes,
          noVotes,
          presentVotes,
          notVotingCount,
          abstainVotes,
          participationRate,
          periodStart: membership.startDate,
          periodEnd: membership.endDate || new Date(),
          lastCalculated: new Date()
        },
        update: {
          totalVotes,
          yesVotes,
          noVotes,
          presentVotes,
          notVotingCount,
          abstainVotes,
          participationRate,
          lastCalculated: new Date()
        }
      });

      console.log(`Updated voting statistics for membership ${membershipId}`);
    } catch (error) {
      console.error('Failed to calculate voting statistics:', error);
    }
  }

  // Private helper methods
  private static async processFederalLegislator(member: any, legislatureId: string): Promise<void> {
    try {
      const bioguideId = member.bioguideId;
      const chamber = member.terms?.[0]?.chamber === 'House of Representatives' ? 'HOUSE' : 'SENATE';
      const district = member.terms?.[0]?.district;
      const party = member.partyName;
      const state = member.terms?.[0]?.stateCode;

      await prisma.legislativeMembership.upsert({
        where: {
          bioguideId_legislatureId: {
            bioguideId: bioguideId,
            legislatureId: legislatureId
          }
        },
        create: {
          legislatorId: bioguideId, // We'll link this to our official records later
          legislatureId,
          district,
          party,
          startDate: new Date(member.terms?.[0]?.startYear + '-01-01'),
          endDate: member.terms?.[0]?.endYear ? new Date(member.terms[0].endYear + '-01-01') : undefined,
          bioguideId,
          isActive: true
        },
        update: {
          party,
          district,
          isActive: true
        }
      });
    } catch (error) {
      console.error(`Failed to process federal legislator ${member.bioguideId}:`, error);
    }
  }

  private static async processStateLegislator(person: any, legislatureId: string, state: string): Promise<void> {
    try {
      const chamber = person.current_role?.chamber === 'upper' ? 'SENATE' : 'HOUSE';
      const district = person.current_role?.district;
      const party = person.current_role?.party;

      await prisma.legislativeMembership.upsert({
        where: {
          openStatesId_legislatureId: {
            openStatesId: person.id,
            legislatureId: legislatureId
          }
        },
        create: {
          legislatorId: person.id,
          legislatureId,
          district,
          party,
          startDate: person.current_role?.start_date ? new Date(person.current_role.start_date) : new Date(),
          endDate: person.current_role?.end_date ? new Date(person.current_role.end_date) : undefined,
          isActive: true
        },
        update: {
          party,
          district,
          isActive: true
        }
      });
    } catch (error) {
      console.error(`Failed to process state legislator ${person.id}:`, error);
    }
  }

  private static async processVote(voteData: any): Promise<void> {
    try {
      const chamber = voteData.chamber === 'House of Representatives' ? 'HOUSE' : 'SENATE';
      const voteId = `${voteData.congress}-${chamber}-${voteData.number}`;

      // Find the legislature
      const legislature = await prisma.legislature.findFirst({
        where: {
          level: 'FEDERAL',
          session: `${voteData.congress}th`
        }
      });

      if (!legislature) {
        console.warn(`Legislature not found for congress ${voteData.congress}`);
        return;
      }

      // Create or update vote record
      await prisma.vote.upsert({
        where: {
          externalId_chamber: {
            externalId: voteId,
            chamber: chamber
          }
        },
        create: {
          externalId: voteId,
          number: voteData.number,
          question: voteData.question || voteData.description,
          description: voteData.description,
          date: new Date(voteData.date),
          chamber,
          yesCount: voteData.totals?.yes || 0,
          noCount: voteData.totals?.no || 0,
          presentCount: voteData.totals?.present || 0,
          notVotingCount: voteData.totals?.notVoting || 0,
          passed: voteData.result?.includes('Passed') || false,
          legislatureId: legislature.id,
          dataSource: 'congress_gov',
          apiUrl: voteData.url
        },
        update: {
          question: voteData.question || voteData.description,
          description: voteData.description,
          yesCount: voteData.totals?.yes || 0,
          noCount: voteData.totals?.no || 0,
          presentCount: voteData.totals?.present || 0,
          notVotingCount: voteData.totals?.notVoting || 0,
          passed: voteData.result?.includes('Passed') || false,
          lastSynced: new Date()
        }
      });

      console.log(`Processed vote ${voteId}`);
    } catch (error) {
      console.error(`Failed to process vote:`, error);
    }
  }

  private static async processBill(billData: any, legislatureId: string): Promise<void> {
    try {
      const billId = `${billData.type.toLowerCase()}${billData.number}-${billData.congress}`;
      const chamber = billData.originChamber === 'House' ? 'HOUSE' : 'SENATE';

      await prisma.bill.upsert({
        where: {
          externalId_level: {
            externalId: billId,
            level: 'FEDERAL'
          }
        },
        create: {
          externalId: billId,
          number: `${billData.type} ${billData.number}`,
          title: billData.title,
          summary: billData.summary?.text,
          status: this.mapBillStatus(billData.latestAction?.text),
          introducedDate: new Date(billData.introducedDate),
          lastActionDate: billData.latestAction?.actionDate ? new Date(billData.latestAction.actionDate) : undefined,
          chamber,
          level: 'FEDERAL',
          subjects: billData.subjects || [],
          policyAreas: billData.policyArea ? [billData.policyArea.name] : [],
          dataSource: 'congress_gov',
          apiUrl: billData.url,
          legislatureId
        },
        update: {
          title: billData.title,
          summary: billData.summary?.text,
          status: this.mapBillStatus(billData.latestAction?.text),
          lastActionDate: billData.latestAction?.actionDate ? new Date(billData.latestAction.actionDate) : undefined,
          subjects: billData.subjects || [],
          policyAreas: billData.policyArea ? [billData.policyArea.name] : [],
          lastSynced: new Date()
        }
      });

      console.log(`Processed bill ${billId}`);
    } catch (error) {
      console.error(`Failed to process bill:`, error);
    }
  }

  private static mapVotePosition(position: string): 'YEA' | 'NAY' | 'PRESENT' | 'NOT_VOTING' | 'ABSTAIN' {
    switch (position?.toLowerCase()) {
      case 'yes':
      case 'yea':
      case 'aye':
        return 'YEA';
      case 'no':
      case 'nay':
        return 'NAY';
      case 'present':
        return 'PRESENT';
      case 'not voting':
      case 'not_voting':
        return 'NOT_VOTING';
      default:
        return 'ABSTAIN';
    }
  }

  private static mapBillStatus(latestAction?: string): 'INTRODUCED' | 'COMMITTEE' | 'FLOOR_VOTE' | 'PASSED_CHAMBER' | 'SENT_TO_OTHER_CHAMBER' | 'PASSED_BOTH' | 'SENT_TO_EXECUTIVE' | 'SIGNED' | 'VETOED' | 'BECAME_LAW' | 'DIED' {
    if (!latestAction) return 'INTRODUCED';
    
    const action = latestAction.toLowerCase();
    
    if (action.includes('introduced')) return 'INTRODUCED';
    if (action.includes('committee')) return 'COMMITTEE';
    if (action.includes('floor') || action.includes('vote')) return 'FLOOR_VOTE';
    if (action.includes('passed')) return 'PASSED_CHAMBER';
    if (action.includes('sent to') || action.includes('received in')) return 'SENT_TO_OTHER_CHAMBER';
    if (action.includes('enrolled')) return 'PASSED_BOTH';
    if (action.includes('presented to president')) return 'SENT_TO_EXECUTIVE';
    if (action.includes('signed by president')) return 'SIGNED';
    if (action.includes('became public law')) return 'BECAME_LAW';
    if (action.includes('vetoed')) return 'VETOED';
    
    return 'INTRODUCED';
  }
}