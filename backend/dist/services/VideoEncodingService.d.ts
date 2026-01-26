/**
 * VideoEncodingService
 *
 * Abstraction layer for video encoding operations.
 * Now integrated with FFmpeg-based encoding pipeline.
 *
 * Modes:
 * 1. Queue Mode (production): Jobs are queued and processed by worker
 * 2. Immediate Mode (development): Videos are encoded immediately
 * 3. Fallback Mode: Copy raw to public container if FFmpeg unavailable
 *
 * Encoding Tiers:
 * - 720p @ 2.5 Mbps
 * - 480p @ 1.2 Mbps
 * - 360p @ 0.6 Mbps
 *
 * @module services/VideoEncodingService
 */
export type EncodingStatus = 'PENDING' | 'ENCODING' | 'READY' | 'FAILED';
export interface EncodingJobResult {
    jobName: string;
    status: EncodingStatus;
    outputAssetName?: string;
    hlsManifestUrl?: string;
    mp4Url?: string;
    error?: string;
}
export interface EncodingConfig {
    subscriptionId: string;
    resourceGroup: string;
    accountName: string;
}
/**
 * Video encoding service stub.
 *
 * In development: Auto-marks videos as READY with original URL as fallback
 * In production: Logs warning and leaves videos in PENDING status
 *
 * Future: Full Azure Media Services integration when SDK is installed
 */
export declare class VideoEncodingService {
    private config;
    private initialized;
    private queueEnabled;
    /**
     * Initialize the encoding service
     */
    initialize(): Promise<void>;
    /**
     * Check if encoding service is available
     * Returns true since we always have at least the fallback
     */
    isAvailable(): boolean;
    /**
     * Submit a video for encoding
     *
     * Queue mode: Adds to encoding queue for background processing
     * Immediate mode: Processes immediately (development)
     *
     * @param videoId - The video record ID
     * @param inputUrl - URL to the raw video in blob storage
     * @returns Job name for tracking
     */
    submitEncodingJob(videoId: string, inputUrl: string): Promise<string | null>;
    /**
     * Simulate encoding for development/staging environments
     * Copies video from private raw container to public encoded container
     * Made public so publish endpoint can trigger simulation for stuck videos
     *
     * @param videoId - The video record ID
     * @param _inputUrl - Original URL (unused, kept for API compatibility)
     */
    simulateEncodingForDevelopment(videoId: string, _inputUrl: string): Promise<void>;
    /**
     * Handle encoding job completion (called from webhook)
     *
     * Updates video record based on job result
     */
    handleJobComplete(videoId: string, jobName: string, success: boolean, error?: string): Promise<void>;
    /**
     * Clean up encoding resources
     *
     * Stub implementation - no resources to clean up
     * Full implementation would delete Azure Media Services assets
     */
    cleanupResources(videoId: string): Promise<void>;
    /**
     * Manually mark a video as encoded (admin function)
     *
     * For use when encoding is done externally (e.g., FFmpeg script)
     */
    markAsEncoded(videoId: string, options: {
        hlsManifestUrl?: string;
        mp4Url?: string;
    }): Promise<void>;
}
export declare const videoEncodingService: VideoEncodingService;
//# sourceMappingURL=VideoEncodingService.d.ts.map