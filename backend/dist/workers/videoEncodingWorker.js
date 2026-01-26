"use strict";
/**
 * VideoEncodingWorker
 *
 * Background worker that processes video encoding jobs from the queue.
 * Uses FFmpegEncoder to transcode videos to HLS and MP4.
 *
 * Features:
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
const logger_1 = require("../services/logger");
// ========================================
// Constants
// ========================================
const POLL_INTERVAL_MS = 5000; // Check for jobs every 5 seconds
const STATS_LOG_INTERVAL_MS = 60000; // Log stats every minute
const CLEANUP_INTERVAL_MS = 3600000; // Clean up old jobs every hour
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
        logger_1.logger.info('VideoEncodingWorker started');
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
     * Process a single encoding job
     */
    async processJob(job) {
        logger_1.logger.info({
            jobId: job.id,
            videoId: job.videoId,
            attempt: job.attempts
        }, 'Processing encoding job');
        const startTime = Date.now();
        // Check if FFmpeg is available
        const ffmpegAvailable = await FFmpegEncoder_1.ffmpegEncoder.isAvailable();
        if (ffmpegAvailable) {
            // Full FFmpeg encoding
            const result = await FFmpegEncoder_1.ffmpegEncoder.encode(job.videoId, job.inputBlobName);
            if (!result.success) {
                throw new Error(result.error || 'Encoding failed');
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info({
                jobId: job.id,
                videoId: job.videoId,
                durationMs: duration,
                hlsManifestUrl: result.hlsManifestUrl,
                mp4Url: result.mp4Url
            }, 'Encoding completed with FFmpeg');
        }
        else {
            // Fallback: copy to public container (development mode)
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
                    moderationStatus: 'APPROVED',
                    audioStatus: 'PASS'
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
    }
}
exports.VideoEncodingWorker = VideoEncodingWorker;
// Export singleton instance
exports.videoEncodingWorker = new VideoEncodingWorker();
//# sourceMappingURL=videoEncodingWorker.js.map