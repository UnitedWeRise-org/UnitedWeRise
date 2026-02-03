/**
 * VideoFeedService
 *
 * Probability-cloud sampling algorithm for video snippet feeds.
 * Modeled after ProbabilityFeedService but adapted for video-specific
 * signals: engagement score, view velocity, hashtag matching, and social graph.
 *
 * Feed Types:
 * - for-you: Personalized probability sampling across all dimensions
 * - following: Videos from followed users, weighted by relationship type
 * - trending: Engagement-velocity-ranked videos from last 24 hours
 *
 * @module services/videoFeedService
 */

import { prisma } from '../lib/prisma.js';
import { logger } from './logger';

// ========================================
// Types
// ========================================

interface VideoFeedWeights {
  recency: number;
  engagement: number;
  social: number;
  trending: number;
  hashtagMatch: number;
}

interface ScoredVideo {
  videoId: string;
  recencyScore: number;
  engagementScore: number;
  socialScore: number;
  trendingScore: number;
  hashtagScore: number;
  finalScore: number;
}

export type VideoFeedType = 'for-you' | 'following' | 'trending';

interface VideoFeedOptions {
  userId?: string;
  feedType?: VideoFeedType;
  limit?: number;
  excludeIds?: string[];
  customWeights?: Partial<VideoFeedWeights>;
}

// ========================================
// Constants
// ========================================

const DEFAULT_WEIGHTS: VideoFeedWeights = {
  recency: 0.25,
  engagement: 0.30,
  social: 0.20,
  trending: 0.15,
  hashtagMatch: 0.10
};

/** Time window for candidate videos (days) */
const CANDIDATE_WINDOW_DAYS = 30;

/** Time window for trending calculation (hours) */
const TRENDING_WINDOW_HOURS = 24;

/** Half-life for recency scoring (hours) */
const RECENCY_HALF_LIFE_HOURS = 48;

// ========================================
// VideoFeedService Class
// ========================================

export class VideoFeedService {

  /**
   * Generate a personalized video feed using probability-cloud sampling.
   *
   * @param options - Feed generation options
   * @returns Scored and sampled video IDs with metadata
   */
  static async generateFeed(options: VideoFeedOptions): Promise<{
    videoIds: string[];
    feedType: VideoFeedType;
    algorithm: string;
    candidateCount: number;
  }> {
    const {
      userId,
      feedType = 'for-you',
      limit = 15,
      excludeIds = [],
      customWeights
    } = options;

    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

    switch (feedType) {
      case 'following':
        return this.generateFollowingFeed(userId!, limit, excludeIds);
      case 'trending':
        return this.generateTrendingFeed(limit, excludeIds);
      case 'for-you':
      default:
        return this.generateForYouFeed(userId, limit, excludeIds, weights);
    }
  }

  /**
   * For-You feed: probability-cloud sampling across all dimensions.
   */
  private static async generateForYouFeed(
    userId: string | undefined,
    limit: number,
    excludeIds: string[],
    weights: VideoFeedWeights
  ): Promise<{ videoIds: string[]; feedType: VideoFeedType; algorithm: string; candidateCount: number }> {
    const cutoffDate = new Date(Date.now() - CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // Get candidate videos
    const candidates = await prisma.video.findMany({
      where: {
        videoType: 'REEL',
        publishStatus: 'PUBLISHED',
        isActive: true,
        encodingStatus: 'READY',
        moderationStatus: 'APPROVED',
        deletedAt: null,
        publishedAt: { gte: cutoffDate },
        id: { notIn: excludeIds }
      },
      select: {
        id: true,
        publishedAt: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        engagementScore: true,
        hashtags: true,
        userId: true,
        createdAt: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 200 // Cap candidates for performance
    });

    if (candidates.length === 0) {
      return { videoIds: [], feedType: 'for-you', algorithm: 'probability-cloud', candidateCount: 0 };
    }

    // Get user's social graph for social scoring
    let followedUserIds: Set<string> = new Set();
    let userHashtags: Set<string> = new Set();

    if (userId) {
      const [follows, likedVideos] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true }
        }),
        prisma.videoLike.findMany({
          where: { userId },
          select: { video: { select: { hashtags: true } } },
          take: 50,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      followedUserIds = new Set(follows.map(f => f.followingId));

      // Build user interest profile from liked video hashtags
      for (const like of likedVideos) {
        for (const tag of like.video.hashtags) {
          userHashtags.add(tag);
        }
      }
    }

    // Find max engagement for normalization
    const maxEngagement = Math.max(1, ...candidates.map(v => v.engagementScore));
    const maxViews = Math.max(1, ...candidates.map(v => v.viewCount));

    // Score each candidate
    const scored: ScoredVideo[] = candidates.map(video => {
      // Recency: exponential decay with half-life
      const ageHours = video.publishedAt
        ? (Date.now() - video.publishedAt.getTime()) / (1000 * 60 * 60)
        : 999;
      const recencyScore = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);

      // Engagement: normalized 0-1
      const engagementScore = video.engagementScore / maxEngagement;

      // Social: 1.0 if from followed user, 0 otherwise
      const socialScore = followedUserIds.has(video.userId) ? 1.0 : 0.0;

      // Trending: view velocity (views per hour in last 24h)
      const videoAgeHours = Math.max(1, ageHours);
      const viewVelocity = video.viewCount / videoAgeHours;
      const maxVelocity = maxViews / 24; // Rough normalization
      const trendingScore = Math.min(1, viewVelocity / Math.max(1, maxVelocity));

      // Hashtag match: Jaccard similarity with user interests
      let hashtagScore = 0;
      if (userHashtags.size > 0 && video.hashtags.length > 0) {
        const intersection = video.hashtags.filter(t => userHashtags.has(t)).length;
        const union = new Set([...video.hashtags, ...userHashtags]).size;
        hashtagScore = union > 0 ? intersection / union : 0;
      }

      // Weighted final score
      const finalScore =
        (recencyScore * weights.recency) +
        (engagementScore * weights.engagement) +
        (socialScore * weights.social) +
        (trendingScore * weights.trending) +
        (hashtagScore * weights.hashtagMatch);

      return {
        videoId: video.id,
        recencyScore,
        engagementScore,
        socialScore,
        trendingScore,
        hashtagScore,
        finalScore
      };
    });

    // Weighted random sampling (probability-cloud)
    const selected = this.weightedSample(scored, limit);

    logger.info({
      feedType: 'for-you',
      candidateCount: candidates.length,
      selectedCount: selected.length,
      userId
    }, 'Video feed generated');

    return {
      videoIds: selected.map(s => s.videoId),
      feedType: 'for-you',
      algorithm: 'probability-cloud',
      candidateCount: candidates.length
    };
  }

  /**
   * Following feed: videos from followed users, weighted by relationship type.
   */
  private static async generateFollowingFeed(
    userId: string,
    limit: number,
    excludeIds: string[]
  ): Promise<{ videoIds: string[]; feedType: VideoFeedType; algorithm: string; candidateCount: number }> {
    // Get followed user IDs with relationship type
    const [follows, subscriptions, friendships] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      }),
      prisma.subscription.findMany({
        where: { subscriberId: userId },
        select: { subscribedId: true }
      }),
      prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, status: 'ACCEPTED' },
            { recipientId: userId, status: 'ACCEPTED' }
          ]
        },
        select: { requesterId: true, recipientId: true }
      })
    ]);

    // Build relationship map with priority multipliers
    const relationshipMap = new Map<string, number>();

    for (const f of follows) {
      relationshipMap.set(f.followingId, Math.max(relationshipMap.get(f.followingId) || 0, 1.0));
    }
    for (const s of subscriptions) {
      relationshipMap.set(s.subscribedId, Math.max(relationshipMap.get(s.subscribedId) || 0, 2.0));
    }
    for (const f of friendships) {
      const friendId = f.requesterId === userId ? f.recipientId : f.requesterId;
      relationshipMap.set(friendId, Math.max(relationshipMap.get(friendId) || 0, 1.5));
    }

    const followedIds = Array.from(relationshipMap.keys());

    if (followedIds.length === 0) {
      return { videoIds: [], feedType: 'following', algorithm: 'social-recency', candidateCount: 0 };
    }

    const videos = await prisma.video.findMany({
      where: {
        videoType: 'REEL',
        publishStatus: 'PUBLISHED',
        isActive: true,
        encodingStatus: 'READY',
        moderationStatus: 'APPROVED',
        deletedAt: null,
        userId: { in: followedIds },
        id: { notIn: excludeIds }
      },
      select: {
        id: true,
        publishedAt: true,
        userId: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 100
    });

    // Score by recency * relationship multiplier
    const scored = videos.map(video => {
      const ageHours = video.publishedAt
        ? (Date.now() - video.publishedAt.getTime()) / (1000 * 60 * 60)
        : 999;
      const recencyScore = Math.pow(0.5, ageHours / 24);
      const multiplier = relationshipMap.get(video.userId) || 1.0;

      return {
        videoId: video.id,
        recencyScore,
        engagementScore: 0,
        socialScore: multiplier,
        trendingScore: 0,
        hashtagScore: 0,
        finalScore: recencyScore * multiplier
      };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.finalScore - a.finalScore);
    const selected = scored.slice(0, limit);

    return {
      videoIds: selected.map(s => s.videoId),
      feedType: 'following',
      algorithm: 'social-recency',
      candidateCount: videos.length
    };
  }

  /**
   * Trending feed: engagement-velocity-ranked videos from last 24 hours.
   */
  private static async generateTrendingFeed(
    limit: number,
    excludeIds: string[]
  ): Promise<{ videoIds: string[]; feedType: VideoFeedType; algorithm: string; candidateCount: number }> {
    const cutoffDate = new Date(Date.now() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);

    const videos = await prisma.video.findMany({
      where: {
        videoType: 'REEL',
        publishStatus: 'PUBLISHED',
        isActive: true,
        encodingStatus: 'READY',
        moderationStatus: 'APPROVED',
        deletedAt: null,
        publishedAt: { gte: cutoffDate },
        id: { notIn: excludeIds }
      },
      select: {
        id: true,
        engagementScore: true,
        viewCount: true,
        publishedAt: true
      },
      orderBy: { engagementScore: 'desc' },
      take: limit
    });

    return {
      videoIds: videos.map(v => v.id),
      feedType: 'trending',
      algorithm: 'engagement-velocity',
      candidateCount: videos.length
    };
  }

  /**
   * Weighted random sampling from scored candidates.
   * Higher scores have proportionally higher probability of being selected.
   *
   * @param scored - Scored video candidates
   * @param count - Number to select
   * @returns Selected videos in sampled order
   */
  private static weightedSample(scored: ScoredVideo[], count: number): ScoredVideo[] {
    if (scored.length <= count) return scored;

    const selected: ScoredVideo[] = [];
    const remaining = [...scored];

    for (let i = 0; i < count && remaining.length > 0; i++) {
      // Calculate total weight of remaining candidates
      const totalWeight = remaining.reduce((sum, v) => sum + Math.max(0.01, v.finalScore), 0);

      // Random selection weighted by score
      let random = Math.random() * totalWeight;
      let selectedIndex = 0;

      for (let j = 0; j < remaining.length; j++) {
        random -= Math.max(0.01, remaining[j].finalScore);
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }

      selected.push(remaining[selectedIndex]);
      remaining.splice(selectedIndex, 1);
    }

    return selected;
  }
}
