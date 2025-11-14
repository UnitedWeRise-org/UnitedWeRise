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
 *
 * Migration: Phase 3-4 Pino structured logging (2025-11-13)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsCleanupJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const visitorAnalytics_1 = __importDefault(require("../services/visitorAnalytics"));
const logger_1 = require("../services/logger");
// Create child logger for analytics cleanup job
const jobLogger = logger_1.logger.child({ component: 'analytics-cleanup-job' });
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
            jobLogger.info({ startTime: new Date().toISOString() }, 'Starting daily cleanup job');
            try {
                // 1. Aggregate yesterday's data
                await visitorAnalytics_1.default.aggregateDailyStats();
                // 2. Clean up old data
                await visitorAnalytics_1.default.cleanupOldData();
                // 3. Rotate daily IP salt
                await visitorAnalytics_1.default.rotateDailySalt();
                jobLogger.info('Daily cleanup job completed successfully');
            }
            catch (error) {
                jobLogger.error({ error }, 'Error during daily cleanup');
            }
        });
        jobLogger.info({ schedule: '0 3 * * *' }, 'Cron job started - runs daily at 3:00 AM UTC');
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
     * Manually trigger the cleanup job (for testing/admin tools)
     */
    async runNow() {
        jobLogger.info('Manually triggering cleanup job');
        try {
            await visitorAnalytics_1.default.aggregateDailyStats();
            await visitorAnalytics_1.default.cleanupOldData();
            await visitorAnalytics_1.default.rotateDailySalt();
            jobLogger.info('Manual cleanup completed successfully');
            return { success: true, message: 'Cleanup completed successfully' };
        }
        catch (error) {
            jobLogger.error({ error }, 'Error during manual cleanup');
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