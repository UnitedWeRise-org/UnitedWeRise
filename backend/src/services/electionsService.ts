/**
 * Elections Service
 * 
 * Handles election data, ballot information, candidate profiles, and voting guides
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ElectionCalendarItem {
  id: string;
  name: string;
  type: string;
  date: string;
  level: string;
  state: string;
  county?: string;
  city?: string;
  registrationDeadline?: string;
  description?: string;
  officialUrl?: string;
  offices: {
    id: string;
    title: string;
    level: string;
    candidates: {
      id: string;
      name: string;
      party?: string;
      isIncumbent: boolean;
      platformSummary?: string;
      campaignWebsite?: string;
    }[];
  }[];
  ballotMeasures: {
    id: string;
    title: string;
    type: string;
    description: string;
    number?: string;
  }[];
}

export interface VoterGuide {
  elections: ElectionCalendarItem[];
  registrationInfo: {
    isRegistered: boolean;
    registrationUrl: string;
    deadlines: Array<{
      type: string;
      date: string;
      description: string;
    }>;
  };
  votingOptions: {
    inPerson: {
      available: boolean;
      hours: string;
      locations: string[];
    };
    absentee: {
      available: boolean;
      requirements: string[];
      deadlines: Array<{
        type: string;
        date: string;
      }>;
    };
    earlyVoting: {
      available: boolean;
      period: string;
      locations: string[];
    };
  };
}

export interface CandidateProfile {
  id: string;
  name: string;
  party?: string;
  office: {
    title: string;
    level: string;
    district?: string;
  };
  isIncumbent: boolean;
  campaignWebsite?: string;
  campaignEmail?: string;
  campaignPhone?: string;
  platformSummary?: string;
  keyIssues: string[];
  isVerified: boolean;
  endorsements?: Array<{
    organization: string;
    type: string;
    date: string;
  }>;
  financialData?: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    individualDonations: number;
    pacDonations: number;
  };
}

export class ElectionsService {
  /**
   * Get upcoming elections for a specific location
   */
  static async getElectionCalendar(
    state: string,
    county?: string,
    city?: string,
    limit: number = 50
  ): Promise<ElectionCalendarItem[]> {
    try {
      const elections = await prisma.election.findMany({
        where: {
          AND: [
            { state: state.toUpperCase() },
            { date: { gte: new Date() } },
            { isActive: true },
            county ? { county: { contains: county, mode: 'insensitive' } } : {},
            city ? { city: { contains: city, mode: 'insensitive' } } : {},
          ],
        },
        include: {
          offices: {
            include: {
              candidates: {
                where: { isWithdrawn: false },
                include: {
                  financialData: true,
                },
              },
            },
          },
          ballotMeasures: true,
        },
        orderBy: { date: 'asc' },
        take: limit,
      });

      return elections.map(election => ({
        id: election.id,
        name: election.name,
        type: election.type,
        date: election.date.toISOString(),
        level: election.level,
        state: election.state,
        county: election.county || undefined,
        city: election.city || undefined,
        registrationDeadline: election.registrationDeadline?.toISOString(),
        description: election.description || undefined,
        officialUrl: election.officialUrl || undefined,
        offices: election.offices.map(office => ({
          id: office.id,
          title: office.title,
          level: office.level,
          candidates: office.candidates.map(candidate => ({
            id: candidate.id,
            name: candidate.name,
            party: candidate.party || undefined,
            isIncumbent: candidate.isIncumbent,
            platformSummary: candidate.platformSummary || undefined,
            campaignWebsite: candidate.campaignWebsite || undefined,
          })),
        })),
        ballotMeasures: election.ballotMeasures.map(measure => ({
          id: measure.id,
          title: measure.title,
          type: measure.type,
          description: measure.description,
          number: measure.number || undefined,
        })),
      }));
    } catch (error) {
      console.error('Error fetching election calendar:', error);
      throw new Error('Failed to fetch election calendar');
    }
  }

  /**
   * Get detailed candidate profile
   */
  static async getCandidateProfile(candidateId: string): Promise<CandidateProfile | null> {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          office: true,
          endorsements: true,
          financialData: true,
        },
      });

      if (!candidate) {
        return null;
      }

      return {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party || undefined,
        office: {
          title: candidate.office.title,
          level: candidate.office.level,
          district: candidate.office.district || undefined,
        },
        isIncumbent: candidate.isIncumbent,
        campaignWebsite: candidate.campaignWebsite || undefined,
        campaignEmail: candidate.campaignEmail || undefined,
        campaignPhone: candidate.campaignPhone || undefined,
        platformSummary: candidate.platformSummary || undefined,
        keyIssues: candidate.keyIssues,
        isVerified: candidate.isVerified,
        endorsements: candidate.endorsements.map(endorsement => ({
          organization: endorsement.organization,
          type: endorsement.type,
          date: endorsement.createdAt.toISOString(),
        })),
        financialData: candidate.financialData ? {
          totalRaised: Number(candidate.financialData.totalRaised),
          totalSpent: Number(candidate.financialData.totalSpent),
          cashOnHand: Number(candidate.financialData.cashOnHand),
          individualDonations: Number(candidate.financialData.individualDonations),
          pacDonations: Number(candidate.financialData.pacDonations),
        } : undefined,
      };
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      throw new Error('Failed to fetch candidate profile');
    }
  }

  /**
   * Generate voter guide for a specific location
   */
  static async generateVoterGuide(
    state: string,
    county?: string,
    city?: string
  ): Promise<VoterGuide> {
    try {
      const elections = await this.getElectionCalendar(state, county, city, 10);

      // Get state-specific voting information (this would ideally come from a voting info API)
      const votingInfo = this.getVotingInfoForState(state);

      return {
        elections,
        registrationInfo: {
          isRegistered: false, // This would need to be checked via external API
          registrationUrl: `https://www.${state.toLowerCase()}.gov/elections/register`,
          deadlines: [
            {
              type: 'Online Registration',
              date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              description: 'Deadline to register online',
            },
            {
              type: 'Mail Registration',
              date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
              description: 'Postmark deadline for mail registration',
            },
          ],
        },
        votingOptions: votingInfo,
      };
    } catch (error) {
      console.error('Error generating voter guide:', error);
      throw new Error('Failed to generate voter guide');
    }
  }

  /**
   * Search candidates by name, office, or party
   */
  static async searchCandidates(
    query: string,
    state?: string,
    office?: string,
    party?: string,
    limit: number = 20
  ): Promise<CandidateProfile[]> {
    try {
      const candidates = await prisma.candidate.findMany({
        where: {
          AND: [
            { isWithdrawn: false },
            query ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { platformSummary: { contains: query, mode: 'insensitive' } },
                { keyIssues: { has: query } },
              ],
            } : {},
            state ? { office: { state: state.toUpperCase() } } : {},
            office ? { office: { title: { contains: office, mode: 'insensitive' } } } : {},
            party ? { party: { contains: party, mode: 'insensitive' } } : {},
          ],
        },
        include: {
          office: true,
          endorsements: true,
          financialData: true,
        },
        orderBy: [
          { isVerified: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
      });

      return candidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        party: candidate.party || undefined,
        office: {
          title: candidate.office.title,
          level: candidate.office.level,
          district: candidate.office.district || undefined,
        },
        isIncumbent: candidate.isIncumbent,
        campaignWebsite: candidate.campaignWebsite || undefined,
        campaignEmail: candidate.campaignEmail || undefined,
        campaignPhone: candidate.campaignPhone || undefined,
        platformSummary: candidate.platformSummary || undefined,
        keyIssues: candidate.keyIssues,
        isVerified: candidate.isVerified,
        endorsements: candidate.endorsements.map(endorsement => ({
          organization: endorsement.organization,
          type: endorsement.type,
          date: endorsement.createdAt.toISOString(),
        })),
        financialData: candidate.financialData ? {
          totalRaised: Number(candidate.financialData.totalRaised),
          totalSpent: Number(candidate.financialData.totalSpent),
          cashOnHand: Number(candidate.financialData.cashOnHand),
          individualDonations: Number(candidate.financialData.individualDonations),
          pacDonations: Number(candidate.financialData.pacDonations),
        } : undefined,
      }));
    } catch (error) {
      console.error('Error searching candidates:', error);
      throw new Error('Failed to search candidates');
    }
  }

  /**
   * Get ballot measures for upcoming elections
   */
  static async getBallotMeasures(
    state: string,
    county?: string,
    city?: string,
    limit: number = 50
  ) {
    try {
      return await prisma.ballotMeasure.findMany({
        where: {
          AND: [
            { state: state.toUpperCase() },
            { election: { date: { gte: new Date() } } },
            county ? { county: { contains: county, mode: 'insensitive' } } : {},
            city ? { city: { contains: city, mode: 'insensitive' } } : {},
          ],
        },
        include: {
          election: true,
        },
        orderBy: {
          election: { date: 'asc' },
        },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching ballot measures:', error);
      throw new Error('Failed to fetch ballot measures');
    }
  }

  /**
   * Get voting information for a specific state
   * (This would ideally be populated from official state APIs)
   */
  private static getVotingInfoForState(state: string) {
    // This is placeholder data - in a real system, this would come from state APIs
    const defaultVotingInfo = {
      inPerson: {
        available: true,
        hours: '6:00 AM - 8:00 PM',
        locations: ['Check your local election office for polling locations'],
      },
      absentee: {
        available: true,
        requirements: ['Valid excuse required', 'ID verification'],
        deadlines: [
          {
            type: 'Application Deadline',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            type: 'Ballot Return Deadline',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
      earlyVoting: {
        available: true,
        period: '2 weeks before election',
        locations: ['County election office', 'Designated early voting sites'],
      },
    };

    // State-specific customizations could be added here
    return defaultVotingInfo;
  }
}