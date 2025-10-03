"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModerationResultsService = void 0;
const client_1 = require("@prisma/client");
const adminDebug_js_1 = require("../utils/adminDebug.js");
const prisma = new client_1.PrismaClient();
/**
 * Service for managing image moderation results and reviews
 */
class ModerationResultsService {
    /**
     * Create a new moderation result for a photo
     */
    static async createModerationResult(data) {
        try {
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Creating moderation result', { photoId: data.photoId, aiModel: data.aiModel });
            const result = await prisma.imageModerationResult.create({
                data: {
                    photoId: data.photoId,
                    moderationType: data.moderationType || 'AI_ANALYSIS',
                    aiAnalysisResults: data.aiAnalysisResults,
                    overallConfidence: data.overallConfidence || 0.0,
                    categories: data.categories || [],
                    primaryCategory: data.primaryCategory,
                    riskScore: data.riskScore || 0.0,
                    isSafe: data.isSafe !== undefined ? data.isSafe : true,
                    requiresHumanReview: data.requiresHumanReview || false,
                    detectedObjects: data.detectedObjects || [],
                    detectedText: data.detectedText,
                    textAnalysis: data.textAnalysis,
                    faceCount: data.faceCount || 0,
                    adultContentScore: data.adultContentScore || 0.0,
                    violenceScore: data.violenceScore || 0.0,
                    racyScore: data.racyScore || 0.0,
                    hateSpeechScore: data.hateSpeechScore || 0.0,
                    spamScore: data.spamScore || 0.0,
                    qualityScore: data.qualityScore || 0.0,
                    technicalMetadata: data.technicalMetadata,
                    processingTime: data.processingTime,
                    aiModel: data.aiModel,
                    modelVersion: data.modelVersion
                }
            });
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Moderation result created successfully', { resultId: result.id });
            return result;
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to create moderation result', error);
            throw error;
        }
    }
    /**
     * Get moderation result by photo ID
     */
    static async getModerationResultByPhotoId(photoId) {
        try {
            const result = await prisma.imageModerationResult.findUnique({
                where: { photoId },
                include: {
                    reviews: {
                        include: {
                            reviewer: {
                                select: {
                                    id: true,
                                    username: true,
                                    isAdmin: true,
                                    isModerator: true
                                }
                            }
                        },
                        orderBy: { reviewedAt: 'desc' }
                    }
                }
            });
            return result;
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to get moderation result', error);
            throw error;
        }
    }
    /**
     * Query moderation results with filters for admin dashboard
     */
    static async queryModerationResults(query = {}) {
        try {
            const { status, requiresReview, riskScoreMin, riskScoreMax, categories, dateFrom, dateTo, limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'desc' } = query;
            const where = {};
            // Build where conditions
            if (requiresReview !== undefined) {
                where.requiresHumanReview = requiresReview;
            }
            if (riskScoreMin !== undefined || riskScoreMax !== undefined) {
                where.riskScore = {};
                if (riskScoreMin !== undefined)
                    where.riskScore.gte = riskScoreMin;
                if (riskScoreMax !== undefined)
                    where.riskScore.lte = riskScoreMax;
            }
            if (categories && categories.length > 0) {
                where.categories = {
                    hasSome: categories
                };
            }
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom)
                    where.createdAt.gte = dateFrom;
                if (dateTo)
                    where.createdAt.lte = dateTo;
            }
            // Note: Photo status filtering removed - Photo model deleted
            const results = await prisma.imageModerationResult.findMany({
                where,
                include: {
                    reviews: {
                        include: {
                            reviewer: {
                                select: {
                                    id: true,
                                    username: true,
                                    isAdmin: true,
                                    isModerator: true
                                }
                            }
                        },
                        orderBy: { reviewedAt: 'desc' },
                        take: 1 // Only get the latest review
                    }
                },
                orderBy: { [orderBy]: orderDirection },
                take: limit,
                skip: offset
            });
            // Get total count for pagination
            const totalCount = await prisma.imageModerationResult.count({ where });
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Queried moderation results', {
                count: results.length,
                totalCount,
                filters: query
            });
            return {
                results,
                totalCount,
                hasMore: offset + results.length < totalCount
            };
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to query moderation results', error);
            throw error;
        }
    }
    /**
     * Get pending items requiring human review
     */
    static async getPendingReviewItems(limit = 20, offset = 0) {
        try {
            const results = await prisma.imageModerationResult.findMany({
                where: {
                    requiresHumanReview: true
                },
                include: {
                    reviews: {
                        include: {
                            reviewer: {
                                select: {
                                    id: true,
                                    username: true,
                                    isAdmin: true,
                                    isModerator: true
                                }
                            }
                        },
                        orderBy: { reviewedAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: [
                    { riskScore: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: limit,
                skip: offset
            });
            const totalPending = await prisma.imageModerationResult.count({
                where: {
                    requiresHumanReview: true
                }
            });
            return {
                results,
                totalPending,
                hasMore: offset + results.length < totalPending
            };
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to get pending review items', error);
            throw error;
        }
    }
    /**
     * Create a human moderation review
     */
    static async createModerationReview(data) {
        try {
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Creating moderation review', {
                moderationResultId: data.moderationResultId,
                decision: data.decision,
                reviewerId: data.reviewerId
            });
            const review = await prisma.imageModerationReview.create({
                data: {
                    moderationResultId: data.moderationResultId,
                    reviewerId: data.reviewerId,
                    decision: data.decision,
                    reason: data.reason,
                    notes: data.notes,
                    confidenceOverride: data.confidenceOverride,
                    categoryOverride: data.categoryOverride,
                    isAppeal: data.isAppeal || false,
                    originalDecision: data.originalDecision
                },
                include: {
                    moderationResult: true,
                    reviewer: {
                        select: {
                            id: true,
                            username: true,
                            isAdmin: true,
                            isModerator: true
                        }
                    }
                }
            });
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Moderation review created successfully', { reviewId: review.id });
            return review;
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to create moderation review', error);
            throw error;
        }
    }
    /**
     * Get moderation statistics for admin dashboard
     */
    static async getModerationStatistics() {
        try {
            const [totalImages, pendingReview, highRiskImages, recentActivity] = await Promise.all([
                // Total images with moderation results
                prisma.imageModerationResult.count(),
                // Pending human review
                prisma.imageModerationResult.count({
                    where: {
                        requiresHumanReview: true
                    }
                }),
                // High risk images (risk score > 0.7)
                prisma.imageModerationResult.count({
                    where: { riskScore: { gt: 0.7 } }
                }),
                // Recent activity (last 24 hours)
                prisma.imageModerationResult.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    }
                })
            ]);
            return {
                totalImages,
                pendingReview,
                highRiskImages,
                recentActivity
            };
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to get moderation statistics', error);
            throw error;
        }
    }
    /**
     * Update photo moderation status based on AI analysis
     * NOTE: Photo model removed - this method is now a no-op
     */
    static async updatePhotoModerationStatus(photoId, result) {
        // Photo model deleted - no-op
        await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Photo moderation update skipped (Photo model removed)', {
            photoId,
            riskScore: result.riskScore
        });
    }
    /**
     * Apply moderation decision to photo
     * NOTE: Photo model removed - this method is now a no-op
     */
    static async applyModerationDecision(photoId, decision) {
        // Photo model deleted - no-op
        await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Moderation decision application skipped (Photo model removed)', {
            photoId,
            decision
        });
    }
    /**
     * Bulk approve multiple images
     */
    static async bulkApproveImages(photoIds, reviewerId, reason) {
        try {
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Bulk approving images', {
                count: photoIds.length,
                reviewerId
            });
            const results = [];
            for (const photoId of photoIds) {
                const moderationResult = await this.getModerationResultByPhotoId(photoId);
                if (moderationResult) {
                    const review = await this.createModerationReview({
                        moderationResultId: moderationResult.id,
                        reviewerId,
                        decision: 'APPROVE',
                        reason: reason || 'Bulk approval'
                    });
                    results.push(review);
                }
            }
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Bulk approval completed', {
                processedCount: results.length
            });
            return results;
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to bulk approve images', error);
            throw error;
        }
    }
}
exports.ModerationResultsService = ModerationResultsService;
exports.default = ModerationResultsService;
//# sourceMappingURL=moderationResultsService.js.map