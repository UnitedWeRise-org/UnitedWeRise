/**
 * Image Content Moderation Service
 *
 * Provides Azure Content Safety integration for image moderation
 * Purpose-built for detecting inappropriate content in user-uploaded images
 * Supports both images and videos for future TikTok-style features
 */
import { ModerationResult, ModerationConfig, VisionAnalysisRequest } from '../types/moderation';
export declare class ImageContentModerationService {
    private client;
    private isConfigured;
    private config;
    private endpoint;
    constructor();
    /**
     * Analyze image content for moderation
     */
    analyzeImage(request: VisionAnalysisRequest): Promise<ModerationResult>;
    /**
     * Perform Azure Content Safety image analysis
     */
    private performContentSafetyAnalysis;
    /**
     * Extract content flags from Content Safety analysis
     * Maps Content Safety categories to our internal flags
     */
    private extractContentFlags;
    /**
     * Classify content type based on Content Safety analysis
     */
    private classifyContentType;
    /**
     * Make final moderation decision
     */
    private makeModerationDecision;
    /**
     * Create fallback result when service is not configured
     * SECURITY: Always blocks when unconfigured in ALL environments
     */
    private createFallbackResult;
    /**
     * Create error fallback result
     * SECURITY: Always blocks on error in ALL environments
     */
    private createErrorFallbackResult;
    /**
     * Health check for image moderation service
     */
    healthCheck(): Promise<{
        status: string;
        latency?: number;
        error?: string;
    }>;
    /**
     * Update moderation configuration
     */
    updateConfig(newConfig: Partial<ModerationConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ModerationConfig;
}
export declare const imageContentModerationService: ImageContentModerationService;
//# sourceMappingURL=imageContentModerationService.d.ts.map