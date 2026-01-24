"use strict";
/**
 * Scheduled Video Publishing Cron Job
 *
 * Runs every minute to publish videos that have reached their scheduled time.
 *
 * Schedule: * * * * * (Every minute)
 *
 * @module jobs/scheduledVideoPublishJob
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const publishScheduledVideos_1 = require("./publishScheduledVideos");
const logger_1 = require("../services/logger");
// Create child logger for scheduled video publish job
const jobLogger = logger_1.logger.child({ component: 'scheduled-video-publish-job' });
class ScheduledVideoPublishJob {
    job = null;
    stuckCheckJob = null;
    /**
     * Start the cron job
     * Runs every minute to check for scheduled videos
     */
    start() {
        // Schedule: "* * * * *" = Every minute
        this.job = node_cron_1.default.schedule('* * * * *', async () => {
            try {
                const result = await (0, publishScheduledVideos_1.publishScheduledVideos)();
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
            }
            catch (error) {
                jobLogger.error({ error }, 'Error during scheduled video publish check');
            }
        });
        // Also run stuck video check every 15 minutes
        this.stuckCheckJob = node_cron_1.default.schedule('*/15 * * * *', async () => {
            try {
                const stuck = await (0, publishScheduledVideos_1.checkStuckScheduledVideos)();
                if (stuck > 0) {
                    jobLogger.warn({ count: stuck }, 'Handled stuck scheduled videos');
                }
            }
            catch (error) {
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
    isRunning() {
        return this.job !== null;
    }
}
exports.default = new ScheduledVideoPublishJob();
//# sourceMappingURL=scheduledVideoPublishJob.js.map