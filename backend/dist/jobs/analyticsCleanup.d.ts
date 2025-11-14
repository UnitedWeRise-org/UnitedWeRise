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
 *
 * Migration: Phase 3-4 Pino structured logging (2025-11-13)
 */
declare class AnalyticsCleanupJob {
    private job;
    /**
     * Start the cron job
     * Runs at 3 AM UTC every day
     */
    start(): void;
    /**
     * Stop the cron job (for graceful shutdown)
     */
    stop(): void;
    /**
     * Manually trigger the cleanup job (for testing/admin tools)
     */
    runNow(): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message: string;
        error: string;
    }>;
}
export declare const analyticsCleanupJob: AnalyticsCleanupJob;
export default analyticsCleanupJob;
//# sourceMappingURL=analyticsCleanup.d.ts.map