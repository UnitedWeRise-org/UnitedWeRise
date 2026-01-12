"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const rateLimiting_1 = require("../middleware/rateLimiting");
const emailService_1 = require("../services/emailService");
const logger_1 = require("../services/logger");
const safeJson_1 = require("../utils/safeJson");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
};
const validateAppeal = [
    (0, express_validator_1.body)('suspensionId').notEmpty().withMessage('Suspension ID is required'),
    (0, express_validator_1.body)('reason').isLength({ min: 10, max: 2000 }).trim().withMessage('Appeal reason must be 10-2000 characters'),
    (0, express_validator_1.body)('additionalInfo').optional().isLength({ max: 5000 }).trim().withMessage('Additional info must be less than 5000 characters'),
    handleValidationErrors
];
const requireModerator = async (req, res, next) => {
    if (!req.user?.isModerator && !req.user?.isAdmin) {
        // Role info logged server-side only
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};
// Submit appeal
router.post('/', auth_1.requireAuth, rateLimiting_1.apiLimiter, validateAppeal, async (req, res) => {
    try {
        const { suspensionId, reason, additionalInfo } = req.body;
        const userId = req.user.id;
        // Verify the suspension belongs to the user and is active
        const suspension = await prisma_1.prisma.userSuspension.findFirst({
            where: {
                id: suspensionId,
                userId,
                isActive: true
            }
        });
        if (!suspension) {
            return res.status(404).json({ error: 'Active suspension not found' });
        }
        if (suspension.appealed) {
            return res.status(409).json({ error: 'This suspension has already been appealed' });
        }
        // Check if user has submitted too many appeals recently
        const recentAppeals = await prisma_1.prisma.appeal.count({
            where: {
                userId,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });
        if (recentAppeals >= 3) {
            return res.status(429).json({
                error: 'Too many appeals submitted recently. Please wait before submitting another appeal.'
            });
        }
        // Create appeal
        const appeal = await prisma_1.prisma.appeal.create({
            data: {
                userId,
                suspensionId,
                reason,
                additionalInfo,
                status: 'PENDING'
            }
        });
        // Mark suspension as appealed
        await prisma_1.prisma.userSuspension.update({
            where: { id: suspensionId },
            data: {
                appealed: true,
                appealedAt: new Date()
            }
        });
        // Notify moderators about new appeal (in a real system, this would send notifications)
        logger_1.logger.info({ appealId: appeal.id, userId }, 'New appeal submitted');
        res.json({
            message: 'Appeal submitted successfully',
            appealId: appeal.id,
            status: 'PENDING',
            estimatedReviewTime: '3-5 business days'
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Submit appeal error');
        res.status(500).json({ error: 'Failed to submit appeal' });
    }
});
// Get user's appeals
router.get('/my', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit, offset } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset, 50 // Max limit for appeals
        );
        const page = Math.floor(offset / limit) + 1;
        const appeals = await prisma_1.prisma.appeal.findMany({
            where: { userId },
            include: {
                suspension: {
                    select: {
                        reason: true,
                        type: true,
                        createdAt: true,
                        endsAt: true
                    }
                },
                reviewedByUser: {
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
        const total = await prisma_1.prisma.appeal.count({ where: { userId } });
        res.json({
            appeals,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get user appeals error');
        res.status(500).json({ error: 'Failed to retrieve appeals' });
    }
});
// Get appeal status
router.get('/:appealId', auth_1.requireAuth, async (req, res) => {
    try {
        const { appealId } = req.params;
        const userId = req.user.id;
        const appeal = await prisma_1.prisma.appeal.findFirst({
            where: {
                id: appealId,
                userId // Ensure user can only see their own appeals
            },
            include: {
                suspension: {
                    select: {
                        reason: true,
                        type: true,
                        createdAt: true,
                        endsAt: true
                    }
                },
                reviewedByUser: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        if (!appeal) {
            return res.status(404).json({ error: 'Appeal not found' });
        }
        res.json({ appeal });
    }
    catch (error) {
        logger_1.logger.error({ error, appealId: req.params.appealId, userId: req.user?.id }, 'Get appeal error');
        res.status(500).json({ error: 'Failed to retrieve appeal' });
    }
});
// Moderator routes
// Get appeals queue
router.get('/queue/all', auth_1.requireAuth, requireModerator, async (req, res) => {
    try {
        const { limit, offset } = (0, safeJson_1.safePaginationParams)(req.query.limit, req.query.offset, 50 // Max limit for appeals queue
        );
        const page = Math.floor(offset / limit) + 1;
        const status = req.query.status || 'PENDING';
        const where = {};
        if (status)
            where.status = status;
        const appeals = await prisma_1.prisma.appeal.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                },
                suspension: {
                    include: {
                        moderator: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                reviewedByUser: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
            skip: offset,
            take: limit
        });
        const total = await prisma_1.prisma.appeal.count({ where });
        res.json({
            appeals,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get appeals queue error');
        res.status(500).json({ error: 'Failed to retrieve appeals queue' });
    }
});
// Review appeal
router.post('/:appealId/review', auth_1.requireAuth, requireModerator, [
    (0, express_validator_1.body)('decision').isIn(['APPROVED', 'DENIED']).withMessage('Decision must be APPROVED or DENIED'),
    (0, express_validator_1.body)('reviewNotes').isLength({ min: 10, max: 2000 }).trim().withMessage('Review notes must be 10-2000 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { appealId } = req.params;
        const { decision, reviewNotes } = req.body;
        const reviewerId = req.user.id;
        const appeal = await prisma_1.prisma.appeal.findUnique({
            where: { id: appealId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true
                    }
                },
                suspension: true
            }
        });
        if (!appeal) {
            return res.status(404).json({ error: 'Appeal not found' });
        }
        if (appeal.status !== 'PENDING') {
            return res.status(400).json({ error: 'Appeal has already been reviewed' });
        }
        // Update appeal
        await prisma_1.prisma.appeal.update({
            where: { id: appealId },
            data: {
                status: decision,
                reviewNotes,
                reviewedBy: reviewerId,
                reviewedAt: new Date()
            }
        });
        // If approved, lift the suspension
        if (decision === 'APPROVED' && appeal.suspension) {
            await prisma_1.prisma.userSuspension.update({
                where: { id: appeal.suspension.id },
                data: { isActive: false }
            });
            // Check if user has other active suspensions
            const otherSuspensions = await prisma_1.prisma.userSuspension.findFirst({
                where: {
                    userId: appeal.userId,
                    isActive: true,
                    id: { not: appeal.suspension.id }
                }
            });
            if (!otherSuspensions) {
                await prisma_1.prisma.user.update({
                    where: { id: appeal.userId },
                    data: { isSuspended: false }
                });
            }
            // Create moderation log
            await prisma_1.prisma.moderationLog.create({
                data: {
                    moderatorId: reviewerId,
                    targetType: 'USER',
                    targetId: appeal.userId,
                    action: 'APPEAL_APPROVED',
                    reason: 'Suspension appeal approved',
                    notes: reviewNotes,
                    metadata: {
                        appealId,
                        originalSuspensionReason: appeal.suspension.reason
                    }
                }
            });
        }
        else {
            // Create moderation log for denied appeal
            await prisma_1.prisma.moderationLog.create({
                data: {
                    moderatorId: reviewerId,
                    targetType: 'USER',
                    targetId: appeal.userId,
                    action: 'APPEAL_DENIED',
                    reason: 'Suspension appeal denied',
                    notes: reviewNotes,
                    metadata: {
                        appealId
                    }
                }
            });
        }
        // Send notification email to user
        try {
            if (appeal.user) {
                const emailTemplate = generateAppealResultTemplate(appeal.user.email, decision, reviewNotes, appeal.user.firstName || undefined);
                await emailService_1.emailService.sendEmail(emailTemplate);
            }
        }
        catch (error) {
            logger_1.logger.error({ error, appealId, email: appeal.user?.email }, 'Failed to send appeal result email');
        }
        res.json({
            message: `Appeal ${decision.toLowerCase()} successfully`,
            decision,
            appealId
        });
    }
    catch (error) {
        logger_1.logger.error({ error, appealId: req.params.appealId, reviewerId: req.user?.id }, 'Review appeal error');
        res.status(500).json({ error: 'Failed to review appeal' });
    }
});
// Helper function to generate appeal result email template
function generateAppealResultTemplate(email, decision, notes, firstName) {
    const name = firstName ? firstName : email.split('@')[0];
    const isApproved = decision === 'APPROVED';
    return {
        to: email,
        subject: `Appeal ${isApproved ? 'Approved' : 'Decision'} - United We Rise`,
        text: `Hello ${name},

Your suspension appeal has been ${decision.toLowerCase()}.

${isApproved ? 'Your account suspension has been lifted.' : 'Your suspension remains in effect.'}

Reviewer notes: ${notes}

${isApproved ? 'You can now access your account normally.' : 'You may submit a new appeal in the future if circumstances change.'}

Best regards,
The United We Rise Moderation Team`,
        html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">United We Rise</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Appeal Decision</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <div style="background: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${isApproved ? '#22c55e' : '#ef4444'}; padding: 20px; margin-bottom: 30px;">
            <h2 style="color: ${isApproved ? '#15803d' : '#dc2626'}; margin: 0 0 10px 0; font-size: 20px;">Appeal ${isApproved ? 'Approved' : 'Denied'}</h2>
          </div>
          
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
            Hello ${name},
          </p>
          
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
            Your suspension appeal has been <strong>${decision.toLowerCase()}</strong>.
          </p>
          
          <p style="color: #374151; line-height: 1.6; font-size: 16px; margin-bottom: 20px;">
            ${isApproved ? 'Your account suspension has been lifted and you can now access your account normally.' : 'Your suspension remains in effect.'}
          </p>
          
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #1f2937; margin: 0 0 10px 0; font-weight: 600;">Reviewer notes:</p>
            <p style="color: #374151; margin: 0;">${notes}</p>
          </div>
          
          ${!isApproved ? '<p style="color: #374151; line-height: 1.6; font-size: 16px;">You may submit a new appeal in the future if circumstances change.</p>' : ''}
        </div>
        
        <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Best regards,<br>
            The United We Rise Moderation Team
          </p>
        </div>
      </div>
    `
    };
}
exports.default = router;
//# sourceMappingURL=appeals.js.map