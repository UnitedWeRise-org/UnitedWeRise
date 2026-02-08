"use strict";
/**
 * VideoEncodingWorker
 *
 * Background worker that processes video encoding jobs from the queue.
 * Uses FFmpegEncoder with a two-phase pipeline:
 * - Phase 1: Encode 720p → run moderation → video becomes watchable
 * - Phase 2: Encode 360p → update manifest (non-fatal if fails)
 *
 * Features:
 * - Two-phase encoding for faster time-to-playable
 * - Automatic job pickup from queue
 * - Retry on failure (up to 3 attempts)
 * - Graceful shutdown support
 * - Queue statistics logging
 *
 * @module workers/videoEncodingWorker
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoEncodingWorker = exports.VideoEncodingWorker = void 0;
const videoEncodingQueue_1 = require("../queues/videoEncodingQueue");
const FFmpegEncoder_1 = require("../services/FFmpegEncoder");
const videoContentModerationService_1 = require("../services/videoContentModerationService");
const logger_1 = require("../services/logger");
// ========================================
// Constants
// ========================================
const POLL_INTERVAL_MS = 5000; // Check for jobs every 5 seconds
const STATS_LOG_INTERVAL_MS = 60000; // Log stats every minute
const CLEANUP_INTERVAL_MS = 3600000; // Clean up old jobs every hour
/** Enable two-phase encoding (720p first, then 360p) */
const TWO_PHASE_ENABLED = process.env.VIDEO_ENCODING_TWO_PHASE !== 'false';
// ========================================
// VideoEncodingWorker Class
// ========================================
class VideoEncodingWorker {
    running = false;
    pollTimer;
    statsTimer;
    cleanupTimer;
    processingJobs = new Set();
    /**
     * Start the worker
     */
    async start() {
        if (this.running) {
            logger_1.logger.warn('VideoEncodingWorker already running');
            return;
        }
        // Check if FFmpeg is available
        const ffmpegAvailable = await FFmpegEncoder_1.ffmpegEncoder.isAvailable();
        if (!ffmpegAvailable) {
            logger_1.logger.error('FFmpeg not available - video encoding worker will use fallback mode');
        }
        this.running = true;
        logger_1.logger.info({ twoPhaseEnabled: TWO_PHASE_ENABLED }, 'VideoEncodingWorker started');
        // Listen for new jobs
        videoEncodingQueue_1.videoEncodingQueue.on('job:added', () => {
            this.processNextJob();
        });
        // Start polling for jobs
        this.pollTimer = setInterval(() => {
            this.processNextJob();
        }, POLL_INTERVAL_MS);
        // Start stats logging
        this.statsTimer = setInterval(() => {
            const stats = videoEncodingQueue_1.videoEncodingQueue.getStats();
            logger_1.logger.info({ stats }, 'Video encoding queue stats');
        }, STATS_LOG_INTERVAL_MS);
        // Start cleanup timer
        this.cleanupTimer = setInterval(() => {
            videoEncodingQueue_1.videoEncodingQueue.cleanup();
        }, CLEANUP_INTERVAL_MS);
        // Recover orphaned PENDING videos from the database (lost on server restart)
        await this.recoverOrphanedVideos();
        // Process any existing jobs
        this.processNextJob();
    }
    /**
     * Stop the worker gracefully
     */
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
        if (this.statsTimer) {
            clearInterval(this.statsTimer);
        }
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        // Wait for in-progress jobs to complete (with timeout)
        const waitStart = Date.now();
        const maxWait = 60000; // 1 minute
        while (this.processingJobs.size > 0 && Date.now() - waitStart < maxWait) {
            logger_1.logger.info({ pendingJobs: this.processingJobs.size }, 'Waiting for encoding jobs to complete...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        if (this.processingJobs.size > 0) {
            logger_1.logger.warn({ pendingJobs: this.processingJobs.size }, 'Shutdown with jobs still processing');
        }
        logger_1.logger.info('VideoEncodingWorker stopped');
    }
    /**
     * Recover orphaned videos stuck in PENDING status after server restart.
     * The in-memory queue is lost on restart, so videos that were queued but
     * not yet processed remain in PENDING state with no active job.
     * Only recovers videos created in the last 24 hours to avoid re-processing old records.
     */
    async recoverOrphanedVideos() {
        try {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma.js')));
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const orphanedVideos = await prisma.video.findMany({
                where: {
                    encodingStatus: 'PENDING',
                    deletedAt: null,
                    createdAt: { gt: cutoff }
                },
                select: {
                    id: true,
                    originalBlobName: true
                }
            });
            if (orphanedVideos.length === 0) {
                logger_1.logger.info('No orphaned PENDING videos found on startup');
                return;
            }
            let requeued = 0;
            for (const video of orphanedVideos) {
                if (!video.originalBlobName) {
                    logger_1.logger.warn({ videoId: video.id }, 'Orphaned video has no originalBlobName — skipping');
                    continue;
                }
                videoEncodingQueue_1.videoEncodingQueue.addJob(video.id, video.originalBlobName);
                requeued++;
            }
            logger_1.logger.warn({ found: orphanedVideos.length, requeued }, 'Re-queued orphaned PENDING videos on startup');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to recover orphaned videos on startup');
        }
    }
    /**
     * Process next available job from queue
     */
    async processNextJob() {
        if (!this.running)
            return;
        const job = videoEncodingQueue_1.videoEncodingQueue.getNextJob();
        if (!job)
            return;
        this.processingJobs.add(job.id);
        try {
            await this.processJob(job);
            videoEncodingQueue_1.videoEncodingQueue.completeJob(job.id);
        }
        catch (error) {
            logger_1.logger.error({ error, jobId: job.id, videoId: job.videoId }, 'Encoding job failed');
            videoEncodingQueue_1.videoEncodingQueue.failJob(job.id, error.message, true);
        }
        finally {
            this.processingJobs.delete(job.id);
        }
        // Check for more jobs
        if (videoEncodingQueue_1.videoEncodingQueue.hasAvailableJobs()) {
            setImmediate(() => this.processNextJob());
        }
    }
    /**
     * Process a single encoding job using two-phase pipeline.
     *
     * Phase 1: Encode 720p → run content moderation → video becomes READY
     * Phase 2: Encode 360p → update manifest (non-fatal)
     *
     * @param job - Encoding job from the queue
     */
    async processJob(job) {
        const encodingService = process.env.VIDEO_ENCODING_SERVICE || 'ffmpeg';
        logger_1.logger.info({
            jobId: job.id,
            videoId: job.videoId,
            attempt: job.attempts,
            twoPhase: TWO_PHASE_ENABLED,
            encodingService
        }, 'Processing encoding job');
        // Dispatch to Coconut.co if configured
        if (encodingService === 'coconut') {
            await this.processCoconut(job);
            return;
        }
        const startTime = Date.now();
        // Check if FFmpeg is available
        const ffmpegAvailable = await FFmpegEncoder_1.ffmpegEncoder.isAvailable();
        if (!ffmpegAvailable) {
            // Fallback: copy to public container (development mode)
            await this.processFallback(job, startTime);
            return;
        }
        if (!TWO_PHASE_ENABLED) {
            // Legacy single-pass encoding
            await this.processLegacy(job, startTime);
            return;
        }
        // === Two-Phase Encoding Pipeline ===
        // Check if this is a Phase 2 retry (video already READY, 720p exists)
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma.js')));
        const videoState = await prisma.video.findUnique({
            where: { id: job.videoId },
            select: { encodingStatus: true, encodingTiersStatus: true }
        });
        if (videoState?.encodingStatus === 'READY' &&
            (videoState.encodingTiersStatus === 'PARTIAL' || videoState.encodingTiersStatus === 'PARTIAL_FAILED')) {
            // Skip Phase 1, go directly to Phase 2 (360p retry)
            logger_1.logger.info({ videoId: job.videoId }, 'Phase 2 retry detected — skipping Phase 1');
            const phase2Result = await FFmpegEncoder_1.ffmpegEncoder.encodePhase2(job.videoId, job.inputBlobName);
            if (phase2Result.success) {
                logger_1.logger.info({ videoId: job.videoId }, 'Phase 2 retry completed successfully');
            }
            else {
                logger_1.logger.warn({ videoId: job.videoId, error: phase2Result.error }, 'Phase 2 retry failed');
            }
            return;
        }
        // Phase 1: Encode 720p (critical — failure here fails the job)
        const phase1Result = await FFmpegEncoder_1.ffmpegEncoder.encodePhase1(job.videoId, job.inputBlobName);
        if (!phase1Result.success) {
            throw new Error(phase1Result.error || 'Phase 1 encoding failed');
        }
        const phase1Duration = Date.now() - startTime;
        logger_1.logger.info({
            jobId: job.id,
            videoId: job.videoId,
            phase1DurationMs: phase1Duration,
            hlsManifestUrl: phase1Result.hlsManifestUrl
        }, 'Phase 1 complete — running content moderation');
        // Run content moderation between phases (video is READY but not yet moderation-approved)
        try {
            await videoContentModerationService_1.videoContentModerationService.queueModeration(job.videoId);
        }
        catch (error) {
            logger_1.logger.error({ error, videoId: job.videoId }, 'Content moderation failed — video remains in current moderation state');
        }
        // Phase 2: Encode 360p (non-fatal — video already watchable at 720p)
        const phase2Start = Date.now();
        const phase2Result = await FFmpegEncoder_1.ffmpegEncoder.encodePhase2(job.videoId, job.inputBlobName);
        const totalDuration = Date.now() - startTime;
        if (phase2Result.success) {
            logger_1.logger.info({
                jobId: job.id,
                videoId: job.videoId,
                phase1DurationMs: phase1Duration,
                phase2DurationMs: Date.now() - phase2Start,
                totalDurationMs: totalDuration
            }, 'Two-phase encoding completed successfully');
        }
        else {
            logger_1.logger.warn({
                jobId: job.id,
                videoId: job.videoId,
                phase2Error: phase2Result.error,
                totalDurationMs: totalDuration
            }, 'Phase 2 (360p) failed — video remains watchable at 720p only');
        }
    }
    /**
     * Legacy single-pass encoding (both tiers at once)
     */
    async processLegacy(job, startTime) {
        const result = await FFmpegEncoder_1.ffmpegEncoder.encode(job.videoId, job.inputBlobName);
        if (!result.success) {
            throw new Error(result.error || 'Encoding failed');
        }
        // Run content moderation after encoding
        try {
            await videoContentModerationService_1.videoContentModerationService.queueModeration(job.videoId);
        }
        catch (error) {
            logger_1.logger.error({ error, videoId: job.videoId }, 'Content moderation failed after legacy encoding');
        }
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            jobId: job.id,
            videoId: job.videoId,
            durationMs: duration,
            hlsManifestUrl: result.hlsManifestUrl
        }, 'Encoding completed with FFmpeg (legacy single-pass)');
    }
    /**
     * Fallback copy mode when FFmpeg is not available (development/staging)
     */
    async processFallback(job, startTime) {
        logger_1.logger.warn({ videoId: job.videoId }, 'FFmpeg not available, using fallback copy mode');
        const { videoStorageService } = await Promise.resolve().then(() => __importStar(require('../services/VideoStorageService')));
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma.js')));
        const result = await videoStorageService.copyRawToEncoded(job.videoId, job.inputBlobName);
        await prisma.video.update({
            where: { id: job.videoId },
            data: {
                encodingStatus: 'READY',
                encodingCompletedAt: new Date(),
                mp4Url: result.url,
                encodingTiersStatus: 'ALL'
            }
        });
        const duration = Date.now() - startTime;
        logger_1.logger.info({
            jobId: job.id,
            videoId: job.videoId,
            durationMs: duration,
            mp4Url: result.url
        }, 'Encoding completed with fallback copy');
    }
    /**
     * Dispatch encoding to Coconut.co cloud service.
     * Fire-and-forget: the Coconut webhook handles completion/failure.
     * Supports Phase 2 retry detection for videos already at 720p.
     */
    async processCoconut(job) {
        const { coconutEncodingService } = await Promise.resolve().then(() => __importStar(require('../services/CoconutEncodingService')));
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma.js')));
        // Check if this is a Phase 2 retry (video already READY, 720p exists)
        const videoState = await prisma.video.findUnique({
            where: { id: job.videoId },
            select: { encodingStatus: true, encodingTiersStatus: true }
        });
        if (videoState?.encodingStatus === 'READY' &&
            (videoState.encodingTiersStatus === 'PARTIAL' || videoState.encodingTiersStatus === 'PARTIAL_FAILED')) {
            logger_1.logger.info({ videoId: job.videoId }, 'Coconut Phase 2 retry — dispatching 360p job');
            await prisma.video.update({
                where: { id: job.videoId },
                data: { encodingTiersStatus: 'PARTIAL' }
            });
            const result = await coconutEncodingService.createPhase2Job(job.videoId, job.inputBlobName);
            logger_1.logger.info({ videoId: job.videoId, coconutJobId: result.jobId }, 'Coconut Phase 2 retry dispatched');
            return;
        }
        // Phase 1: Set ENCODING status and dispatch to Coconut
        await prisma.video.update({
            where: { id: job.videoId },
            data: {
                encodingStatus: 'ENCODING',
                encodingStartedAt: new Date()
            }
        });
        const result = await coconutEncodingService.createPhase1Job(job.videoId, job.inputBlobName);
        logger_1.logger.info({
            jobId: job.id,
            videoId: job.videoId,
            coconutJobId: result.jobId
        }, 'Coconut Phase 1 dispatched — webhook will handle completion');
    }
}
exports.VideoEncodingWorker = VideoEncodingWorker;
// Export singleton instance
exports.videoEncodingWorker = new VideoEncodingWorker();
//# sourceMappingURL=videoEncodingWorker.js.map