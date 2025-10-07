/**
 * Image Content Moderation Service
 *
 * Provides Azure Content Safety integration for image moderation
 * Purpose-built for detecting inappropriate content in user-uploaded images
 * Supports both images and videos for future TikTok-style features
 */

import { AzureKeyCredential } from "@azure/core-auth";
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";
import logger from '../utils/logger';
import {
  ModerationResult,
  ModerationCategory,
  ContentType,
  ContentFlags,
  ModerationConfig,
  VisionAnalysisRequest,
  DEFAULT_MODERATION_CONFIG,
  BLOCKED_CONTENT_TYPES,
  MEDICAL_CONTENT_TYPES
} from '../types/moderation';

/**
 * Azure Content Safety severity levels:
 * 0 - Safe
 * 2 - Low severity
 * 4 - Medium severity
 * 6 - High severity
 */
const SEVERITY_THRESHOLD_BLOCK = 4; // Block medium+ severity
const SEVERITY_THRESHOLD_WARN = 2;  // Warn on low+ severity

export class ImageContentModerationService {
  private client: any;
  private isConfigured: boolean;
  private config: ModerationConfig;
  private endpoint: string;

  constructor() {
    const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com/';
    const apiKey = process.env.AZURE_CONTENT_SAFETY_KEY;

    this.endpoint = endpoint;
    this.isConfigured = !!(endpoint && apiKey);
    this.config = DEFAULT_MODERATION_CONFIG;

    if (this.isConfigured) {
      const credential = new AzureKeyCredential(apiKey!);
      this.client = ContentSafetyClient(endpoint, credential);

      logger.info('Image Content Moderation Service initialized', {
        service: 'Azure Content Safety',
        endpoint: endpoint,
        isProduction: this.config.isProduction,
        strictMode: this.config.strictMode,
        capabilities: 'Image & Video moderation'
      });
    } else {
      logger.warn('Image Content Moderation Service not configured - missing endpoint or API key');
    }
  }

  /**
   * Analyze image content for moderation
   */
  async analyzeImage(request: VisionAnalysisRequest): Promise<ModerationResult> {
    const startTime = Date.now();

    try {
      if (!this.isConfigured) {
        logger.warn('Azure Content Safety not configured');
        return this.createFallbackResult(startTime, 'Azure Content Safety not configured');
      }

      // Merge custom config with defaults
      const config = { ...this.config, ...request.config };

      // Convert image buffer to base64
      const base64Image = request.imageBuffer.toString('base64');

      // Analyze image with Azure Content Safety
      const safetyAnalysis = await this.performContentSafetyAnalysis(base64Image);

      // Extract content flags from analysis
      const contentFlags = this.extractContentFlags(safetyAnalysis);

      // Determine content type
      const contentType = this.classifyContentType(contentFlags);

      // Make moderation decision
      const moderationDecision = this.makeModerationDecision(contentType, contentFlags, config);

      const processingTime = Date.now() - startTime;

      const result: ModerationResult = {
        category: moderationDecision.category,
        approved: moderationDecision.approved,
        reason: moderationDecision.reason,
        description: moderationDecision.description,
        contentType,
        contentFlags,
        confidence: moderationDecision.confidence,
        processingTime,
        model: 'Azure Content Safety',
        timestamp: new Date(),
        rawResponse: safetyAnalysis
      };

      logger.info('Image content moderation completed', {
        userId: request.userId,
        photoType: request.photoType,
        category: result.category,
        contentType: result.contentType,
        approved: result.approved,
        processingTime,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      logger.error('Image content moderation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        photoType: request.photoType,
        processingTime: Date.now() - startTime
      });

      // Return conservative fallback on error
      return this.createErrorFallbackResult(startTime, error);
    }
  }

  /**
   * Perform Azure Content Safety image analysis
   */
  private async performContentSafetyAnalysis(base64Image: string): Promise<any> {
    const analyzeImageOption = { image: { content: base64Image } };
    const analyzeImageParameters = { body: analyzeImageOption };

    const result = await this.client.path("/image:analyze").post(analyzeImageParameters);

    if (isUnexpected(result)) {
      throw new Error(`Content Safety API error: ${result.status} ${result.body?.error?.message || 'Unknown error'}`);
    }

    return result.body;
  }

  /**
   * Extract content flags from Content Safety analysis
   * Maps Content Safety categories to our internal flags
   */
  private extractContentFlags(analysis: any): ContentFlags {
    const categories = analysis.categoriesAnalysis || [];

    // Find severity scores for each category (0-6 scale)
    const hateSeverity = categories.find((c: any) => c.category === 'Hate')?.severity || 0;
    const sexualSeverity = categories.find((c: any) => c.category === 'Sexual')?.severity || 0;
    const violenceSeverity = categories.find((c: any) => c.category === 'Violence')?.severity || 0;
    const selfHarmSeverity = categories.find((c: any) => c.category === 'SelfHarm')?.severity || 0;

    // Convert severity (0-6) to score (0.0-1.0)
    const toScore = (severity: number) => severity / 6.0;

    return {
      isAdult: sexualSeverity >= SEVERITY_THRESHOLD_BLOCK,
      isRacy: sexualSeverity >= SEVERITY_THRESHOLD_WARN && sexualSeverity < SEVERITY_THRESHOLD_BLOCK,
      isGory: violenceSeverity >= SEVERITY_THRESHOLD_WARN || selfHarmSeverity >= SEVERITY_THRESHOLD_WARN,
      adultScore: toScore(sexualSeverity),
      racyScore: toScore(sexualSeverity),
      goreScore: Math.max(toScore(violenceSeverity), toScore(selfHarmSeverity)),
      hasText: false, // Content Safety doesn't detect text in images
      textContent: null,
      isNewsworthy: false, // Content Safety doesn't classify newsworthy content
      isMedical: false, // Content Safety doesn't have medical category
      isPolitical: hateSeverity >= SEVERITY_THRESHOLD_WARN // Hate speech often overlaps with political content
    };
  }

  /**
   * Classify content type based on Content Safety analysis
   */
  private classifyContentType(flags: ContentFlags): ContentType {
    // Check for blocked content first
    if (flags.isAdult && flags.adultScore > 0.7) {
      return ContentType.PORNOGRAPHY;
    }

    if (flags.isGory && flags.goreScore > 0.8) {
      return ContentType.EXTREME_VIOLENCE;
    }

    // Check for mild violence
    if (flags.isGory && flags.goreScore > 0.2) {
      return ContentType.MILD_VIOLENCE;
    }

    // Default to clean if no issues detected
    if (!flags.isAdult && !flags.isRacy && !flags.isGory) {
      return ContentType.CLEAN;
    }

    return ContentType.UNKNOWN;
  }

  /**
   * Make final moderation decision
   */
  private makeModerationDecision(
    contentType: ContentType,
    flags: ContentFlags,
    config: ModerationConfig
  ): {
    category: ModerationCategory;
    approved: boolean;
    reason: string;
    description: string;
    confidence: number;
  } {
    // Block prohibited content
    if (BLOCKED_CONTENT_TYPES.includes(contentType)) {
      return {
        category: ModerationCategory.BLOCK,
        approved: false,
        reason: 'Content contains prohibited material',
        description: `Content classified as ${contentType} and blocked per community guidelines`,
        confidence: 0.9
      };
    }

    // Handle adult content thresholds
    if (flags.isAdult && flags.adultScore > config.adultThreshold) {
      return {
        category: ModerationCategory.BLOCK,
        approved: false,
        reason: 'Adult content detected above threshold',
        description: `Adult content score (${flags.adultScore.toFixed(2)}) exceeds limit (${config.adultThreshold})`,
        confidence: flags.adultScore
      };
    }

    // Handle gore content
    if (flags.isGory && flags.goreScore > config.goreThreshold) {
      return {
        category: ModerationCategory.BLOCK,
        approved: false,
        reason: 'Graphic content detected above threshold',
        description: `Gore content score (${flags.goreScore.toFixed(2)}) exceeds limit (${config.goreThreshold})`,
        confidence: flags.goreScore
      };
    }

    // Handle racy content
    if (flags.isRacy && flags.racyScore > config.racyThreshold) {
      return {
        category: ModerationCategory.WARN,
        approved: !config.strictMode,
        reason: 'Suggestive content detected',
        description: `Racy content score (${flags.racyScore.toFixed(2)}) above threshold (${config.racyThreshold})`,
        confidence: flags.racyScore
      };
    }

    // Approve clean content
    return {
      category: ModerationCategory.APPROVE,
      approved: true,
      reason: 'Content passed safety checks',
      description: 'No safety issues detected in content',
      confidence: 0.9
    };
  }

  /**
   * Create fallback result when service is not configured
   * SECURITY: Always blocks when unconfigured in ALL environments
   */
  private createFallbackResult(startTime: number, reason: string): ModerationResult {
    return {
      category: ModerationCategory.BLOCK,
      approved: false,
      reason,
      description: 'Content moderation service unavailable - blocked for safety',
      contentType: ContentType.UNKNOWN,
      contentFlags: {
        isAdult: false,
        isRacy: false,
        isGory: false,
        adultScore: 0.0,
        racyScore: 0.0,
        goreScore: 0.0,
        hasText: false,
        isNewsworthy: false,
        isMedical: false,
        isPolitical: false
      },
      confidence: 0.1,
      processingTime: Date.now() - startTime,
      model: 'not-configured',
      timestamp: new Date()
    };
  }

  /**
   * Create error fallback result
   * SECURITY: Always blocks on error in ALL environments
   */
  private createErrorFallbackResult(startTime: number, error: any): ModerationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      category: ModerationCategory.BLOCK,
      approved: false,
      reason: `Moderation error: ${errorMessage}`,
      description: 'Content moderation failed - blocked for safety',
      contentType: ContentType.UNKNOWN,
      contentFlags: {
        isAdult: false,
        isRacy: false,
        isGory: false,
        adultScore: 0.0,
        racyScore: 0.0,
        goreScore: 0.0,
        hasText: false,
        isNewsworthy: false,
        isMedical: false,
        isPolitical: false
      },
      confidence: 0.1,
      processingTime: Date.now() - startTime,
      model: 'error-fallback',
      timestamp: new Date()
    };
  }

  /**
   * Health check for image moderation service
   */
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    if (!this.isConfigured) {
      return {
        status: 'not-configured',
        latency: 0,
        error: 'Azure Content Safety endpoint or API key not configured'
      };
    }

    return {
      status: 'healthy',
      latency: 0
    };
  }

  /**
   * Update moderation configuration
   */
  updateConfig(newConfig: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Image moderation configuration updated', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): ModerationConfig {
    return { ...this.config };
  }
}

// Singleton instance for consistent usage
export const imageContentModerationService = new ImageContentModerationService();
