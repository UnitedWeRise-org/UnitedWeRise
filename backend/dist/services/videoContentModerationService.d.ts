/**
 * Video Content Moderation Service
 *
 * Provides content moderation for user-uploaded videos using Azure Content Safety.
 * Handles visual content analysis (frame sampling), audio policy checking,
 * and caption text moderation.
 *
 * Moderation Flow:
 * 1. Thumbnail quick-check via Azure Content Safety
 * 2. Frame sampling: extract 6 evenly-spaced frames, analyze each
 * 3. Audio policy check (transcription + text moderation)
 * 4. Combined moderation decision
 *
 * Confidence Thresholds:
 * - High (>0.9): Auto-reject immediately
 * - Medium (0.5-0.9): Set PENDING for admin manual review
 * - Low (<0.5): Auto-approve
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
     * Moderate a video — runs thumbnail check, frame sampling, and audio policy.
     *
     * @param request - Video moderation request with video details
     * @returns Moderation result
     */
    moderateVideo(request: VideoModerationRequest): Promise<VideoModerationResult>;
    /**
     * Analyze video content by extracting and scanning evenly-spaced frames.
     * Uses FFmpeg to extract frames, then sends each to Azure Content Safety.
     *
     * @param videoId - Video record ID
     * @param videoUrl - URL to the video file (raw or encoded)
     * @returns Visual moderation result with aggregated category scores
     */
    private analyzeVideoContent;
    /**
     * Moderate thumbnail image
     */
    private moderateThumbnail;
    /**
     * Check audio policy by extracting audio, transcribing, and moderating text.
     *
     * @param videoId - Video record ID
     * @param videoUrl - URL to the video file
     * @returns Audio moderation result
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
     *
     * @param videoId - Video record ID to moderate
     */
    queueModeration(videoId: string): Promise<void>;
    /**
     * Check if service is configured
     */
    isAvailable(): boolean;
}
export declare const videoContentModerationService: VideoContentModerationService;
//# sourceMappingURL=videoContentModerationService.d.ts.map