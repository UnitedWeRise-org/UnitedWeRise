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

import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { videoStorageService } from '../services/VideoStorageService';
import { videoEncodingQueue } from '../queues/videoEncodingQueue';
import { logger } from '../services/logger';

const jobLogger = logger.child({ component: 'encoding-watchdog' });

/** Minimum time before considering a job stuck (milliseconds) */
const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/** Time after which a stuck job with no output is marked FAILED (milliseconds) */
const TIMEOUT_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes

class EncodingWatchdogJob {
  private job: ScheduledTask | null = null;

  /**
   * Start the watchdog cron job.
   * Runs every 5 minutes to check for stuck encoding jobs.
   */
  start() {
    this.job = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.checkStuckEncodings();
      } catch (error) {
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
  isRunning(): boolean {
    return this.job !== null;
  }

  /**
   * Find and recover stuck encoding jobs (both ENCODING and PENDING).
   */
  private async checkStuckEncodings(): Promise<void> {
    const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const timeoutThreshold = new Date(Date.now() - TIMEOUT_THRESHOLD_MS);

    // Check for stuck ENCODING videos (webhook lost or FFmpeg process died)
    const stuckVideos = await prisma.video.findMany({
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
        } catch (error) {
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
  private async requeueOrphanedPendingVideos(stuckThreshold: Date): Promise<void> {
    const orphanedVideos = await prisma.video.findMany({
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

    if (orphanedVideos.length === 0) return;

    let requeued = 0;
    for (const video of orphanedVideos) {
      // Skip if already in the queue (avoid duplicates)
      if (videoEncodingQueue.getJobByVideoId(video.id)) {
        continue;
      }

      if (!video.originalBlobName) {
        jobLogger.warn({ videoId: video.id }, 'Orphaned PENDING video has no originalBlobName — skipping');
        continue;
      }

      videoEncodingQueue.addJob(video.id, video.originalBlobName);
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
  private async recoverStuckVideo(
    video: { id: string; encodingStartedAt: Date | null; encodingTiersStatus: string },
    timeoutThreshold: Date
  ): Promise<void> {
    const manifestPath = `${video.id}/master.m3u8`;
    const outputExists = await videoStorageService.encodedBlobExists(manifestPath);

    if (outputExists) {
      // Encoding succeeded but webhook was lost — recover DB state
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
      const cdnEndpoint = process.env.AZURE_CDN_ENDPOINT;
      const hlsManifestUrl = cdnEndpoint
        ? `${cdnEndpoint}/${video.id}/master.m3u8`
        : `https://${accountName}.blob.core.windows.net/videos-encoded/${video.id}/master.m3u8`;

      await prisma.video.update({
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

    } else if (video.encodingStartedAt && video.encodingStartedAt < timeoutThreshold) {
      // No output after timeout — mark as failed
      await prisma.video.update({
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

    } else {
      // Stuck > 30 min but < 60 min with no output — still waiting
      jobLogger.info({
        videoId: video.id,
        stuckSince: video.encodingStartedAt
      }, 'Video stuck but within timeout window — will check again');
    }
  }
}

export default new EncodingWatchdogJob();
