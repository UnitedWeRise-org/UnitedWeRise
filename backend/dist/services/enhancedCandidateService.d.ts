interface CandidateProfile {
    id: string;
    name: string;
    party?: string;
    isIncumbent: boolean;
    campaignWebsite?: string;
    campaignEmail?: string;
    platformSummary?: string;
    keyIssues: string[];
    isVerified: boolean;
    photos: {
        avatar?: any;
        campaignHeadshot?: any;
        gallery: any[];
    };
    policyPositions?: {
        issue: string;
        position: string;
        stance: 'for' | 'against' | 'neutral' | 'nuanced';
        confidence: number;
    }[];
    office: {
        id: string;
        title: string;
        level: string;
        description?: string;
    };
    election: {
        id: string;
        name: string;
        date: Date;
        type: string;
    };
}
interface CandidateComparisonResult {
    candidates: CandidateProfile[];
    comparison: {
        sharedIssues: {
            issue: string;
            positions: {
                candidateId: string;
                candidateName: string;
                position: string;
                stance: string;
                confidence: number;
            }[];
            agreement: 'agree' | 'disagree' | 'mixed' | 'unclear';
            summary: string;
        }[];
        uniqueIssues: {
            candidateId: string;
            candidateName: string;
            issues: {
                issue: string;
                position: string;
                defaultMessage?: string;
            }[];
        }[];
        overallSummary: string;
        generatedAt: Date;
    };
}
export declare class EnhancedCandidateService {
    /**
     * Get enhanced candidate profile with photos and AI-analyzed positions
     */
    static getCandidateProfile(candidateId: string): Promise<CandidateProfile | null>;
    /**
     * Compare multiple candidates using AI-powered analysis
     */
    static compareCandidates(candidateIds: string[], officeId?: string): Promise<CandidateComparisonResult | null>;
    /**
     * Get candidates by office with enhanced data
     */
    static getCandidatesByOffice(officeId: string, includeAnalysis?: boolean): Promise<CandidateProfile[]>;
    /**
     * Search candidates with enhanced filtering
     */
    static searchCandidates(params: {
        query?: string;
        state?: string;
        party?: string;
        office?: string;
        isIncumbent?: boolean;
        limit?: number;
    }): Promise<CandidateProfile[]>;
    /**
     * Update candidate policy positions (for candidates updating their own profiles)
     */
    static updateCandidatePlatform(candidateId: string, updates: {
        platformSummary?: string;
        keyIssues?: string[];
        campaignWebsite?: string;
        campaignEmail?: string;
    }): Promise<boolean>;
    private static buildBasicProfile;
    private static generateFallbackComparison;
    private static findSharedIssues;
    private static findUniqueIssues;
    /**
     * Get candidate messaging inbox (for DM system integration)
     */
    static getCandidateInbox(candidateId: string, userId: string): Promise<any>;
}
export {};
//# sourceMappingURL=enhancedCandidateService.d.ts.map