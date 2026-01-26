"use strict";
/**
 * VideoEncodingService
 *
 * Abstraction layer for video encoding operations.
 * Designed for portability to Azure Media Services, FFmpeg, or other solutions.
 *
 * CURRENT STATUS: Stub implementation
 * - In development mode: Auto-marks videos as READY for testing
 * - In production: Videos remain in PENDING status until Azure Media Services
 *   SDK is installed and configured
 *
 * TO ENABLE FULL AZURE MEDIA SERVICES:
 * 1. Install: npm install @azure/identity @azure/arm-mediaservices
 * 2. Configure environment variables:
 *    - AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID
 *    - AZURE_MEDIA_SERVICES_RESOURCE_GROUP
 *    - AZURE_MEDIA_SERVICES_ACCOUNT_NAME
 * 3. Replace this stub implementation with full Azure SDK integration
 *
 * Planned Encoding Tiers:
 * - 1080p @ 4.5 Mbps
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
    sdkAvailable = false;
    /**
     * Initialize the encoding service
     * Currently checks for configuration but SDK support is stubbed
     */
    async initialize() {
        if (this.initialized)
            return;
        const subscriptionId = process.env.AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID;
        const resourceGroup = process.env.AZURE_MEDIA_SERVICES_RESOURCE_GROUP;
        const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
        if (subscriptionId && resourceGroup && accountName) {
            this.config = { subscriptionId, resourceGroup, accountName };
            logger_1.logger.info('VideoEncodingService: Azure config detected but SDK not installed');
            logger_1.logger.info('To enable encoding: npm install @azure/identity @azure/arm-mediaservices');
        }
        else {
            logger_1.logger.warn('VideoEncodingService: Azure Media Services not configured');
        }
        // SDK is not available in this stub implementation
        this.sdkAvailable = false;
        this.initialized = true;
    }
    /**
     * Check if encoding service is available
     * Returns false in stub mode
     */
    isAvailable() {
        return this.initialized && this.sdkAvailable;
    }
    /**
     * Submit a video for encoding
     *
     * In development: Simulates encoding by auto-marking as READY
     * In production: Leaves video in PENDING status
     *
     * @param videoId - The video record ID
     * @param inputUrl - URL to the raw video in blob storage
     * @returns Job name for tracking, or null if encoding not available
     */
    async submitEncodingJob(videoId, inputUrl) {
        await this.initialize();
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment) {
            // Development mode: simulate encoding
            await this.simulateEncodingForDevelopment(videoId, inputUrl);
            return `simulated-job-${videoId}`;
        }
        // Production without SDK: log warning, leave in PENDING
        logger_1.logger.warn({
            videoId,
            hasConfig: !!this.config
        }, 'Video encoding service not available. Video will remain in PENDING status.');
        return null;
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
        logger_1.logger.info({ videoId }, 'Simulating video encoding for development');
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