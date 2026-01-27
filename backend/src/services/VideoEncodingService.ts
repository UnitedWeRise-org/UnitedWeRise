/**
 * VideoEncodingService
 *
 * Abstraction layer for video encoding operations.
 * Now integrated with FFmpeg-based encoding pipeline.
 *
 * Modes:
 * 1. Queue Mode (production): Jobs are queued and processed by worker
 * 2. Immediate Mode (development): Videos are encoded immediately
 * 3. Fallback Mode: Copy raw to public container if FFmpeg unavailable
 *
 * Encoding Tiers:
 * - 720p @ 2.5 Mbps
 * - 480p @ 1.2 Mbps
 * - 360p @ 0.6 Mbps
 *
 * @module services/VideoEncodingService
 */

import { prisma } from '../lib/prisma.js';
import { logger } from './logger';
import { videoStorageService } from './VideoStorageService';
import { videoEncodingQueue } from '../queues/videoEncodingQueue';

// ========================================
// Types
// ========================================

export type EncodingStatus = 'PENDING' | 'ENCODING' | 'READY' | 'FAILED';

export interface EncodingJobResult {
  jobName: string;
  status: EncodingStatus;
  outputAssetName?: string;
  hlsManifestUrl?: string;
  mp4Url?: string;
  error?: string;
}

export interface EncodingConfig {
  subscriptionId: string;
  resourceGroup: string;
  accountName: string;
}

// ========================================
// VideoEncodingService Class (Stub Implementation)
// ========================================

/**
 * Video encoding service stub.
 *
 * In development: Auto-marks videos as READY with original URL as fallback
 * In production: Logs warning and leaves videos in PENDING status
 *
 * Future: Full Azure Media Services integration when SDK is installed
 */
export class VideoEncodingService {
  private config: EncodingConfig | null = null;
  private initialized: boolean = false;
  private queueEnabled: boolean = false;

  /**
   * Initialize the encoding service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const subscriptionId = process.env.AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID;
    const resourceGroup = process.env.AZURE_MEDIA_SERVICES_RESOURCE_GROUP;
    const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;

    if (subscriptionId && resourceGroup && accountName) {
      this.config = { subscriptionId, resourceGroup, accountName };
    }

    // Queue mode is enabled when VIDEO_ENCODING_QUEUE=true
    this.queueEnabled = process.env.VIDEO_ENCODING_QUEUE === 'true';

    logger.info({
      queueEnabled: this.queueEnabled,
      hasAzureConfig: !!this.config
    }, 'VideoEncodingService initialized');

    this.initialized = true;
  }

  /**
   * Check if encoding service is available
   * Returns true since we always have at least the fallback
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Submit a video for encoding
   *
   * Queue mode: Adds to encoding queue for background processing
   * Immediate mode: Processes immediately (development)
   *
   * @param videoId - The video record ID
   * @param inputUrl - URL to the raw video in blob storage
   * @returns Job name for tracking
   */
  async submitEncodingJob(videoId: string, inputUrl: string): Promise<string | null> {
    await this.initialize();

    const isDevelopment = process.env.NODE_ENV !== 'production';
    logger.info({ videoId, isDevelopment }, 'Encoding job received');

    // Get the blob name for the video
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { originalBlobName: true }
    });

    if (!video?.originalBlobName) {
      logger.error({ videoId }, 'Cannot submit encoding job - no original blob name');
      return null;
    }

    if (this.queueEnabled) {
      // Queue mode: Add to background queue
      const jobId = videoEncodingQueue.addJob(videoId, video.originalBlobName);
      logger.info({ videoId, jobId }, 'Video encoding job queued');
      return jobId;
    }

    // Immediate mode: Process now (for development/staging)
    if (isDevelopment) {
      // Development mode: simulate encoding with copy
      await this.simulateEncodingForDevelopment(videoId, inputUrl);
      return `immediate-job-${videoId}`;
    }

    // Production without queue: add to queue anyway for worker to pick up
    const jobId = videoEncodingQueue.addJob(videoId, video.originalBlobName);
    logger.info({ videoId, jobId }, 'Video encoding job added to queue (worker will process)');
    return jobId;
  }

  /**
   * Simulate encoding for development/staging environments
   * Copies video from private raw container to public encoded container
   * Made public so publish endpoint can trigger simulation for stuck videos
   *
   * @param videoId - The video record ID
   * @param _inputUrl - Original URL (unused, kept for API compatibility)
   */
  public async simulateEncodingForDevelopment(videoId: string, _inputUrl: string): Promise<void> {
    logger.info({ videoId }, 'Starting simulated encoding (dev/staging)');

    // Update to ENCODING status
    await prisma.video.update({
      where: { id: videoId },
      data: {
        encodingStatus: 'ENCODING',
        encodingStartedAt: new Date()
      }
    });

    // Get the raw blob name from the video record
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { originalBlobName: true }
    });

    if (!video?.originalBlobName) {
      throw new Error(`Video ${videoId} has no originalBlobName`);
    }

    // Copy video from private raw container to public encoded container
    const result = await videoStorageService.copyRawToEncoded(videoId, video.originalBlobName);

    logger.info({ videoId, mp4Url: result.url }, 'Video copied to public container');

    // Mark as READY with public URL
    await prisma.video.update({
      where: { id: videoId },
      data: {
        encodingStatus: 'READY',
        encodingCompletedAt: new Date(),
        // Now points to PUBLIC videos-encoded container
        mp4Url: result.url,
        // Auto-approve moderation in development
        moderationStatus: 'APPROVED',
        audioStatus: 'PASS'
      }
    });

    logger.info({ videoId }, 'Database updated with encoded URLs');
    logger.info({ videoId, mp4Url: result.url }, 'Development encoding simulation complete');
  }

  /**
   * Handle encoding job completion (called from webhook)
   *
   * Updates video record based on job result
   */
  async handleJobComplete(
    videoId: string,
    jobName: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    if (success) {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          encodingStatus: 'READY',
          encodingCompletedAt: new Date()
        }
      });
      logger.info({ videoId, jobName }, 'Video encoding completed successfully');
    } else {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          encodingStatus: 'FAILED',
          encodingCompletedAt: new Date(),
          encodingError: error || 'Encoding job failed'
        }
      });
      logger.error({ videoId, jobName, error }, 'Video encoding failed');
    }
  }

  /**
   * Clean up encoding resources
   *
   * Stub implementation - no resources to clean up
   * Full implementation would delete Azure Media Services assets
   */
  async cleanupResources(videoId: string): Promise<void> {
    if (!this.isAvailable()) {
      logger.info({ videoId }, 'No encoding resources to cleanup (stub mode)');
      return;
    }

    // Full implementation would clean up:
    // - Input asset
    // - Output asset
    // - Encoding job
    // - Streaming locator
    logger.info({ videoId }, 'Encoding resources cleanup would happen here');
  }

  /**
   * Manually mark a video as encoded (admin function)
   *
   * For use when encoding is done externally (e.g., FFmpeg script)
   */
  async markAsEncoded(
    videoId: string,
    options: {
      hlsManifestUrl?: string;
      mp4Url?: string;
    }
  ): Promise<void> {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        encodingStatus: 'READY',
        encodingCompletedAt: new Date(),
        hlsManifestUrl: options.hlsManifestUrl,
        mp4Url: options.mp4Url
      }
    });
    logger.info({ videoId, ...options }, 'Video manually marked as encoded');
  }
}

// Export singleton instance
export const videoEncodingService = new VideoEncodingService();
