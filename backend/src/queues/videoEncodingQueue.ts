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
import { logger } from '../services/logger';

// ========================================
// Types
// ========================================

export interface EncodingJob {
  id: string;
  videoId: string;
  inputBlobName: string;
  priority: number; // Lower = higher priority
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

// ========================================
// VideoEncodingQueue Class
// ========================================

export class VideoEncodingQueue extends EventEmitter {
  private jobs: Map<string, EncodingJob> = new Map();
  private pendingQueue: string[] = [];
  private processingSet: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 2) {
    super();
    this.maxConcurrent = maxConcurrent;
    logger.info({ maxConcurrent }, 'VideoEncodingQueue initialized');
  }

  /**
   * Add a job to the queue
   * @param videoId - Video record ID
   * @param inputBlobName - Blob name in videos-raw container
   * @param priority - Lower number = higher priority (default 10)
   * @returns Job ID
   */
  addJob(videoId: string, inputBlobName: string, priority: number = 10): string {
    const jobId = `job-${videoId}-${Date.now()}`;

    const job: EncodingJob = {
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

    logger.info({ jobId, videoId, priority, queueLength: this.pendingQueue.length }, 'Encoding job added to queue');

    // Emit event for worker to pick up
    this.emit('job:added', job);

    return jobId;
  }

  /**
   * Get next job to process
   * @returns Job or null if none available
   */
  getNextJob(): EncodingJob | null {
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

    logger.info({ jobId, videoId: job.videoId, attempt: job.attempts }, 'Job dequeued for processing');

    return job;
  }

  /**
   * Mark job as completed
   */
  completeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    this.processingSet.delete(jobId);

    logger.info({ jobId, videoId: job.videoId }, 'Encoding job completed');

    this.emit('job:completed', job);
  }

  /**
   * Mark job as failed
   * @param jobId - Job ID
   * @param error - Error message
   * @param retry - Whether to retry the job
   */
  failJob(jobId: string, error: string, retry: boolean = true): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.processingSet.delete(jobId);

    if (retry && job.attempts < job.maxAttempts) {
      // Re-queue for retry
      job.status = 'pending';
      job.error = error;
      this.pendingQueue.push(jobId);

      logger.warn({ jobId, videoId: job.videoId, attempt: job.attempts, error }, 'Encoding job failed, will retry');

      this.emit('job:retry', job);
    } else {
      // Permanent failure
      job.status = 'failed';
      job.error = error;

      logger.error({ jobId, videoId: job.videoId, attempts: job.attempts, error }, 'Encoding job permanently failed');

      this.emit('job:failed', job);
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): EncodingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get job by video ID
   */
  getJobByVideoId(videoId: string): EncodingJob | undefined {
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
  getStats(): QueueStats {
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
  hasAvailableJobs(): boolean {
    return this.pendingQueue.length > 0 && this.processingSet.size < this.maxConcurrent;
  }

  /**
   * Clean up old completed/failed jobs (older than 24 hours)
   */
  cleanup(): void {
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
      logger.info({ cleaned }, 'Cleaned up old encoding jobs');
    }
  }
}

// Export singleton instance
export const videoEncodingQueue = new VideoEncodingQueue(2);
