export interface EmailTemplate {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
/**
 * Email service for sending transactional emails
 *
 * Supports:
 * - SMTP configuration via environment variables
 * - Email verification and password reset flows
 * - Moderation notifications (warnings, suspensions)
 * - Candidate registration workflows
 * - Admin messaging to candidates
 * - HTML templates with fallback to plain text
 *
 * Configuration:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - SMTP_FROM (optional, defaults to SMTP_USER)
 * - FRONTEND_URL for link generation
 */
declare class EmailService {
    private transporter;
    constructor();
    /**
     * Initialize SMTP transporter with environment configuration
     *
     * Attempts to create nodemailer transport using SMTP credentials.
     * Logs warning if no credentials configured (emails won't send).
     *
     * @private
     */
    private initializeTransporter;
    /**
     * Send email using configured SMTP transport
     *
     * Sends HTML email with plain text fallback (auto-stripped from HTML if not provided).
     * Returns boolean success/failure (logs errors but doesn't throw).
     *
     * @param template - Email template with to, subject, html, and optional text
     * @returns Promise<boolean> True if sent successfully, false otherwise
     *
     * @example
     * const sent = await emailService.sendEmail({
     *   to: 'user@example.com',
     *   subject: 'Welcome!',
     *   html: '<h1>Welcome to our platform</h1>',
     *   text: 'Welcome to our platform'
     * });
     * if (!sent) console.error('Email failed to send');
     */
    sendEmail(template: EmailTemplate): Promise<boolean>;
    /**
     * Generate email verification template for new user registration
     *
     * Creates branded email with verification link that expires in 24 hours.
     * Link format: {FRONTEND_URL}/verify-email?token={verifyToken}
     *
     * @param email - Recipient email address
     * @param verifyToken - Verification token to include in link
     * @param firstName - Optional first name for personalization
     * @returns EmailTemplate ready to send
     *
     * @example
     * const template = emailService.generateEmailVerificationTemplate(
     *   'user@example.com',
     *   'verify_abc123',
     *   'Jane'
     * );
     * await emailService.sendEmail(template);
     */
    generateEmailVerificationTemplate(email: string, verifyToken: string, firstName?: string): EmailTemplate;
    /**
     * Generate password reset template for forgot password flow
     *
     * Creates email with password reset link that expires in 1 hour.
     * Link format: {FRONTEND_URL}/reset-password?token={resetToken}
     *
     * @param email - Recipient email address
     * @param resetToken - Password reset token to include in link
     * @param firstName - Optional first name for personalization
     * @returns EmailTemplate ready to send
     *
     * @example
     * const template = emailService.generatePasswordResetTemplate(
     *   'user@example.com',
     *   'reset_xyz789',
     *   'John'
     * );
     * await emailService.sendEmail(template);
     */
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
    /**
     * Test SMTP connection
     *
     * Verifies SMTP transport configuration without sending email.
     * Useful for health checks and configuration validation.
     *
     * @returns Promise<boolean> True if connection successful, false otherwise
     *
     * @example
     * const isWorking = await emailService.testConnection();
     * if (!isWorking) {
     *   console.error('Email service misconfigured');
     * }
     */
    testConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map