/**
 * VideoEncodingWorker
 *
 * Background worker that processes video encoding jobs from the queue.
 * Uses FFmpegEncoder to transcode videos to HLS and MP4.
 *
 * Features:
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
     * Process next available job from queue
     */
    private processNextJob;
    /**
     * Process a single encoding job
     */
    private processJob;
}
export declare const videoEncodingWorker: VideoEncodingWorker;
//# sourceMappingURL=videoEncodingWorker.d.ts.map