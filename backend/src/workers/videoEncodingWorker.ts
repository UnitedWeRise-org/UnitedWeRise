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

import { videoEncodingQueue, EncodingJob } from '../queues/videoEncodingQueue';
import { ffmpegEncoder } from '../services/FFmpegEncoder';
import { logger } from '../services/logger';

// ========================================
// Constants
// ========================================

const POLL_INTERVAL_MS = 5000; // Check for jobs every 5 seconds
const STATS_LOG_INTERVAL_MS = 60000; // Log stats every minute
const CLEANUP_INTERVAL_MS = 3600000; // Clean up old jobs every hour

// ========================================
// VideoEncodingWorker Class
// ========================================

export class VideoEncodingWorker {
  private running: boolean = false;
  private pollTimer?: NodeJS.Timeout;
  private statsTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private processingJobs: Set<string> = new Set();

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('VideoEncodingWorker already running');
      return;
    }

    // Check if FFmpeg is available
    const ffmpegAvailable = await ffmpegEncoder.isAvailable();
    if (!ffmpegAvailable) {
      logger.error('FFmpeg not available - video encoding worker will use fallback mode');
    }

    this.running = true;
    logger.info('VideoEncodingWorker started');

    // Listen for new jobs
    videoEncodingQueue.on('job:added', () => {
      this.processNextJob();
    });

    // Start polling for jobs
    this.pollTimer = setInterval(() => {
      this.processNextJob();
    }, POLL_INTERVAL_MS);

    // Start stats logging
    this.statsTimer = setInterval(() => {
      const stats = videoEncodingQueue.getStats();
      logger.info({ stats }, 'Video encoding queue stats');
    }, STATS_LOG_INTERVAL_MS);

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      videoEncodingQueue.cleanup();
    }, CLEANUP_INTERVAL_MS);

    // Process any existing jobs
    this.processNextJob();
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (!this.running) return;

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
      logger.info({ pendingJobs: this.processingJobs.size }, 'Waiting for encoding jobs to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (this.processingJobs.size > 0) {
      logger.warn({ pendingJobs: this.processingJobs.size }, 'Shutdown with jobs still processing');
    }

    logger.info('VideoEncodingWorker stopped');
  }

  /**
   * Process next available job from queue
   */
  private async processNextJob(): Promise<void> {
    if (!this.running) return;

    const job = videoEncodingQueue.getNextJob();
    if (!job) return;

    this.processingJobs.add(job.id);

    try {
      await this.processJob(job);
      videoEncodingQueue.completeJob(job.id);
    } catch (error: any) {
      logger.error({ error, jobId: job.id, videoId: job.videoId }, 'Encoding job failed');
      videoEncodingQueue.failJob(job.id, error.message, true);
    } finally {
      this.processingJobs.delete(job.id);
    }

    // Check for more jobs
    if (videoEncodingQueue.hasAvailableJobs()) {
      setImmediate(() => this.processNextJob());
    }
  }

  /**
   * Process a single encoding job
   */
  private async processJob(job: EncodingJob): Promise<void> {
    logger.info({
      jobId: job.id,
      videoId: job.videoId,
      attempt: job.attempts
    }, 'Processing encoding job');

    const startTime = Date.now();

    // Check if FFmpeg is available
    const ffmpegAvailable = await ffmpegEncoder.isAvailable();

    if (ffmpegAvailable) {
      // Full FFmpeg encoding
      const result = await ffmpegEncoder.encode(job.videoId, job.inputBlobName);

      if (!result.success) {
        throw new Error(result.error || 'Encoding failed');
      }

      const duration = Date.now() - startTime;
      logger.info({
        jobId: job.id,
        videoId: job.videoId,
        durationMs: duration,
        hlsManifestUrl: result.hlsManifestUrl,
        mp4Url: result.mp4Url
      }, 'Encoding completed with FFmpeg');
    } else {
      // Fallback: copy to public container (development mode)
      logger.warn({ videoId: job.videoId }, 'FFmpeg not available, using fallback copy mode');

      const { videoStorageService } = await import('../services/VideoStorageService');
      const { prisma } = await import('../lib/prisma.js');

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
      logger.info({
        jobId: job.id,
        videoId: job.videoId,
        durationMs: duration,
        mp4Url: result.url
      }, 'Encoding completed with fallback copy');
    }
  }
}

// Export singleton instance
export const videoEncodingWorker = new VideoEncodingWorker();
