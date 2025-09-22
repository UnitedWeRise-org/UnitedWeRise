"use strict";
/**
 * Modular Engagement Scoring Service
 * Configurable algorithm for calculating post engagement scores
 * Designed for easy adjustment and A/B testing of different approaches
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementScoringService = void 0;
class EngagementScoringService {
    /**
     * Update scoring configuration
     */
    static updateConfig(newConfig) {
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
    static getConfig() {
        return JSON.parse(JSON.stringify(this.config)); // Deep copy
    }
    /**
     * Apply algorithm preset
     */
    static applyPreset(algorithm) {
        const presets = {
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
                    reportsWeight: -1.0
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
                    reportsWeight: 0.0 // Don't penalize controversial content
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
                    shares: 4.0, // Sharing indicates quality
                    views: 0.05,
                    communityNotes: 1.0,
                    reportsWeight: -2.0 // Heavy penalty for reported content
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
                    reportsWeight: -0.5
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
    static calculateScore(metrics, postCreatedAt, authorReputation = 70) {
        const weights = this.config.weights;
        const modifiers = this.config.modifiers;
        // Base engagement calculation
        let baseScore = (metrics.likesCount * weights.likes) +
            (metrics.dislikesCount * weights.dislikes) +
            (metrics.agreesCount * weights.agrees) +
            (metrics.disagreesCount * weights.disagrees) +
            (metrics.commentsCount * weights.comments) +
            (metrics.sharesCount * weights.shares) +
            (metrics.viewsCount * weights.views) +
            (metrics.communityNotesCount * weights.communityNotes) +
            (metrics.reportsCount * weights.reportsWeight);
        // Create breakdown for debugging/transparency
        const breakdown = {
            baseComponents: {
                likes: metrics.likesCount * weights.likes,
                dislikes: metrics.dislikesCount * weights.dislikes,
                agrees: metrics.agreesCount * weights.agrees,
                disagrees: metrics.disagreesCount * weights.disagrees,
                comments: metrics.commentsCount * weights.comments,
                shares: metrics.sharesCount * weights.shares,
                views: metrics.viewsCount * weights.views,
                communityNotes: metrics.communityNotesCount * weights.communityNotes,
                reports: metrics.reportsCount * weights.reportsWeight
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
        }
        else {
            // Just enforce min/max bounds
            finalScore = Math.max(this.config.adjustments.minScore, Math.min(this.config.adjustments.maxScore, finalScore));
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
    static isControversial(metrics, threshold) {
        const totalAgreement = metrics.likesCount + metrics.agreesCount;
        const totalDisagreement = metrics.dislikesCount + metrics.disagreesCount;
        if (totalAgreement === 0 && totalDisagreement === 0)
            return false;
        // Check both directions for controversy
        const disagreementRatio = totalDisagreement / Math.max(1, totalAgreement);
        const agreementRatio = totalAgreement / Math.max(1, totalDisagreement);
        return disagreementRatio >= threshold || agreementRatio >= threshold;
    }
    /**
     * Calculate quality ratio based on positive vs negative engagement
     */
    static calculateQualityRatio(metrics) {
        const positiveEngagement = metrics.likesCount +
            metrics.agreesCount +
            (metrics.commentsCount * 0.5) +
            (metrics.sharesCount * 2);
        const negativeEngagement = metrics.dislikesCount +
            metrics.disagreesCount +
            (metrics.reportsCount * 3);
        const totalEngagement = positiveEngagement + negativeEngagement;
        if (totalEngagement === 0)
            return 0.5; // Neutral
        return positiveEngagement / totalEngagement;
    }
    /**
     * Batch calculate scores for multiple posts
     */
    static batchCalculateScores(posts) {
        return posts.map(post => this.calculateScore(post.metrics, post.createdAt, post.authorReputation || 70));
    }
    /**
     * Get algorithm performance metrics
     */
    static getAlgorithmMetrics(posts) {
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
exports.EngagementScoringService = EngagementScoringService;
EngagementScoringService.config = {
    algorithm: 'balanced',
    weights: {
        likes: 1.0,
        dislikes: 0.8, // Still counts as engagement
        agrees: 1.2, // Shows resonance
        disagrees: 1.5, // Sparks discussion
        comments: 2.0,
        shares: 3.0,
        views: 0.1,
        communityNotes: 2.5,
        reportsWeight: -0.5 // Negative impact
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
exports.default = EngagementScoringService;
//# sourceMappingURL=engagementScoringService.js.map