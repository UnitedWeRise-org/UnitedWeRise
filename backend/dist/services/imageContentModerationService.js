"use strict";
/**
 * Image Content Moderation Service
 *
 * Provides Azure Content Safety integration for image moderation
 * Purpose-built for detecting inappropriate content in user-uploaded images
 * Supports both images and videos for future TikTok-style features
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageContentModerationService = exports.ImageContentModerationService = void 0;
const core_auth_1 = require("@azure/core-auth");
const ai_content_safety_1 = __importStar(require("@azure-rest/ai-content-safety"));
const logger_1 = __importDefault(require("../utils/logger"));
const moderation_1 = require("../types/moderation");
/**
 * Azure Content Safety severity levels:
 * 0 - Safe
 * 2 - Low severity
 * 4 - Medium severity
 * 6 - High severity
 */
const SEVERITY_THRESHOLD_BLOCK = 4; // Block medium+ severity
const SEVERITY_THRESHOLD_WARN = 2; // Warn on low+ severity
class ImageContentModerationService {
    constructor() {
        const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com/';
        const apiKey = process.env.AZURE_CONTENT_SAFETY_KEY;
        this.endpoint = endpoint;
        this.isConfigured = !!(endpoint && apiKey);
        this.config = moderation_1.DEFAULT_MODERATION_CONFIG;
        if (this.isConfigured) {
            const credential = new core_auth_1.AzureKeyCredential(apiKey);
            this.client = (0, ai_content_safety_1.default)(endpoint, credential);
            logger_1.default.info('Image Content Moderation Service initialized', {
                service: 'Azure Content Safety',
                endpoint: endpoint,
                isProduction: this.config.isProduction,
                strictMode: this.config.strictMode,
                capabilities: 'Image & Video moderation'
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
                logger_1.default.warn('Azure Content Safety not configured');
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
            const result = {
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
     * Perform Azure Content Safety image analysis
     */
    async performContentSafetyAnalysis(base64Image) {
        const analyzeImageOption = { image: { content: base64Image } };
        const analyzeImageParameters = { body: analyzeImageOption };
        const result = await this.client.path("/image:analyze").post(analyzeImageParameters);
        if ((0, ai_content_safety_1.isUnexpected)(result)) {
            throw new Error(`Content Safety API error: ${result.status} ${result.body?.error?.message || 'Unknown error'}`);
        }
        return result.body;
    }
    /**
     * Extract content flags from Content Safety analysis
     * Maps Content Safety categories to our internal flags
     */
    extractContentFlags(analysis) {
        const categories = analysis.categoriesAnalysis || [];
        // Find severity scores for each category (0-6 scale)
        const hateSeverity = categories.find((c) => c.category === 'Hate')?.severity || 0;
        const sexualSeverity = categories.find((c) => c.category === 'Sexual')?.severity || 0;
        const violenceSeverity = categories.find((c) => c.category === 'Violence')?.severity || 0;
        const selfHarmSeverity = categories.find((c) => c.category === 'SelfHarm')?.severity || 0;
        // Convert severity (0-6) to score (0.0-1.0)
        const toScore = (severity) => severity / 6.0;
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
    classifyContentType(flags) {
        // Check for blocked content first
        if (flags.isAdult && flags.adultScore > 0.7) {
            return moderation_1.ContentType.PORNOGRAPHY;
        }
        if (flags.isGory && flags.goreScore > 0.8) {
            return moderation_1.ContentType.EXTREME_VIOLENCE;
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
                description: `Adult content score (${flags.adultScore.toFixed(2)}) exceeds limit (${config.adultThreshold})`,
                confidence: flags.adultScore
            };
        }
        // Handle gore content
        if (flags.isGory && flags.goreScore > config.goreThreshold) {
            return {
                category: moderation_1.ModerationCategory.BLOCK,
                approved: false,
                reason: 'Graphic content detected above threshold',
                description: `Gore content score (${flags.goreScore.toFixed(2)}) exceeds limit (${config.goreThreshold})`,
                confidence: flags.goreScore
            };
        }
        // Handle racy content
        if (flags.isRacy && flags.racyScore > config.racyThreshold) {
            return {
                category: moderation_1.ModerationCategory.WARN,
                approved: !config.strictMode,
                reason: 'Suggestive content detected',
                description: `Racy content score (${flags.racyScore.toFixed(2)}) above threshold (${config.racyThreshold})`,
                confidence: flags.racyScore
            };
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
            approved: false,
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
     * SECURITY: Always blocks on error in ALL environments
     */
    createErrorFallbackResult(startTime, error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
            category: moderation_1.ModerationCategory.BLOCK,
            approved: false,
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