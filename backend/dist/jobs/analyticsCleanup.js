"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsCleanupJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const visitorAnalytics_1 = __importDefault(require("../services/visitorAnalytics"));
class AnalyticsCleanupJob {
    constructor() {
        this.job = null;
    }
    /**
     * Start the cron job
     * Runs at 3 AM UTC every day
     */
    start() {
        // Schedule: "0 3 * * *" = Every day at 3:00 AM UTC
        this.job = node_cron_1.default.schedule('0 3 * * *', async () => {
            console.log('[AnalyticsCleanup] Starting daily cleanup job at', new Date().toISOString());
            try {
                // 1. Aggregate yesterday's data
                await visitorAnalytics_1.default.aggregateDailyStats();
                // 2. Clean up old data
                await visitorAnalytics_1.default.cleanupOldData();
                // 3. Rotate daily IP salt
                await visitorAnalytics_1.default.rotateDailySalt();
                console.log('[AnalyticsCleanup] Daily cleanup job completed successfully');
            }
            catch (error) {
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
            await visitorAnalytics_1.default.aggregateDailyStats();
            await visitorAnalytics_1.default.cleanupOldData();
            await visitorAnalytics_1.default.rotateDailySalt();
            console.log('[AnalyticsCleanup] Manual cleanup completed successfully');
            return { success: true, message: 'Cleanup completed successfully' };
        }
        catch (error) {
            console.error('[AnalyticsCleanup] Error during manual cleanup:', error);
            return {
                success: false,
                message: 'Cleanup failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.analyticsCleanupJob = new AnalyticsCleanupJob();
exports.default = exports.analyticsCleanupJob;
//# sourceMappingURL=analyticsCleanup.js.map