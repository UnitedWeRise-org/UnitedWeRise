"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const moderationService_1 = require("../services/moderationService");
const emailService_1 = require("../services/emailService");
const validation_1 = require("../middleware/validation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const metricsService_1 = require("../services/metricsService");
const candidateReportService_1 = require("../services/candidateReportService");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
const requireModerator = async (req, res, next) => {
    if (!req.user?.isModerator && !req.user?.isAdmin) {
        return res.status(403).json({ error: 'Moderator access required' });
    }
    next();
};
const requireAdmin = async (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
// User Reporting Routes
// Submit a report
router.post('/reports', auth_1.requireAuth, rateLimiting_1.apiLimiter, validation_1.validateReport, async (req, res) => {
    try {
        const { targetType, targetId, reason, description } = req.body;
        const reporterId = req.user.id;
        // Handle candidate reports specially
        if (targetType === 'CANDIDATE') {
            const report = await candidateReportService_1.CandidateReportService.submitCandidateReport(reporterId, targetId, reason, description);
            metricsService_1.metricsService.trackReportSubmitted(report.id, 'CANDIDATE', reason);
            return res.json({
                message: 'Candidate report submitted successfully',
                reportId: report.id,
                geographicWeight: report.geographicWeight,
                aiUrgencyLevel: report.aiUrgencyLevel
            });
        }
        // Check if user has already reported this content
        const existingReport = await prisma_1.prisma.report.findFirst({
            where: {
                reporterId,
                targetType,
                targetId,
                status: { in: ['PENDING', 'IN_REVIEW'] }
            }
        });
        if (existingReport) {
            return res.status(409).json({ error: 'You have already reported this content' });
        }
        // Verify target exists
        let targetExists = false;
        switch (targetType) {
            case 'POST':
                targetExists = !!(await prisma_1.prisma.post.findUnique({ where: { id: targetId } }));
                break;
            case 'COMMENT':
                targetExists = !!(await prisma_1.prisma.comment.findUnique({ where: { id: targetId } }));
                break;
            case 'USER':
                targetExists = !!(await prisma_1.prisma.user.findUnique({ where: { id: targetId } }));
                break;
            case 'MESSAGE':
                targetExists = !!(await prisma_1.prisma.message.findUnique({ where: { id: targetId } }));
                break;
        }
        if (!targetExists) {
            return res.status(404).json({ error: 'Reported content not found' });
        }
        // Create report
        const reportId = await moderationService_1.moderationService.createReport(reporterId, targetType, targetId, reason, description);
        // Track report submission metrics
        metricsService_1.metricsService.trackReportSubmitted(reportId, targetType, reason);
        res.json({
            message: 'Report submitted successfully',
            reportId,
            estimatedReviewTime: '24-48 hours'
        });
    }
    catch (error) {
        console.error('Submit report error:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});
// Get user's reports
router.get('/reports/my', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const offset = (page - 1) * limit;
        const reports = await prisma_1.prisma.report.findMany({
            where: { reporterId: userId },
            include: {
                moderator: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit
        });
        const total = await prisma_1.prisma.report.count({
            where: { reporterId: userId }
        });
        res.json({
            reports: reports.map(report => ({
                ...report,
                targetDetails: null // Don't expose target content details for privacy
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get user reports error:', error);
        res.status(500).json({ error: 'Failed to retrieve reports' });
    }
});
// Moderator Routes (require moderator access)
// Get reports queue
router.get('/reports', auth_1.requireAuth, requireModerator, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const status = req.query.status || 'PENDING';
        const priority = req.query.priority;
        const targetType = req.query.targetType;
        const offset = (page - 1) * limit;
        const where = {};
        if (status && status !== 'all')
            where.status = status;
        if (priority && priority !== 'all')
            where.priority = priority;
        if (targetType && targetType !== 'all')
            where.targetType = targetType;
        const reports = await prisma_1.prisma.report.findMany({
            where,
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        email: true
                    }
                },
                moderator: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ],
            skip: offset,
            take: limit
        });
        const total = await prisma_1.prisma.report.count({ where });
        // Get target content details
        const enrichedReports = await Promise.all(reports.map(async (report) => {
            let targetContent = null;
            try {
                switch (report.targetType) {
                    case 'POST':
                        targetContent = await prisma_1.prisma.post.findUnique({
                            where: { id: report.targetId },
                            include: {
                                author: { select: { id: true, username: true, email: true } }
                            }
                        });
                        break;
                    case 'COMMENT':
                        targetContent = await prisma_1.prisma.comment.findUnique({
                            where: { id: report.targetId },
                            include: {
                                user: { select: { id: true, username: true, email: true } },
                                post: { select: { id: true, content: true } }
                            }
                        });
                        break;
                    case 'USER':
                        targetContent = await prisma_1.prisma.user.findUnique({
                            where: { id: report.targetId },
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                bio: true,
                                createdAt: true,
                                followersCount: true,
                                followingCount: true,
                                isSuspended: true
                            }
                        });
                        break;
                    case 'MESSAGE':
                        targetContent = await prisma_1.prisma.message.findUnique({
                            where: { id: report.targetId },
                            include: {
                                sender: { select: { id: true, username: true, email: true } }
                            }
                        });
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to fetch ${report.targetType} ${report.targetId}:`, error);
            }
            return {
                ...report,
                targetContent
            };
        }));
        res.json({
            reports: enrichedReports,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get reports queue error:', error);
        res.status(500).json({ error: 'Failed to retrieve reports' });
    }
});
// Take action on a report
router.post('/reports/:reportId/action', auth_1.requireAuth, requireModerator, validation_1.validateModerationAction, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { action, notes } = req.body;
        const moderatorId = req.user.id;
        const report = await prisma_1.prisma.report.findUnique({
            where: { id: reportId }
        });
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        if (report.status === 'RESOLVED') {
            return res.status(400).json({ error: 'Report already resolved' });
        }
        // Update report
        await prisma_1.prisma.report.update({
            where: { id: reportId },
            data: {
                status: 'RESOLVED',
                moderatorId,
                moderatedAt: new Date(),
                moderatorNotes: notes,
                actionTaken: action
            }
        });
        // Create moderation log
        await prisma_1.prisma.moderationLog.create({
            data: {
                moderatorId,
                targetType: report.targetType,
                targetId: report.targetId,
                action,
                reason: `Report resolution: ${report.reason}`,
                notes,
                metadata: {
                    reportId,
                    originalReason: report.reason
                }
            }
        });
        // Execute the action
        await executeModeratorAction(action, report.targetType, report.targetId, moderatorId, notes || '');
        // Send notification email to reporter
        try {
            const reporter = await prisma_1.prisma.user.findUnique({
                where: { id: report.reporterId },
                select: { email: true, firstName: true }
            });
            if (reporter) {
                const emailTemplate = emailService_1.emailService.generateReportUpdateTemplate(reporter.email, reportId, action, notes, reporter.firstName || undefined);
                await emailService_1.emailService.sendEmail(emailTemplate);
            }
        }
        catch (error) {
            console.error('Failed to send report update email:', error);
            // Don't fail the request if email fails
        }
        res.json({
            message: 'Report resolved successfully',
            action,
            reportId
        });
    }
    catch (error) {
        console.error('Report action error:', error);
        res.status(500).json({ error: 'Failed to process report action' });
    }
});
// Content moderation actions
async function executeModeratorAction(action, targetType, targetId, moderatorId, reason) {
    switch (action) {
        case 'CONTENT_HIDDEN':
            // Implementation depends on your content model
            // You might add a 'hidden' or 'moderated' field
            if (targetType === 'POST') {
                // await prisma.post.update({ where: { id: targetId }, data: { isHidden: true } });
            }
            break;
        case 'CONTENT_DELETED':
            if (targetType === 'POST') {
                await prisma_1.prisma.post.delete({ where: { id: targetId } });
            }
            else if (targetType === 'COMMENT') {
                await prisma_1.prisma.comment.delete({ where: { id: targetId } });
            }
            break;
        case 'USER_WARNED':
            if (targetType === 'USER' || targetType === 'POST' || targetType === 'COMMENT') {
                let userId = targetId;
                // Get userId if targeting content
                if (targetType === 'POST') {
                    const post = await prisma_1.prisma.post.findUnique({ where: { id: targetId } });
                    userId = post?.authorId || '';
                }
                else if (targetType === 'COMMENT') {
                    const comment = await prisma_1.prisma.comment.findUnique({ where: { id: targetId } });
                    userId = comment?.userId || '';
                }
                if (userId) {
                    await moderationService_1.moderationService.issueWarning(userId, moderatorId, reason, 'MODERATE');
                }
            }
            break;
        case 'USER_SUSPENDED':
            if (targetType === 'USER' || targetType === 'POST' || targetType === 'COMMENT') {
                let userId = targetId;
                // Get userId if targeting content
                if (targetType === 'POST') {
                    const post = await prisma_1.prisma.post.findUnique({ where: { id: targetId } });
                    userId = post?.authorId || '';
                }
                else if (targetType === 'COMMENT') {
                    const comment = await prisma_1.prisma.comment.findUnique({ where: { id: targetId } });
                    userId = comment?.userId || '';
                }
                if (userId) {
                    const suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                    await moderationService_1.moderationService.suspendUser(userId, moderatorId, reason, 'TEMPORARY', suspensionEnd);
                }
            }
            break;
        case 'USER_BANNED':
            if (targetType === 'USER' || targetType === 'POST' || targetType === 'COMMENT') {
                let userId = targetId;
                // Get userId if targeting content
                if (targetType === 'POST') {
                    const post = await prisma_1.prisma.post.findUnique({ where: { id: targetId } });
                    userId = post?.authorId || '';
                }
                else if (targetType === 'COMMENT') {
                    const comment = await prisma_1.prisma.comment.findUnique({ where: { id: targetId } });
                    userId = comment?.userId || '';
                }
                if (userId) {
                    await moderationService_1.moderationService.suspendUser(userId, moderatorId, reason, 'PERMANENT');
                }
            }
            break;
    }
}
// Get moderation statistics
router.get('/stats', auth_1.requireAuth, requireModerator, async (req, res) => {
    try {
        const [pendingReports, resolvedToday, activeFlags, suspendedUsers, totalReports] = await Promise.all([
            prisma_1.prisma.report.count({ where: { status: 'PENDING' } }),
            prisma_1.prisma.report.count({
                where: {
                    status: 'RESOLVED',
                    moderatedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            }),
            prisma_1.prisma.contentFlag.count({ where: { resolved: false } }),
            prisma_1.prisma.user.count({ where: { isSuspended: true } }),
            prisma_1.prisma.report.count()
        ]);
        const urgentReports = await prisma_1.prisma.report.count({
            where: { priority: 'URGENT', status: 'PENDING' }
        });
        res.json({
            pendingReports,
            urgentReports,
            resolvedToday,
            activeFlags,
            suspendedUsers,
            totalReports,
            averageResolutionTime: '2.3 hours' // Would calculate from actual data
        });
    }
    catch (error) {
        console.error('Get moderation stats error:', error);
        res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
});
// Admin Routes (require admin access)
// Promote user to moderator
router.post('/users/:userId/promote', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isModerator) {
            return res.status(400).json({ error: 'User is already a moderator' });
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isModerator: true }
        });
        res.json({
            message: 'User promoted to moderator successfully',
            userId
        });
    }
    catch (error) {
        console.error('Promote user error:', error);
        res.status(500).json({ error: 'Failed to promote user' });
    }
});
// Get system health for moderation
router.get('/health', auth_1.requireAuth, requireModerator, async (req, res) => {
    try {
        // Cleanup expired suspensions
        await moderationService_1.moderationService.cleanupExpiredSuspensions();
        const health = {
            status: 'healthy',
            automatedModeration: 'active',
            lastCleanup: new Date().toISOString(),
            queueStatus: 'processing'
        };
        res.json(health);
    }
    catch (error) {
        console.error('Moderation health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'System check failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=moderation.js.map