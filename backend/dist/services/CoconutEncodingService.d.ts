/**
 * CoconutEncodingService
 *
 * Cloud video encoding service using Coconut.co REST API.
 * Supports two-phase encoding: Phase 1 (720p only) for fast unlock,
 * Phase 2 (720p + 360p) for full adaptive bitrate.
 *
 * Coconut encodes on their infrastructure and writes HLS output directly
 * to the Azure Blob Storage `videos-encoded` container.
 *
 * Feature-flagged behind VIDEO_ENCODING_SERVICE=coconut (default: ffmpeg).
 *
 * @module services/CoconutEncodingService
 */
export declare class CoconutEncodingService {
    private readonly apiKey;
    private readonly webhookSecret;
    private readonly storageAccountName;
    private readonly storageAccountKey;
    private readonly webhookBaseUrl;
    constructor();
    /**
     * Check if Coconut encoding is available (API key configured).
     */
    isAvailable(): boolean;
    /**
     * Create Phase 1 encoding job (720p only).
     * Video becomes watchable after this phase completes.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Raw blob name (e.g., "videoId/original.mp4")
     * @returns Coconut job ID
     */
    createPhase1Job(videoId: string, inputBlobName: string): Promise<{
        jobId: number;
    }>;
    /**
     * Create Phase 2 encoding job (720p + 360p).
     * Overwrites Phase 1 manifest with multi-variant version.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Raw blob name
     * @returns Coconut job ID
     */
    createPhase2Job(videoId: string, inputBlobName: string): Promise<{
        jobId: number;
    }>;
    /**
     * Build a Coconut job payload.
     */
    private buildJobPayload;
    /**
     * Submit a job to the Coconut v2 API.
     */
    private submitJob;
}
/** Singleton instance */
export declare const coconutEncodingService: CoconutEncodingService;
//# sourceMappingURL=CoconutEncodingService.d.ts.map