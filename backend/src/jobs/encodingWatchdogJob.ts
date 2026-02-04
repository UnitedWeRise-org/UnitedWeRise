/**
 * Encoding Watchdog Cron Job
 *
 * Detects and recovers stuck video encoding jobs.
 * Handles cases where Coconut.co webhooks were lost (network issues,
 * CSRF blocking, server restart during callback, etc.).
 *
 * Schedule: Every 5 minutes
 *
 * Recovery logic:
 * - Stuck > 30 min with HLS output in blob storage: recover to READY (webhook was lost)
 * - Stuck > 60 min with no output: mark as FAILED (encoding timed out)
 *
 * @module jobs/encodingWatchdogJob
 */

import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { videoStorageService } from '../services/VideoStorageService';
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
   * Find and recover stuck encoding jobs.
   */
  private async checkStuckEncodings(): Promise<void> {
    const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const timeoutThreshold = new Date(Date.now() - TIMEOUT_THRESHOLD_MS);

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

    if (stuckVideos.length === 0) return;

    jobLogger.warn({ count: stuckVideos.length }, 'Found stuck encoding jobs');

    for (const video of stuckVideos) {
      try {
        await this.recoverStuckVideo(video, timeoutThreshold);
      } catch (error) {
        jobLogger.error({ error, videoId: video.id }, 'Failed to recover stuck video');
      }
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
          encodingTiersStatus: 'PARTIAL',
          moderationStatus: process.env.NODE_ENV !== 'production' ? 'APPROVED' : undefined,
          audioStatus: process.env.NODE_ENV !== 'production' ? 'PASS' : undefined
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
