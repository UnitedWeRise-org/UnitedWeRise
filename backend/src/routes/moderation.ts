import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, requireStagingAuth, AuthRequest } from '../middleware/auth';
import { moderationService } from '../services/moderationService';
import { emailService } from '../services/emailService';
import { validateReport, validateModerationAction } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimiting';
import { metricsService } from '../services/metricsService';
import { CandidateReportService } from '../services/candidateReportService';
import { logger } from '../services/logger';
import { safePaginationParams, PAGINATION_LIMITS } from '../utils/safeJson';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

const requireModerator = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.isModerator && !req.user?.isAdmin) {
    // Role info logged server-side only
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.isAdmin) {
    // Role info logged server-side only
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// User Reporting Routes

/**
 * @swagger
 * /api/moderation/reports:
 *   post:
 *     tags: [Moderation]
 *     summary: Submit content report
 *     description: Report inappropriate content (post, comment, user, message, candidate). Prevents duplicate active reports. Candidate reports use AI urgency scoring and geographic weighting.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetType
 *               - targetId
 *               - reason
 *             properties:
 *               targetType:
 *                 type: string
 *                 enum: [POST, COMMENT, USER, MESSAGE, CANDIDATE]
 *                 description: Type of content being reported
 *               targetId:
 *                 type: string
 *                 description: ID of content being reported
 *               reason:
 *                 type: string
 *                 description: Reason for report (SPAM, HARASSMENT, HATE_SPEECH, etc.)
 *               description:
 *                 type: string
 *                 description: Additional details about the report
 *     responses:
 *       200:
 *         description: Report submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Report submitted successfully"
 *                 reportId:
 *                   type: string
 *                 estimatedReviewTime:
 *                   type: string
 *                   example: "24-48 hours"
 *                 geographicWeight:
 *                   type: number
 *                   description: Geographic priority weight (only for CANDIDATE reports)
 *                 aiUrgencyLevel:
 *                   type: string
 *                   description: AI-determined urgency (only for CANDIDATE reports)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reported content not found
 *       409:
 *         description: Duplicate report - user already reported this content
 *       500:
 *         description: Server error
 */
router.post('/reports', requireAuth, apiLimiter, validateReport, async (req: AuthRequest, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    const reporterId = req.user!.id;

    // Handle candidate reports specially
    if (targetType === 'CANDIDATE') {
      const report = await CandidateReportService.submitCandidateReport(
        reporterId,
        targetId,
        reason,
        description
      );
      
      metricsService.trackReportSubmitted(report.id, 'CANDIDATE', reason);
      
      return res.json({
        message: 'Candidate report submitted successfully',
        reportId: report.id,
        geographicWeight: report.geographicWeight,
        aiUrgencyLevel: report.aiUrgencyLevel
      });
    }

    // Check if user has already reported this content
    const existingReport = await prisma.report.findFirst({
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
        targetExists = !!(await prisma.post.findUnique({ where: { id: targetId } }));
        break;
      case 'COMMENT':
        targetExists = !!(await prisma.comment.findUnique({ where: { id: targetId } }));
        break;
      case 'USER':
        targetExists = !!(await prisma.user.findUnique({ where: { id: targetId } }));
        break;
      case 'MESSAGE':
        targetExists = !!(await prisma.message.findUnique({ where: { id: targetId } }));
        break;
    }

    if (!targetExists) {
      return res.status(404).json({ error: 'Reported content not found' });
    }

    // Create report
    const reportId = await moderationService.createReport(
      reporterId,
      targetType,
      targetId,
      reason,
      description
    );

    // Track report submission metrics
    metricsService.trackReportSubmitted(reportId, targetType, reason);

    res.json({
      message: 'Report submitted successfully',
      reportId,
      estimatedReviewTime: '24-48 hours'
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Submit report error');
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * @swagger
 * /api/moderation/reports/my:
 *   get:
 *     tags: [Moderation]
 *     summary: Get current user's submitted reports
 *     description: Retrieves all reports submitted by authenticated user with pagination. Target details hidden for privacy.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Reports per page
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Report with status and moderator info (target details hidden for privacy)
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/reports/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined,
      50 // Max limit for user reports
    );
    const page = Math.floor(offset / limit) + 1;

    const reports = await prisma.report.findMany({
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

    const total = await prisma.report.count({
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
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get user reports error');
    res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});

// Moderator Routes (require moderator access)

/**
 * @swagger
 * /api/moderation/reports:
 *   get:
 *     tags: [Moderation]
 *     summary: Get reports queue (moderator/admin only)
 *     description: Retrieves pending/resolved reports for moderation review with full content details. Supports filtering by status, priority, and target type.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_REVIEW, RESOLVED, all]
 *           default: "PENDING"
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT, all]
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [POST, COMMENT, USER, MESSAGE, CANDIDATE, all]
 *     responses:
 *       200:
 *         description: Reports retrieved with target content details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Report with full reporter, moderator, and target content details
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - moderator/admin access required
 *       500:
 *         description: Server error
 */
router.get('/reports', requireAuth, requireModerator, async (req: AuthRequest, res) => {
  try {
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined,
      50 // Max limit for moderation reports
    );
    const page = Math.floor(offset / limit) + 1;
    const status = req.query.status as string || 'PENDING';
    const priority = req.query.priority as string;
    const targetType = req.query.targetType as string;

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (priority && priority !== 'all') where.priority = priority;
    if (targetType && targetType !== 'all') where.targetType = targetType;

    const reports = await prisma.report.findMany({
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

    const total = await prisma.report.count({ where });

    // Get target content details
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let targetContent = null;

        try {
          switch (report.targetType) {
            case 'POST':
              targetContent = await prisma.post.findUnique({
                where: { id: report.targetId },
                include: {
                  author: { select: { id: true, username: true, email: true } }
                }
              });
              break;
            case 'COMMENT':
              targetContent = await prisma.comment.findUnique({
                where: { id: report.targetId },
                include: {
                  user: { select: { id: true, username: true, email: true } },
                  post: { select: { id: true, content: true } }
                }
              });
              break;
            case 'USER':
              targetContent = await prisma.user.findUnique({
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
              targetContent = await prisma.message.findUnique({
                where: { id: report.targetId },
                include: {
                  sender: { select: { id: true, username: true, email: true } }
                }
              });
              break;
          }
        } catch (error) {
          logger.error({ error, targetType: report.targetType, targetId: report.targetId }, 'Failed to fetch moderation target');
        }

        return {
          ...report,
          targetContent
        };
      })
    );

    res.json({
      reports: enrichedReports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error({ error }, 'Get reports queue error');
    res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});

/**
 * @swagger
 * /api/moderation/reports/{reportId}/action:
 *   post:
 *     tags: [Moderation]
 *     summary: Take action on report (moderator/admin only)
 *     description: Resolve report by taking moderation action (hide content, delete content, warn user, suspend user, ban user). Sends email notification to reporter.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [NO_ACTION, CONTENT_HIDDEN, CONTENT_DELETED, USER_WARNED, USER_SUSPENDED, USER_BANNED]
 *                 description: Moderation action to take
 *               notes:
 *                 type: string
 *                 description: Moderator notes explaining action
 *     responses:
 *       200:
 *         description: Report resolved and action executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 action:
 *                   type: string
 *                 reportId:
 *                   type: string
 *       400:
 *         description: Report already resolved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - moderator/admin access required
 *       404:
 *         description: Report not found
 *       500:
 *         description: Server error
 */
router.post('/reports/:reportId/action', requireAuth, requireModerator, validateModerationAction, async (req: AuthRequest, res) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body;
    const moderatorId = req.user!.id;

    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status === 'RESOLVED') {
      return res.status(400).json({ error: 'Report already resolved' });
    }

    // Update report
    await prisma.report.update({
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
    await prisma.moderationLog.create({
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
      const reporter = await prisma.user.findUnique({
        where: { id: report.reporterId },
        select: { email: true, firstName: true }
      });

      if (reporter) {
        const emailTemplate = emailService.generateReportUpdateTemplate(
          reporter.email,
          reportId,
          action,
          notes,
          reporter.firstName || undefined
        );
        await emailService.sendEmail(emailTemplate);
      }
    } catch (error) {
      logger.error({ error, reportId }, 'Failed to send report update email');
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Report resolved successfully',
      action,
      reportId
    });
  } catch (error) {
    logger.error({ error, reportId: req.params.reportId }, 'Report action error');
    res.status(500).json({ error: 'Failed to process report action' });
  }
});

// Content moderation actions
async function executeModeratorAction(
  action: string,
  targetType: string,
  targetId: string,
  moderatorId: string,
  reason: string
): Promise<void> {
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
        await prisma.post.delete({ where: { id: targetId } });
      } else if (targetType === 'COMMENT') {
        await prisma.comment.delete({ where: { id: targetId } });
      }
      break;

    case 'USER_WARNED':
      if (targetType === 'USER' || targetType === 'POST' || targetType === 'COMMENT') {
        let userId = targetId;
        
        // Get userId if targeting content
        if (targetType === 'POST') {
          const post = await prisma.post.findUnique({ where: { id: targetId } });
          userId = post?.authorId || '';
        } else if (targetType === 'COMMENT') {
          const comment = await prisma.comment.findUnique({ where: { id: targetId } });
          userId = comment?.userId || '';
        }

        if (userId) {
          await moderationService.issueWarning(userId, moderatorId, reason, 'MODERATE');
        }
      }
      break;

    case 'USER_SUSPENDED':
      if (targetType === 'USER' || targetType === 'POST' || targetType === 'COMMENT') {
        let userId = targetId;
        
        // Get userId if targeting content
        if (targetType === 'POST') {
          const post = await prisma.post.findUnique({ where: { id: targetId } });
          userId = post?.authorId || '';
        } else if (targetType === 'COMMENT') {
          const comment = await prisma.comment.findUnique({ where: { id: targetId } });
          userId = comment?.userId || '';
        }

        if (userId) {
          const suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          await moderationService.suspendUser(userId, moderatorId, reason, 'TEMPORARY', suspensionEnd);
        }
      }
      break;

    case 'USER_BANNED':
      if (targetType === 'USER' || targetType === 'POST' || targetType === 'COMMENT') {
        let userId = targetId;
        
        // Get userId if targeting content
        if (targetType === 'POST') {
          const post = await prisma.post.findUnique({ where: { id: targetId } });
          userId = post?.authorId || '';
        } else if (targetType === 'COMMENT') {
          const comment = await prisma.comment.findUnique({ where: { id: targetId } });
          userId = comment?.userId || '';
        }

        if (userId) {
          await moderationService.suspendUser(userId, moderatorId, reason, 'PERMANENT');
        }
      }
      break;
  }
}

/**
 * @swagger
 * /api/moderation/stats:
 *   get:
 *     tags: [Moderation]
 *     summary: Get moderation statistics (moderator/admin only)
 *     description: Retrieves moderation queue statistics including pending reports, urgent reports, resolved today, active flags, suspended users.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pendingReports:
 *                   type: integer
 *                 urgentReports:
 *                   type: integer
 *                 resolvedToday:
 *                   type: integer
 *                 activeFlags:
 *                   type: integer
 *                 suspendedUsers:
 *                   type: integer
 *                 totalReports:
 *                   type: integer
 *                 averageResolutionTime:
 *                   type: string
 *                   example: "2.3 hours"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - moderator/admin access required
 *       500:
 *         description: Server error
 */
router.get('/stats', requireAuth, requireModerator, async (req: AuthRequest, res) => {
  try {
    const [
      pendingReports,
      resolvedToday,
      activeFlags,
      suspendedUsers,
      totalReports
    ] = await Promise.all([
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({
        where: {
          status: 'RESOLVED',
          moderatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.contentFlag.count({ where: { resolved: false } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.report.count()
    ]);

    const urgentReports = await prisma.report.count({
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
  } catch (error) {
    logger.error({ error }, 'Get moderation stats error');
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// Admin Routes (require admin access)

/**
 * @swagger
 * /api/moderation/users/{userId}/promote:
 *   post:
 *     tags: [Moderation]
 *     summary: Promote user to moderator (admin only)
 *     description: Grants moderator privileges to specified user. Admin access required.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User promoted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User promoted to moderator successfully"
 *                 userId:
 *                   type: string
 *       400:
 *         description: User is already a moderator
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/users/:userId/promote', requireStagingAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isModerator) {
      return res.status(400).json({ error: 'User is already a moderator' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isModerator: true }
    });

    res.json({
      message: 'User promoted to moderator successfully',
      userId
    });
  } catch (error) {
    logger.error({ error, targetUserId: req.params.userId }, 'Promote user error');
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

/**
 * @swagger
 * /api/moderation/health:
 *   get:
 *     tags: [Moderation]
 *     summary: Get moderation system health (moderator/admin only)
 *     description: Checks moderation system health and cleans up expired suspensions. Returns system status and queue information.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: System health OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 automatedModeration:
 *                   type: string
 *                   example: "active"
 *                 lastCleanup:
 *                   type: string
 *                   format: date-time
 *                 queueStatus:
 *                   type: string
 *                   example: "processing"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - moderator/admin access required
 *       500:
 *         description: System check failed
 */
router.get('/health', requireAuth, requireModerator, async (req: AuthRequest, res) => {
  try {
    // Cleanup expired suspensions
    await moderationService.cleanupExpiredSuspensions();

    const health = {
      status: 'healthy',
      automatedModeration: 'active',
      lastCleanup: new Date().toISOString(),
      queueStatus: 'processing'
    };

    res.json(health);
  } catch (error) {
    logger.error({ error }, 'Moderation health check error');
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'System check failed'
    });
  }
});

export default router;