/**
 * Video Content Moderation Service
 *
 * Provides content moderation for user-uploaded videos using Azure Content Safety.
 * Handles both visual content analysis and audio policy checking.
 *
 * Moderation Flow:
 * 1. Visual content analysis via Azure Content Safety
 * 2. Audio policy check (configurable: STRICT, WARN, PERMISSIVE)
 * 3. Combined moderation decision
 *
 * @module services/videoContentModerationService
 */
export type VideoModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AudioStatus = 'PENDING' | 'PASS' | 'FLAGGED' | 'MUTED';
export type AudioPolicy = 'STRICT' | 'WARN' | 'PERMISSIVE';
export interface VideoModerationResult {
    status: VideoModerationStatus;
    reason?: string;
    confidence?: number;
    categories?: {
        hate?: number;
        selfHarm?: number;
        sexual?: number;
        violence?: number;
    };
    audioStatus: AudioStatus;
    audioMuted: boolean;
    processingTime: number;
}
export interface VideoModerationRequest {
    videoId: string;
    videoUrl: string;
    thumbnailUrl?: string;
    userId: string;
}
export declare class VideoContentModerationService {
    private client;
    private isConfigured;
    private endpoint;
    constructor();
    /**
     * Moderate a video
     *
     * @param request - Video moderation request with video details
     * @returns Moderation result
     */
    moderateVideo(request: VideoModerationRequest): Promise<VideoModerationResult>;
    /**
     * Analyze video content using Azure Content Safety
     *
     * Note: Azure Content Safety video analysis is async and may take time.
     * For MVP, we use thumbnail analysis + periodic frame sampling.
     */
    private analyzeVideoContent;
    /**
     * Moderate thumbnail image
     */
    private moderateThumbnail;
    /**
     * Check audio policy
     *
     * STRICT: Flag any music (not speech)
     * WARN: Allow but warn user
     * PERMISSIVE: Allow any audio
     */
    private checkAudioPolicy;
    /**
     * Combine visual and audio moderation results
     */
    private combineResults;
    /**
     * Update video record with moderation result
     */
    private updateVideoModeration;
    /**
     * Create fallback result when service is unavailable
     */
    private createFallbackResult;
    /**
     * Extract severity from Azure Content Safety response
     */
    private getSeverity;
    /**
     * Get human-readable rejection reason
     */
    private getRejectReason;
    /**
     * Queue a video for moderation (called after encoding completes)
     */
    queueModeration(videoId: string): Promise<void>;
    /**
     * Check if service is configured
     */
    isAvailable(): boolean;
}
export declare const videoContentModerationService: VideoContentModerationService;
//# sourceMappingURL=videoContentModerationService.d.ts.map