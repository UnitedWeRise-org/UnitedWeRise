/**
 * User Interest Service
 *
 * Constructs user interest vectors from multiple signal sources for
 * personalized feed ranking. Used by SlotRollService for the PERSONALIZED pool.
 *
 * Signal Sources (weighted by relevance):
 * 1. SOCIAL GRAPH
 *    - Subscriptions (2.0x) - Highest priority, explicit strong interest
 *    - Friends (1.5x) - Mutual relationship indicates shared interests
 *    - Follows (1.0x) - One-way interest signal
 *
 * 2. BEHAVIORAL SIGNALS
 *    - Recent likes (last 50) - Strong positive signal
 *    - User's own posts (last 20) - Self-similarity
 *    - Comments/reactions - Engagement patterns
 *    - Agree/disagree patterns - Topic stance inference
 *
 * 3. EXPLICIT PREFERENCES
 *    - User.interests[] - Explicit topic subscriptions
 *    - Onboarding data - Initial preferences
 *    - Geographic scope - Location-based relevance
 *
 * 4. NEGATIVE SIGNALS
 *    - Muted accounts - Exclude from feed
 *    - Blocked accounts - Hard exclude
 *    - Hidden posts - Reduce similar content
 */

import { prisma } from '../lib/prisma';
import { logger } from './logger';

interface SocialGraphRelationship {
    userId: string;
    type: 'subscription' | 'friend' | 'follow';
    weight: number;
}

export interface UserInterestProfile {
    userId: string;
    // Social graph
    relationships: SocialGraphRelationship[];
    subscribedIds: Set<string>;
    friendIds: Set<string>;
    followedIds: Set<string>;
    // Behavioral
    interactionEmbeddings: number[][];
    likedPostEmbeddings: number[][];
    ownPostEmbeddings: number[][];
    // Explicit
    explicitInterests: string[];
    // Geographic
    h3Index: string | null;
    // Negative
    mutedIds: Set<string>;
    blockedIds: Set<string>;
    // Computed
    aggregateVector: number[] | null;
}

// Relationship weight multipliers
const RELATIONSHIP_WEIGHTS = {
    subscription: 2.0,
    friend: 1.5,
    follow: 1.0
};

// Signal weights for vector aggregation
const SIGNAL_WEIGHTS = {
    likedPosts: 0.4,      // Strong positive signal
    ownPosts: 0.2,        // Self-similarity
    socialGraph: 0.3,     // Posts from connections
    explicitInterests: 0.1 // Explicit preferences (lower weight until better implemented)
};

export class UserInterestService {
    /**
     * Build complete interest profile for a user
     * Aggregates all signal sources into a unified profile
     */
    static async buildProfile(userId: string): Promise<UserInterestProfile> {
        const startTime = Date.now();

        try {
            // Parallel fetch all data sources
            const [
                subscriptions,
                friendships,
                follows,
                likedPosts,
                ownPosts,
                user,
                mutes,
                blocks
            ] = await Promise.all([
                // Subscriptions (user subscribes to others)
                prisma.subscription.findMany({
                    where: { subscriberId: userId },
                    select: { subscribedId: true }
                }),
                // Friendships (bidirectional, ACCEPTED only)
                prisma.friendship.findMany({
                    where: {
                        OR: [{ requesterId: userId }, { recipientId: userId }],
                        status: 'ACCEPTED'
                    },
                    select: { requesterId: true, recipientId: true }
                }),
                // Follows (one-way)
                prisma.follow.findMany({
                    where: { followerId: userId },
                    select: { followingId: true }
                }),
                // Liked posts with embeddings
                prisma.like.findMany({
                    where: { userId },
                    include: {
                        post: {
                            select: {
                                embedding: true,
                                authorId: true,
                                tags: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }),
                // User's own posts
                prisma.post.findMany({
                    where: { authorId: userId },
                    select: { embedding: true, tags: true },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }),
                // User profile with interests and location
                prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        interests: true,
                        embedding: true,
                        onboardingData: true,
                        h3Index: true
                    }
                }),
                // Muted users (table may not exist yet - Phase 3)
                this.getMutedUsers(userId),
                // Blocked users (table may not exist yet - Phase 3)
                this.getBlockedUsers(userId)
            ]);

            // Build relationship sets
            const subscribedIds = new Set(subscriptions.map(s => s.subscribedId));
            const friendIds = new Set<string>();
            for (const f of friendships) {
                friendIds.add(f.requesterId === userId ? f.recipientId : f.requesterId);
            }
            const followedIds = new Set(follows.map(f => f.followingId));
            const mutedIds = new Set(mutes.map(m => m.mutedId));
            const blockedIds = new Set(blocks.map(b => b.blockedId));

            // Build relationships array with weights
            const relationships: SocialGraphRelationship[] = [
                ...Array.from(subscribedIds).map(id => ({
                    userId: id,
                    type: 'subscription' as const,
                    weight: RELATIONSHIP_WEIGHTS.subscription
                })),
                ...Array.from(friendIds).map(id => ({
                    userId: id,
                    type: 'friend' as const,
                    weight: RELATIONSHIP_WEIGHTS.friend
                })),
                ...Array.from(followedIds)
                    .filter(id => !subscribedIds.has(id) && !friendIds.has(id))
                    .map(id => ({
                        userId: id,
                        type: 'follow' as const,
                        weight: RELATIONSHIP_WEIGHTS.follow
                    }))
            ];

            // Extract embeddings
            const likedPostEmbeddings = likedPosts
                .map(l => l.post.embedding)
                .filter(e => e && e.length > 0) as number[][];

            const ownPostEmbeddings = ownPosts
                .map(p => p.embedding)
                .filter(e => e && e.length > 0) as number[][];

            // Combine all interaction embeddings
            const interactionEmbeddings = [...likedPostEmbeddings, ...ownPostEmbeddings];

            // Get explicit interests
            const explicitInterests = user?.interests || [];

            // Compute aggregate vector
            const aggregateVector = this.computeAggregateVector(
                likedPostEmbeddings,
                ownPostEmbeddings,
                user?.embedding || []
            );

            const profile: UserInterestProfile = {
                userId,
                relationships,
                subscribedIds,
                friendIds,
                followedIds,
                interactionEmbeddings,
                likedPostEmbeddings,
                ownPostEmbeddings,
                explicitInterests,
                h3Index: user?.h3Index || null,
                mutedIds,
                blockedIds,
                aggregateVector
            };

            logger.debug({
                userId,
                subscriptionCount: subscribedIds.size,
                friendCount: friendIds.size,
                followCount: followedIds.size,
                likedPostCount: likedPostEmbeddings.length,
                ownPostCount: ownPostEmbeddings.length,
                mutedCount: mutedIds.size,
                blockedCount: blockedIds.size,
                hasAggregateVector: !!aggregateVector,
                hasH3Index: !!user?.h3Index,
                buildTimeMs: Date.now() - startTime
            }, 'UserInterestService: Profile built');

            return profile;

        } catch (error) {
            logger.error({ error, userId }, 'UserInterestService: Failed to build profile');
            throw error;
        }
    }

    /**
     * Compute aggregate interest vector from embeddings
     * Uses weighted average of liked posts and own posts
     */
    private static computeAggregateVector(
        likedEmbeddings: number[][],
        ownEmbeddings: number[][],
        userEmbedding: number[]
    ): number[] | null {
        const allEmbeddings: { embedding: number[]; weight: number }[] = [];

        // Add liked post embeddings with weight
        for (const emb of likedEmbeddings) {
            if (emb.length > 0) {
                allEmbeddings.push({ embedding: emb, weight: SIGNAL_WEIGHTS.likedPosts });
            }
        }

        // Add own post embeddings with weight
        for (const emb of ownEmbeddings) {
            if (emb.length > 0) {
                allEmbeddings.push({ embedding: emb, weight: SIGNAL_WEIGHTS.ownPosts });
            }
        }

        // Add user embedding if exists
        if (userEmbedding && userEmbedding.length > 0) {
            allEmbeddings.push({ embedding: userEmbedding, weight: SIGNAL_WEIGHTS.explicitInterests });
        }

        if (allEmbeddings.length === 0) {
            return null;
        }

        // Determine vector dimension from first embedding
        const dimension = allEmbeddings[0].embedding.length;

        // Compute weighted average
        const result = new Array(dimension).fill(0);
        let totalWeight = 0;

        for (const { embedding, weight } of allEmbeddings) {
            if (embedding.length !== dimension) continue;
            for (let i = 0; i < dimension; i++) {
                result[i] += embedding[i] * weight;
            }
            totalWeight += weight;
        }

        if (totalWeight === 0) return null;

        // Normalize
        for (let i = 0; i < dimension; i++) {
            result[i] /= totalWeight;
        }

        return result;
    }

    /**
     * Calculate relevance score for a post given user profile
     * Returns 0-1 score combining all signals
     */
    static calculatePostRelevance(
        post: {
            id: string;
            authorId: string;
            embedding: number[];
            tags?: string[];
        },
        profile: UserInterestProfile
    ): number {
        let score = 0;
        let weightSum = 0;

        // 1. Author relationship score (0-2.0)
        const authorScore = this.getAuthorRelationshipScore(post.authorId, profile);
        score += authorScore * 0.3;
        weightSum += 0.3;

        // 2. Content similarity score (0-1)
        if (profile.aggregateVector && post.embedding?.length > 0) {
            const similarity = this.cosineSimilarity(profile.aggregateVector, post.embedding);
            // Normalize to 0-1 range (cosine similarity is -1 to 1)
            const normalizedSimilarity = (similarity + 1) / 2;
            score += normalizedSimilarity * 0.5;
            weightSum += 0.5;
        }

        // 3. Explicit interest match (0-1)
        if (profile.explicitInterests.length > 0 && post.tags?.length) {
            const interestMatch = this.calculateInterestMatch(
                profile.explicitInterests,
                post.tags
            );
            score += interestMatch * 0.2;
            weightSum += 0.2;
        }

        // Normalize by actual weights used
        return weightSum > 0 ? score / weightSum : 0;
    }

    /**
     * Get author relationship score based on social graph
     */
    static getAuthorRelationshipScore(authorId: string, profile: UserInterestProfile): number {
        if (profile.subscribedIds.has(authorId)) {
            return RELATIONSHIP_WEIGHTS.subscription;
        }
        if (profile.friendIds.has(authorId)) {
            return RELATIONSHIP_WEIGHTS.friend;
        }
        if (profile.followedIds.has(authorId)) {
            return RELATIONSHIP_WEIGHTS.follow;
        }
        return 0.1; // Base score for unknown authors
    }

    /**
     * Check if author should be excluded (muted/blocked)
     */
    static shouldExcludeAuthor(authorId: string, profile: UserInterestProfile): boolean {
        return profile.blockedIds.has(authorId) || profile.mutedIds.has(authorId);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private static cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length || a.length === 0) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    /**
     * Calculate interest match score between user interests and post tags
     */
    private static calculateInterestMatch(interests: string[], tags: string[]): number {
        if (interests.length === 0 || tags.length === 0) return 0;

        const interestSet = new Set(interests.map(i => i.toLowerCase()));
        const tagSet = new Set(tags.map(t => t.toLowerCase()));

        let matches = 0;
        for (const tag of tagSet) {
            if (interestSet.has(tag)) matches++;
        }

        return matches / Math.max(interestSet.size, 1);
    }

    /**
     * Get relationship weight for priority multiplier
     */
    static getRelationshipWeight(authorId: string, profile: UserInterestProfile): number {
        if (profile.subscribedIds.has(authorId)) return RELATIONSHIP_WEIGHTS.subscription;
        if (profile.friendIds.has(authorId)) return RELATIONSHIP_WEIGHTS.friend;
        if (profile.followedIds.has(authorId)) return RELATIONSHIP_WEIGHTS.follow;
        return 0.1;
    }

    /**
     * Calculate geographic proximity boost based on H3 indexes
     * Returns 1.0-1.5 boost for nearby posts, 1.0 for distant/no location
     */
    static calculateGeoBoost(
        postH3Index: string | null,
        profile: UserInterestProfile
    ): number {
        if (!profile.h3Index || !postH3Index) {
            return 1.0; // No boost if either has no location
        }

        // H3 index prefix matching for proximity
        // More shared prefix = closer proximity
        // Resolution 7 H3 index is ~5km, each resolution level is ~7x smaller
        const userIndex = profile.h3Index;
        const postIndex = postH3Index;

        // Find common prefix length (both are hex strings)
        let commonLength = 0;
        const minLength = Math.min(userIndex.length, postIndex.length);
        for (let i = 0; i < minLength; i++) {
            if (userIndex[i] === postIndex[i]) {
                commonLength++;
            } else {
                break;
            }
        }

        // Boost based on proximity:
        // Same cell or very close (8+ chars match): 1.5x
        // Close (6-7 chars match): 1.3x
        // Nearby (4-5 chars match): 1.15x
        // Same region (2-3 chars match): 1.05x
        // Different regions: 1.0x
        if (commonLength >= 8) return 1.5;
        if (commonLength >= 6) return 1.3;
        if (commonLength >= 4) return 1.15;
        if (commonLength >= 2) return 1.05;
        return 1.0;
    }

    /**
     * Get muted user IDs (placeholder until Mute model is added)
     * TODO: Implement when Mute table is created in Phase 3
     */
    private static async getMutedUsers(userId: string): Promise<{ mutedId: string }[]> {
        // Mute model doesn't exist yet - return empty array
        // Will be implemented when schema migration adds Mute table
        return [];
    }

    /**
     * Get blocked user IDs (placeholder until Block model is added)
     * TODO: Implement when Block table is created in Phase 3
     */
    private static async getBlockedUsers(userId: string): Promise<{ blockedId: string }[]> {
        // Block model doesn't exist yet - return empty array
        // Will be implemented when schema migration adds Block table
        return [];
    }
}

export const userInterestService = new UserInterestService();
