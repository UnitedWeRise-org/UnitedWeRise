import { ReportReason } from '@prisma/client';
interface GeographicInfo {
    district: string;
    state: string;
    county?: string;
    officeLevel: string;
}
export declare class CandidateReportService {
    /**
     * Calculate geographic weight based on reporter location vs candidate district
     */
    static calculateGeographicWeight(reporterInfo: GeographicInfo, candidateInfo: GeographicInfo): number;
    /**
     * Assess urgency of candidate report using AI
     */
    static assessReportUrgency(reason: ReportReason, description: string, candidateName: string, officeTitle: string): Promise<{
        urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        assessmentScore: number;
        analysisNotes: string;
    }>;
    /**
     * Submit a report for a candidate
     */
    static submitCandidateReport(reporterId: string, candidateId: string, reason: ReportReason, description: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: import(".prisma/client").$Enums.ReportReason;
        status: import(".prisma/client").$Enums.ReportStatus;
        priority: import(".prisma/client").$Enums.ReportPriority;
        description: string | null;
        moderatorId: string | null;
        targetType: import(".prisma/client").$Enums.ReportTargetType;
        targetId: string;
        reporterId: string;
        moderatedAt: Date | null;
        moderatorNotes: string | null;
        actionTaken: import(".prisma/client").$Enums.ModerationAction | null;
        reporterDistrict: string | null;
        candidateDistrict: string | null;
        geographicWeight: number | null;
        aiAssessmentScore: number | null;
        aiUrgencyLevel: string | null;
        aiAnalysisNotes: string | null;
        aiAssessedAt: Date | null;
    }>;
    /**
     * Get user's electoral district based on address
     */
    private static getUserDistrict;
    /**
     * Check for brigading patterns
     */
    private static checkBrigadingPatterns;
    /**
     * Get monthly verification due candidates
     */
    static getCandidatesDueForVerification(): Promise<any[]>;
    /**
     * Request documents from candidate
     */
    static requestVerificationDocuments(candidateId: string, requestedBy: string, documentTypes: string[]): Promise<{
        id: string;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        candidateId: string;
        verificationNotes: string | null;
        expiresAt: Date | null;
        documentType: string;
        documentUrl: string;
        documentName: string;
        uploadedAt: Date;
        isValid: boolean;
        requestedAt: Date | null;
        requestedBy: string | null;
    }[]>;
    /**
     * Helper functions for monthly verification dates
     */
    private static getFirstMondayOfMonth;
    private static getSecondMondayOfMonth;
}
export declare const candidateReportService: CandidateReportService;
export {};
//# sourceMappingURL=candidateReportService.d.ts.map