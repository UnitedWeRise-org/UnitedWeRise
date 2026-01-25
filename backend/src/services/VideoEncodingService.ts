/**
 * VideoEncodingService
 *
 * Abstraction layer for video encoding operations.
 * Designed for portability to Azure Media Services, FFmpeg, or other solutions.
 *
 * CURRENT STATUS: Stub implementation
 * - In development mode: Auto-marks videos as READY for testing
 * - In production: Videos remain in PENDING status until Azure Media Services
 *   SDK is installed and configured
 *
 * TO ENABLE FULL AZURE MEDIA SERVICES:
 * 1. Install: npm install @azure/identity @azure/arm-mediaservices
 * 2. Configure environment variables:
 *    - AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID
 *    - AZURE_MEDIA_SERVICES_RESOURCE_GROUP
 *    - AZURE_MEDIA_SERVICES_ACCOUNT_NAME
 * 3. Replace this stub implementation with full Azure SDK integration
 *
 * Planned Encoding Tiers:
 * - 1080p @ 4.5 Mbps
 * - 720p @ 2.5 Mbps
 * - 480p @ 1.2 Mbps
 * - 360p @ 0.6 Mbps
 *
 * @module services/VideoEncodingService
 */

import { prisma } from '../lib/prisma.js';
import { logger } from './logger';

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
  private sdkAvailable: boolean = false;

  /**
   * Initialize the encoding service
   * Currently checks for configuration but SDK support is stubbed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const subscriptionId = process.env.AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID;
    const resourceGroup = process.env.AZURE_MEDIA_SERVICES_RESOURCE_GROUP;
    const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;

    if (subscriptionId && resourceGroup && accountName) {
      this.config = { subscriptionId, resourceGroup, accountName };
      logger.info('VideoEncodingService: Azure config detected but SDK not installed');
      logger.info('To enable encoding: npm install @azure/identity @azure/arm-mediaservices');
    } else {
      logger.warn('VideoEncodingService: Azure Media Services not configured');
    }

    // SDK is not available in this stub implementation
    this.sdkAvailable = false;
    this.initialized = true;
  }

  /**
   * Check if encoding service is available
   * Returns false in stub mode
   */
  isAvailable(): boolean {
    return this.initialized && this.sdkAvailable;
  }

  /**
   * Submit a video for encoding
   *
   * In development: Simulates encoding by auto-marking as READY
   * In production: Leaves video in PENDING status
   *
   * @param videoId - The video record ID
   * @param inputUrl - URL to the raw video in blob storage
   * @returns Job name for tracking, or null if encoding not available
   */
  async submitEncodingJob(videoId: string, inputUrl: string): Promise<string | null> {
    await this.initialize();

    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      // Development mode: simulate encoding
      await this.simulateEncodingForDevelopment(videoId, inputUrl);
      return `simulated-job-${videoId}`;
    }

    // Production without SDK: log warning, leave in PENDING
    logger.warn({
      videoId,
      hasConfig: !!this.config
    }, 'Video encoding service not available. Video will remain in PENDING status.');

    return null;
  }

  /**
   * Simulate encoding for development/staging environments
   * Sets video to READY with the original URL as fallback MP4
   * Made public so publish endpoint can trigger simulation for stuck videos
   */
  public async simulateEncodingForDevelopment(videoId: string, inputUrl: string): Promise<void> {
    logger.info({ videoId }, 'Simulating video encoding for development');

    // Update to ENCODING status
    await prisma.video.update({
      where: { id: videoId },
      data: {
        encodingStatus: 'ENCODING',
        encodingStartedAt: new Date()
      }
    });

    // Simulate processing delay (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mark as READY with original URL as fallback
    await prisma.video.update({
      where: { id: videoId },
      data: {
        encodingStatus: 'READY',
        encodingCompletedAt: new Date(),
        // Use original URL as fallback MP4 for playback
        mp4Url: inputUrl,
        // Auto-approve moderation in development
        moderationStatus: 'APPROVED',
        audioStatus: 'PASS'
      }
    });

    logger.info({ videoId }, 'Development encoding simulation complete');
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
