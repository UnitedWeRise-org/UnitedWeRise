export interface InquiryData {
    candidateId: string;
    inquirerId?: string;
    subject: string;
    content: string;
    category?: string;
    isAnonymous?: boolean;
    contactEmail?: string;
    contactName?: string;
    policyTopic?: string;
    specificQuestion?: string;
}
export interface ResponseData {
    inquiryId: string;
    responderId: string;
    content: string;
    responseType?: 'DIRECT' | 'PUBLIC_QA' | 'POLICY_STATEMENT' | 'REFERRAL';
    isPublic?: boolean;
    isFromCandidate?: boolean;
}
export interface PublicQAData {
    candidateId: string;
    question: string;
    answer: string;
    category?: string;
    sourceInquiryId?: string;
}
export declare class CandidateInboxService {
    /**
     * Initialize candidate inbox (automatically created when candidate registers)
     */
    static createInbox(candidateId: string, settings?: {
        allowPublicQ?: boolean;
        autoResponse?: string;
        staffEmails?: string[];
        categories?: string[];
    }): Promise<any>;
    /**
     * Submit inquiry to candidate
     */
    static submitInquiry(inquiryData: InquiryData): Promise<any>;
    /**
     * Get candidate inbox with inquiries
     */
    static getCandidateInbox(candidateId: string, userId: string, filters?: {
        status?: string[];
        category?: string[];
        priority?: string[];
        limit?: number;
        offset?: number;
    }): Promise<any>;
    /**
     * Respond to inquiry
     */
    static respondToInquiry(responseData: ResponseData): Promise<any>;
    /**
     * Convert inquiry to public Q&A
     */
    static convertToPublicQA(inquiryId: string, question: string, answer: string): Promise<any>;
    /**
     * Get public Q&A for candidate
     */
    static getPublicQA(candidateId: string, filters?: {
        category?: string[];
        limit?: number;
        offset?: number;
        pinned?: boolean;
    }): Promise<any>;
    /**
     * Add staff member to candidate inbox
     */
    static addStaffMember(candidateId: string, userId: string, staffData: {
        role: string;
        permissions: string[];
        addedBy: string;
    }): Promise<any>;
    private static determinePriority;
    private static sendAutoResponse;
    private static notifyStaff;
    private static notifyInquirer;
    private static notifyAnonymousInquirer;
    private static verifyInboxAccess;
    private static verifyStaffPermission;
    private static getInboxStats;
}
//# sourceMappingURL=candidateInboxService.d.ts.map