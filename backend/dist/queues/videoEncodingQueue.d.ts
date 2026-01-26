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
import { EventEmitter } from 'events';
export interface EncodingJob {
    id: string;
    videoId: string;
    inputBlobName: string;
    priority: number;
    createdAt: Date;
    startedAt?: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    attempts: number;
    maxAttempts: number;
}
export interface QueueStats {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
}
export declare class VideoEncodingQueue extends EventEmitter {
    private jobs;
    private pendingQueue;
    private processingSet;
    private maxConcurrent;
    constructor(maxConcurrent?: number);
    /**
     * Add a job to the queue
     * @param videoId - Video record ID
     * @param inputBlobName - Blob name in videos-raw container
     * @param priority - Lower number = higher priority (default 10)
     * @returns Job ID
     */
    addJob(videoId: string, inputBlobName: string, priority?: number): string;
    /**
     * Get next job to process
     * @returns Job or null if none available
     */
    getNextJob(): EncodingJob | null;
    /**
     * Mark job as completed
     */
    completeJob(jobId: string): void;
    /**
     * Mark job as failed
     * @param jobId - Job ID
     * @param error - Error message
     * @param retry - Whether to retry the job
     */
    failJob(jobId: string, error: string, retry?: boolean): void;
    /**
     * Get job by ID
     */
    getJob(jobId: string): EncodingJob | undefined;
    /**
     * Get job by video ID
     */
    getJobByVideoId(videoId: string): EncodingJob | undefined;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Check if there are jobs available to process
     */
    hasAvailableJobs(): boolean;
    /**
     * Clean up old completed/failed jobs (older than 24 hours)
     */
    cleanup(): void;
}
export declare const videoEncodingQueue: VideoEncodingQueue;
//# sourceMappingURL=videoEncodingQueue.d.ts.map