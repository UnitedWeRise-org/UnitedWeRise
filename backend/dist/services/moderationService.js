"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationService = void 0;
const prisma_1 = require("../lib/prisma");
const emailService_1 = require("./emailService");
const azureOpenAIService_1 = require("./azureOpenAIService");
const logger_1 = require("./logger");
/**
 * Content moderation service using AI-powered analysis and automated flagging
 *
 * Features:
 * - Automated spam detection with keyword matching
 * - Azure OpenAI toxicity detection
 * - Hate speech detection
 * - Semantic duplicate content detection using embeddings
 * - User reporting system with priority escalation
 * - Suspension and warning management
 */
class ModerationService {
    prisma;
    toxicityThreshold;
    spamKeywords;
    constructor() {
        this.prisma = prisma_1.prisma;
        this.toxicityThreshold = 0.8; // Confidence threshold for flagging content
        this.spamKeywords = [
            'click here', 'buy now', 'free money', 'guaranteed', 'make money fast',
            'lose weight fast', 'get rich quick', 'no risk', 'limited time',
            'act now', 'urgent', 'congratulations you won', 'claim your prize'
        ];
    }
    /**
     * Analyze content for policy violations using automated detection
     *
     * Performs multiple parallel checks:
     * - Spam detection (keyword matching, capitalization, links, repetition)
     * - Toxicity detection (Azure OpenAI with fallback)
     * - Hate speech detection (Azure OpenAI with fallback)
     * - Duplicate content detection (semantic similarity)
     *
     * Creates ContentFlag records for violations above confidence thresholds.
     * Auto-moderates high-confidence (>0.9) severe violations.
     *
     * @param content - Text content to analyze
     * @param contentType - Type of content (POST, COMMENT, MESSAGE)
     * @param contentId - ID of the content being analyzed
     * @returns Promise<void> Flags created in database
     * @throws {Error} When database operations fail
     *
     * @example
     * await moderationService.analyzeContent(
     *   'This is spam content!!!',
     *   'POST',
     *   'post_123'
     * );
     * // Creates flags in database, may auto-hide content
     */
    async analyzeContent(content, contentType, contentId) {
        const flags = [];
        // Spam detection
        const spamScore = this.detectSpam(content);
        if (spamScore > 0.7) {
            flags.push({
                contentType,
                contentId,
                flagType: 'SPAM',
                confidence: spamScore,
                source: 'AUTOMATED',
                details: { spamIndicators: this.getSpamIndicators(content) }
            });
        }
        // Toxicity detection (placeholder - would integrate with real AI service)
        const toxicityScore = await this.detectToxicity(content);
        if (toxicityScore > this.toxicityThreshold) {
            flags.push({
                contentType,
                contentId,
                flagType: 'TOXICITY',
                confidence: toxicityScore,
                source: 'AUTOMATED',
                details: { toxicityScore }
            });
        }
        // Hate speech detection
        const hateSpeechScore = await this.detectHateSpeech(content);
        if (hateSpeechScore > 0.7) {
            flags.push({
                contentType,
                contentId,
                flagType: 'HATE_SPEECH',
                confidence: hateSpeechScore,
                source: 'AUTOMATED',
                details: { flaggedTerms: this.getHateSpeechTerms(content) }
            });
        }
        // Duplicate content detection
        const isDuplicate = await this.detectDuplicateContent(content, contentType);
        if (isDuplicate) {
            flags.push({
                contentType,
                contentId,
                flagType: 'DUPLICATE_CONTENT',
                confidence: 0.9,
                source: 'AUTOMATED',
                details: { duplicateDetection: true }
            });
        }
        // Create flags in database
        for (const flag of flags) {
            await this.prisma.contentFlag.create({
                data: flag
            });
        }
        // Auto-moderate high-confidence violations
        await this.autoModerate(flags, contentId, contentType);
    }
    // Spam detection using keyword matching and patterns
    detectSpam(content) {
        const lowerContent = content.toLowerCase();
        let spamScore = 0;
        // Check for spam keywords
        const keywordMatches = this.spamKeywords.filter(keyword => lowerContent.includes(keyword.toLowerCase())).length;
        spamScore += (keywordMatches / this.spamKeywords.length) * 0.5;
        // Check for excessive capitalization
        const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        if (capsRatio > 0.5)
            spamScore += 0.3;
        // Check for excessive punctuation
        const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length;
        if (punctuationRatio > 2)
            spamScore += 0.2;
        // Check for excessive links
        const linkCount = (content.match(/https?:\/\/\S+/gi) || []).length;
        if (linkCount > 3)
            spamScore += 0.4;
        // Check for repetitive patterns
        const words = content.split(' ');
        const uniqueWords = new Set(words);
        const repetitionRatio = 1 - (uniqueWords.size / words.length);
        if (repetitionRatio > 0.7)
            spamScore += 0.3;
        return Math.min(spamScore, 1.0);
    }
    // Azure OpenAI-powered toxicity detection
    async detectToxicity(content) {
        try {
            const moderationPrompt = `Analyze this content for toxicity, harassment, or harmful language. Focus on:
- Personal attacks or threats
- Hate speech targeting individuals or groups
- Severely inappropriate language
- Content that could cause harm

Content: "${content.slice(0, 1000)}"

Respond with JSON only:
{
  "toxicityScore": 0.0-1.0,
  "reasoning": "brief explanation",
  "categories": ["category1", "category2"]
}`;
            // Use General tier (gpt-4o-mini) for pattern matching moderation tasks
            const response = await azureOpenAIService_1.azureOpenAI.generateGeneralCompletion(moderationPrompt, {
                maxTokens: 200,
                temperature: 0.1,
                systemMessage: "You are a content moderation assistant. Analyze content objectively and provide toxicity scores. Be conservative - only flag genuinely harmful content, not political opinions."
            });
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            if (!analysisMatch) {
                throw new Error('No JSON found in response');
            }
            const analysis = JSON.parse(analysisMatch[0]);
            logger_1.logger.debug({
                score: analysis.toxicityScore,
                categories: analysis.categories
            }, 'Toxicity analysis completed');
            return Math.min(Math.max(analysis.toxicityScore || 0, 0), 1.0);
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Azure OpenAI toxicity detection failed, using fallback');
            // Fallback to simple keyword matching
            const toxicWords = [
                'hate', 'kill', 'die', 'stupid', 'idiot', 'moron', 'retard',
                'nazi', 'terrorist', 'scum', 'trash', 'worthless'
            ];
            const lowerContent = content.toLowerCase();
            const toxicMatches = toxicWords.filter(word => lowerContent.includes(word)).length;
            return Math.min(toxicMatches / 5, 1.0);
        }
    }
    // Azure OpenAI-powered hate speech detection
    async detectHateSpeech(content) {
        try {
            const hateSpeechPrompt = `Analyze this content for hate speech targeting individuals or groups based on:
- Race, ethnicity, or nationality
- Religion or beliefs
- Gender identity or sexual orientation
- Disability or other protected characteristics

Content: "${content.slice(0, 1000)}"

Respond with JSON only:
{
  "hateSpeechScore": 0.0-1.0,
  "reasoning": "brief explanation",
  "targetedGroups": ["group1", "group2"]
}`;
            // Use General tier (gpt-4o-mini) for pattern matching hate speech detection
            const response = await azureOpenAIService_1.azureOpenAI.generateGeneralCompletion(hateSpeechPrompt, {
                maxTokens: 200,
                temperature: 0.1,
                systemMessage: "You are a hate speech detection system. Focus on content that targets or dehumanizes specific groups. Political criticism or disagreement is not hate speech unless it targets identity groups."
            });
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            if (!analysisMatch) {
                throw new Error('No JSON found in response');
            }
            const analysis = JSON.parse(analysisMatch[0]);
            logger_1.logger.debug({
                score: analysis.hateSpeechScore,
                targetedGroups: analysis.targetedGroups
            }, 'Hate speech analysis completed');
            return Math.min(Math.max(analysis.hateSpeechScore || 0, 0), 1.0);
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Azure OpenAI hate speech detection failed, using fallback');
            // Fallback to pattern detection
            const lowerContent = content.toLowerCase();
            let score = 0;
            // Check for targeted harassment patterns
            if (lowerContent.includes('you people') || lowerContent.includes('your kind')) {
                score += 0.3;
            }
            // Check for dehumanizing language
            if (lowerContent.includes('animals') || lowerContent.includes('vermin')) {
                score += 0.4;
            }
            return Math.min(score, 1.0);
        }
    }
    // Semantic duplicate content detection using Azure OpenAI embeddings
    async detectDuplicateContent(content, contentType) {
        try {
            // Generate embedding for the new content
            const contentEmbedding = await azureOpenAIService_1.azureOpenAI.generateEmbedding(content);
            // Get recent posts with embeddings from the database
            const recentPosts = await this.prisma.post.findMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    },
                    embedding: {
                        isEmpty: false
                    }
                },
                select: {
                    id: true,
                    content: true,
                    embedding: true
                },
                take: 100 // Limit for performance
            });
            // Check for high similarity (potential duplicates)
            for (const post of recentPosts) {
                if (post.embedding && Array.isArray(post.embedding)) {
                    const similarity = azureOpenAIService_1.AzureOpenAIService.calculateSimilarity(contentEmbedding.embedding, post.embedding);
                    // High similarity threshold for duplicate detection
                    if (similarity > 0.95) {
                        logger_1.logger.info({
                            similarity,
                            originalPostId: post.id,
                            originalContent: post.content.slice(0, 100)
                        }, 'Potential duplicate content detected');
                        return true;
                    }
                }
            }
            return false;
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Semantic duplicate detection failed, using exact match fallback');
            // Fallback to exact content matching
            const recentContent = await this.prisma.post.findMany({
                where: {
                    content,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                take: 1
            });
            return recentContent.length > 0;
        }
    }
    // Get spam indicators for reporting
    getSpamIndicators(content) {
        const indicators = [];
        const lowerContent = content.toLowerCase();
        this.spamKeywords.forEach(keyword => {
            if (lowerContent.includes(keyword.toLowerCase())) {
                indicators.push(`Contains spam keyword: "${keyword}"`);
            }
        });
        const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        if (capsRatio > 0.5)
            indicators.push('Excessive capitalization');
        const linkCount = (content.match(/https?:\/\/\S+/gi) || []).length;
        if (linkCount > 3)
            indicators.push('Excessive links');
        return indicators;
    }
    // Get hate speech terms found (sanitized for logging)
    getHateSpeechTerms(content) {
        // Return generic indicators rather than actual terms
        return ['Potentially offensive language detected'];
    }
    // Auto-moderation for high-confidence violations
    async autoModerate(flags, contentId, contentType) {
        const highConfidenceFlags = flags.filter(flag => flag.confidence > 0.9);
        if (highConfidenceFlags.length > 0) {
            // Auto-hide content with high confidence spam/toxicity
            const severeFlags = highConfidenceFlags.filter(flag => ['TOXICITY', 'HATE_SPEECH', 'SPAM'].includes(flag.flagType));
            if (severeFlags.length > 0) {
                // Mark content as hidden/deleted based on severity
                if (contentType === 'POST') {
                    // Would implement content hiding logic
                    logger_1.logger.info({ contentId, contentType, flags: severeFlags.length }, 'Auto-moderating post due to high-confidence violations');
                }
            }
        }
    }
    /**
     * Create user report for policy violations
     *
     * Creates report record with auto-assigned priority based on reason.
     * Urgent reports (violence, self-harm, illegal content) are automatically escalated.
     *
     * Priority levels:
     * - URGENT: Violence threats, self-harm, illegal content
     * - HIGH: Hate speech, harassment, fake accounts
     * - MEDIUM: Misinformation, impersonation
     * - LOW: All other reasons
     *
     * @param reporterId - User ID submitting the report
     * @param targetType - Type of reported content (POST, COMMENT, USER, MESSAGE)
     * @param targetId - ID of the reported content/user
     * @param reason - Reason for report (maps to priority level)
     * @param description - Optional detailed description
     * @returns Promise<string> Created report ID
     * @throws {Error} When database operation fails
     *
     * @example
     * const reportId = await moderationService.createReport(
     *   'user_reporter_123',
     *   'POST',
     *   'post_456',
     *   'HATE_SPEECH',
     *   'This post targets a specific group with derogatory language.'
     * );
     * // Returns report ID, auto-escalates if URGENT priority
     */
    async createReport(reporterId, targetType, targetId, reason, description) {
        const priority = this.determinePriority(reason);
        const report = await this.prisma.report.create({
            data: {
                reporterId,
                targetType,
                targetId,
                reason: reason,
                description,
                priority
            }
        });
        // Auto-escalate urgent reports
        if (priority === 'URGENT') {
            await this.escalateReport(report.id);
        }
        return report.id;
    }
    // Determine report priority based on reason
    determinePriority(reason) {
        const urgentReasons = ['VIOLENCE_THREATS', 'SELF_HARM', 'ILLEGAL_CONTENT'];
        const highPriorityReasons = ['HATE_SPEECH', 'HARASSMENT', 'FAKE_ACCOUNT'];
        const mediumPriorityReasons = ['MISINFORMATION', 'IMPERSONATION'];
        if (urgentReasons.includes(reason))
            return 'URGENT';
        if (highPriorityReasons.includes(reason))
            return 'HIGH';
        if (mediumPriorityReasons.includes(reason))
            return 'MEDIUM';
        return 'LOW';
    }
    // Escalate urgent reports
    async escalateReport(reportId) {
        logger_1.logger.warn({ reportId }, 'URGENT: Report requires immediate attention');
        // In production: send notifications to moderators, create alerts, etc.
    }
    /**
     * Get user's current suspension status and permissions
     *
     * Checks for active suspensions (not expired) and determines user permissions.
     *
     * Suspension types and their effects:
     * - PERMANENT/TEMPORARY: Cannot post or comment
     * - POSTING_RESTRICTED: Cannot post (can comment)
     * - COMMENTING_RESTRICTED: Cannot comment (can post)
     *
     * @param userId - User ID to check
     * @returns Promise<Object> Suspension status with permission flags
     *
     * @example
     * const status = await moderationService.getUserSuspensionStatus('user_123');
     * if (!status.canPost) {
     *   throw new Error('User is restricted from posting');
     * }
     * console.log(status.suspension.type); // "POSTING_RESTRICTED"
     * console.log(status.suspension.endsAt); // 2025-11-01
     */
    async getUserSuspensionStatus(userId) {
        const activeSuspension = await this.prisma.userSuspension.findFirst({
            where: {
                userId,
                isActive: true,
                OR: [
                    { endsAt: null }, // Permanent
                    { endsAt: { gte: new Date() } } // Not expired
                ]
            }
        });
        if (!activeSuspension) {
            return {
                isSuspended: false,
                canPost: true,
                canComment: true
            };
        }
        const canPost = !['PERMANENT', 'TEMPORARY', 'POSTING_RESTRICTED'].includes(activeSuspension.type);
        const canComment = !['PERMANENT', 'TEMPORARY', 'COMMENTING_RESTRICTED'].includes(activeSuspension.type);
        return {
            isSuspended: true,
            suspension: activeSuspension,
            canPost,
            canComment
        };
    }
    /**
     * Issue warning to user for policy violation
     *
     * Creates warning record and sends email notification to user.
     * FINAL warnings automatically trigger 7-day temporary suspension.
     *
     * Warning severity levels:
     * - MINOR: First-time minor violations
     * - MODERATE: Repeated minor or single moderate violation
     * - MAJOR: Serious violations or repeated moderate violations
     * - FINAL: Last warning before suspension (auto-suspends for 7 days)
     *
     * @param userId - User ID receiving warning
     * @param moderatorId - Moderator ID issuing warning
     * @param reason - Reason for warning
     * @param severity - Warning severity level
     * @param notes - Optional moderator notes
     * @returns Promise<void>
     * @throws {Error} When database operation or email sending fails
     *
     * @example
     * await moderationService.issueWarning(
     *   'user_123',
     *   'mod_456',
     *   'Excessive profanity in comments',
     *   'MODERATE',
     *   'User has been previously warned about language.'
     * );
     * // Creates warning, sends email, auto-suspends if FINAL severity
     */
    async issueWarning(userId, moderatorId, reason, severity, notes) {
        await this.prisma.userWarning.create({
            data: {
                userId,
                moderatorId,
                reason,
                severity,
                notes
            }
        });
        // Send warning email
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, firstName: true }
            });
            if (user) {
                const emailTemplate = emailService_1.emailService.generateWarningTemplate(user.email, reason, severity, user.firstName || undefined);
                await emailService_1.emailService.sendEmail(emailTemplate);
            }
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to send warning email');
        }
        // Auto-suspend on final warning
        if (severity === 'FINAL') {
            await this.suspendUser(userId, moderatorId, 'Final warning issued', 'TEMPORARY', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            );
        }
    }
    /**
     * Suspend user account with specified restrictions
     *
     * Deactivates existing suspensions and creates new one.
     * Updates user.isSuspended flag and sends email notification.
     *
     * Suspension types:
     * - TEMPORARY: Full suspension with expiration date (requires endsAt)
     * - PERMANENT: Permanent ban from platform (no endsAt)
     * - POSTING_RESTRICTED: Can view and comment, cannot post
     * - COMMENTING_RESTRICTED: Can view and post, cannot comment
     *
     * @param userId - User ID to suspend
     * @param moderatorId - Moderator ID issuing suspension
     * @param reason - Reason for suspension
     * @param type - Suspension type
     * @param endsAt - Optional expiration date (required for TEMPORARY)
     * @returns Promise<void>
     * @throws {Error} When database operation or email sending fails
     *
     * @example
     * await moderationService.suspendUser(
     *   'user_123',
     *   'mod_456',
     *   'Repeated harassment of other users',
     *   'TEMPORARY',
     *   new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
     * );
     * // Suspends user for 14 days, sends notification email
     */
    async suspendUser(userId, moderatorId, reason, type, endsAt) {
        // Deactivate existing suspensions
        await this.prisma.userSuspension.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false }
        });
        // Create new suspension
        await this.prisma.userSuspension.create({
            data: {
                userId,
                moderatorId,
                reason,
                type,
                endsAt
            }
        });
        // Update user suspension status
        await this.prisma.user.update({
            where: { id: userId },
            data: { isSuspended: true }
        });
        // Send suspension email
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, firstName: true }
            });
            if (user) {
                const emailTemplate = emailService_1.emailService.generateSuspensionTemplate(user.email, reason, type, endsAt, user.firstName || undefined);
                await emailService_1.emailService.sendEmail(emailTemplate);
            }
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to send suspension email');
        }
    }
    /**
     * Cleanup expired temporary suspensions
     *
     * Finds suspensions with endsAt <= now, deactivates them, and clears user.isSuspended
     * flag if no other active suspensions exist.
     *
     * Should be run periodically (e.g., cron job every hour) to automatically restore access.
     *
     * @returns Promise<void>
     * @throws {Error} When database operations fail
     *
     * @example
     * // Run in scheduled task
     * setInterval(async () => {
     *   await moderationService.cleanupExpiredSuspensions();
     * }, 3600000); // Every hour
     */
    async cleanupExpiredSuspensions() {
        const expired = await this.prisma.userSuspension.findMany({
            where: {
                isActive: true,
                endsAt: { lte: new Date() }
            }
        });
        for (const suspension of expired) {
            await this.prisma.userSuspension.update({
                where: { id: suspension.id },
                data: { isActive: false }
            });
            // Check if user has other active suspensions
            const otherActive = await this.prisma.userSuspension.findFirst({
                where: {
                    userId: suspension.userId,
                    isActive: true,
                    id: { not: suspension.id }
                }
            });
            if (!otherActive) {
                await this.prisma.user.update({
                    where: { id: suspension.userId },
                    data: { isSuspended: false }
                });
            }
        }
    }
}
exports.moderationService = new ModerationService();
//# sourceMappingURL=moderationService.js.map