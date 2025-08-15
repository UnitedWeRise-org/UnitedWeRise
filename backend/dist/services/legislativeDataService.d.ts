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
export declare class LegislativeDataService {
    /**
     * Sync federal legislators from Congress.gov API
     */
    static syncFederalLegislators(forceRefresh?: boolean): Promise<void>;
    /**
     * Sync state legislators from Open States API
     */
    static syncStateLegislators(state: string, forceRefresh?: boolean): Promise<void>;
    /**
     * Get voting records for a specific legislator
     */
    static getVotingRecords(bioguideId: string, limit?: number): Promise<VotingRecord[]>;
    /**
     * Sync voting records for all legislators
     */
    static syncVotingRecords(chamber?: 'HOUSE' | 'SENATE'): Promise<void>;
    /**
     * Get bills and legislation
     */
    static syncBills(congress?: string, limit?: number): Promise<void>;
    /**
     * Calculate voting statistics for a legislator
     */
    static calculateVotingStatistics(membershipId: string): Promise<void>;
    private static processFederalLegislator;
    private static processStateLegislator;
    private static processVote;
    private static processBill;
    private static mapVotePosition;
    private static mapBillStatus;
}
//# sourceMappingURL=legislativeDataService.d.ts.map