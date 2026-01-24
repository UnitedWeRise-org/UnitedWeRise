/**
 * Scheduled Video Publishing Cron Job
 *
 * Runs every minute to publish videos that have reached their scheduled time.
 *
 * Schedule: * * * * * (Every minute)
 *
 * @module jobs/scheduledVideoPublishJob
 */
declare class ScheduledVideoPublishJob {
    private job;
    private stuckCheckJob;
    /**
     * Start the cron job
     * Runs every minute to check for scheduled videos
     */
    start(): void;
    /**
     * Stop the cron job
     */
    stop(): void;
    /**
     * Check if the job is running
     */
    isRunning(): boolean;
}
declare const _default: ScheduledVideoPublishJob;
export default _default;
//# sourceMappingURL=scheduledVideoPublishJob.d.ts.map