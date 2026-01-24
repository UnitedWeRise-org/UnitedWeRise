/**
 * Scheduled Video Publishing Cron Job
 *
 * Runs every minute to publish videos that have reached their scheduled time.
 *
 * Schedule: * * * * * (Every minute)
 *
 * @module jobs/scheduledVideoPublishJob
 */

import cron, { ScheduledTask } from 'node-cron';
import { publishScheduledVideos, checkStuckScheduledVideos } from './publishScheduledVideos';
import { logger } from '../services/logger';

// Create child logger for scheduled video publish job
const jobLogger = logger.child({ component: 'scheduled-video-publish-job' });

class ScheduledVideoPublishJob {
  private job: ScheduledTask | null = null;
  private stuckCheckJob: ScheduledTask | null = null;

  /**
   * Start the cron job
   * Runs every minute to check for scheduled videos
   */
  start() {
    // Schedule: "* * * * *" = Every minute
    this.job = cron.schedule('* * * * *', async () => {
      try {
        const result = await publishScheduledVideos();

        if (result.processed > 0) {
          jobLogger.info({
            processed: result.processed,
            published: result.published,
            failed: result.failed
          }, 'Scheduled video publish check completed');

          if (result.failed > 0) {
            jobLogger.warn({
              errors: result.errors
            }, 'Some scheduled videos failed to publish');
          }
        }
      } catch (error) {
        jobLogger.error({ error }, 'Error during scheduled video publish check');
      }
    });

    // Also run stuck video check every 15 minutes
    this.stuckCheckJob = cron.schedule('*/15 * * * *', async () => {
      try {
        const stuck = await checkStuckScheduledVideos();
        if (stuck > 0) {
          jobLogger.warn({ count: stuck }, 'Handled stuck scheduled videos');
        }
      } catch (error) {
        jobLogger.error({ error }, 'Error during stuck video check');
      }
    });

    jobLogger.info('Scheduled video publish job started - runs every minute');
    jobLogger.info('Stuck video check job started - runs every 15 minutes');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      jobLogger.info('Scheduled video publish job stopped');
    }
    if (this.stuckCheckJob) {
      this.stuckCheckJob.stop();
      this.stuckCheckJob = null;
      jobLogger.info('Stuck video check job stopped');
    }
  }

  /**
   * Check if the job is running
   */
  isRunning(): boolean {
    return this.job !== null;
  }
}

export default new ScheduledVideoPublishJob();
