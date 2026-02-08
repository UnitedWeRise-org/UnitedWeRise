"use strict";
/**
 * Encoding Watchdog Cron Job
 *
 * Detects and recovers stuck video encoding jobs.
 * Handles cases where Coconut.co webhooks were lost (network issues,
 * CSRF blocking, server restart during callback, etc.) and orphaned
 * PENDING videos whose in-memory queue jobs were lost on server restart.
 *
 * Schedule: Every 5 minutes
 *
 * Recovery logic:
 * - PENDING > 30 min: re-queue for encoding (queue job was lost on restart)
 * - ENCODING > 30 min with HLS output in blob storage: recover to READY (webhook was lost)
 * - ENCODING > 60 min with no output: mark as FAILED (encoding timed out)
 *
 * @module jobs/encodingWatchdogJob
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = require("../lib/prisma.js");
const VideoStorageService_1 = require("../services/VideoStorageService");
const videoEncodingQueue_1 = require("../queues/videoEncodingQueue");
const logger_1 = require("../services/logger");
const jobLogger = logger_1.logger.child({ component: 'encoding-watchdog' });
/** Minimum time before considering a job stuck (milliseconds) */
const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
/** Time after which a stuck job with no output is marked FAILED (milliseconds) */
const TIMEOUT_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes
class EncodingWatchdogJob {
    job = null;
    /**
     * Start the watchdog cron job.
     * Runs every 5 minutes to check for stuck encoding jobs.
     */
    start() {
        this.job = node_cron_1.default.schedule('*/5 * * * *', async () => {
            try {
                await this.checkStuckEncodings();
            }
            catch (error) {
                jobLogger.error({ error }, 'Error during encoding watchdog check');
            }
        });
        jobLogger.info('Encoding watchdog started - runs every 5 minutes');
    }
    /**
     * Stop the watchdog cron job.
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            jobLogger.info('Encoding watchdog stopped');
        }
    }
    /**
     * Check if the job is running.
     */
    isRunning() {
        return this.job !== null;
    }
    /**
     * Find and recover stuck encoding jobs (both ENCODING and PENDING).
     */
    async checkStuckEncodings() {
        const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
        const timeoutThreshold = new Date(Date.now() - TIMEOUT_THRESHOLD_MS);
        // Check for stuck ENCODING videos (webhook lost or FFmpeg process died)
        const stuckVideos = await prisma_js_1.prisma.video.findMany({
            where: {
                encodingStatus: 'ENCODING',
                encodingStartedAt: { lt: stuckThreshold },
                deletedAt: null
            },
            select: {
                id: true,
                encodingStartedAt: true,
                encodingTiersStatus: true
            }
        });
        if (stuckVideos.length > 0) {
            jobLogger.warn({ count: stuckVideos.length }, 'Found stuck ENCODING videos');
            for (const video of stuckVideos) {
                try {
                    await this.recoverStuckVideo(video, timeoutThreshold);
                }
                catch (error) {
                    jobLogger.error({ error, videoId: video.id }, 'Failed to recover stuck video');
                }
            }
        }
        // Check for orphaned PENDING videos (queue job lost on server restart)
        await this.requeueOrphanedPendingVideos(stuckThreshold);
    }
    /**
     * Re-queue videos stuck in PENDING status for > 30 minutes.
     * These are videos whose in-memory queue jobs were lost on server restart.
     */
    async requeueOrphanedPendingVideos(stuckThreshold) {
        const orphanedVideos = await prisma_js_1.prisma.video.findMany({
            where: {
                encodingStatus: 'PENDING',
                createdAt: { lt: stuckThreshold },
                deletedAt: null
            },
            select: {
                id: true,
                originalBlobName: true,
                createdAt: true
            }
        });
        if (orphanedVideos.length === 0)
            return;
        let requeued = 0;
        for (const video of orphanedVideos) {
            // Skip if already in the queue (avoid duplicates)
            if (videoEncodingQueue_1.videoEncodingQueue.getJobByVideoId(video.id)) {
                continue;
            }
            if (!video.originalBlobName) {
                jobLogger.warn({ videoId: video.id }, 'Orphaned PENDING video has no originalBlobName — skipping');
                continue;
            }
            videoEncodingQueue_1.videoEncodingQueue.addJob(video.id, video.originalBlobName);
            requeued++;
        }
        if (requeued > 0) {
            jobLogger.warn({ found: orphanedVideos.length, requeued }, 'Re-queued orphaned PENDING videos');
        }
    }
    /**
     * Attempt to recover a single stuck video.
     * Checks blob storage for existing output before deciding recovery action.
     */
    async recoverStuckVideo(video, timeoutThreshold) {
        const manifestPath = `${video.id}/master.m3u8`;
        const outputExists = await VideoStorageService_1.videoStorageService.encodedBlobExists(manifestPath);
        if (outputExists) {
            // Encoding succeeded but webhook was lost — recover DB state
            const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
            const cdnEndpoint = process.env.AZURE_CDN_ENDPOINT;
            const hlsManifestUrl = cdnEndpoint
                ? `${cdnEndpoint}/${video.id}/master.m3u8`
                : `https://${accountName}.blob.core.windows.net/videos-encoded/${video.id}/master.m3u8`;
            await prisma_js_1.prisma.video.update({
                where: { id: video.id },
                data: {
                    encodingStatus: 'READY',
                    encodingCompletedAt: new Date(),
                    hlsManifestUrl,
                    mp4Url: null,
                    encodingTiersStatus: 'PARTIAL'
                }
            });
            jobLogger.warn({
                videoId: video.id,
                hlsManifestUrl,
                stuckSince: video.encodingStartedAt
            }, 'Recovered stuck video — webhook was lost but encoding output exists');
        }
        else if (video.encodingStartedAt && video.encodingStartedAt < timeoutThreshold) {
            // No output after timeout — mark as failed
            await prisma_js_1.prisma.video.update({
                where: { id: video.id },
                data: {
                    encodingStatus: 'FAILED',
                    encodingCompletedAt: new Date(),
                    encodingError: 'Encoding timed out — no webhook received and no output found in storage',
                    encodingTiersStatus: 'NONE'
                }
            });
            jobLogger.error({
                videoId: video.id,
                stuckSince: video.encodingStartedAt
            }, 'Marked stuck video as FAILED — encoding timed out with no output');
        }
        else {
            // Stuck > 30 min but < 60 min with no output — still waiting
            jobLogger.info({
                videoId: video.id,
                stuckSince: video.encodingStartedAt
            }, 'Video stuck but within timeout window — will check again');
        }
    }
}
exports.default = new EncodingWatchdogJob();
//# sourceMappingURL=encodingWatchdogJob.js.map