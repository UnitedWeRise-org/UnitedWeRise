"use strict";
/**
 * Probability-based Feed Algorithm
 * Created: August 10, 2025
 * Purpose: Implement electron-cloud-like probability sampling for social media feed
 * Author: Claude Code Assistant
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProbabilityFeedService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProbabilityFeedService {
    /**
     * Generate personalized feed using probability cloud sampling
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
            console.error('ProbabilityFeedService error:', error);
            throw error;
        }
    }
    /**
     * Get user profile with interaction patterns for similarity scoring
     */
    static async getUserProfile(userId) {
        const [user, followedUsers, likedPosts, userPosts] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    embedding: true,
                    interests: true // if we add this field later
                }
            }),
            prisma.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true }
            }),
            prisma.like.findMany({
                where: { userId },
                include: { post: { select: { embedding: true, authorId: true } } },
                orderBy: { createdAt: 'desc' },
                take: 50 // Recent likes for interest profiling
            }),
            prisma.post.findMany({
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
     */
    static async getCandidatePosts(userId) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return prisma.post.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                authorId: { not: userId } // Don't include user's own posts
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        verified: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 500 // Large pool to sample from
        });
    }
    /**
     * Score a single post across all dimensions
     */
    static async scorePost(post, userProfile, weights) {
        const now = Date.now();
        const postTime = new Date(post.createdAt).getTime();
        // 1. Recency Score (exponential decay)
        const hoursSincePost = (now - postTime) / (1000 * 60 * 60);
        const recencyScore = Math.exp(-hoursSincePost / 24); // Half-life of 24 hours
        // 2. Social Score (posts from followed users get boost)
        const socialScore = userProfile.followedUserIds.has(post.authorId) ? 1.0 : 0.1;
        // 3. Trending Score (based on engagement velocity)
        const likesCount = post._count.likes;
        const commentsCount = post._count.comments;
        const engagementScore = likesCount + (commentsCount * 2); // Comments worth more
        const hoursAge = Math.max(1, hoursSincePost);
        const trendingScore = Math.min(1.0, engagementScore / hoursAge); // Engagement per hour, capped at 1
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
                console.warn('Similarity calculation error:', error);
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
            console.warn('Reputation calculation error:', error);
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
     * Calculate cosine similarity between two vectors
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