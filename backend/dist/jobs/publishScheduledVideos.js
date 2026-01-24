"use strict";
/**
 * Scheduled Video Publishing Job
 *
 * Runs periodically to publish videos that have reached their scheduled time.
 * Can be invoked via:
 * - node-cron within the main application
 * - Azure Functions Timer Trigger
 * - Azure Container Apps Jobs
 *
 * @module jobs/publishScheduledVideos
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishScheduledVideos = publishScheduledVideos;
exports.checkStuckScheduledVideos = checkStuckScheduledVideos;
const prisma_js_1 = require("../lib/prisma.js");
const logger_1 = require("../services/logger");
/**
 * Publish all videos that have reached their scheduled publish time.
 *
 * @returns Object with counts of processed, published, and failed videos
 */
async function publishScheduledVideos() {
    const startTime = Date.now();
    const errors = [];
    let processed = 0;
    let published = 0;
    let failed = 0;
    logger_1.logger.info('Starting scheduled video publish job');
    try {
        // Find all videos that are scheduled and past their publish time
        const videosToPublish = await prisma_js_1.prisma.video.findMany({
            where: {
                publishStatus: 'SCHEDULED',
                scheduledPublishAt: {
                    lte: new Date()
                },
                // Only publish videos that are fully ready
                encodingStatus: 'READY',
                moderationStatus: 'APPROVED',
                // Not deleted
                deletedAt: null
            },
            select: {
                id: true,
                userId: true,
                caption: true,
                scheduledPublishAt: true
            }
        });
        processed = videosToPublish.length;
        if (processed === 0) {
            logger_1.logger.info('No scheduled videos to publish');
            return { processed: 0, published: 0, failed: 0, errors: [] };
        }
        logger_1.logger.info({ count: processed }, 'Found scheduled videos to publish');
        // Publish each video
        for (const video of videosToPublish) {
            try {
                await prisma_js_1.prisma.video.update({
                    where: { id: video.id },
                    data: {
                        publishStatus: 'PUBLISHED',
                        publishedAt: new Date(),
                        isActive: true,
                        scheduledPublishAt: null // Clear the schedule
                    }
                });
                published++;
                logger_1.logger.info({
                    videoId: video.id,
                    userId: video.userId,
                    scheduledFor: video.scheduledPublishAt
                }, 'Video published successfully');
                // Optional: Send notification to user that their video was published
                // await notifyUserVideoPublished(video.userId, video.id);
                // Optional: Notify followers of new content
                // await notifyFollowersNewVideo(video.userId, video.id);
            }
            catch (error) {
                failed++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Video ${video.id}: ${errorMessage}`);
                logger_1.logger.error({
                    videoId: video.id,
                    error: errorMessage
                }, 'Failed to publish scheduled video');
            }
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            processed,
            published,
            failed,
            durationMs: duration
        }, 'Scheduled video publish job completed');
        return { processed, published, failed, errors };
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Scheduled video publish job failed');
        throw error;
    }
}
/**
 * Check for videos stuck in SCHEDULED state that can't be published
 * (e.g., encoding failed, moderation rejected).
 * These should be notified to the user.
 */
async function checkStuckScheduledVideos() {
    const stuckVideos = await prisma_js_1.prisma.video.findMany({
        where: {
            publishStatus: 'SCHEDULED',
            scheduledPublishAt: {
                lte: new Date()
            },
            OR: [
                { encodingStatus: 'FAILED' },
                { moderationStatus: 'REJECTED' }
            ]
        },
        select: {
            id: true,
            userId: true,
            encodingStatus: true,
            moderationStatus: true
        }
    });
    for (const video of stuckVideos) {
        logger_1.logger.warn({
            videoId: video.id,
            userId: video.userId,
            encodingStatus: video.encodingStatus,
            moderationStatus: video.moderationStatus
        }, 'Scheduled video cannot be published');
        // Move to draft and notify user
        await prisma_js_1.prisma.video.update({
            where: { id: video.id },
            data: {
                publishStatus: 'DRAFT',
                scheduledPublishAt: null
            }
        });
        // TODO: Notify user that their scheduled video could not be published
        // await notifyUserScheduledPublishFailed(video.userId, video.id, reason);
    }
    return stuckVideos.length;
}
// ========================================
// Standalone Execution
// ========================================
// Allow running as standalone script
if (require.main === module) {
    (async () => {
        try {
            const result = await publishScheduledVideos();
            console.log('Publish job result:', result);
            const stuck = await checkStuckScheduledVideos();
            console.log('Stuck videos handled:', stuck);
            process.exit(0);
        }
        catch (error) {
            console.error('Job failed:', error);
            process.exit(1);
        }
    })();
}
//# sourceMappingURL=publishScheduledVideos.js.map