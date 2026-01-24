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
/**
 * Publish all videos that have reached their scheduled publish time.
 *
 * @returns Object with counts of processed, published, and failed videos
 */
export declare function publishScheduledVideos(): Promise<{
    processed: number;
    published: number;
    failed: number;
    errors: string[];
}>;
/**
 * Check for videos stuck in SCHEDULED state that can't be published
 * (e.g., encoding failed, moderation rejected).
 * These should be notified to the user.
 */
export declare function checkStuckScheduledVideos(): Promise<number>;
//# sourceMappingURL=publishScheduledVideos.d.ts.map