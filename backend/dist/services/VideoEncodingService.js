"use strict";
/**
 * VideoEncodingService
 *
 * Abstraction layer for video encoding operations.
 * Now integrated with FFmpeg-based encoding pipeline.
 *
 * Modes:
 * 1. Queue Mode (production): Jobs are queued and processed by worker
 * 2. Immediate Mode (development): Videos are encoded immediately
 * 3. Fallback Mode: Copy raw to public container if FFmpeg unavailable
 *
 * Encoding Tiers:
 * - 720p @ 2.5 Mbps
 * - 480p @ 1.2 Mbps
 * - 360p @ 0.6 Mbps
 *
 * @module services/VideoEncodingService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoEncodingService = exports.VideoEncodingService = void 0;
const prisma_js_1 = require("../lib/prisma.js");
const logger_1 = require("./logger");
const VideoStorageService_1 = require("./VideoStorageService");
const videoEncodingQueue_1 = require("../queues/videoEncodingQueue");
// ========================================
// VideoEncodingService Class (Stub Implementation)
// ========================================
/**
 * Video encoding service stub.
 *
 * In development: Auto-marks videos as READY with original URL as fallback
 * In production: Logs warning and leaves videos in PENDING status
 *
 * Future: Full Azure Media Services integration when SDK is installed
 */
class VideoEncodingService {
    config = null;
    initialized = false;
    queueEnabled = false;
    /**
     * Initialize the encoding service
     */
    async initialize() {
        if (this.initialized)
            return;
        const subscriptionId = process.env.AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID;
        const resourceGroup = process.env.AZURE_MEDIA_SERVICES_RESOURCE_GROUP;
        const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
        if (subscriptionId && resourceGroup && accountName) {
            this.config = { subscriptionId, resourceGroup, accountName };
        }
        // Queue mode is enabled when VIDEO_ENCODING_QUEUE=true
        this.queueEnabled = process.env.VIDEO_ENCODING_QUEUE === 'true';
        logger_1.logger.info({
            queueEnabled: this.queueEnabled,
            hasAzureConfig: !!this.config
        }, 'VideoEncodingService initialized');
        this.initialized = true;
    }
    /**
     * Check if encoding service is available
     * Returns true since we always have at least the fallback
     */
    isAvailable() {
        return true;
    }
    /**
     * Submit a video for encoding
     *
     * Queue mode: Adds to encoding queue for background processing
     * Immediate mode: Processes immediately (development)
     *
     * @param videoId - The video record ID
     * @param inputUrl - URL to the raw video in blob storage
     * @returns Job name for tracking
     */
    async submitEncodingJob(videoId, inputUrl) {
        await this.initialize();
        logger_1.logger.info({ videoId }, 'Encoding job received');
        const video = await prisma_js_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { originalBlobName: true }
        });
        if (!video?.originalBlobName) {
            logger_1.logger.error({ videoId }, 'Cannot submit encoding job - no original blob name');
            return null;
        }
        // Always add to queue — worker handles FFmpeg or fallback
        const jobId = videoEncodingQueue_1.videoEncodingQueue.addJob(videoId, video.originalBlobName);
        logger_1.logger.info({ videoId, jobId }, 'Video encoding job queued');
        return jobId;
    }
    /**
     * Simulate encoding for development/staging environments
     * Copies video from private raw container to public encoded container
     * Made public so publish endpoint can trigger simulation for stuck videos
     *
     * @param videoId - The video record ID
     * @param _inputUrl - Original URL (unused, kept for API compatibility)
     */
    async simulateEncodingForDevelopment(videoId, _inputUrl) {
        logger_1.logger.info({ videoId }, 'Starting simulated encoding (dev/staging)');
        // Update to ENCODING status
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: {
                encodingStatus: 'ENCODING',
                encodingStartedAt: new Date()
            }
        });
        // Get the raw blob name from the video record
        const video = await prisma_js_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { originalBlobName: true }
        });
        if (!video?.originalBlobName) {
            throw new Error(`Video ${videoId} has no originalBlobName`);
        }
        // Copy video from private raw container to public encoded container
        const result = await VideoStorageService_1.videoStorageService.copyRawToEncoded(videoId, video.originalBlobName);
        logger_1.logger.info({ videoId, mp4Url: result.url }, 'Video copied to public container');
        // Mark as READY with public URL
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: {
                encodingStatus: 'READY',
                encodingCompletedAt: new Date(),
                // Now points to PUBLIC videos-encoded container
                mp4Url: result.url,
                // Auto-approve moderation in development
                moderationStatus: 'APPROVED',
                audioStatus: 'PASS'
            }
        });
        logger_1.logger.info({ videoId }, 'Database updated with encoded URLs');
        logger_1.logger.info({ videoId, mp4Url: result.url }, 'Development encoding simulation complete');
    }
    /**
     * Handle encoding job completion (called from webhook)
     *
     * Updates video record based on job result
     */
    async handleJobComplete(videoId, jobName, success, error) {
        if (success) {
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'READY',
                    encodingCompletedAt: new Date()
                }
            });
            logger_1.logger.info({ videoId, jobName }, 'Video encoding completed successfully');
        }
        else {
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    encodingStatus: 'FAILED',
                    encodingCompletedAt: new Date(),
                    encodingError: error || 'Encoding job failed'
                }
            });
            logger_1.logger.error({ videoId, jobName, error }, 'Video encoding failed');
        }
    }
    /**
     * Clean up encoding resources
     *
     * Stub implementation - no resources to clean up
     * Full implementation would delete Azure Media Services assets
     */
    async cleanupResources(videoId) {
        if (!this.isAvailable()) {
            logger_1.logger.info({ videoId }, 'No encoding resources to cleanup (stub mode)');
            return;
        }
        // Full implementation would clean up:
        // - Input asset
        // - Output asset
        // - Encoding job
        // - Streaming locator
        logger_1.logger.info({ videoId }, 'Encoding resources cleanup would happen here');
    }
    /**
     * Manually mark a video as encoded (admin function)
     *
     * For use when encoding is done externally (e.g., FFmpeg script)
     */
    async markAsEncoded(videoId, options) {
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: {
                encodingStatus: 'READY',
                encodingCompletedAt: new Date(),
                hlsManifestUrl: options.hlsManifestUrl,
                mp4Url: options.mp4Url
            }
        });
        logger_1.logger.info({ videoId, ...options }, 'Video manually marked as encoded');
    }
}
exports.VideoEncodingService = VideoEncodingService;
// Export singleton instance
exports.videoEncodingService = new VideoEncodingService();
//# sourceMappingURL=VideoEncodingService.js.map