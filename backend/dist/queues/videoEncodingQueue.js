"use strict";
/**
 * VideoEncodingQueue
 *
 * In-memory queue for video encoding jobs.
 * Provides simple job management with priority support.
 *
 * Note: Jobs are lost on server restart. For production at scale,
 * consider migrating to Redis-backed queue (Bull/BullMQ).
 *
 * @module queues/videoEncodingQueue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoEncodingQueue = exports.VideoEncodingQueue = void 0;
const events_1 = require("events");
const logger_1 = require("../services/logger");
// ========================================
// VideoEncodingQueue Class
// ========================================
class VideoEncodingQueue extends events_1.EventEmitter {
    jobs = new Map();
    pendingQueue = [];
    processingSet = new Set();
    maxConcurrent;
    constructor(maxConcurrent = 2) {
        super();
        this.maxConcurrent = maxConcurrent;
        logger_1.logger.info({ maxConcurrent }, 'VideoEncodingQueue initialized');
    }
    /**
     * Add a job to the queue
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @param priority - Lower number = higher priority (default 10)
     * @returns Job ID
     */
    addJob(videoId, inputBlobName, priority = 10) {
        const jobId = `job-${videoId}-${Date.now()}`;
        const job = {
            id: jobId,
            videoId,
            inputBlobName,
            priority,
            createdAt: new Date(),
            status: 'pending',
            attempts: 0,
            maxAttempts: 3
        };
        this.jobs.set(jobId, job);
        this.pendingQueue.push(jobId);
        // Sort by priority (lower first)
        this.pendingQueue.sort((a, b) => {
            const jobA = this.jobs.get(a);
            const jobB = this.jobs.get(b);
            return (jobA?.priority || 10) - (jobB?.priority || 10);
        });
        logger_1.logger.info({ jobId, videoId, priority, queueLength: this.pendingQueue.length }, 'Encoding job added to queue');
        // Emit event for worker to pick up
        this.emit('job:added', job);
        return jobId;
    }
    /**
     * Get next job to process
     * @returns Job or null if none available
     */
    getNextJob() {
        if (this.processingSet.size >= this.maxConcurrent) {
            return null;
        }
        const jobId = this.pendingQueue.shift();
        if (!jobId) {
            return null;
        }
        const job = this.jobs.get(jobId);
        if (!job) {
            return null;
        }
        job.status = 'processing';
        job.startedAt = new Date();
        job.attempts += 1;
        this.processingSet.add(jobId);
        logger_1.logger.info({ jobId, videoId: job.videoId, attempt: job.attempts }, 'Job dequeued for processing');
        return job;
    }
    /**
     * Mark job as completed
     */
    completeJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        job.status = 'completed';
        this.processingSet.delete(jobId);
        logger_1.logger.info({ jobId, videoId: job.videoId }, 'Encoding job completed');
        this.emit('job:completed', job);
    }
    /**
     * Mark job as failed
     * @param jobId - Job ID
     * @param error - Error message
     * @param retry - Whether to retry the job
     */
    failJob(jobId, error, retry = true) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        this.processingSet.delete(jobId);
        if (retry && job.attempts < job.maxAttempts) {
            // Re-queue for retry
            job.status = 'pending';
            job.error = error;
            this.pendingQueue.push(jobId);
            logger_1.logger.warn({ jobId, videoId: job.videoId, attempt: job.attempts, error }, 'Encoding job failed, will retry');
            this.emit('job:retry', job);
        }
        else {
            // Permanent failure
            job.status = 'failed';
            job.error = error;
            logger_1.logger.error({ jobId, videoId: job.videoId, attempts: job.attempts, error }, 'Encoding job permanently failed');
            this.emit('job:failed', job);
        }
    }
    /**
     * Get job by ID
     */
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    /**
     * Get job by video ID
     */
    getJobByVideoId(videoId) {
        for (const job of this.jobs.values()) {
            if (job.videoId === videoId) {
                return job;
            }
        }
        return undefined;
    }
    /**
     * Get queue statistics
     */
    getStats() {
        let pending = 0;
        let processing = 0;
        let completed = 0;
        let failed = 0;
        for (const job of this.jobs.values()) {
            switch (job.status) {
                case 'pending':
                    pending++;
                    break;
                case 'processing':
                    processing++;
                    break;
                case 'completed':
                    completed++;
                    break;
                case 'failed':
                    failed++;
                    break;
            }
        }
        return {
            pending,
            processing,
            completed,
            failed,
            total: this.jobs.size
        };
    }
    /**
     * Check if there are jobs available to process
     */
    hasAvailableJobs() {
        return this.pendingQueue.length > 0 && this.processingSet.size < this.maxConcurrent;
    }
    /**
     * Clean up old completed/failed jobs (older than 24 hours)
     */
    cleanup() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        let cleaned = 0;
        for (const [jobId, job] of this.jobs.entries()) {
            if ((job.status === 'completed' || job.status === 'failed') &&
                job.createdAt.getTime() < cutoff) {
                this.jobs.delete(jobId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger_1.logger.info({ cleaned }, 'Cleaned up old encoding jobs');
        }
    }
}
exports.VideoEncodingQueue = VideoEncodingQueue;
// Export singleton instance
exports.videoEncodingQueue = new VideoEncodingQueue(2);
//# sourceMappingURL=videoEncodingQueue.js.map