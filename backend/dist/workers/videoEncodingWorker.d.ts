/**
 * VideoEncodingWorker
 *
 * Background worker that processes video encoding jobs from the queue.
 * Uses FFmpegEncoder with a two-phase pipeline:
 * - Phase 1: Encode 720p → run moderation → video becomes watchable
 * - Phase 2: Encode 360p → update manifest (non-fatal if fails)
 *
 * Features:
 * - Two-phase encoding for faster time-to-playable
 * - Automatic job pickup from queue
 * - Retry on failure (up to 3 attempts)
 * - Graceful shutdown support
 * - Queue statistics logging
 *
 * @module workers/videoEncodingWorker
 */
export declare class VideoEncodingWorker {
    private running;
    private pollTimer?;
    private statsTimer?;
    private cleanupTimer?;
    private processingJobs;
    /**
     * Start the worker
     */
    start(): Promise<void>;
    /**
     * Stop the worker gracefully
     */
    stop(): Promise<void>;
    /**
     * Recover orphaned videos stuck in PENDING status after server restart.
     * The in-memory queue is lost on restart, so videos that were queued but
     * not yet processed remain in PENDING state with no active job.
     * Only recovers videos created in the last 24 hours to avoid re-processing old records.
     */
    private recoverOrphanedVideos;
    /**
     * Process next available job from queue
     */
    private processNextJob;
    /**
     * Process a single encoding job using two-phase pipeline.
     *
     * Phase 1: Encode 720p → run content moderation → video becomes READY
     * Phase 2: Encode 360p → update manifest (non-fatal)
     *
     * @param job - Encoding job from the queue
     */
    private processJob;
    /**
     * Legacy single-pass encoding (both tiers at once)
     */
    private processLegacy;
    /**
     * Fallback copy mode when FFmpeg is not available (development/staging)
     */
    private processFallback;
    /**
     * Dispatch encoding to Coconut.co cloud service.
     * Fire-and-forget: the Coconut webhook handles completion/failure.
     * Supports Phase 2 retry detection for videos already at 720p.
     */
    private processCoconut;
}
export declare const videoEncodingWorker: VideoEncodingWorker;
//# sourceMappingURL=videoEncodingWorker.d.ts.map