/**
 * Content moderation service using AI-powered analysis and automated flagging
 *
 * Features:
 * - Automated spam detection with keyword matching
 * - Azure OpenAI toxicity detection
 * - Hate speech detection
 * - Semantic duplicate content detection using embeddings
 * - User reporting system with priority escalation
 * - Suspension and warning management
 */
declare class ModerationService {
    private prisma;
    private toxicityThreshold;
    private spamKeywords;
    constructor();
    /**
     * Analyze content for policy violations using automated detection
     *
     * Performs multiple parallel checks:
     * - Spam detection (keyword matching, capitalization, links, repetition)
     * - Toxicity detection (Azure OpenAI with fallback)
     * - Hate speech detection (Azure OpenAI with fallback)
     * - Duplicate content detection (semantic similarity)
     *
     * Creates ContentFlag records for violations above confidence thresholds.
     * Auto-moderates high-confidence (>0.9) severe violations.
     *
     * @param content - Text content to analyze
     * @param contentType - Type of content (POST, COMMENT, MESSAGE)
     * @param contentId - ID of the content being analyzed
     * @returns Promise<void> Flags created in database
     * @throws {Error} When database operations fail
     *
     * @example
     * await moderationService.analyzeContent(
     *   'This is spam content!!!',
     *   'POST',
     *   'post_123'
     * );
     * // Creates flags in database, may auto-hide content
     */
    analyzeContent(content: string, contentType: 'POST' | 'COMMENT' | 'MESSAGE' | 'VIDEO', contentId: string): Promise<void>;
    private detectSpam;
    private detectToxicity;
    private detectHateSpeech;
    private detectDuplicateContent;
    private getSpamIndicators;
    private getHateSpeechTerms;
    private autoModerate;
    /**
     * Create user report for policy violations
     *
     * Creates report record with auto-assigned priority based on reason.
     * Urgent reports (violence, self-harm, illegal content) are automatically escalated.
     *
     * Priority levels:
     * - URGENT: Violence threats, self-harm, illegal content
     * - HIGH: Hate speech, harassment, fake accounts
     * - MEDIUM: Misinformation, impersonation
     * - LOW: All other reasons
     *
     * @param reporterId - User ID submitting the report
     * @param targetType - Type of reported content (POST, COMMENT, USER, MESSAGE)
     * @param targetId - ID of the reported content/user
     * @param reason - Reason for report (maps to priority level)
     * @param description - Optional detailed description
     * @returns Promise<string> Created report ID
     * @throws {Error} When database operation fails
     *
     * @example
     * const reportId = await moderationService.createReport(
     *   'user_reporter_123',
     *   'POST',
     *   'post_456',
     *   'HATE_SPEECH',
     *   'This post targets a specific group with derogatory language.'
     * );
     * // Returns report ID, auto-escalates if URGENT priority
     */
    createReport(reporterId: string, targetType: 'POST' | 'COMMENT' | 'USER' | 'MESSAGE', targetId: string, reason: string, description?: string): Promise<string>;
    private determinePriority;
    private escalateReport;
    /**
     * Get user's current suspension status and permissions
     *
     * Checks for active suspensions (not expired) and determines user permissions.
     *
     * Suspension types and their effects:
     * - PERMANENT/TEMPORARY: Cannot post or comment
     * - POSTING_RESTRICTED: Cannot post (can comment)
     * - COMMENTING_RESTRICTED: Cannot comment (can post)
     *
     * @param userId - User ID to check
     * @returns Promise<Object> Suspension status with permission flags
     *
     * @example
     * const status = await moderationService.getUserSuspensionStatus('user_123');
     * if (!status.canPost) {
     *   throw new Error('User is restricted from posting');
     * }
     * console.log(status.suspension.type); // "POSTING_RESTRICTED"
     * console.log(status.suspension.endsAt); // 2025-11-01
     */
    getUserSuspensionStatus(userId: string): Promise<{
        isSuspended: boolean;
        suspension?: any;
        canPost: boolean;
        canComment: boolean;
    }>;
    /**
     * Issue warning to user for policy violation
     *
     * Creates warning record and sends email notification to user.
     * FINAL warnings automatically trigger 7-day temporary suspension.
     *
     * Warning severity levels:
     * - MINOR: First-time minor violations
     * - MODERATE: Repeated minor or single moderate violation
     * - MAJOR: Serious violations or repeated moderate violations
     * - FINAL: Last warning before suspension (auto-suspends for 7 days)
     *
     * @param userId - User ID receiving warning
     * @param moderatorId - Moderator ID issuing warning
     * @param reason - Reason for warning
     * @param severity - Warning severity level
     * @param notes - Optional moderator notes
     * @returns Promise<void>
     * @throws {Error} When database operation or email sending fails
     *
     * @example
     * await moderationService.issueWarning(
     *   'user_123',
     *   'mod_456',
     *   'Excessive profanity in comments',
     *   'MODERATE',
     *   'User has been previously warned about language.'
     * );
     * // Creates warning, sends email, auto-suspends if FINAL severity
     */
    issueWarning(userId: string, moderatorId: string, reason: string, severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'FINAL', notes?: string): Promise<void>;
    /**
     * Suspend user account with specified restrictions
     *
     * Deactivates existing suspensions and creates new one.
     * Updates user.isSuspended flag and sends email notification.
     *
     * Suspension types:
     * - TEMPORARY: Full suspension with expiration date (requires endsAt)
     * - PERMANENT: Permanent ban from platform (no endsAt)
     * - POSTING_RESTRICTED: Can view and comment, cannot post
     * - COMMENTING_RESTRICTED: Can view and post, cannot comment
     *
     * @param userId - User ID to suspend
     * @param moderatorId - Moderator ID issuing suspension
     * @param reason - Reason for suspension
     * @param type - Suspension type
     * @param endsAt - Optional expiration date (required for TEMPORARY)
     * @returns Promise<void>
     * @throws {Error} When database operation or email sending fails
     *
     * @example
     * await moderationService.suspendUser(
     *   'user_123',
     *   'mod_456',
     *   'Repeated harassment of other users',
     *   'TEMPORARY',
     *   new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
     * );
     * // Suspends user for 14 days, sends notification email
     */
    suspendUser(userId: string, moderatorId: string, reason: string, type: 'TEMPORARY' | 'PERMANENT' | 'POSTING_RESTRICTED' | 'COMMENTING_RESTRICTED', endsAt?: Date): Promise<void>;
    /**
     * Cleanup expired temporary suspensions
     *
     * Finds suspensions with endsAt <= now, deactivates them, and clears user.isSuspended
     * flag if no other active suspensions exist.
     *
     * Should be run periodically (e.g., cron job every hour) to automatically restore access.
     *
     * @returns Promise<void>
     * @throws {Error} When database operations fail
     *
     * @example
     * // Run in scheduled task
     * setInterval(async () => {
     *   await moderationService.cleanupExpiredSuspensions();
     * }, 3600000); // Every hour
     */
    cleanupExpiredSuspensions(): Promise<void>;
}
export declare const moderationService: ModerationService;
export {};
//# sourceMappingURL=moderationService.d.ts.map