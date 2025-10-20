export interface EmailTemplate {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    constructor();
    private initializeTransporter;
    sendEmail(template: EmailTemplate): Promise<boolean>;
    generateEmailVerificationTemplate(email: string, verifyToken: string, firstName?: string): EmailTemplate;
    generatePasswordResetTemplate(email: string, resetToken: string, firstName?: string): EmailTemplate;
    generateWelcomeTemplate(email: string, firstName?: string): EmailTemplate;
    generateWarningTemplate(email: string, reason: string, severity: string, firstName?: string): EmailTemplate;
    generateSuspensionTemplate(email: string, reason: string, type: string, endsAt?: Date, firstName?: string): EmailTemplate;
    generateReportUpdateTemplate(email: string, reportId: string, action: string, notes?: string, firstName?: string): EmailTemplate;
    private stripHtml;
    generateWaiverApprovalTemplate(email: string, candidateName: string, officeLevel: string, finalFee: number, firstName?: string): EmailTemplate;
    generateWaiverDenialTemplate(email: string, candidateName: string, officeLevel: string, originalFee: number, denialReason?: string, firstName?: string): EmailTemplate;
    generateCandidateApprovalTemplate(email: string, candidateName: string, officeTitle: string, officeLevelName: string, firstName?: string): EmailTemplate;
    generateCandidateRejectionTemplate(email: string, candidateName: string, officeTitle: string, rejectionReason: string, notes?: string, firstName?: string): EmailTemplate;
    generateCandidateStatusChangeTemplate(email: string, candidateName: string, oldStatus: string, newStatus: string, reason?: string, notes?: string, firstName?: string): EmailTemplate;
    generateAdminMessageTemplate(email: string, candidateName: string, subject: string, messagePreview: string, messageType: string, priority: string, firstName?: string): EmailTemplate;
    testConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map