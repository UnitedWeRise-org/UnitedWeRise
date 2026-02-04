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
declare class EncodingWatchdogJob {
    private job;
    /**
     * Start the watchdog cron job.
     * Runs every 5 minutes to check for stuck encoding jobs.
     */
    start(): void;
    /**
     * Stop the watchdog cron job.
     */
    stop(): void;
    /**
     * Check if the job is running.
     */
    isRunning(): boolean;
    /**
     * Find and recover stuck encoding jobs.
     */
    private checkStuckEncodings;
    /**
     * Attempt to recover a single stuck video.
     * Checks blob storage for existing output before deciding recovery action.
     */
    private recoverStuckVideo;
}
declare const _default: EncodingWatchdogJob;
export default _default;
//# sourceMappingURL=encodingWatchdogJob.d.ts.map