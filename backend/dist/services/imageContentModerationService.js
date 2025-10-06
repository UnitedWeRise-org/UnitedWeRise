"use strict";
/**
 * Image Content Moderation Service
 *
 * Provides Azure OpenAI Vision integration for content analysis and moderation
 * Analyzes images for explicit content, violence, newsworthy content, and safety
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageContentModerationService = exports.ImageContentModerationService = void 0;
const openai_1 = __importDefault(require("openai"));
const logger_1 = __importDefault(require("../utils/logger"));
const moderation_1 = require("../types/moderation");
class ImageContentModerationService {
    constructor() {
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        // Use tier-based Vision deployment (gpt-4o-mini with built-in vision)
        this.visionDeployment = process.env.AZURE_OPENAI_VISION ||
            process.env.AZURE_OPENAI_VISION_DEPLOYMENT ||
            'gpt-4o-mini';
        this.isConfigured = !!(endpoint && apiKey);
        this.config = moderation_1.DEFAULT_MODERATION_CONFIG;
        if (this.isConfigured) {
            this.client = new openai_1.default({
                apiKey: apiKey,
                baseURL: `${endpoint.replace(/\/+$/, '')}/openai/deployments`,
                defaultQuery: { 'api-version': '2024-10-01-preview' },
                defaultHeaders: {
                    'api-key': apiKey,
                },
            });
            logger_1.default.info('Image Content Moderation Service initialized', {
                endpoint: endpoint.replace(/\/+$/, ''),
                visionModel: this.visionDeployment,
                isProduction: this.config.isProduction,
                strictMode: this.config.strictMode
            });
        }
        else {
            logger_1.default.warn('Image Content Moderation Service not configured - missing endpoint or API key');
        }
    }
    /**
     * Analyze image content for moderation
     */
    async analyzeImage(request) {
        const startTime = Date.now();
        try {
            if (!this.isConfigured) {
                logger_1.default.warn('Azure OpenAI Vision not configured, returning default approval');
                return this.createFallbackResult(startTime, 'Azure OpenAI Vision not configured');
            }
            // Merge custom config with defaults
            const config = { ...this.config, ...request.config };
            // Convert image buffer to base64
            const base64Image = request.imageBuffer.toString('base64');
            const imageDataUrl = `data:${request.mimeType};base64,${base64Image}`;
            // Analyze image with Azure OpenAI Vision
            const visionAnalysis = await this.performVisionAnalysis(imageDataUrl, request.photoType);
            // Extract content flags from analysis
            const contentFlags = this.extractContentFlags(visionAnalysis);
            // Determine content type
            const contentType = this.classifyContentType(contentFlags, visionAnalysis);
            // Make moderation decision
            const moderationDecision = this.makeModerationDecision(contentType, contentFlags, config);
            const processingTime = Date.now() - startTime;
            const result = {
                category: moderationDecision.category,
                approved: moderationDecision.approved,
                reason: moderationDecision.reason,
                description: moderationDecision.description,
                contentType,
                contentFlags,
                confidence: moderationDecision.confidence,
                processingTime,
                model: this.visionDeployment,
                timestamp: new Date(),
                rawResponse: visionAnalysis
            };
            logger_1.default.info('Image content moderation completed', {
                userId: request.userId,
                photoType: request.photoType,
                category: result.category,
                contentType: result.contentType,
                approved: result.approved,
                processingTime,
                confidence: result.confidence
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Image content moderation failed', {
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
     * Perform Azure OpenAI Vision analysis
     */
    async performVisionAnalysis(imageDataUrl, photoType) {
        const prompt = this.buildAnalysisPrompt(photoType);
        const response = await this.client.chat.completions.create({
            model: this.visionDeployment,
            messages: [
                {
                    role: "system",
                    content: "You are a content safety analyst specialized in image moderation for social media platforms. Analyze images objectively and provide detailed safety assessments."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageDataUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 800,
            temperature: 0.1, // Low temperature for consistent analysis
        });
        const content = response.choices[0].message?.content;
        if (!content) {
            throw new Error('No response from Azure OpenAI Vision');
        }
        // Try to parse JSON response
        try {
            return JSON.parse(content);
        }
        catch (parseError) {
            // If JSON parsing fails, return the text content for fallback processing
            return { textResponse: content };
        }
    }
    /**
     * Build analysis prompt based on photo type
     */
    buildAnalysisPrompt(photoType) {
        const basePrompt = `
Analyze this image for content moderation. Return a JSON response with the following structure:

{
  "isAdult": boolean,
  "isRacy": boolean,
  "isGory": boolean,
  "adultScore": number (0.0-1.0),
  "racyScore": number (0.0-1.0),
  "goreScore": number (0.0-1.0),
  "hasText": boolean,
  "textContent": "extracted text or null",
  "isNewsworthy": boolean,
  "isMedical": boolean,
  "isPolitical": boolean,
  "description": "detailed description of image content",
  "categories": ["category1", "category2"],
  "safetyLevel": "SAFE|WARNING|UNSAFE",
  "reasoning": "explanation of safety assessment"
}

Focus on:
- Adult/sexual content detection
- Violence and gore assessment
- Newsworthy vs. inappropriate content distinction
- Medical content identification
- Political content recognition
- Text extraction and analysis
`;
        // Add photo type specific context
        switch (photoType) {
            case 'AVATAR':
            case 'PROFILE':
                return basePrompt + '\n\nThis is a user profile photo. Apply strict standards for appropriateness in professional/public contexts.';
            case 'CAMPAIGN':
                return basePrompt + '\n\nThis is campaign material. Look for political content, campaign messaging, and public appropriateness.';
            case 'POST_MEDIA':
                return basePrompt + '\n\nThis is social media post content. Balance free expression with community safety standards.';
            case 'VERIFICATION':
                return basePrompt + '\n\nThis is verification/ID content. Look for personal documents, faces, and sensitive information.';
            default:
                return basePrompt + '\n\nThis is general user content. Apply standard community guidelines for safety and appropriateness.';
        }
    }
    /**
     * Extract content flags from vision analysis
     */
    extractContentFlags(analysis) {
        // Handle both JSON and text response formats
        if (analysis.textResponse) {
            // Fallback text parsing
            return this.parseTextResponse(analysis.textResponse);
        }
        return {
            isAdult: analysis.isAdult || false,
            isRacy: analysis.isRacy || false,
            isGory: analysis.isGory || false,
            adultScore: analysis.adultScore || 0.0,
            racyScore: analysis.racyScore || 0.0,
            goreScore: analysis.goreScore || 0.0,
            hasText: analysis.hasText || false,
            textContent: analysis.textContent || null,
            isNewsworthy: analysis.isNewsworthy || false,
            isMedical: analysis.isMedical || false,
            isPolitical: analysis.isPolitical || false
        };
    }
    /**
     * Parse text response when JSON parsing fails
     */
    parseTextResponse(textResponse) {
        const lowerText = textResponse.toLowerCase();
        return {
            isAdult: this.containsKeywords(lowerText, ['adult', 'sexual', 'pornographic', 'explicit']),
            isRacy: this.containsKeywords(lowerText, ['racy', 'suggestive', 'provocative']),
            isGory: this.containsKeywords(lowerText, ['gore', 'violent', 'blood', 'graphic']),
            adultScore: this.extractScore(textResponse, 'adult') || 0.0,
            racyScore: this.extractScore(textResponse, 'racy') || 0.0,
            goreScore: this.extractScore(textResponse, 'gore') || 0.0,
            hasText: this.containsKeywords(lowerText, ['text', 'words', 'writing']),
            textContent: null, // Cannot extract from fallback
            isNewsworthy: this.containsKeywords(lowerText, ['news', 'journalism', 'newsworthy']),
            isMedical: this.containsKeywords(lowerText, ['medical', 'health', 'anatomy']),
            isPolitical: this.containsKeywords(lowerText, ['political', 'campaign', 'election'])
        };
    }
    /**
     * Check if text contains any of the specified keywords
     */
    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }
    /**
     * Extract numerical score from text response
     */
    extractScore(text, scoreType) {
        const regex = new RegExp(`${scoreType}.*?([0-9.]+)`, 'i');
        const match = text.match(regex);
        return match ? parseFloat(match[1]) : null;
    }
    /**
     * Classify content type based on analysis
     */
    classifyContentType(flags, analysis) {
        // Check for blocked content first
        if (flags.isAdult && flags.adultScore > 0.7) {
            return moderation_1.ContentType.PORNOGRAPHY;
        }
        if (flags.isGory && flags.goreScore > 0.8) {
            return moderation_1.ContentType.EXTREME_VIOLENCE;
        }
        // Check for newsworthy content
        if (flags.isNewsworthy) {
            if (flags.isGory && flags.goreScore > 0.4) {
                return moderation_1.ContentType.GRAPHIC_NEWS;
            }
            if (flags.isPolitical) {
                return moderation_1.ContentType.POLITICAL_CONTENT;
            }
            return moderation_1.ContentType.DISTURBING_BUT_NEWSWORTHY;
        }
        // Check for medical content
        if (flags.isMedical) {
            return moderation_1.ContentType.MEDICAL_CONTENT;
        }
        // Check for mild violence
        if (flags.isGory && flags.goreScore > 0.2) {
            return moderation_1.ContentType.MILD_VIOLENCE;
        }
        // Default to clean if no issues detected
        if (!flags.isAdult && !flags.isRacy && !flags.isGory) {
            return moderation_1.ContentType.CLEAN;
        }
        return moderation_1.ContentType.UNKNOWN;
    }
    /**
     * Make final moderation decision
     */
    makeModerationDecision(contentType, flags, config) {
        // Block prohibited content
        if (moderation_1.BLOCKED_CONTENT_TYPES.includes(contentType)) {
            return {
                category: moderation_1.ModerationCategory.BLOCK,
                approved: false,
                reason: 'Content contains prohibited material',
                description: `Content classified as ${contentType} and blocked per community guidelines`,
                confidence: 0.9
            };
        }
        // Handle adult content thresholds
        if (flags.isAdult && flags.adultScore > config.adultThreshold) {
            return {
                category: moderation_1.ModerationCategory.BLOCK,
                approved: false,
                reason: 'Adult content detected above threshold',
                description: `Adult content score (${flags.adultScore}) exceeds limit (${config.adultThreshold})`,
                confidence: flags.adultScore
            };
        }
        // Handle gore content with newsworthy consideration
        if (flags.isGory && flags.goreScore > config.goreThreshold) {
            if (config.allowNewsworthyContent && flags.isNewsworthy) {
                return {
                    category: moderation_1.ModerationCategory.WARN,
                    approved: true,
                    reason: 'Graphic but newsworthy content',
                    description: 'Content contains graphic elements but appears to be newsworthy',
                    confidence: 0.7
                };
            }
            return {
                category: moderation_1.ModerationCategory.BLOCK,
                approved: false,
                reason: 'Graphic content detected above threshold',
                description: `Gore content score (${flags.goreScore}) exceeds limit (${config.goreThreshold})`,
                confidence: flags.goreScore
            };
        }
        // Handle racy content
        if (flags.isRacy && flags.racyScore > config.racyThreshold) {
            return {
                category: moderation_1.ModerationCategory.WARN,
                approved: !config.strictMode,
                reason: 'Suggestive content detected',
                description: `Racy content score (${flags.racyScore}) above threshold (${config.racyThreshold})`,
                confidence: flags.racyScore
            };
        }
        // Handle medical content
        if (moderation_1.MEDICAL_CONTENT_TYPES.includes(contentType)) {
            if (config.allowMedicalContent) {
                return {
                    category: moderation_1.ModerationCategory.WARN,
                    approved: true,
                    reason: 'Medical content allowed',
                    description: 'Content appears to be medical/educational in nature',
                    confidence: 0.8
                };
            }
        }
        // Approve clean content
        return {
            category: moderation_1.ModerationCategory.APPROVE,
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
    createFallbackResult(startTime, reason) {
        return {
            category: moderation_1.ModerationCategory.BLOCK,
            approved: false, // SECURITY FIX: Always block when moderation is not configured
            reason,
            description: 'Content moderation service unavailable - blocked for safety',
            contentType: moderation_1.ContentType.UNKNOWN,
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
     * SECURITY: Always blocks on error in ALL environments (production, staging, development)
     */
    createErrorFallbackResult(startTime, error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
            category: moderation_1.ModerationCategory.BLOCK,
            approved: false, // SECURITY FIX: Always block on moderation errors
            reason: `Moderation error: ${errorMessage}`,
            description: 'Content moderation failed - blocked for safety',
            contentType: moderation_1.ContentType.UNKNOWN,
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
    async healthCheck() {
        if (!this.isConfigured) {
            return {
                status: 'not-configured',
                latency: 0,
                error: 'Azure OpenAI Vision endpoint or API key not configured'
            };
        }
        const startTime = Date.now();
        try {
            // Test with a simple analysis (would need a test image in production)
            // For now, just verify the client configuration
            return {
                status: 'healthy',
                latency: Date.now() - startTime
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                latency: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update moderation configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_1.default.info('Image moderation configuration updated', newConfig);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ImageContentModerationService = ImageContentModerationService;
// Singleton instance for consistent usage
exports.imageContentModerationService = new ImageContentModerationService();
//# sourceMappingURL=imageContentModerationService.js.map