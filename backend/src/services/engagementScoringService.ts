/**
 * Modular Engagement Scoring Service
 * Configurable algorithm for calculating post engagement scores
 * Designed for easy adjustment and A/B testing of different approaches
 */

export interface EngagementWeights {
  likes: number;
  dislikes: number;
  agrees: number;
  disagrees: number;
  comments: number;
  shares: number;
  views: number;
  communityNotes: number;
  reportsWeight: number; // Negative weight for reported content
  commentEngagement: number; // Weight for comment engagement metrics
  enhancedShares: number; // Weight for enhanced share metrics (quote shares, quality, etc.)
}

export interface EngagementMetrics {
  likesCount: number;
  dislikesCount: number;
  agreesCount: number;
  disagreesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  communityNotesCount: number;
  reportsCount: number;
  // Comment engagement metrics
  commentEngagement?: {
    totalCommentReactions: number;
    avgReactionsPerComment: number;
    commentQualityScore: number; // Based on reaction distribution
  };
  // Enhanced share metrics
  shareMetrics?: {
    simpleSharesCount: number;
    quoteSharesCount: number;
    avgQuoteLength: number;
    recentSharesBoost: number; // Boost factor for recent shares
    shareQualityScore: number; // Based on quote content quality
  };
}

export interface EngagementConfig {
  algorithm: 'standard' | 'controversy' | 'quality' | 'balanced' | 'custom';
  weights: EngagementWeights;
  modifiers: {
    timeDecayEnabled: boolean;
    timeDecayFactor: number; // How much engagement decays per hour
    controversyBoost: boolean;
    controversyThreshold: number; // Ratio for controversy detection
    qualityBias: boolean;
    newContentBoost: boolean; // Boost content less than 24h old
    authorReputationWeight: number; // 0-1 multiplier based on author reputation
  };
  adjustments: {
    minScore: number; // Minimum possible score
    maxScore: number; // Maximum possible score
    scaleToRange: boolean; // Whether to scale all scores to 0-100 range
  };
}

export class EngagementScoringService {
  private static config: EngagementConfig = {
    algorithm: 'balanced',
    weights: {
      likes: 1.0,
      dislikes: 0.8, // Still counts as engagement
      agrees: 1.2,   // Shows resonance
      disagrees: 1.5, // Sparks discussion
      comments: 2.0,
      shares: 3.0,
      views: 0.1,
      communityNotes: 2.5,
      reportsWeight: -0.5, // Negative impact
      commentEngagement: 1.5, // Comment reactions show deep engagement
      enhancedShares: 2.5 // Enhanced share metrics (quote shares, quality)
    },
    modifiers: {
      timeDecayEnabled: true,
      timeDecayFactor: 0.95, // 5% decay per hour
      controversyBoost: true,
      controversyThreshold: 1.5, // More disagrees than agrees
      qualityBias: true,
      newContentBoost: true,
      authorReputationWeight: 0.3
    },
    adjustments: {
      minScore: 0,
      maxScore: 1000,
      scaleToRange: false
    }
  };

  /**
   * Update scoring configuration
   */
  static updateConfig(newConfig: Partial<EngagementConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Deep merge weights and modifiers
    if (newConfig.weights) {
      this.config.weights = { ...this.config.weights, ...newConfig.weights };
    }
    if (newConfig.modifiers) {
      this.config.modifiers = { ...this.config.modifiers, ...newConfig.modifiers };
    }
    if (newConfig.adjustments) {
      this.config.adjustments = { ...this.config.adjustments, ...newConfig.adjustments };
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): EngagementConfig {
    return JSON.parse(JSON.stringify(this.config)); // Deep copy
  }

  /**
   * Apply algorithm preset
   */
  static applyPreset(algorithm: EngagementConfig['algorithm']) {
    const presets: Record<EngagementConfig['algorithm'], Partial<EngagementConfig>> = {
      standard: {
        algorithm: 'standard',
        weights: {
          likes: 1.0,
          dislikes: 0.0, // Ignore dislikes in standard
          agrees: 1.0,
          disagrees: 0.0, // Ignore disagrees in standard
          comments: 2.0,
          shares: 3.0,
          views: 0.1,
          communityNotes: 1.0,
          reportsWeight: -1.0,
          commentEngagement: 1.0,
          enhancedShares: 2.0
        },
        modifiers: {
          timeDecayEnabled: true,
          timeDecayFactor: 0.95,
          controversyBoost: false,
          controversyThreshold: 1.5,
          qualityBias: true,
          newContentBoost: true,
          authorReputationWeight: 0.2
        }
      },
      controversy: {
        algorithm: 'controversy',
        weights: {
          likes: 0.5,
          dislikes: 1.0, // Boost negative engagement
          agrees: 0.5,
          disagrees: 2.0, // High weight for controversy
          comments: 1.5,
          shares: 2.0,
          views: 0.1,
          communityNotes: 3.0, // Community notes indicate importance
          reportsWeight: 0.0, // Don't penalize controversial content
          commentEngagement: 2.0, // High weight for controversial discussions
          enhancedShares: 1.5 // Moderate weight for controversial content sharing
        },
        modifiers: {
          timeDecayEnabled: true,
          timeDecayFactor: 0.98,
          controversyBoost: true,
          controversyThreshold: 1.2,
          qualityBias: false,
          newContentBoost: false,
          authorReputationWeight: 0.1
        }
      },
      quality: {
        algorithm: 'quality',
        weights: {
          likes: 1.5,
          dislikes: -0.5, // Penalize dislikes for quality
          agrees: 2.0,
          disagrees: 0.5,
          comments: 2.5, // High value on thoughtful discussion
          shares: 4.0,   // Sharing indicates quality
          views: 0.05,
          communityNotes: 1.0,
          reportsWeight: -2.0, // Heavy penalty for reported content
          commentEngagement: 3.0, // Very high weight for quality discussions
          enhancedShares: 4.5 // Very high weight for quality content sharing
        },
        modifiers: {
          timeDecayEnabled: true,
          timeDecayFactor: 0.92,
          controversyBoost: false,
          controversyThreshold: 1.5,
          qualityBias: true,
          newContentBoost: true,
          authorReputationWeight: 0.5 // Strong reputation influence
        }
      },
      balanced: {
        algorithm: 'balanced',
        weights: {
          likes: 1.0,
          dislikes: 0.8,
          agrees: 1.2,
          disagrees: 1.5,
          comments: 2.0,
          shares: 3.0,
          views: 0.1,
          communityNotes: 2.5,
          reportsWeight: -0.5,
          commentEngagement: 1.5,
          enhancedShares: 2.5
        },
        modifiers: {
          timeDecayEnabled: true,
          timeDecayFactor: 0.95,
          controversyBoost: true,
          controversyThreshold: 1.5,
          qualityBias: true,
          newContentBoost: true,
          authorReputationWeight: 0.3
        }
      },
      custom: {
        // Custom preserves existing weights
        algorithm: 'custom'
      }
    };

    const preset = presets[algorithm];
    if (preset) {
      this.updateConfig(preset);
    }
  }

  /**
   * Calculate engagement score for a post
   */
  static calculateScore(
    metrics: EngagementMetrics,
    postCreatedAt: Date,
    authorReputation: number = 70
  ): { score: number; breakdown: any; algorithm: string } {
    const weights = this.config.weights;
    const modifiers = this.config.modifiers;

    // Base engagement calculation
    let baseScore =
      (metrics.likesCount * weights.likes) +
      (metrics.dislikesCount * weights.dislikes) +
      (metrics.agreesCount * weights.agrees) +
      (metrics.disagreesCount * weights.disagrees) +
      (metrics.commentsCount * weights.comments) +
      (metrics.sharesCount * weights.shares) +
      (metrics.viewsCount * weights.views) +
      (metrics.communityNotesCount * weights.communityNotes) +
      (metrics.reportsCount * weights.reportsWeight);

    // Add comment engagement score
    if (metrics.commentEngagement) {
      const commentEngagementScore =
        (metrics.commentEngagement.totalCommentReactions * 0.5) +
        (metrics.commentEngagement.avgReactionsPerComment * 2.0) +
        (metrics.commentEngagement.commentQualityScore * 3.0);
      baseScore += commentEngagementScore * weights.commentEngagement;
    }

    // Add enhanced share metrics score
    if (metrics.shareMetrics) {
      const enhancedShareScore =
        (metrics.shareMetrics.simpleSharesCount * 1.0) +
        (metrics.shareMetrics.quoteSharesCount * 2.5) + // Quote shares worth more
        (metrics.shareMetrics.avgQuoteLength * 0.1) + // Longer quotes indicate thoughtfulness
        (metrics.shareMetrics.recentSharesBoost * 2.0) +
        (metrics.shareMetrics.shareQualityScore * 3.0);
      baseScore += enhancedShareScore * weights.enhancedShares;
    }

    // Create breakdown for debugging/transparency
    const breakdown: any = {
      baseComponents: {
        likes: metrics.likesCount * weights.likes,
        dislikes: metrics.dislikesCount * weights.dislikes,
        agrees: metrics.agreesCount * weights.agrees,
        disagrees: metrics.disagreesCount * weights.disagrees,
        comments: metrics.commentsCount * weights.comments,
        shares: metrics.sharesCount * weights.shares,
        views: metrics.viewsCount * weights.views,
        communityNotes: metrics.communityNotesCount * weights.communityNotes,
        reports: metrics.reportsCount * weights.reportsWeight,
        commentEngagement: metrics.commentEngagement ?
          ((metrics.commentEngagement.totalCommentReactions * 0.5) +
           (metrics.commentEngagement.avgReactionsPerComment * 2.0) +
           (metrics.commentEngagement.commentQualityScore * 3.0)) * weights.commentEngagement : 0,
        enhancedShares: metrics.shareMetrics ?
          ((metrics.shareMetrics.simpleSharesCount * 1.0) +
           (metrics.shareMetrics.quoteSharesCount * 2.5) +
           (metrics.shareMetrics.avgQuoteLength * 0.1) +
           (metrics.shareMetrics.recentSharesBoost * 2.0) +
           (metrics.shareMetrics.shareQualityScore * 3.0)) * weights.enhancedShares : 0
      },
      baseScore,
      modifiers: {},
      finalScore: baseScore
    };

    // Apply time decay
    if (modifiers.timeDecayEnabled) {
      const hoursAge = (Date.now() - postCreatedAt.getTime()) / (1000 * 60 * 60);
      const decayMultiplier = Math.pow(modifiers.timeDecayFactor, hoursAge);
      baseScore *= decayMultiplier;
      breakdown.modifiers.timeDecay = {
        hoursAge,
        decayMultiplier,
        adjustedScore: baseScore
      };
    }

    // Apply controversy boost
    if (modifiers.controversyBoost && this.isControversial(metrics, modifiers.controversyThreshold)) {
      const controversyMultiplier = 1.3;
      baseScore *= controversyMultiplier;
      breakdown.modifiers.controversyBoost = {
        applied: true,
        multiplier: controversyMultiplier,
        adjustedScore: baseScore
      };
    }

    // Apply quality bias
    if (modifiers.qualityBias) {
      const qualityRatio = this.calculateQualityRatio(metrics);
      const qualityMultiplier = 0.8 + (qualityRatio * 0.4); // Range: 0.8 - 1.2
      baseScore *= qualityMultiplier;
      breakdown.modifiers.qualityBias = {
        qualityRatio,
        qualityMultiplier,
        adjustedScore: baseScore
      };
    }

    // Apply new content boost
    if (modifiers.newContentBoost) {
      const hoursAge = (Date.now() - postCreatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursAge < 24) {
        const newContentMultiplier = 1.2;
        baseScore *= newContentMultiplier;
        breakdown.modifiers.newContentBoost = {
          applied: true,
          hoursAge,
          multiplier: newContentMultiplier,
          adjustedScore: baseScore
        };
      }
    }

    // Apply author reputation weight
    if (modifiers.authorReputationWeight > 0) {
      // Normalize reputation to 0-1 range (assuming 0-100 scale)
      const normalizedReputation = Math.max(0, Math.min(100, authorReputation)) / 100;
      const reputationMultiplier = 1 + (normalizedReputation - 0.5) * modifiers.authorReputationWeight;
      baseScore *= reputationMultiplier;
      breakdown.modifiers.authorReputation = {
        authorReputation,
        normalizedReputation,
        reputationMultiplier,
        adjustedScore: baseScore
      };
    }

    // Apply score adjustments
    let finalScore = baseScore;
    if (this.config.adjustments.scaleToRange) {
      // Scale to 0-100 range or custom range
      const { minScore, maxScore } = this.config.adjustments;
      finalScore = Math.max(minScore, Math.min(maxScore, finalScore));
    } else {
      // Just enforce min/max bounds
      finalScore = Math.max(
        this.config.adjustments.minScore,
        Math.min(this.config.adjustments.maxScore, finalScore)
      );
    }

    breakdown.finalScore = finalScore;

    return {
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      breakdown,
      algorithm: this.config.algorithm
    };
  }

  /**
   * Determine if a post is controversial
   */
  private static isControversial(metrics: EngagementMetrics, threshold: number): boolean {
    const totalAgreement = metrics.likesCount + metrics.agreesCount;
    const totalDisagreement = metrics.dislikesCount + metrics.disagreesCount;

    if (totalAgreement === 0 && totalDisagreement === 0) return false;

    // Check both directions for controversy
    const disagreementRatio = totalDisagreement / Math.max(1, totalAgreement);
    const agreementRatio = totalAgreement / Math.max(1, totalDisagreement);

    return disagreementRatio >= threshold || agreementRatio >= threshold;
  }

  /**
   * Calculate quality ratio based on positive vs negative engagement
   */
  private static calculateQualityRatio(metrics: EngagementMetrics): number {
    const positiveEngagement =
      metrics.likesCount +
      metrics.agreesCount +
      (metrics.commentsCount * 0.5) +
      (metrics.sharesCount * 2);

    const negativeEngagement =
      metrics.dislikesCount +
      metrics.disagreesCount +
      (metrics.reportsCount * 3);

    const totalEngagement = positiveEngagement + negativeEngagement;

    if (totalEngagement === 0) return 0.5; // Neutral

    return positiveEngagement / totalEngagement;
  }

  /**
   * Batch calculate scores for multiple posts
   */
  static batchCalculateScores(
    posts: Array<{
      metrics: EngagementMetrics;
      createdAt: Date;
      authorReputation?: number;
    }>
  ): Array<{ score: number; breakdown: any; algorithm: string }> {
    return posts.map(post =>
      this.calculateScore(
        post.metrics,
        post.createdAt,
        post.authorReputation || 70
      )
    );
  }

  /**
   * Calculate comment engagement metrics for a post
   */
  static calculateCommentEngagement(comments: Array<{
    likesCount: number;
    dislikesCount: number;
    agreesCount: number;
    disagreesCount: number;
  }>): EngagementMetrics['commentEngagement'] {
    if (comments.length === 0) {
      return {
        totalCommentReactions: 0,
        avgReactionsPerComment: 0,
        commentQualityScore: 0
      };
    }

    // Calculate total reactions across all comments
    const totalCommentReactions = comments.reduce((total, comment) => {
      return total + comment.likesCount + comment.dislikesCount + comment.agreesCount + comment.disagreesCount;
    }, 0);

    // Calculate average reactions per comment
    const avgReactionsPerComment = totalCommentReactions / comments.length;

    // Calculate comment quality score based on positive vs negative reactions
    const positiveReactions = comments.reduce((total, comment) => {
      return total + comment.likesCount + comment.agreesCount;
    }, 0);

    const negativeReactions = comments.reduce((total, comment) => {
      return total + comment.dislikesCount + comment.disagreesCount;
    }, 0);

    // Quality score: 0.5 is neutral, >0.5 is positive, <0.5 is negative
    const commentQualityScore = totalCommentReactions > 0 ?
      (positiveReactions / totalCommentReactions) : 0.5;

    return {
      totalCommentReactions,
      avgReactionsPerComment,
      commentQualityScore
    };
  }

  /**
   * Calculate enhanced share metrics for a post
   */
  static calculateShareMetrics(shares: Array<{
    shareType: 'SIMPLE' | 'QUOTE';
    content?: string | null;
    createdAt: Date;
  }>, postCreatedAt: Date): EngagementMetrics['shareMetrics'] {
    if (shares.length === 0) {
      return {
        simpleSharesCount: 0,
        quoteSharesCount: 0,
        avgQuoteLength: 0,
        recentSharesBoost: 0,
        shareQualityScore: 0
      };
    }

    // Count share types
    const simpleShares = shares.filter(s => s.shareType === 'SIMPLE');
    const quoteShares = shares.filter(s => s.shareType === 'QUOTE');

    const simpleSharesCount = simpleShares.length;
    const quoteSharesCount = quoteShares.length;

    // Calculate average quote length
    const quoteLengths = quoteShares
      .map(s => s.content?.length || 0)
      .filter(length => length > 0);
    const avgQuoteLength = quoteLengths.length > 0 ?
      quoteLengths.reduce((sum, length) => sum + length, 0) / quoteLengths.length : 0;

    // Calculate recent shares boost (shares in last 24 hours get extra weight)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentShares = shares.filter(s => new Date(s.createdAt) > oneDayAgo);
    const recentSharesBoost = recentShares.length;

    // Calculate share quality score based on quote vs simple ratio and quote length
    let shareQualityScore = 0.5; // Base neutral score

    if (shares.length > 0) {
      // Higher ratio of quote shares = higher quality
      const quoteRatio = quoteSharesCount / shares.length;

      // Meaningful quote length indicates higher quality
      const qualityQuotes = quoteLengths.filter(length => length >= 50).length;
      const qualityQuoteRatio = quoteLengths.length > 0 ? qualityQuotes / quoteLengths.length : 0;

      // Combine metrics for overall quality score
      shareQualityScore = (quoteRatio * 0.6) + (qualityQuoteRatio * 0.4);
    }

    return {
      simpleSharesCount,
      quoteSharesCount,
      avgQuoteLength,
      recentSharesBoost,
      shareQualityScore
    };
  }

  /**
   * Calculate engagement score for individual comments
   */
  static calculateCommentScore(comment: {
    likesCount: number;
    dislikesCount: number;
    agreesCount: number;
    disagreesCount: number;
    replyCount: number;
    createdAt: Date;
    content: string;
  }, authorReputation: number = 70): { score: number; breakdown: any } {

    // Comment-specific weights (different from post weights)
    const commentWeights = {
      likes: 1.0,
      dislikes: 0.6, // Less penalty for comment dislikes
      agrees: 1.5,   // High value for agreement
      disagrees: 1.2, // Some value for sparking discussion
      replies: 3.0,  // Replies are very valuable for comments
      length: 0.1,   // Longer comments may be more thoughtful
      recency: 2.0   // Recent comments get boost
    };

    // Calculate base engagement
    const reactionScore =
      (comment.likesCount * commentWeights.likes) +
      (comment.dislikesCount * commentWeights.dislikes) +
      (comment.agreesCount * commentWeights.agrees) +
      (comment.disagreesCount * commentWeights.disagrees);

    const replyScore = comment.replyCount * commentWeights.replies;

    // Content quality based on length (reasonable length indicates thoughtfulness)
    const contentLength = comment.content.length;
    const lengthScore = Math.min(contentLength, 500) * commentWeights.length; // Cap at 500 chars

    // Recency bonus (comments less than 1 hour old get boost)
    const hoursAge = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60 * 60);
    const recencyMultiplier = hoursAge < 1 ? 1.5 :
                             hoursAge < 6 ? 1.2 :
                             hoursAge < 24 ? 1.0 : 0.8;

    // Base score calculation
    let baseScore = (reactionScore + replyScore + lengthScore) * recencyMultiplier;

    // Quality multiplier based on positive vs negative reactions
    const totalReactions = comment.likesCount + comment.dislikesCount + comment.agreesCount + comment.disagreesCount;
    const positiveReactions = comment.likesCount + comment.agreesCount;

    let qualityMultiplier = 1.0;
    if (totalReactions > 0) {
      const positiveRatio = positiveReactions / totalReactions;
      qualityMultiplier = 0.7 + (positiveRatio * 0.6); // Range: 0.7 - 1.3
    }

    baseScore *= qualityMultiplier;

    // Author reputation factor (less impact than for posts)
    const normalizedReputation = Math.max(0, Math.min(100, authorReputation)) / 100;
    const reputationMultiplier = 1 + (normalizedReputation - 0.5) * 0.2; // ±10% max impact
    baseScore *= reputationMultiplier;

    // Controversy detection for comments
    const isControversial = totalReactions >= 5 &&
                           Math.abs(positiveReactions - (totalReactions - positiveReactions)) / totalReactions < 0.3;
    if (isControversial) {
      baseScore *= 1.2; // Small boost for controversial but engaging comments
    }

    const finalScore = Math.max(0, baseScore);

    const breakdown = {
      components: {
        reactions: reactionScore,
        replies: replyScore,
        length: lengthScore,
        recency: recencyMultiplier,
        quality: qualityMultiplier,
        reputation: reputationMultiplier,
        controversial: isControversial
      },
      metrics: {
        totalReactions,
        positiveRatio: totalReactions > 0 ? positiveReactions / totalReactions : 0,
        hoursAge: Math.round(hoursAge * 10) / 10,
        contentLength
      },
      finalScore: Math.round(finalScore * 100) / 100
    };

    return {
      score: Math.round(finalScore * 100) / 100,
      breakdown
    };
  }

  /**
   * Find trending comments for a post
   */
  static findTrendingComments(
    comments: Array<{
      id: string;
      likesCount: number;
      dislikesCount: number;
      agreesCount: number;
      disagreesCount: number;
      replyCount?: number;
      createdAt: Date;
      content: string;
      author?: { reputation?: number };
    }>,
    options: {
      limit?: number;
      minScore?: number;
      timeWindow?: number; // Hours to consider for trending
    } = {}
  ) {
    const { limit = 5, minScore = 1.0, timeWindow = 24 } = options;

    // Filter comments within time window
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
    const recentComments = comments.filter(c => new Date(c.createdAt) >= cutoffTime);

    // Calculate scores for all recent comments
    const scoredComments = recentComments.map(comment => ({
      ...comment,
      engagementData: this.calculateCommentScore(
        {
          likesCount: comment.likesCount,
          dislikesCount: comment.dislikesCount,
          agreesCount: comment.agreesCount,
          disagreesCount: comment.disagreesCount,
          replyCount: comment.replyCount || 0,
          createdAt: comment.createdAt,
          content: comment.content
        },
        comment.author?.reputation || 70
      )
    }));

    // Filter by minimum score and sort by engagement score
    const trendingComments = scoredComments
      .filter(c => c.engagementData.score >= minScore)
      .sort((a, b) => b.engagementData.score - a.engagementData.score)
      .slice(0, limit);

    return {
      trendingComments,
      stats: {
        totalComments: comments.length,
        recentComments: recentComments.length,
        qualifyingComments: trendingComments.length,
        averageScore: trendingComments.length > 0 ?
          trendingComments.reduce((sum, c) => sum + c.engagementData.score, 0) / trendingComments.length : 0,
        timeWindow
      }
    };
  }

  /**
   * Get algorithm performance metrics
   */
  static getAlgorithmMetrics(
    posts: Array<{
      metrics: EngagementMetrics;
      createdAt: Date;
      authorReputation?: number;
    }>
  ) {
    const scores = this.batchCalculateScores(posts);

    const scoreValues = scores.map(s => s.score);
    const avg = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
    const min = Math.min(...scoreValues);
    const max = Math.max(...scoreValues);

    // Calculate standard deviation
    const variance = scoreValues.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scoreValues.length;
    const stdDev = Math.sqrt(variance);

    return {
      algorithm: this.config.algorithm,
      totalPosts: posts.length,
      scoreDistribution: {
        min,
        max,
        average: Math.round(avg * 100) / 100,
        standardDeviation: Math.round(stdDev * 100) / 100
      },
      config: this.getConfig()
    };
  }
}

export default EngagementScoringService;