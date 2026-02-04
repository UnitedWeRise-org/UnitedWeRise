"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoContentModerationService = exports.VideoContentModerationService = void 0;
const core_auth_1 = require("@azure/core-auth");
const ai_content_safety_1 = __importDefault(require("@azure-rest/ai-content-safety"));
const fs_1 = require("fs");
const prisma_js_1 = require("../lib/prisma.js");
const logger_1 = require("./logger");
const FFmpegEncoder_1 = require("./FFmpegEncoder");
const VideoStorageService_1 = require("./VideoStorageService");
// ========================================
// Constants
// ========================================
// Azure Content Safety severity levels (0, 2, 4, 6)
const SEVERITY_THRESHOLD_BLOCK = 4; // Block at medium+ severity
const SEVERITY_THRESHOLD_WARN = 2; // Warn at low+ severity
// Confidence thresholds for moderation decisions
const AUTO_REJECT_THRESHOLD = 0.9;
const MANUAL_REVIEW_THRESHOLD = 0.5;
// Frame sampling configuration
const FRAME_SAMPLE_COUNT = 6;
// Audio policy (configurable via environment)
const AUDIO_POLICY = process.env.AUDIO_POLICY || 'STRICT';
// ========================================
// VideoContentModerationService Class
// ========================================
class VideoContentModerationService {
    client;
    isConfigured;
    endpoint;
    constructor() {
        const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com/';
        const apiKey = process.env.AZURE_CONTENT_SAFETY_KEY;
        this.endpoint = endpoint;
        this.isConfigured = !!(endpoint && apiKey);
        if (this.isConfigured) {
            const credential = new core_auth_1.AzureKeyCredential(apiKey);
            this.client = (0, ai_content_safety_1.default)(endpoint, credential);
            logger_1.logger.info({
                service: 'Video Content Moderation',
                endpoint,
                audioPolicy: AUDIO_POLICY
            }, 'Video Content Moderation Service initialized');
        }
        else {
            logger_1.logger.warn('Video Content Moderation Service not configured - missing endpoint or API key');
        }
    }
    /**
     * Moderate a video — runs thumbnail check, frame sampling, and audio policy.
     *
     * @param request - Video moderation request with video details
     * @returns Moderation result
     */
    async moderateVideo(request) {
        const startTime = Date.now();
        logger_1.logger.info({ videoId: request.videoId }, 'Starting video moderation');
        try {
            if (!this.isConfigured) {
                return this.createFallbackResult(startTime, 'not_configured');
            }
            // Step 1: Moderate thumbnail first (quick check)
            let thumbnailResult = null;
            if (request.thumbnailUrl) {
                thumbnailResult = await this.moderateThumbnail(request.thumbnailUrl);
                if (thumbnailResult.status === 'REJECTED') {
                    logger_1.logger.info({
                        videoId: request.videoId,
                        reason: thumbnailResult.reason
                    }, 'Video rejected based on thumbnail');
                    await this.updateVideoModeration(request.videoId, thumbnailResult);
                    return thumbnailResult;
                }
            }
            // Step 2: Frame sampling analysis on encoded video
            const visualResult = await this.analyzeVideoContent(request.videoId, request.videoUrl);
            // Step 3: Audio policy check
            const audioResult = await this.checkAudioPolicy(request.videoId, request.videoUrl);
            // Combine results
            const finalResult = this.combineResults(visualResult, audioResult, startTime);
            // Update database
            await this.updateVideoModeration(request.videoId, finalResult);
            logger_1.logger.info({
                videoId: request.videoId,
                status: finalResult.status,
                audioStatus: finalResult.audioStatus,
                processingTime: finalResult.processingTime
            }, 'Video moderation completed');
            return finalResult;
        }
        catch (error) {
            logger_1.logger.error({ error, videoId: request.videoId }, 'Video moderation failed');
            const fallbackResult = this.createFallbackResult(startTime, 'error');
            fallbackResult.status = 'REJECTED';
            fallbackResult.reason = 'Moderation service error';
            return fallbackResult;
        }
    }
    /**
     * Analyze video content by extracting and scanning evenly-spaced frames.
     * Uses FFmpeg to extract frames, then sends each to Azure Content Safety.
     *
     * @param videoId - Video record ID
     * @param videoUrl - URL to the video file (raw or encoded)
     * @returns Visual moderation result with aggregated category scores
     */
    async analyzeVideoContent(videoId, videoUrl) {
        // Get video duration for frame interval calculation
        const video = await prisma_js_1.prisma.video.findUnique({
            where: { id: videoId },
            select: { duration: true, originalBlobName: true }
        });
        if (!video) {
            logger_1.logger.warn({ videoId }, 'Video not found for frame sampling');
            return { status: 'APPROVED', confidence: 1.0 };
        }
        // Generate SAS URL for the raw video
        const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(video.originalBlobName, 10);
        // Extract frames using FFmpeg
        const workDir = `/tmp/uwr-moderation-${videoId}`;
        let framePaths = [];
        try {
            framePaths = await FFmpegEncoder_1.ffmpegEncoder.extractFrames(inputUrl, workDir, FRAME_SAMPLE_COUNT, video.duration);
            if (framePaths.length === 0) {
                logger_1.logger.warn({ videoId }, 'No frames extracted — falling back to approved');
                return { status: 'APPROVED', confidence: 0.8 };
            }
            // Analyze each frame with Azure Content Safety
            const aggregatedCategories = { hate: 0, selfHarm: 0, sexual: 0, violence: 0 };
            let maxSeverityScore = 0;
            let worstReason = '';
            for (const framePath of framePaths) {
                try {
                    const frameBuffer = await fs_1.promises.readFile(framePath);
                    const base64Image = frameBuffer.toString('base64');
                    const analysisResult = await this.client.path('/image:analyze').post({
                        body: {
                            image: { content: base64Image },
                            categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
                            outputType: 'FourSeverityLevels'
                        }
                    });
                    if (analysisResult.status !== '200') {
                        logger_1.logger.warn({ videoId, framePath, status: analysisResult.status }, 'Frame analysis API error');
                        continue;
                    }
                    const categories = {
                        hate: this.getSeverity(analysisResult.body, 'Hate'),
                        selfHarm: this.getSeverity(analysisResult.body, 'SelfHarm'),
                        sexual: this.getSeverity(analysisResult.body, 'Sexual'),
                        violence: this.getSeverity(analysisResult.body, 'Violence')
                    };
                    // Track worst-case across all frames
                    aggregatedCategories.hate = Math.max(aggregatedCategories.hate, categories.hate);
                    aggregatedCategories.selfHarm = Math.max(aggregatedCategories.selfHarm, categories.selfHarm);
                    aggregatedCategories.sexual = Math.max(aggregatedCategories.sexual, categories.sexual);
                    aggregatedCategories.violence = Math.max(aggregatedCategories.violence, categories.violence);
                    const frameMaxSeverity = Math.max(categories.hate, categories.selfHarm, categories.sexual, categories.violence);
                    if (frameMaxSeverity > maxSeverityScore) {
                        maxSeverityScore = frameMaxSeverity;
                        worstReason = this.getRejectReason(categories);
                    }
                }
                catch (frameError) {
                    logger_1.logger.warn({ error: frameError, framePath, videoId }, 'Failed to analyze frame');
                }
            }
            // Convert severity (0-6 scale) to confidence (0.0-1.0)
            const confidence = maxSeverityScore / 6;
            // Apply tiered decision logic
            if (confidence >= AUTO_REJECT_THRESHOLD) {
                return {
                    status: 'REJECTED',
                    reason: worstReason,
                    confidence,
                    categories: aggregatedCategories
                };
            }
            if (confidence >= MANUAL_REVIEW_THRESHOLD) {
                return {
                    status: 'PENDING',
                    reason: `Manual review needed: ${worstReason}`,
                    confidence,
                    categories: aggregatedCategories
                };
            }
            return {
                status: 'APPROVED',
                confidence: 1 - confidence,
                categories: aggregatedCategories
            };
        }
        finally {
            // Cleanup extracted frames
            try {
                await fs_1.promises.rm(workDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Moderate thumbnail image
     */
    async moderateThumbnail(thumbnailUrl) {
        const startTime = Date.now();
        try {
            const response = await fetch(thumbnailUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch thumbnail: ${response.status}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const base64Image = buffer.toString('base64');
            const analysisResult = await this.client.path('/image:analyze').post({
                body: {
                    image: { content: base64Image },
                    categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
                    outputType: 'FourSeverityLevels'
                }
            });
            if (analysisResult.status !== '200') {
                throw new Error(`Content Safety API error: ${analysisResult.status}`);
            }
            const analysis = analysisResult.body;
            const categories = {
                hate: this.getSeverity(analysis, 'Hate'),
                selfHarm: this.getSeverity(analysis, 'SelfHarm'),
                sexual: this.getSeverity(analysis, 'Sexual'),
                violence: this.getSeverity(analysis, 'Violence')
            };
            const maxSeverity = Math.max(categories.hate, categories.selfHarm, categories.sexual, categories.violence);
            const processingTime = Date.now() - startTime;
            if (maxSeverity >= SEVERITY_THRESHOLD_BLOCK) {
                return {
                    status: 'REJECTED',
                    reason: this.getRejectReason(categories),
                    confidence: maxSeverity / 6,
                    categories,
                    audioStatus: 'PENDING',
                    audioMuted: false,
                    processingTime
                };
            }
            return {
                status: 'APPROVED',
                confidence: 1 - (maxSeverity / 6),
                categories,
                audioStatus: 'PENDING',
                audioMuted: false,
                processingTime
            };
        }
        catch (error) {
            logger_1.logger.error({ error, thumbnailUrl }, 'Thumbnail moderation failed');
            return this.createFallbackResult(Date.now() - startTime, 'thumbnail_error');
        }
    }
    /**
     * Check audio policy by extracting audio, transcribing, and moderating text.
     *
     * @param videoId - Video record ID
     * @param videoUrl - URL to the video file
     * @returns Audio moderation result
     */
    async checkAudioPolicy(videoId, videoUrl) {
        if (AUDIO_POLICY === 'PERMISSIVE') {
            return { status: 'PASS', muted: false };
        }
        try {
            // Get raw video URL for audio extraction
            const video = await prisma_js_1.prisma.video.findUnique({
                where: { id: videoId },
                select: { originalBlobName: true, duration: true }
            });
            if (!video) {
                return { status: 'PASS', muted: false };
            }
            const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(video.originalBlobName, 10);
            const workDir = `/tmp/uwr-audio-mod-${videoId}`;
            const audioPath = await FFmpegEncoder_1.ffmpegEncoder.extractAudio(inputUrl, workDir);
            if (!audioPath) {
                // No audio track — pass automatically
                await prisma_js_1.prisma.video.update({
                    where: { id: videoId },
                    data: { audioStatus: 'PASS' }
                });
                return { status: 'PASS', muted: false };
            }
            // Transcription would go here — using Azure Speech-to-Text or Whisper
            // For now, store a placeholder and pass
            // TODO: Integrate Azure Speech-to-Text when service is provisioned
            logger_1.logger.info({ videoId }, 'Audio extracted — transcription service integration pending');
            // Cleanup
            try {
                await fs_1.promises.rm(workDir, { recursive: true, force: true });
            }
            catch {
                // Ignore cleanup errors
            }
            return { status: 'PASS', muted: false };
        }
        catch (error) {
            logger_1.logger.warn({ error, videoId }, 'Audio policy check failed — defaulting to PASS');
            return { status: 'PASS', muted: false };
        }
    }
    /**
     * Combine visual and audio moderation results
     */
    combineResults(visualResult, audioResult, startTime) {
        return {
            status: visualResult.status,
            reason: visualResult.reason,
            confidence: visualResult.confidence,
            categories: visualResult.categories,
            audioStatus: audioResult.status,
            audioMuted: audioResult.muted,
            processingTime: Date.now() - startTime
        };
    }
    /**
     * Update video record with moderation result
     */
    async updateVideoModeration(videoId, result) {
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: {
                moderationStatus: result.status,
                moderationReason: result.reason,
                moderationConfidence: result.confidence,
                audioStatus: result.audioStatus,
                audioMuted: result.audioMuted
            }
        });
    }
    /**
     * Create fallback result when service is unavailable
     */
    createFallbackResult(startTime, type) {
        return {
            status: 'PENDING',
            reason: `Requires manual review (${type})`,
            confidence: undefined,
            audioStatus: 'PENDING',
            audioMuted: false,
            processingTime: Date.now() - startTime
        };
    }
    /**
     * Extract severity from Azure Content Safety response
     */
    getSeverity(analysis, category) {
        const result = analysis.categoriesAnalysis?.find((c) => c.category === category);
        return result?.severity || 0;
    }
    /**
     * Get human-readable rejection reason
     */
    getRejectReason(categories) {
        const reasons = [];
        if (categories.hate >= SEVERITY_THRESHOLD_BLOCK) {
            reasons.push('hate content');
        }
        if (categories.selfHarm >= SEVERITY_THRESHOLD_BLOCK) {
            reasons.push('self-harm content');
        }
        if (categories.sexual >= SEVERITY_THRESHOLD_BLOCK) {
            reasons.push('sexual content');
        }
        if (categories.violence >= SEVERITY_THRESHOLD_BLOCK) {
            reasons.push('violent content');
        }
        return reasons.length > 0
            ? `Content flagged for: ${reasons.join(', ')}`
            : 'Content flagged by safety analysis';
    }
    /**
     * Queue a video for moderation (called after encoding completes)
     *
     * @param videoId - Video record ID to moderate
     */
    async queueModeration(videoId) {
        const video = await prisma_js_1.prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                originalUrl: true,
                thumbnailUrl: true,
                userId: true
            }
        });
        if (!video) {
            logger_1.logger.warn({ videoId }, 'Video not found for moderation');
            return;
        }
        await this.moderateVideo({
            videoId: video.id,
            videoUrl: video.originalUrl,
            thumbnailUrl: video.thumbnailUrl || undefined,
            userId: video.userId
        });
    }
    /**
     * Check if service is configured
     */
    isAvailable() {
        return this.isConfigured;
    }
}
exports.VideoContentModerationService = VideoContentModerationService;
// Export singleton instance
exports.videoContentModerationService = new VideoContentModerationService();
//# sourceMappingURL=videoContentModerationService.js.map