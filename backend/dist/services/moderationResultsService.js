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
                },
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            url: true,
                            userId: true,
                            createdAt: true
                        }
                    }
                }
            });
            // Update photo moderation status based on AI results
            await this.updatePhotoModerationStatus(data.photoId, result);
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
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            url: true,
                            thumbnailUrl: true,
                            userId: true,
                            moderationStatus: true,
                            createdAt: true
                        }
                    },
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
            // Add photo status filter if provided
            if (status) {
                where.photo = {
                    moderationStatus: status
                };
            }
            const results = await prisma.imageModerationResult.findMany({
                where,
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            url: true,
                            thumbnailUrl: true,
                            userId: true,
                            moderationStatus: true,
                            createdAt: true,
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true
                                }
                            }
                        }
                    },
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
                    requiresHumanReview: true,
                    photo: {
                        moderationStatus: 'PENDING'
                    }
                },
                include: {
                    photo: {
                        select: {
                            id: true,
                            filename: true,
                            url: true,
                            thumbnailUrl: true,
                            userId: true,
                            moderationStatus: true,
                            createdAt: true,
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true
                                }
                            }
                        }
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
                    requiresHumanReview: true,
                    photo: {
                        moderationStatus: 'PENDING'
                    }
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
                    moderationResult: {
                        include: {
                            photo: true
                        }
                    },
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
            // Update photo status based on review decision
            await this.applyModerationDecision(review.moderationResult.photoId, data.decision);
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
            const [totalImages, pendingReview, approved, rejected, flagged, highRiskImages, recentActivity] = await Promise.all([
                // Total images with moderation results
                prisma.imageModerationResult.count(),
                // Pending human review
                prisma.imageModerationResult.count({
                    where: {
                        requiresHumanReview: true,
                        photo: { moderationStatus: 'PENDING' }
                    }
                }),
                // Approved images
                prisma.photo.count({
                    where: { moderationStatus: 'APPROVED' }
                }),
                // Rejected images
                prisma.photo.count({
                    where: { moderationStatus: 'REJECTED' }
                }),
                // Flagged images
                prisma.photo.count({
                    where: { moderationStatus: 'FLAGGED' }
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
                approved,
                rejected,
                flagged,
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
     */
    static async updatePhotoModerationStatus(photoId, result) {
        try {
            let status = 'PENDING';
            let requiresReview = false;
            let humanReviewRequired = false;
            // Determine status based on AI analysis
            if (result.isSafe && result.riskScore < 0.3 && result.overallConfidence > 0.8) {
                status = 'APPROVED';
            }
            else if (result.riskScore > 0.7 || !result.isSafe) {
                status = 'FLAGGED';
                requiresReview = true;
                humanReviewRequired = true;
            }
            else if (result.requiresHumanReview || result.overallConfidence < 0.6) {
                status = 'REVIEW_REQUIRED';
                requiresReview = true;
                humanReviewRequired = true;
            }
            await prisma.photo.update({
                where: { id: photoId },
                data: {
                    moderationStatus: status,
                    moderationScore: result.riskScore,
                    requiresReview,
                    autoModerationPassed: status === 'APPROVED',
                    humanReviewRequired,
                    lastModerationAt: new Date(),
                    moderationMetadata: {
                        aiModel: result.aiModel,
                        modelVersion: result.modelVersion,
                        overallConfidence: result.overallConfidence,
                        primaryCategory: result.primaryCategory
                    }
                }
            });
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Updated photo moderation status', {
                photoId,
                status,
                riskScore: result.riskScore
            });
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to update photo moderation status', error);
            throw error;
        }
    }
    /**
     * Apply moderation decision to photo
     */
    static async applyModerationDecision(photoId, decision) {
        try {
            let status;
            let isActive = true;
            switch (decision) {
                case 'APPROVE':
                    status = 'APPROVED';
                    break;
                case 'REJECT':
                    status = 'REJECTED';
                    isActive = false;
                    break;
                case 'FLAG_FOR_REVIEW':
                    status = 'FLAGGED';
                    break;
                case 'REQUIRE_BLUR':
                case 'REQUIRE_WARNING':
                    status = 'FLAGGED';
                    break;
                default:
                    status = 'PENDING';
            }
            await prisma.photo.update({
                where: { id: photoId },
                data: {
                    moderationStatus: status,
                    isActive,
                    requiresReview: false,
                    humanReviewRequired: false,
                    lastModerationAt: new Date()
                }
            });
            await (0, adminDebug_js_1.adminDebugLog)('ModerationResultsService', 'Applied moderation decision', {
                photoId,
                decision,
                status
            });
        }
        catch (error) {
            await (0, adminDebug_js_1.adminDebugError)('ModerationResultsService', 'Failed to apply moderation decision', error);
            throw error;
        }
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