/**
 * VideoEncodingService
 *
 * Abstraction layer for video encoding operations.
 * Designed for portability to Azure Media Services, FFmpeg, or other solutions.
 *
 * CURRENT STATUS: Stub implementation
 * - In development mode: Auto-marks videos as READY for testing
 * - In production: Videos remain in PENDING status until Azure Media Services
 *   SDK is installed and configured
 *
 * TO ENABLE FULL AZURE MEDIA SERVICES:
 * 1. Install: npm install @azure/identity @azure/arm-mediaservices
 * 2. Configure environment variables:
 *    - AZURE_MEDIA_SERVICES_SUBSCRIPTION_ID
 *    - AZURE_MEDIA_SERVICES_RESOURCE_GROUP
 *    - AZURE_MEDIA_SERVICES_ACCOUNT_NAME
 * 3. Replace this stub implementation with full Azure SDK integration
 *
 * Planned Encoding Tiers:
 * - 1080p @ 4.5 Mbps
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
    private sdkAvailable;
    /**
     * Initialize the encoding service
     * Currently checks for configuration but SDK support is stubbed
     */
    initialize(): Promise<void>;
    /**
     * Check if encoding service is available
     * Returns false in stub mode
     */
    isAvailable(): boolean;
    /**
     * Submit a video for encoding
     *
     * In development: Simulates encoding by auto-marking as READY
     * In production: Leaves video in PENDING status
     *
     * @param videoId - The video record ID
     * @param inputUrl - URL to the raw video in blob storage
     * @returns Job name for tracking, or null if encoding not available
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