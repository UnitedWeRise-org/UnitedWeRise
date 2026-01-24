/**
 * Scheduled Video Publishing Job
 *
 * Runs periodically to publish videos that have reached their scheduled time.
 * Can be invoked via:
 * - node-cron within the main application
 * - Azure Functions Timer Trigger
 * - Azure Container Apps Jobs
 *
 * @module jobs/publishScheduledVideos
 */

import { prisma } from '../lib/prisma.js';
import { logger } from '../services/logger';

/**
 * Publish all videos that have reached their scheduled publish time.
 *
 * @returns Object with counts of processed, published, and failed videos
 */
export async function publishScheduledVideos(): Promise<{
  processed: number;
  published: number;
  failed: number;
  errors: string[];
}> {
  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let published = 0;
  let failed = 0;

  logger.info('Starting scheduled video publish job');

  try {
    // Find all videos that are scheduled and past their publish time
    const videosToPublish = await prisma.video.findMany({
      where: {
        publishStatus: 'SCHEDULED',
        scheduledPublishAt: {
          lte: new Date()
        },
        // Only publish videos that are fully ready
        encodingStatus: 'READY',
        moderationStatus: 'APPROVED',
        // Not deleted
        deletedAt: null
      },
      select: {
        id: true,
        userId: true,
        caption: true,
        scheduledPublishAt: true
      }
    });

    processed = videosToPublish.length;

    if (processed === 0) {
      logger.info('No scheduled videos to publish');
      return { processed: 0, published: 0, failed: 0, errors: [] };
    }

    logger.info({ count: processed }, 'Found scheduled videos to publish');

    // Publish each video
    for (const video of videosToPublish) {
      try {
        await prisma.video.update({
          where: { id: video.id },
          data: {
            publishStatus: 'PUBLISHED',
            publishedAt: new Date(),
            isActive: true,
            scheduledPublishAt: null // Clear the schedule
          }
        });

        published++;

        logger.info({
          videoId: video.id,
          userId: video.userId,
          scheduledFor: video.scheduledPublishAt
        }, 'Video published successfully');

        // Optional: Send notification to user that their video was published
        // await notifyUserVideoPublished(video.userId, video.id);

        // Optional: Notify followers of new content
        // await notifyFollowersNewVideo(video.userId, video.id);

      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Video ${video.id}: ${errorMessage}`);

        logger.error({
          videoId: video.id,
          error: errorMessage
        }, 'Failed to publish scheduled video');
      }
    }

    const duration = Date.now() - startTime;

    logger.info({
      processed,
      published,
      failed,
      durationMs: duration
    }, 'Scheduled video publish job completed');

    return { processed, published, failed, errors };

  } catch (error) {
    logger.error({ error }, 'Scheduled video publish job failed');
    throw error;
  }
}

/**
 * Check for videos stuck in SCHEDULED state that can't be published
 * (e.g., encoding failed, moderation rejected).
 * These should be notified to the user.
 */
export async function checkStuckScheduledVideos(): Promise<number> {
  const stuckVideos = await prisma.video.findMany({
    where: {
      publishStatus: 'SCHEDULED',
      scheduledPublishAt: {
        lte: new Date()
      },
      OR: [
        { encodingStatus: 'FAILED' },
        { moderationStatus: 'REJECTED' }
      ]
    },
    select: {
      id: true,
      userId: true,
      encodingStatus: true,
      moderationStatus: true
    }
  });

  for (const video of stuckVideos) {
    logger.warn({
      videoId: video.id,
      userId: video.userId,
      encodingStatus: video.encodingStatus,
      moderationStatus: video.moderationStatus
    }, 'Scheduled video cannot be published');

    // Move to draft and notify user
    await prisma.video.update({
      where: { id: video.id },
      data: {
        publishStatus: 'DRAFT',
        scheduledPublishAt: null
      }
    });

    // TODO: Notify user that their scheduled video could not be published
    // await notifyUserScheduledPublishFailed(video.userId, video.id, reason);
  }

  return stuckVideos.length;
}

// ========================================
// Standalone Execution
// ========================================

// Allow running as standalone script
if (require.main === module) {
  (async () => {
    try {
      const result = await publishScheduledVideos();
      console.log('Publish job result:', result);

      const stuck = await checkStuckScheduledVideos();
      console.log('Stuck videos handled:', stuck);

      process.exit(0);
    } catch (error) {
      console.error('Job failed:', error);
      process.exit(1);
    }
  })();
}
