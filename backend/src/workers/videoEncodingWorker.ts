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

import { videoEncodingQueue, EncodingJob } from '../queues/videoEncodingQueue';
import { ffmpegEncoder } from '../services/FFmpegEncoder';
import { videoContentModerationService } from '../services/videoContentModerationService';
import { logger } from '../services/logger';

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
    logger.info({ twoPhaseEnabled: TWO_PHASE_ENABLED }, 'VideoEncodingWorker started');

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
   * Process a single encoding job using two-phase pipeline.
   *
   * Phase 1: Encode 720p → run content moderation → video becomes READY
   * Phase 2: Encode 360p → update manifest (non-fatal)
   *
   * @param job - Encoding job from the queue
   */
  private async processJob(job: EncodingJob): Promise<void> {
    logger.info({
      jobId: job.id,
      videoId: job.videoId,
      attempt: job.attempts,
      twoPhase: TWO_PHASE_ENABLED
    }, 'Processing encoding job');

    const startTime = Date.now();

    // Check if FFmpeg is available
    const ffmpegAvailable = await ffmpegEncoder.isAvailable();

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
    const { prisma } = await import('../lib/prisma.js');
    const videoState = await prisma.video.findUnique({
      where: { id: job.videoId },
      select: { encodingStatus: true, encodingTiersStatus: true }
    });

    if (videoState?.encodingStatus === 'READY' &&
        (videoState.encodingTiersStatus === 'PARTIAL' || videoState.encodingTiersStatus === 'PARTIAL_FAILED')) {
      // Skip Phase 1, go directly to Phase 2 (360p retry)
      logger.info({ videoId: job.videoId }, 'Phase 2 retry detected — skipping Phase 1');
      const phase2Result = await ffmpegEncoder.encodePhase2(job.videoId, job.inputBlobName);

      if (phase2Result.success) {
        logger.info({ videoId: job.videoId }, 'Phase 2 retry completed successfully');
      } else {
        logger.warn({ videoId: job.videoId, error: phase2Result.error }, 'Phase 2 retry failed');
      }
      return;
    }

    // Phase 1: Encode 720p (critical — failure here fails the job)
    const phase1Result = await ffmpegEncoder.encodePhase1(job.videoId, job.inputBlobName);

    if (!phase1Result.success) {
      throw new Error(phase1Result.error || 'Phase 1 encoding failed');
    }

    const phase1Duration = Date.now() - startTime;
    logger.info({
      jobId: job.id,
      videoId: job.videoId,
      phase1DurationMs: phase1Duration,
      hlsManifestUrl: phase1Result.hlsManifestUrl
    }, 'Phase 1 complete — running content moderation');

    // Run content moderation between phases (video is READY but not yet moderation-approved)
    try {
      await videoContentModerationService.queueModeration(job.videoId);
    } catch (error) {
      logger.error({ error, videoId: job.videoId }, 'Content moderation failed — video remains in current moderation state');
    }

    // Phase 2: Encode 360p (non-fatal — video already watchable at 720p)
    const phase2Start = Date.now();
    const phase2Result = await ffmpegEncoder.encodePhase2(job.videoId, job.inputBlobName);

    const totalDuration = Date.now() - startTime;

    if (phase2Result.success) {
      logger.info({
        jobId: job.id,
        videoId: job.videoId,
        phase1DurationMs: phase1Duration,
        phase2DurationMs: Date.now() - phase2Start,
        totalDurationMs: totalDuration
      }, 'Two-phase encoding completed successfully');
    } else {
      logger.warn({
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
  private async processLegacy(job: EncodingJob, startTime: number): Promise<void> {
    const result = await ffmpegEncoder.encode(job.videoId, job.inputBlobName);

    if (!result.success) {
      throw new Error(result.error || 'Encoding failed');
    }

    // Run content moderation after encoding
    try {
      await videoContentModerationService.queueModeration(job.videoId);
    } catch (error) {
      logger.error({ error, videoId: job.videoId }, 'Content moderation failed after legacy encoding');
    }

    const duration = Date.now() - startTime;
    logger.info({
      jobId: job.id,
      videoId: job.videoId,
      durationMs: duration,
      hlsManifestUrl: result.hlsManifestUrl
    }, 'Encoding completed with FFmpeg (legacy single-pass)');
  }

  /**
   * Fallback copy mode when FFmpeg is not available (development/staging)
   */
  private async processFallback(job: EncodingJob, startTime: number): Promise<void> {
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
        audioStatus: 'PASS',
        encodingTiersStatus: 'ALL'
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

// Export singleton instance
export const videoEncodingWorker = new VideoEncodingWorker();
