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
    testConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map