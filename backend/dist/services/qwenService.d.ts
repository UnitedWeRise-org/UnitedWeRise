interface PolicyPosition {
    issue: string;
    position: string;
    stance: 'for' | 'against' | 'neutral' | 'nuanced';
    confidence: number;
    evidence?: string[];
    source?: string;
}
interface CandidateComparison {
    candidates: {
        id: string;
        name: string;
        party?: string;
    }[];
    sharedIssues: {
        issue: string;
        positions: {
            candidateId: string;
            position: string;
            stance: 'for' | 'against' | 'neutral' | 'nuanced';
            confidence: number;
        }[];
        agreement: 'agree' | 'disagree' | 'mixed' | 'unclear';
        summary: string;
    }[];
    uniqueIssues: {
        candidateId: string;
        issues: {
            issue: string;
            position: string;
            defaultMessage?: string;
        }[];
    }[];
    overallSummary: string;
}
export declare class QwenService {
    private static readonly API_URL;
    private static readonly API_KEY;
    private static readonly MODEL;
    private static readonly MAX_RETRIES;
    private static readonly TIMEOUT_MS;
    /**
     * Test Qwen3 API connection
     */
    static healthCheck(): Promise<{
        status: string;
        model?: string;
        details?: any;
    }>;
    /**
     * Analyze candidate policy positions from their content
     */
    static analyzeCandidatePositions(candidateId: string, content?: string): Promise<PolicyPosition[]>;
    /**
     * Compare multiple candidates' positions on shared issues
     */
    static compareCandidates(candidateIds: string[], officeId?: string): Promise<CandidateComparison>;
    /**
     * Generate neutral summary for a policy issue across multiple viewpoints
     */
    static generateNeutralSummary(issue: string, positions: {
        candidate: string;
        position: string;
    }[]): Promise<string>;
    /**
     * Simple text generation for general use cases
     */
    static generateResponse(prompt: string, maxTokens?: number): Promise<string>;
    /**
     * Generate default message for missing policy positions
     */
    static generateMissingPositionMessage(candidateName: string, issue: string, candidateId: string): string;
    private static makeAPIRequest;
    private static buildPositionAnalysisPrompt;
    private static buildComparisonPrompt;
    private static parsePositionAnalysis;
    private static parseComparison;
    private static extractPositionsForIssue;
    private static findCandidateId;
    private static findPositionForCandidate;
    /**
     * Get usage statistics for Qwen3 API calls
     */
    static getUsageStats(): Promise<{
        totalRequests: number;
        totalTokens: number;
        avgResponseTime: number;
        successRate: number;
    }>;
}
export {};
//# sourceMappingURL=qwenService.d.ts.map