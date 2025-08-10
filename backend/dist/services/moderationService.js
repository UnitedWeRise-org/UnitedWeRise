"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationService = void 0;
const client_1 = require("@prisma/client");
const emailService_1 = require("./emailService");
class ModerationService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.toxicityThreshold = 0.8; // Confidence threshold for flagging content
        this.spamKeywords = [
            'click here', 'buy now', 'free money', 'guaranteed', 'make money fast',
            'lose weight fast', 'get rich quick', 'no risk', 'limited time',
            'act now', 'urgent', 'congratulations you won', 'claim your prize'
        ];
    }
    // Automated content analysis
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
        const hateSpeechScore = this.detectHateSpeech(content);
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
    // Placeholder for AI-powered toxicity detection
    async detectToxicity(content) {
        // In production, integrate with services like:
        // - Google Perspective API
        // - OpenAI Moderation API
        // - Azure Content Moderator
        // Simple heuristic for demo
        const toxicWords = [
            'hate', 'kill', 'die', 'stupid', 'idiot', 'moron', 'retard',
            'nazi', 'terrorist', 'scum', 'trash', 'worthless'
        ];
        const lowerContent = content.toLowerCase();
        const toxicMatches = toxicWords.filter(word => lowerContent.includes(word)).length;
        return Math.min(toxicMatches / 5, 1.0); // Normalize to 0-1
    }
    // Hate speech detection
    detectHateSpeech(content) {
        const hateSpeechTerms = [
            // This would be a comprehensive list in production
            'racial slurs', 'ethnic slurs', 'religious slurs',
            'homophobic terms', 'transphobic terms', 'ableist terms'
            // Note: Not including actual terms for safety
        ];
        const lowerContent = content.toLowerCase();
        // Pattern detection for hate speech
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
    // Duplicate content detection
    async detectDuplicateContent(content, contentType) {
        const recentContent = await this.prisma.post.findMany({
            where: {
                content,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            },
            take: 1
        });
        return recentContent.length > 0;
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
                    console.log(`Auto-moderating post ${contentId} due to high-confidence violations`);
                }
            }
        }
    }
    // Create user report
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
        console.log(`URGENT: Report ${reportId} requires immediate attention`);
        // In production: send notifications to moderators, create alerts, etc.
    }
    // Get user suspension status
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
    // Issue user warning
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
            console.error('Failed to send warning email:', error);
        }
        // Auto-suspend on final warning
        if (severity === 'FINAL') {
            await this.suspendUser(userId, moderatorId, 'Final warning issued', 'TEMPORARY', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            );
        }
    }
    // Suspend user
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
            console.error('Failed to send suspension email:', error);
        }
    }
    // Cleanup expired suspensions
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