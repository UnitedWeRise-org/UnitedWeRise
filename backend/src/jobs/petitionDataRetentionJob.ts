/**
 * Petition Data Retention Cron Job
 *
 * Runs daily at 4 AM UTC to enforce data retention policies:
 * - Finds petitions with electionDate + 22 months in the past
 * - Deletes signature data and archives petitions (unless on legal hold)
 *
 * Schedule: 0 4 * * * (Every day at 4:00 AM UTC)
 */

import cron, { ScheduledTask } from 'node-cron';
import { petitionRetentionService } from '../services/petitionRetentionService';
import { logger } from '../services/logger';

// Create child logger for petition data retention job
const jobLogger = logger.child({ component: 'petition-data-retention-job' });

class PetitionDataRetentionJob {
  private job: ScheduledTask | null = null;

  /**
   * Start the cron job
   * Runs at 4 AM UTC every day
   */
  start() {
    // Schedule: "0 4 * * *" = Every day at 4:00 AM UTC
    this.job = cron.schedule('0 4 * * *', async () => {
      jobLogger.info({ startTime: new Date().toISOString() }, 'Starting petition data retention job');

      try {
        await this.executeRetention();
        jobLogger.info('Petition data retention job completed successfully');
      } catch (error) {
        jobLogger.error({ error }, 'Error during petition data retention');
      }
    });

    jobLogger.info({ schedule: '0 4 * * *' }, 'Cron job started - runs daily at 4:00 AM UTC');
  }

  /**
   * Stop the cron job (for graceful shutdown)
   */
  stop() {
    if (this.job) {
      this.job.stop();
      jobLogger.info('Cron job stopped');
    }
  }

  /**
   * Manually trigger the retention job (for testing/admin tools)
   */
  async runNow() {
    jobLogger.info('Manually triggering petition data retention job');

    try {
      const result = await this.executeRetention();

      jobLogger.info('Manual petition data retention completed successfully');
      return { success: true, ...result };
    } catch (error) {
      jobLogger.error({ error }, 'Error during manual petition data retention');
      return {
        success: false,
        message: 'Petition data retention failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute the retention logic: find expired petitions and delete their data.
   *
   * @returns Summary of deleted and skipped petitions
   */
  private async executeRetention(): Promise<{ message: string; deleted: number; skipped: number }> {
    const expiredPetitions = await petitionRetentionService.getExpiredPetitions();

    if (expiredPetitions.length === 0) {
      jobLogger.info('No expired petitions found for data retention');
      return { message: 'No expired petitions found', deleted: 0, skipped: 0 };
    }

    let deleted = 0;
    let skipped = 0;

    for (const petition of expiredPetitions) {
      try {
        await petitionRetentionService.deletePetitionData(petition.id);
        deleted++;
        jobLogger.info(
          { petitionId: petition.id, title: petition.title },
          'Petition data deleted by retention policy'
        );
      } catch (error) {
        skipped++;
        jobLogger.warn(
          { error, petitionId: petition.id, title: petition.title },
          'Skipped petition during data retention'
        );
      }
    }

    const message = `Petition data retention: deleted ${deleted} petitions, ${skipped} skipped (errors)`;
    jobLogger.info({ deleted, skipped, total: expiredPetitions.length }, message);

    return { message, deleted, skipped };
  }
}

export const petitionDataRetentionJob = new PetitionDataRetentionJob();
export default petitionDataRetentionJob;
