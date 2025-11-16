"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProbabilityFeedService = void 0;
const prisma_1 = require("../lib/prisma");
const engagementScoringService_1 = require("./engagementScoringService");
const logger_1 = require("./logger");
class ProbabilityFeedService {
    /**
     * Generate personalized feed using probability cloud sampling algorithm
     *
     * This algorithm uses electron-cloud-like probability distribution to sample posts
     * based on multiple weighted factors. Unlike deterministic ranking, this creates
     * more diverse feeds while still favoring relevant content.
     *
     * Algorithm steps:
     * 1. Get candidate posts from last 30 days
     * 2. Score each post across 5 dimensions (recency, similarity, social, trending, reputation)
     * 3. Apply weighted scoring with configurable weights
     * 4. Apply reputation-based visibility multipliers (±10-20% visibility)
     * 5. Use weighted random sampling (higher scores = higher probability)
     *
     * @param userId - User ID to generate feed for
     * @param limit - Maximum number of posts to return (default: 50)
     * @param customWeights - Optional custom weights to override defaults
     * @returns Promise<Object> Feed data with posts, algorithm info, and stats
     * @throws {Error} When user profile cannot be loaded or post scoring fails
     *
     * @example
     * const feed = await ProbabilityFeedService.generateFeed('user_123', 25, {
     *   recency: 0.4,  // Emphasize newer posts
     *   social: 0.3    // Increase content from followed users
     * });
     * console.log(feed.posts.length); // Up to 25 posts
     * console.log(feed.algorithm); // "probability-cloud"
     * console.log(feed.stats.avgRecencyScore); // 0.72
     */
    static async generateFeed(userId, limit = 50, customWeights) {
        const weights = { ...this.defaultWeights, ...customWeights };
        try {
            // Get user's interaction history for similarity matching
            const userProfile = await this.getUserProfile(userId);
            // Get candidate posts (last 30 days to balance freshness vs content pool)
            const candidatePosts = await this.getCandidatePosts(userId);
            if (candidatePosts.length === 0) {
                return { posts: [], algorithm: 'fallback-empty' };
            }
            // Score each post across all dimensions
            const scoredPosts = await Promise.all(candidatePosts.map(post => this.scorePost(post, userProfile, weights)));
            // Sample from probability distribution
            const selectedPosts = this.probabilitySample(scoredPosts, limit);
            return {
                posts: selectedPosts.map(sp => sp.post),
                algorithm: 'probability-cloud',
                weights: weights,
                stats: {
                    candidateCount: candidatePosts.length,
                    avgRecencyScore: this.avgScore(scoredPosts, 'recencyScore'),
                    avgSimilarityScore: this.avgScore(scoredPosts, 'similarityScore'),
                    avgSocialScore: this.avgScore(scoredPosts, 'socialScore'),
                    avgTrendingScore: this.avgScore(scoredPosts, 'trendingScore'),
                    avgReputationScore: this.avgScore(scoredPosts, 'reputationScore'),
                    avgVisibilityMultiplier: this.avgScore(scoredPosts, 'visibilityMultiplier')
                }
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'ProbabilityFeedService error');
            throw error;
        }
    }
    /**
     * Get user profile with interaction patterns for similarity scoring
     *
     * Fetches user data including:
     * - Followed users (for social scoring)
     * - Recent liked posts with embeddings (for similarity scoring)
     * - User's own posts with embeddings (for self-similarity)
     *
     * @param userId - User ID to fetch profile for
     * @returns Promise<Object> User profile with followedUserIds Set and interactionEmbeddings array
     * @throws {Error} When user lookup fails or database query errors
     *
     * @example
     * const profile = await this.getUserProfile('user_123');
     * console.log(profile.followedUserIds.size); // 42
     * console.log(profile.interactionEmbeddings.length); // 70 (max 50 likes + 20 posts)
     */
    static async getUserProfile(userId) {
        const [user, followedUsers, likedPosts, userPosts] = await Promise.all([
            prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    embedding: true,
                    interests: true // if we add this field later
                }
            }),
            prisma_1.prisma.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true }
            }),
            prisma_1.prisma.like.findMany({
                where: { userId },
                include: { post: { select: { embedding: true, authorId: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50 // Recent likes for interest profiling
            }),
            prisma_1.prisma.post.findMany({
                where: { authorId: userId },
                select: { embedding: true },
                orderBy: { createdAt: 'desc' },
                take: 20 // User's own posts for self-similarity
            })
        ]);
        return {
            user,
            followedUserIds: new Set(followedUsers.map(f => f.followingId)),
            interactionEmbeddings: [
                ...likedPosts.map(l => l.post.embedding).filter(e => e.length > 0),
                ...userPosts.map(p => p.embedding).filter(e => e.length > 0)
            ]
        };
    }
    /**
     * Get candidate posts for feed consideration
     *
     * Fetches recent public posts from last 30 days, excluding user's own posts.
     * Includes post metadata, author details with badges, photos, engagement counts,
     * and comment reaction metrics.
     *
     * @param userId - User ID to exclude from results
     * @returns Promise<Post[]> Array of candidate posts (max 500)
     * @throws {Error} When database query fails
     *
     * @example
     * const candidates = await this.getCandidatePosts('user_123');
     * console.log(candidates.length); // Up to 500 posts
     * console.log(candidates[0].author.verified); // true
     */
    static async getCandidatePosts(userId) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return prisma_1.prisma.post.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                authorId: { not: userId }, // Don't include user's own posts
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
                    select: {
                        likes: true,
                        comments: true,
                        shares: true
                    }
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
            take: 500 // Large pool to sample from
        });
    }
    /**
     * Score a single post across all dimensions
     *
     * Calculates 5 dimensional scores and applies weighted final score:
     * 1. Recency Score - Exponential decay with 24-hour half-life
     * 2. Social Score - 1.0 for followed users, 0.1 for others
     * 3. Trending Score - Normalized engagement score (0-1 range)
     * 4. Similarity Score - Cosine similarity to user's interaction history
     * 5. Reputation Score - Author's reputation normalized to 0-1
     *
     * Then applies visibility multiplier based on author reputation:
     * - 95+ reputation: 1.1x visibility boost (+10%)
     * - 50-94 reputation: 1.0x normal visibility
     * - 30-49 reputation: 0.9x suppression (-10%)
     * - 0-29 reputation: 0.8x suppression (-20%)
     *
     * @param post - Post object with author, engagement, and embedding data
     * @param userProfile - User profile with followedUserIds and interactionEmbeddings
     * @param weights - Scoring weights for each dimension
     * @returns Promise<PostScore & { post }> Scored post with breakdown of all scores
     *
     * @example
     * const scored = await this.scorePost(post, profile, weights);
     * console.log(scored.recencyScore); // 0.87 (recent post)
     * console.log(scored.socialScore); // 1.0 (from followed user)
     * console.log(scored.finalScore); // 0.73 (weighted + visibility)
     */
    static async scorePost(post, userProfile, weights) {
        const now = Date.now();
        const postTime = new Date(post.createdAt).getTime();
        // 1. Recency Score (exponential decay)
        const hoursSincePost = (now - postTime) / (1000 * 60 * 60);
        const recencyScore = Math.exp(-hoursSincePost / 24); // Half-life of 24 hours
        // 2. Social Score (posts from followed users get boost)
        const socialScore = userProfile.followedUserIds.has(post.authorId) ? 1.0 : 0.1;
        // 3. Trending Score (using EngagementScoringService)
        // Calculate comment engagement metrics
        const commentEngagement = engagementScoringService_1.EngagementScoringService.calculateCommentEngagement(post.comments || []);
        const engagementMetrics = {
            likesCount: post.likesCount || 0,
            dislikesCount: post.dislikesCount || 0,
            agreesCount: post.agreesCount || 0,
            disagreesCount: post.disagreesCount || 0,
            commentsCount: post._count.comments || 0,
            sharesCount: post._count.shares || 0,
            viewsCount: 0, // Views not implemented yet
            communityNotesCount: 0, // TODO: Implement community notes
            reportsCount: 0, // TODO: Add reports count if available
            commentEngagement
        };
        const engagementResult = engagementScoringService_1.EngagementScoringService.calculateScore(engagementMetrics, new Date(post.createdAt), post.author?.reputation || 70);
        // Normalize engagement score to 0-1 range for trending score
        const trendingScore = Math.min(1.0, engagementResult.score / 100);
        // 4. Similarity Score (cosine similarity to user's interests)
        let similarityScore = 0.5; // Default neutral score
        if (post.embedding && post.embedding.length > 0 && userProfile.interactionEmbeddings.length > 0) {
            try {
                // Average similarity to user's interaction history
                const similarities = userProfile.interactionEmbeddings.map(userEmbed => this.cosineSimilarity(post.embedding, userEmbed));
                similarityScore = similarities.reduce((a, b) => a + b, 0) / similarities.length;
                similarityScore = Math.max(0, Math.min(1, similarityScore)); // Clamp 0-1
            }
            catch (error) {
                logger_1.logger.warn({ error }, 'Similarity calculation error');
            }
        }
        // 5. Reputation Score (author's reputation affects content quality)
        let reputationScore = 0.7; // Default neutral score (70/100)
        let visibilityMultiplier = 1.0; // Default normal visibility
        try {
            // Use cached reputation from post if available, otherwise fetch
            const authorReputation = post.authorReputation || 70;
            reputationScore = authorReputation / 100; // Normalize to 0-1
            // Apply visibility multiplier based on reputation tiers
            if (authorReputation >= 95) {
                visibilityMultiplier = 1.1; // +10% boost
            }
            else if (authorReputation >= 50) {
                visibilityMultiplier = 1.0; // Normal visibility
            }
            else if (authorReputation >= 30) {
                visibilityMultiplier = 0.9; // -10% suppression
            }
            else {
                visibilityMultiplier = 0.8; // -20% suppression
            }
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Reputation calculation error');
        }
        // Calculate final weighted score
        const baseScore = (recencyScore * weights.recency) +
            (similarityScore * weights.similarity) +
            (socialScore * weights.social) +
            (trendingScore * weights.trending) +
            (reputationScore * weights.reputation);
        // Apply reputation-based visibility multiplier
        const finalScore = baseScore * visibilityMultiplier;
        return {
            postId: post.id,
            recencyScore,
            similarityScore,
            socialScore,
            trendingScore,
            reputationScore,
            visibilityMultiplier,
            finalScore,
            post
        };
    }
    /**
     * Sample posts from probability distribution based on scores
     *
     * Implements weighted random sampling (electron cloud-like distribution):
     * - Higher-scored posts have higher probability of selection
     * - But lower-scored posts still have chance (creates diversity)
     * - Each selected post is removed from pool (no duplicates)
     * - Minimum score floor of 0.1 prevents zero-probability posts
     *
     * Algorithm: Accumulate scores as cumulative distribution, generate random
     * number in [0, totalScore], select first post where accumulator >= random.
     *
     * @param scoredPosts - Array of posts with calculated scores
     * @param limit - Maximum number of posts to sample
     * @returns Array of selected posts (up to limit)
     *
     * @example
     * const selected = this.probabilitySample(scoredPosts, 25);
     * // High-score posts more likely, but low-score posts can still appear
     * console.log(selected.length); // Up to 25
     */
    static probabilitySample(scoredPosts, limit) {
        // Sort by score but don't just take the top - use weighted random sampling
        scoredPosts.sort((a, b) => b.finalScore - a.finalScore);
        const selected = [];
        const remaining = [...scoredPosts];
        for (let i = 0; i < limit && remaining.length > 0; i++) {
            // Create probability weights (higher scores = higher probability)
            const totalScore = remaining.reduce((sum, post) => sum + Math.max(0.1, post.finalScore), 0);
            const random = Math.random() * totalScore;
            let accumulator = 0;
            let selectedIndex = 0;
            for (let j = 0; j < remaining.length; j++) {
                accumulator += Math.max(0.1, remaining[j].finalScore);
                if (random <= accumulator) {
                    selectedIndex = j;
                    break;
                }
            }
            // Add selected post and remove from remaining
            selected.push(remaining[selectedIndex]);
            remaining.splice(selectedIndex, 1);
        }
        return selected;
    }
    /**
     * Calculate cosine similarity between two embedding vectors
     *
     * Measures similarity between content embeddings using cosine similarity formula:
     * similarity = (a · b) / (||a|| * ||b||)
     *
     * Returns 0 if vectors have different lengths or zero magnitude.
     * Returns value in [-1, 1] range where:
     * - 1 = identical content
     * - 0 = unrelated content
     * - -1 = opposite content
     *
     * @param a - First embedding vector
     * @param b - Second embedding vector
     * @returns Cosine similarity score (0 if incompatible vectors)
     *
     * @example
     * const sim = this.cosineSimilarity([0.1, 0.5, 0.3], [0.2, 0.6, 0.4]);
     * console.log(sim); // ~0.99 (very similar)
     */
    static cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Calculate average score for analytics
     *
     * Computes mean value for a specific score field across all posts.
     * Used for feed stats/debugging.
     *
     * @param scoredPosts - Array of scored posts
     * @param field - Score field to average (e.g., 'recencyScore', 'finalScore')
     * @returns Average value (0 if empty array)
     *
     * @example
     * const avgRecency = this.avgScore(scoredPosts, 'recencyScore');
     * console.log(avgRecency); // 0.65
     */
    static avgScore(scoredPosts, field) {
        if (scoredPosts.length === 0)
            return 0;
        return scoredPosts.reduce((sum, post) => sum + post[field], 0) / scoredPosts.length;
    }
}
exports.ProbabilityFeedService = ProbabilityFeedService;
// Default weights - can be overridden per user or via A/B testing
ProbabilityFeedService.defaultWeights = {
    recency: 0.30, // Prefer newer content
    similarity: 0.25, // Match user interests
    social: 0.25, // Posts from connections
    trending: 0.10, // Popular content
    reputation: 0.10 // Author reputation
};
//# sourceMappingURL=probabilityFeedService.js.map