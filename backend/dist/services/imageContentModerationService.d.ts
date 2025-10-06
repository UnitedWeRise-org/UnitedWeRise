/**
 * Image Content Moderation Service
 *
 * Provides Azure OpenAI Vision integration for content analysis and moderation
 * Analyzes images for explicit content, violence, newsworthy content, and safety
 */
import { ModerationResult, ModerationConfig, VisionAnalysisRequest } from '../types/moderation';
export declare class ImageContentModerationService {
    private client;
    private visionDeployment;
    private isConfigured;
    private config;
    constructor();
    /**
     * Analyze image content for moderation
     */
    analyzeImage(request: VisionAnalysisRequest): Promise<ModerationResult>;
    /**
     * Perform Azure OpenAI Vision analysis
     */
    private performVisionAnalysis;
    /**
     * Build analysis prompt based on photo type
     */
    private buildAnalysisPrompt;
    /**
     * Extract content flags from vision analysis
     */
    private extractContentFlags;
    /**
     * Parse text response when JSON parsing fails
     */
    private parseTextResponse;
    /**
     * Check if text contains any of the specified keywords
     */
    private containsKeywords;
    /**
     * Extract numerical score from text response
     */
    private extractScore;
    /**
     * Classify content type based on analysis
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
     * SECURITY: Always blocks on error in ALL environments (production, staging, development)
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