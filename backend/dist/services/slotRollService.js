"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.slotRollService = exports.SlotRollService = void 0;
const prisma_1 = require("../lib/prisma");
const probabilityFeedService_1 = require("./probabilityFeedService");
const engagementScoringService_1 = require("./engagementScoringService");
const reputationService_1 = require("./reputationService");
const userInterestService_1 = require("./userInterestService");
const logger_1 = require("./logger");
const DEFAULT_CONFIG = {
    slots: 15,
    loggedInThresholds: {
        random: 10, // 0-9 = random (10%)
        trending: 20 // 10-19 = trending (10%), 20-99 = personalized (80%)
    },
    loggedOutThresholds: {
        random: 30 // 0-29 = random (30%), 30-99 = trending (70%)
    },
    excludeIds: []
};
class SlotRollService {
    /**
     * Generate feed using per-slot roll system
     *
     * @param userId - User ID (null for logged-out users)
     * @param config - Optional configuration overrides
     * @returns Array of posts with slot metadata
     */
    static async generateFeed(userId, config = {}) {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        const isLoggedIn = userId !== null;
        // Initialize with excludeIds to skip previously-seen posts (for infinite scroll)
        const selectedIds = new Set(cfg.excludeIds);
        const posts = [];
        const poolCounts = { random: 0, trending: 0, personalized: 0 };
        const rolls = [];
        // Pre-fetch candidate pools for efficiency
        const [randomPool, trendingPool, personalizedPool] = await Promise.all([
            this.getRandomPool(),
            this.getTrendingPool(),
            isLoggedIn ? this.getPersonalizedPool(userId) : Promise.resolve([])
        ]);
        for (let i = 0; i < cfg.slots; i++) {
            const roll = Math.floor(Math.random() * 100);
            rolls.push(roll);
            const pool = this.determinePool(roll, isLoggedIn, cfg);
            poolCounts[pool]++;
            const post = await this.selectFromPool(pool, selectedIds, { random: randomPool, trending: trendingPool, personalized: personalizedPool }, userId);
            if (post) {
                posts.push({ post, pool, roll });
                selectedIds.add(post.id);
            }
        }
        return {
            posts,
            stats: {
                totalSlots: cfg.slots,
                filledSlots: posts.length,
                poolDistribution: poolCounts,
                rolls,
                isLoggedIn,
                expectedDistribution: isLoggedIn
                    ? { random: '~10%', trending: '~10%', personalized: '~80%' }
                    : { random: '~30%', trending: '~70%' }
            }
        };
    }
    /**
     * Determine which pool to use based on roll and login status
     */
    static determinePool(roll, isLoggedIn, config) {
        if (isLoggedIn) {
            if (roll < config.loggedInThresholds.random)
                return 'random';
            if (roll < config.loggedInThresholds.trending)
                return 'trending';
            return 'personalized';
        }
        else {
            if (roll < config.loggedOutThresholds.random)
                return 'random';
            return 'trending';
        }
    }
    /**
     * Select a post from the specified pool with deduplication
     * Falls back to other pools if primary is exhausted
     */
    static async selectFromPool(pool, excludeIds, pools, userId) {
        const fallbackOrder = pool === 'personalized'
            ? ['personalized', 'trending', 'random']
            : pool === 'trending'
                ? ['trending', 'random']
                : ['random', 'trending'];
        for (const poolType of fallbackOrder) {
            const candidates = pools[poolType].filter(p => !excludeIds.has(p.id));
            if (candidates.length > 0) {
                return this.weightedRandomSelect(candidates, poolType);
            }
        }
        return null; // All pools exhausted
    }
    /**
     * Weighted random selection from candidates
     * Higher-scored posts have higher probability but nothing is guaranteed
     */
    static weightedRandomSelect(candidates, poolType) {
        if (candidates.length === 0)
            return null;
        if (candidates.length === 1)
            return candidates[0];
        // Calculate weights based on pool type
        const weights = candidates.map(post => {
            switch (poolType) {
                case 'random':
                    // Random pool: time decay + reputation only
                    return post._randomScore || 1;
                case 'trending':
                    // Trending pool: engagement + time decay
                    return post._trendingScore || 1;
                case 'personalized':
                    // Personalized pool: full score
                    return post._personalizedScore || post.finalScore || 1;
                default:
                    return 1;
            }
        });
        // Weighted random selection
        const totalWeight = weights.reduce((sum, w) => sum + Math.max(0.1, w), 0);
        const random = Math.random() * totalWeight;
        let accumulator = 0;
        for (let i = 0; i < candidates.length; i++) {
            accumulator += Math.max(0.1, weights[i]);
            if (random <= accumulator) {
                return candidates[i];
            }
        }
        return candidates[candidates.length - 1];
    }
    /**
     * Get RANDOM pool candidates
     * Scoring: Time decay + Reputation only (no engagement, no personalization)
     */
    static async getRandomPool() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                tags: { hasSome: ["Public Post", "Candidate Post", "Official Post"] }
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        verified: true,
                        userBadges: {
                            where: { isDisplayed: true },
                            take: 5,
                            orderBy: { displayOrder: 'asc' },
                            select: {
                                badge: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        imageUrl: true
                                    }
                                },
                                earnedAt: true,
                                displayOrder: true
                            }
                        }
                    }
                },
                photos: true,
                _count: {
                    select: { likes: true, comments: true, shares: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });
        // Score with time decay + reputation only
        const scoredPosts = await Promise.all(posts.map(async (post) => {
            const hoursOld = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
            const timeDecay = Math.pow(0.95, hoursOld / 24); // Decay per day
            let reputationMultiplier = 1.0;
            try {
                const rep = await reputationService_1.reputationService.getUserReputation(post.author.id);
                if (rep.current >= 95)
                    reputationMultiplier = 1.1;
                else if (rep.current >= 50)
                    reputationMultiplier = 1.0;
                else if (rep.current >= 30)
                    reputationMultiplier = 0.9;
                else
                    reputationMultiplier = 0.8;
            }
            catch (e) {
                // Default to normal multiplier on error
            }
            return {
                ...post,
                _randomScore: timeDecay * reputationMultiplier
            };
        }));
        return scoredPosts;
    }
    /**
     * Get TRENDING pool candidates
     * Scoring: Engagement + Time decay + Reputation
     */
    static async getTrendingPool() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                tags: { hasSome: ["Public Post", "Candidate Post", "Official Post"] }
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        verified: true,
                        userBadges: {
                            where: { isDisplayed: true },
                            take: 5,
                            orderBy: { displayOrder: 'asc' },
                            select: {
                                badge: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        imageUrl: true
                                    }
                                },
                                earnedAt: true,
                                displayOrder: true
                            }
                        }
                    }
                },
                photos: true,
                _count: {
                    select: { likes: true, comments: true, shares: true }
                },
                comments: {
                    select: {
                        likesCount: true,
                        dislikesCount: true,
                        agreesCount: true,
                        disagreesCount: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 300
        });
        // Score with engagement + time decay + reputation
        const scoredPosts = await Promise.all(posts.map(async (post) => {
            const hoursOld = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
            const timeDecay = Math.pow(0.95, hoursOld / 24);
            // Engagement score
            const engagementResult = engagementScoringService_1.EngagementScoringService.calculateScore({
                likesCount: post._count.likes,
                dislikesCount: 0,
                agreesCount: 0,
                disagreesCount: 0,
                commentsCount: post._count.comments,
                sharesCount: post._count.shares,
                viewsCount: 0,
                communityNotesCount: 0,
                reportsCount: 0
            }, post.createdAt);
            let reputationMultiplier = 1.0;
            try {
                const rep = await reputationService_1.reputationService.getUserReputation(post.author.id);
                if (rep.current >= 95)
                    reputationMultiplier = 1.1;
                else if (rep.current >= 50)
                    reputationMultiplier = 1.0;
                else if (rep.current >= 30)
                    reputationMultiplier = 0.9;
                else
                    reputationMultiplier = 0.8;
            }
            catch (e) {
                // Default to normal multiplier on error
            }
            return {
                ...post,
                _trendingScore: engagementResult.score * timeDecay * reputationMultiplier
            };
        }));
        return scoredPosts;
    }
    /**
     * Get PERSONALIZED pool candidates
     * Uses UserInterestService for enhanced scoring with:
     * - Social graph relationship weights (Subscribe 2x, Friend 1.5x, Follow 1x)
     * - Content similarity via aggregate interest vector
     * - Mute/block filtering
     */
    static async getPersonalizedPool(userId) {
        try {
            // Build user interest profile
            const profile = await userInterestService_1.UserInterestService.buildProfile(userId);
            // Get base candidates from ProbabilityFeedService
            const result = await probabilityFeedService_1.ProbabilityFeedService.generateFeed(userId, 150);
            // Enhance with UserInterestService scoring
            const enhancedPosts = result.posts
                // Filter out muted/blocked authors
                .filter((post) => !userInterestService_1.UserInterestService.shouldExcludeAuthor(post.authorId, profile))
                // Apply enhanced scoring
                .map((post) => {
                const relationshipWeight = userInterestService_1.UserInterestService.getRelationshipWeight(post.authorId, profile);
                const relevanceScore = userInterestService_1.UserInterestService.calculatePostRelevance({
                    id: post.id,
                    authorId: post.authorId,
                    embedding: post.embedding || [],
                    tags: post.tags
                }, profile);
                const geoBoost = userInterestService_1.UserInterestService.calculateGeoBoost(post.h3Index || null, profile);
                // Combine scores: base score * relationship weight * relevance boost * geo boost
                const baseScore = post.finalScore || 1;
                const enhancedScore = baseScore * relationshipWeight * (1 + relevanceScore) * geoBoost;
                return {
                    ...post,
                    _personalizedScore: enhancedScore,
                    _relationshipWeight: relationshipWeight,
                    _relevanceScore: relevanceScore,
                    _geoBoost: geoBoost
                };
            });
            logger_1.logger.debug({
                userId,
                originalCount: result.posts.length,
                filteredCount: enhancedPosts.length,
                excludedByMuteBlock: result.posts.length - enhancedPosts.length
            }, 'Personalized pool enhanced');
            return enhancedPosts;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get personalized pool, falling back to trending');
            return []; // Empty triggers fallback to trending
        }
    }
}
exports.SlotRollService = SlotRollService;
exports.slotRollService = new SlotRollService();
//# sourceMappingURL=slotRollService.js.map