/**
 * Analytics Cleanup Cron Job
 *
 * Runs daily at 3 AM UTC to maintain visitor analytics data:
 * - Aggregates yesterday's PageView data into DailyVisitStats
 * - Deletes PageView records older than retention period (30 days)
 * - Rotates daily IP salt for privacy
 * - Cleans up expired IPRateLimit blocks
 *
 * Schedule: 0 3 * * * (Every day at 3:00 AM UTC)
 */

import cron, { ScheduledTask } from 'node-cron';
import visitorAnalytics from '../services/visitorAnalytics';

class AnalyticsCleanupJob {
  private job: ScheduledTask | null = null;

  /**
   * Start the cron job
   * Runs at 3 AM UTC every day
   */
  start() {
    // Schedule: "0 3 * * *" = Every day at 3:00 AM UTC
    this.job = cron.schedule('0 3 * * *', async () => {
      console.log('[AnalyticsCleanup] Starting daily cleanup job at', new Date().toISOString());

      try {
        // 1. Aggregate yesterday's data
        await visitorAnalytics.aggregateDailyStats();

        // 2. Clean up old data
        await visitorAnalytics.cleanupOldData();

        // 3. Rotate daily IP salt
        await visitorAnalytics.rotateDailySalt();

        console.log('[AnalyticsCleanup] Daily cleanup job completed successfully');
      } catch (error) {
        console.error('[AnalyticsCleanup] Error during daily cleanup:', error);
      }
    });

    console.log('[AnalyticsCleanup] Cron job started - runs daily at 3:00 AM UTC');
  }

  /**
   * Stop the cron job (for graceful shutdown)
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('[AnalyticsCleanup] Cron job stopped');
    }
  }

  /**
   * Manually trigger the cleanup job (for testing/admin tools)
   */
  async runNow() {
    console.log('[AnalyticsCleanup] Manually triggering cleanup job');

    try {
      await visitorAnalytics.aggregateDailyStats();
      await visitorAnalytics.cleanupOldData();
      await visitorAnalytics.rotateDailySalt();

      console.log('[AnalyticsCleanup] Manual cleanup completed successfully');
      return { success: true, message: 'Cleanup completed successfully' };
    } catch (error) {
      console.error('[AnalyticsCleanup] Error during manual cleanup:', error);
      return {
        success: false,
        message: 'Cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const analyticsCleanupJob = new AnalyticsCleanupJob();
export default analyticsCleanupJob;
