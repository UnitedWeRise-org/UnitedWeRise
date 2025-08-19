/**
 * Elections Service
 *
 * Handles election data, ballot information, candidate profiles, and voting guides
 */
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
        reason: string;
        isPublic: boolean;
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
export declare class ElectionsService {
    /**
     * Get upcoming elections for a specific location
     */
    static getElectionCalendar(state: string, county?: string, city?: string, limit?: number): Promise<ElectionCalendarItem[]>;
    /**
     * Get detailed candidate profile
     */
    static getCandidateProfile(candidateId: string): Promise<CandidateProfile | null>;
    /**
     * Generate voter guide for a specific location
     */
    static generateVoterGuide(state: string, county?: string, city?: string): Promise<VoterGuide>;
    /**
     * Search candidates by name, office, or party
     */
    static searchCandidates(query: string, state?: string, office?: string, party?: string, limit?: number): Promise<CandidateProfile[]>;
    /**
     * Get ballot measures for upcoming elections
     */
    static getBallotMeasures(state: string, county?: string, city?: string, limit?: number): Promise<({
        election: {
            type: import(".prisma/client").$Enums.ElectionType;
            level: import(".prisma/client").$Enums.ElectionLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            city: string | null;
            state: string;
            name: string;
            description: string | null;
            date: Date;
            district: string | null;
            isActive: boolean;
            county: string | null;
            registrationDeadline: Date | null;
            officialUrl: string | null;
        };
    } & {
        number: string | null;
        type: import(".prisma/client").$Enums.BallotMeasureType;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        description: string;
        county: string | null;
        title: string;
        electionId: string;
        fullText: string | null;
        fiscalImpact: string | null;
        arguments: import("@prisma/client/runtime/library").JsonValue | null;
    })[]>;
    /**
     * Get voting information for a specific state
     * (This would ideally be populated from official state APIs)
     */
    private static getVotingInfoForState;
}
//# sourceMappingURL=electionsService.d.ts.map