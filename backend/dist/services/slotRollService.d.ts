/**
 * Slot Roll Service for Per-Slot Feed Algorithm Selection
 *
 * Implements probability-based feed population where each slot independently
 * rolls 0-99 to determine which algorithm pool to use:
 *
 * LOGGED IN (15 slots):
 *   0-9   (10%) = RANDOM     - Time decay + reputation only (anti-echo-chamber)
 *   10-19 (10%) = TRENDING   - Engagement + time decay + reputation
 *   20-99 (80%) = PERSONALIZED - Full vector matching + social graph
 *
 * LOGGED OUT (15 slots):
 *   0-29  (30%) = RANDOM     - Time decay + reputation only
 *   30-99 (70%) = TRENDING   - Engagement + time decay + reputation
 *
 * Key design principles:
 * - Nothing is guaranteed - each slot is an independent roll
 * - Variance is intentional (keeps feed organic)
 * - Within each pool, selection is also weighted random (not top-N)
 * - Deduplication with graceful fallback chain
 */
type PoolType = 'random' | 'trending' | 'personalized';
interface SlotResult {
    post: any;
    pool: PoolType;
    roll: number;
}
interface FeedConfig {
    slots: number;
    loggedInThresholds: {
        random: number;
        trending: number;
    };
    loggedOutThresholds: {
        random: number;
    };
}
export declare class SlotRollService {
    /**
     * Generate feed using per-slot roll system
     *
     * @param userId - User ID (null for logged-out users)
     * @param config - Optional configuration overrides
     * @returns Array of posts with slot metadata
     */
    static generateFeed(userId: string | null, config?: Partial<FeedConfig>): Promise<{
        posts: SlotResult[];
        stats: any;
    }>;
    /**
     * Determine which pool to use based on roll and login status
     */
    private static determinePool;
    /**
     * Select a post from the specified pool with deduplication
     * Falls back to other pools if primary is exhausted
     */
    private static selectFromPool;
    /**
     * Weighted random selection from candidates
     * Higher-scored posts have higher probability but nothing is guaranteed
     */
    private static weightedRandomSelect;
    /**
     * Get RANDOM pool candidates
     * Scoring: Time decay + Reputation only (no engagement, no personalization)
     */
    private static getRandomPool;
    /**
     * Get TRENDING pool candidates
     * Scoring: Engagement + Time decay + Reputation
     */
    private static getTrendingPool;
    /**
     * Get PERSONALIZED pool candidates
     * Uses UserInterestService for enhanced scoring with:
     * - Social graph relationship weights (Subscribe 2x, Friend 1.5x, Follow 1x)
     * - Content similarity via aggregate interest vector
     * - Mute/block filtering
     */
    private static getPersonalizedPool;
}
export declare const slotRollService: SlotRollService;
export {};
//# sourceMappingURL=slotRollService.d.ts.map