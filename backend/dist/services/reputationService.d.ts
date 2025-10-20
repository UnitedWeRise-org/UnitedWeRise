interface ReputationEvent {
    userId: string;
    eventType: string;
    reason: string;
    impact: number;
    postId?: string;
    validated: boolean;
    details?: any;
}
interface ReputationScore {
    current: number;
    tier: 'boosted' | 'normal' | 'suppressed' | 'heavily_suppressed';
    visibilityMultiplier: number;
    lastUpdated: Date;
}
/**
 * User reputation scoring service
 *
 * Simple 0-100 scoring system focused on behavior, not content:
 * - New users start at 70
 * - No automatic decay (scores only change through actions)
 * - Per-post penalty cap (prevents pile-ons from mass reports)
 * - Daily reward cap of +2 points (prevents gaming)
 * - Mild algorithmic effects: ±10-20% visibility multiplier
 * - AI validation for penalties and appeals
 *
 * Score tiers:
 * - 95-100: Boosted visibility (+10%)
 * - 50-94: Normal visibility
 * - 30-49: Suppressed visibility (-10%)
 * - 0-29: Heavily suppressed (-20%)
 */
export declare class ReputationService {
    private prisma;
    constructor();
    /**
     * Get user's current reputation score with tier and visibility info
     *
     * Initializes reputation to 70 for new users if not set.
     * Returns score, tier classification, and visibility multiplier.
     *
     * @param userId - User ID to fetch reputation for
     * @returns Promise<ReputationScore> Current score, tier, multiplier, and last update date
     * @throws {Error} When user not found
     *
     * @example
     * const rep = await reputationService.getUserReputation('user_123');
     * console.log(rep.current); // 73
     * console.log(rep.tier); // "normal"
     * console.log(rep.visibilityMultiplier); // 1.0
     */
    getUserReputation(userId: string): Promise<ReputationScore>;
    /**
     * Apply reputation change with validation and safety checks
     *
     * Validation checks:
     * - Penalties require validated flag to be true
     * - Rewards respect daily gain limit (+2 max per day)
     * - Prevents duplicate penalties on same post
     * - Clamps final score to 0-100 range
     *
     * Logs all changes to ReputationEvent table for audit trail.
     *
     * @param event - Reputation event data with type, impact, and validation status
     * @returns Promise<ReputationScore> Updated reputation score and tier
     * @throws {Error} When database operations fail
     *
     * @example
     * const newRep = await reputationService.applyReputationChange({
     *   userId: 'user_123',
     *   eventType: 'PENALTY_HATE_SPEECH',
     *   reason: 'Targeted harassment',
     *   impact: -10,
     *   postId: 'post_456',
     *   validated: true,
     *   details: { analysis: {...} }
     * });
     * console.log(newRep.current); // 63 (was 73, -10 penalty)
     */
    applyReputationChange(event: ReputationEvent): Promise<ReputationScore>;
    /**
     * Analyze content and apply appropriate penalties automatically
     *
     * Uses Azure OpenAI to detect:
     * - Hate speech (-10 points)
     * - Harassment (-8 points)
     * - Spam (-2 points)
     * - Excessive profanity (-3 points)
     * - Personal attacks (-1 point)
     *
     * AI analysis counts as validation (validated: true).
     * All penalties for single post are combined into one event.
     *
     * @param content - Content text to analyze
     * @param userId - User ID who created the content
     * @param postId - Post ID being analyzed
     * @returns Promise<Object> Array of penalty types and total penalty amount
     * @throws {Error} When database operations fail (AI failures fall back to no penalties)
     *
     * @example
     * const result = await reputationService.analyzeAndApplyPenalties(
     *   'This is spam with hate speech',
     *   'user_123',
     *   'post_456'
     * );
     * console.log(result.penalties); // ['spam', 'hate_speech']
     * console.log(result.totalPenalty); // -12
     */
    analyzeAndApplyPenalties(content: string, userId: string, postId: string): Promise<{
        penalties: string[];
        totalPenalty: number;
    }>;
    /**
     * Generate pre-post content warning for user
     *
     * Analyzes content before posting and warns user if issues detected.
     * Does NOT apply penalties - only preview of potential impact.
     * Allows user to revise or proceed with posting anyway.
     *
     * Philosophy: "We don't aim to prevent anyone from sharing their ideas,
     * but please keep things civil."
     *
     * @param content - Content user wants to post
     * @param userId - User ID (unused currently, for future personalization)
     * @returns Promise<Object> Warning data with issues, penalty, and message
     * @throws {Error} When AI analysis fails (returns no warning on error)
     *
     * @example
     * const warning = await reputationService.generateContentWarning(
     *   'This contains some harsh language',
     *   'user_123'
     * );
     * if (warning.showWarning) {
     *   console.log(warning.message); // Shows friendly warning
     *   console.log(warning.potentialPenalty); // -3
     * }
     */
    generateContentWarning(content: string, userId: string): Promise<{
        showWarning: boolean;
        issues: string[];
        potentialPenalty: number;
        message: string;
    }>;
    /**
     * Award reputation for positive community contributions
     *
     * Reward amounts (all subject to +2 daily max):
     * - quality_post: +0.5 (post with 5+ diverse likes)
     * - constructive: +0.25 (constructive dialogue)
     * - helpful: +0.25 (helpful content)
     * - positive_feedback: +0.25 (community appreciation)
     *
     * Daily cap prevents gaming through mass posting.
     *
     * @param userId - User ID to reward
     * @param reason - Reason for reward
     * @param postId - Optional post ID that triggered reward
     * @returns Promise<ReputationScore> Updated reputation
     * @throws {Error} When database operations fail
     *
     * @example
     * const newRep = await reputationService.awardReputation(
     *   'user_123',
     *   'quality_post',
     *   'post_456'
     * );
     * console.log(newRep.current); // 73.5 (was 73, +0.5 reward)
     */
    awardReputation(userId: string, reason: 'quality_post' | 'constructive' | 'helpful' | 'positive_feedback', postId?: string): Promise<ReputationScore>;
    /**
     * Process community report with AI validation
     *
     * Validates report using AI to prevent weaponized reporting.
     * Only applies penalty if AI confirms violation (confidence > 0.7).
     *
     * Anti-abuse measures:
     * - AI validates report content matches reason
     * - Filters out reports against unpopular political opinions
     * - Focus on behavior/tone, not political positions
     *
     * @param reporterId - User ID submitting report
     * @param targetUserId - User ID being reported
     * @param postId - Post ID being reported
     * @param reason - Reason category (hate_speech, harassment, spam, etc.)
     * @param content - Actual post content to validate
     * @returns Promise<Object> Whether report accepted and penalty applied
     * @throws {Error} When database operations fail
     *
     * @example
     * const result = await reputationService.processReport(
     *   'reporter_123',
     *   'target_456',
     *   'post_789',
     *   'harassment',
     *   'Actual post content here...'
     * );
     * console.log(result.accepted); // true
     * console.log(result.penalty); // -8
     */
    processReport(reporterId: string, targetUserId: string, postId: string, reason: string, content: string): Promise<{
        accepted: boolean;
        penalty?: number;
    }>;
    /**
     * Process user appeal of reputation penalty
     *
     * AI reviews original penalty against user's appeal explanation.
     * Low confidence (< 0.7) appeals flagged for human admin review.
     *
     * If overturned:
     * - Points restored via REWARD_APPEAL_OVERTURNED event
     * - Original event marked with overturned flag
     *
     * Philosophy: "Err on the side of free speech - overturn if reasonable doubt."
     *
     * @param userId - User ID appealing (must match event userId)
     * @param eventId - ReputationEvent ID being appealed
     * @param reason - User's appeal explanation
     * @returns Promise<Object> Decision (overturned/upheld/under_review) and explanation
     * @throws {Error} When event not found, unauthorized, or database fails
     *
     * @example
     * const result = await reputationService.processAppeal(
     *   'user_123',
     *   'event_456',
     *   'This was taken out of context. I was quoting someone else.'
     * );
     * if (result.decision === 'overturned') {
     *   console.log('Points restored!');
     * }
     * console.log(result.explanation); // AI reasoning
     */
    processAppeal(userId: string, eventId: string, reason: string): Promise<{
        decision: 'overturned' | 'upheld' | 'under_review';
        explanation: string;
    }>;
    private getTier;
    private getVisibilityMultiplier;
    private getTodayGain;
    private analyzeContent;
    private validateReport;
    private reviewAppeal;
    private flagForAdminReview;
    private logReputationEvent;
}
export declare const reputationService: ReputationService;
export {};
//# sourceMappingURL=reputationService.d.ts.map