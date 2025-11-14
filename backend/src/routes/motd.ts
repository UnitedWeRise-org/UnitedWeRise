import express from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import * as speakeasy from 'speakeasy';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * @swagger
 * /api/motd/current:
 *   get:
 *     tags: [MOTD]
 *     summary: Get current active MOTD
 *     description: Retrieves the currently active Message of the Day that hasn't been dismissed by the user
 *     parameters:
 *       - in: header
 *         name: x-dismissal-token
 *         schema:
 *           type: string
 *         description: Token for tracking anonymous user dismissals
 *     responses:
 *       200:
 *         description: Current MOTD retrieved successfully (may be null if no active MOTD)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     motd:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                           nullable: true
 *                         content:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     dismissalToken:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.get('/current', async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        const dismissalToken = req.headers['x-dismissal-token'] as string;

        // Find active MOTDs that haven't been dismissed by this user/token
        const currentMOTD = await prisma.messageOfTheDay.findFirst({
            where: {
                isActive: true,
                AND: [
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: new Date() } }
                        ]
                    },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: new Date() } }
                        ]
                    }
                ],
                NOT: {
                    dismissals: {
                        some: userId ? {
                            userId: userId
                        } : {
                            dismissalToken: dismissalToken || 'never_matches'
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true
            }
        });

        if (!currentMOTD) {
            return res.json({ success: true, data: { motd: null } });
        }

        // Record view (with duplicate prevention)
        try {
            await prisma.mOTDView.create({
                data: {
                    motdId: currentMOTD.id,
                    userId: userId || null,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent') || null,
                    viewToken: dismissalToken || null
                }
            });
        } catch (viewError: any) {
            if (viewError.code === 'P2002') {
                // View already recorded for this token - not an error
                logger.debug({ dismissalToken }, 'Duplicate view attempt ignored');
            } else {
                // Log other errors but don't fail the request
                logger.error({ error: viewError }, 'View recording error');
            }
        }

        res.json({
            success: true,
            data: {
                motd: currentMOTD,
                dismissalToken: dismissalToken || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
        });
    } catch (error) {
        logger.error({ error }, 'Get current MOTD error');
        res.status(500).json({ success: false, error: 'Failed to get current MOTD' });
    }
});

/**
 * @swagger
 * /api/motd/dismiss/{id}:
 *   post:
 *     tags: [MOTD]
 *     summary: Dismiss an MOTD
 *     description: Records that a user or anonymous visitor has dismissed a specific MOTD
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MOTD ID to dismiss
 *       - in: header
 *         name: x-dismissal-token
 *         schema:
 *           type: string
 *         description: Token for tracking anonymous user dismissals
 *     responses:
 *       200:
 *         description: MOTD dismissed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     dismissed:
 *                       type: boolean
 *       400:
 *         description: User authentication or dismissal token required
 *       500:
 *         description: Server error
 */
router.post('/dismiss/:id', async (req, res) => {
    try {
        const motdId = req.params.id;
        const userId = (req as any).user?.id;
        const dismissalToken = req.headers['x-dismissal-token'] as string;

        if (!userId && !dismissalToken) {
            return res.status(400).json({ success: false, error: 'User authentication or dismissal token required' });
        }

        // Verify MOTD exists
        const motd = await prisma.messageOfTheDay.findUnique({
            where: { id: motdId }
        });

        if (!motd) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }

        // Create dismissal record
        await prisma.mOTDDismissal.create({
            data: {
                motdId,
                userId: userId || null,
                dismissalToken: dismissalToken || null
            }
        });

        res.json({ success: true, data: { dismissed: true } });
    } catch (error: any) {
        if (error.code === 'P2002') {
            // Already dismissed
            return res.json({ success: true, data: { dismissed: true } });
        }
        logger.error({ error, motdId: req.params.id }, 'Dismiss MOTD error');
        res.status(500).json({ success: false, error: 'Failed to dismiss MOTD' });
    }
});

// Admin routes - require authentication and admin privileges

/**
 * @swagger
 * /api/motd/admin/list:
 *   get:
 *     tags: [MOTD Admin]
 *     summary: List all MOTDs
 *     description: Retrieves all MOTDs with creator info and engagement metrics (admin only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: MOTDs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     motds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                             nullable: true
 *                           content:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           targetAudience:
 *                             type: string
 *                             enum: [ALL, NEW, ACTIVE, INACTIVE, ADMINS, MODERATORS, CANDIDATES]
 *                           isDismissible:
 *                             type: boolean
 *                           showOnce:
 *                             type: boolean
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdBy:
 *                             type: object
 *                           _count:
 *                             type: object
 *                             properties:
 *                               views:
 *                                 type: integer
 *                               dismissals:
 *                                 type: integer
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Server error
 */
router.get('/admin/list', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const motds = await prisma.messageOfTheDay.findMany({
            include: {
                createdBy: {
                    select: { id: true, username: true, firstName: true, lastName: true }
                },
                _count: {
                    select: {
                        views: true,
                        dismissals: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: { motds } });
    } catch (error) {
        logger.error({ error }, 'Get MOTDs admin error');
        res.status(500).json({ success: false, error: 'Failed to get MOTDs' });
    }
});

/**
 * @swagger
 * /api/motd/admin/create:
 *   post:
 *     tags: [MOTD Admin]
 *     summary: Create new MOTD
 *     description: Creates a new Message of the Day with full configuration options (admin only)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: MOTD title (optional, 3-100 chars)
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 description: MOTD content (required, 10-2000 chars, HTML allowed)
 *               isActive:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to activate immediately
 *               targetAudience:
 *                 type: string
 *                 enum: [ALL, NEW, ACTIVE, INACTIVE, ADMINS, MODERATORS, CANDIDATES]
 *                 default: ALL
 *                 description: Target user group
 *               isDismissible:
 *                 type: boolean
 *                 default: true
 *                 description: Whether users can dismiss
 *               showOnce:
 *                 type: boolean
 *                 default: false
 *                 description: Show only once per user
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: When to start displaying
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: When to stop displaying
 *               showToNewUsers:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: MOTD created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     motd:
 *                       type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       500:
 *         description: Server error
 */
router.post('/admin/create', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const {
            title,
            content,
            isActive = false,
            targetAudience = 'ALL',
            isDismissible = true,
            showOnce = false,
            startDate,
            endDate,
            showToNewUsers = true
        } = req.body;
        const userId = req.user.id;

        // Validation
        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        if (content.length < 10 || content.length > 2000) {
            return res.status(400).json({ success: false, error: 'Content must be between 10 and 2000 characters' });
        }

        if (title && (title.length < 3 || title.length > 100)) {
            return res.status(400).json({ success: false, error: 'Title must be between 3 and 100 characters' });
        }

        if (targetAudience && !['ALL', 'NEW', 'ACTIVE', 'INACTIVE', 'ADMINS', 'MODERATORS', 'CANDIDATES'].includes(targetAudience)) {
            return res.status(400).json({ success: false, error: 'Invalid targetAudience value' });
        }

        // Date validation
        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ success: false, error: 'End date must be after start date' });
        }

        // If setting as active, deactivate other active MOTDs
        if (isActive) {
            await prisma.messageOfTheDay.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            });
        }

        const motd = await prisma.messageOfTheDay.create({
            data: {
                title,
                content,
                isActive,
                targetAudience: targetAudience as any,
                isDismissible,
                showOnce,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                showToNewUsers,
                createdById: userId
            },
            include: {
                createdBy: {
                    select: { id: true, username: true, firstName: true, lastName: true }
                }
            }
        });

        // Log the action
        await prisma.mOTDLog.create({
            data: {
                motdId: motd.id,
                action: 'created',
                performedById: userId,
                notes: `Created MOTD: ${title || 'Untitled'}`
            }
        });

        res.json({ success: true, data: { motd } });
    } catch (error) {
        logger.error({ error, userId: req.user?.id }, 'Create MOTD error');
        res.status(500).json({ success: false, error: 'Failed to create MOTD' });
    }
});

/**
 * @swagger
 * /api/motd/admin/update/{id}:
 *   put:
 *     tags: [MOTD Admin]
 *     summary: Update MOTD
 *     description: Updates an existing MOTD with change tracking (admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MOTD ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               targetAudience:
 *                 type: string
 *                 enum: [ALL, NEW, ACTIVE, INACTIVE, ADMINS, MODERATORS, CANDIDATES]
 *               isDismissible:
 *                 type: boolean
 *               showOnce:
 *                 type: boolean
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               showToNewUsers:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: MOTD updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: MOTD not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put('/admin/update/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const motdId = req.params.id;
        const {
            title,
            content,
            isActive,
            targetAudience,
            isDismissible,
            showOnce,
            startDate,
            endDate,
            showToNewUsers
        } = req.body;
        const userId = req.user.id;

        // Get current MOTD for comparison
        const currentMOTD = await prisma.messageOfTheDay.findUnique({
            where: { id: motdId }
        });

        if (!currentMOTD) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }

        // Validation
        if (content !== undefined && (content.length < 10 || content.length > 2000)) {
            return res.status(400).json({ success: false, error: 'Content must be between 10 and 2000 characters' });
        }

        if (title !== undefined && title && (title.length < 3 || title.length > 100)) {
            return res.status(400).json({ success: false, error: 'Title must be between 3 and 100 characters' });
        }

        if (targetAudience && !['ALL', 'NEW', 'ACTIVE', 'INACTIVE', 'ADMINS', 'MODERATORS', 'CANDIDATES'].includes(targetAudience)) {
            return res.status(400).json({ success: false, error: 'Invalid targetAudience value' });
        }

        // Date validation
        const newStartDate = startDate ? new Date(startDate) : currentMOTD.startDate;
        const newEndDate = endDate ? new Date(endDate) : currentMOTD.endDate;
        if (newStartDate && newEndDate && newEndDate < newStartDate) {
            return res.status(400).json({ success: false, error: 'End date must be after start date' });
        }

        // If setting as active, deactivate other active MOTDs
        if (isActive && !currentMOTD.isActive) {
            await prisma.messageOfTheDay.updateMany({
                where: { isActive: true, id: { not: motdId } },
                data: { isActive: false }
            });
        }

        const updatedMOTD = await prisma.messageOfTheDay.update({
            where: { id: motdId },
            data: {
                ...(title !== undefined && { title }),
                ...(content !== undefined && { content }),
                ...(isActive !== undefined && { isActive }),
                ...(targetAudience !== undefined && { targetAudience: targetAudience as any }),
                ...(isDismissible !== undefined && { isDismissible }),
                ...(showOnce !== undefined && { showOnce }),
                ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(showToNewUsers !== undefined && { showToNewUsers })
            },
            include: {
                createdBy: {
                    select: { id: true, username: true, firstName: true, lastName: true }
                }
            }
        });

        // Log the action with changes
        const changes: any = {};
        if (title !== undefined && title !== currentMOTD.title) changes.title = { from: currentMOTD.title, to: title };
        if (content !== undefined && content !== currentMOTD.content) changes.content = { changed: true };
        if (isActive !== undefined && isActive !== currentMOTD.isActive) changes.isActive = { from: currentMOTD.isActive, to: isActive };
        if (targetAudience !== undefined && targetAudience !== currentMOTD.targetAudience) changes.targetAudience = { from: currentMOTD.targetAudience, to: targetAudience };
        if (isDismissible !== undefined && isDismissible !== currentMOTD.isDismissible) changes.isDismissible = { from: currentMOTD.isDismissible, to: isDismissible };
        if (showOnce !== undefined && showOnce !== currentMOTD.showOnce) changes.showOnce = { from: currentMOTD.showOnce, to: showOnce };
        if (startDate !== undefined) changes.startDate = { from: currentMOTD.startDate, to: startDate };
        if (endDate !== undefined) changes.endDate = { from: currentMOTD.endDate, to: endDate };
        if (showToNewUsers !== undefined && showToNewUsers !== currentMOTD.showToNewUsers) changes.showToNewUsers = { from: currentMOTD.showToNewUsers, to: showToNewUsers };

        await prisma.mOTDLog.create({
            data: {
                motdId,
                action: 'updated',
                changes,
                performedById: userId,
                notes: `Updated MOTD: ${title || currentMOTD.title || 'Untitled'}`
            }
        });

        res.json({ success: true, data: { motd: updatedMOTD } });
    } catch (error) {
        logger.error({ error, motdId: req.params.id }, 'Update MOTD error');
        res.status(500).json({ success: false, error: 'Failed to update MOTD' });
    }
});

/**
 * @swagger
 * /api/motd/admin/toggle/{id}:
 *   post:
 *     tags: [MOTD Admin]
 *     summary: Toggle MOTD active state
 *     description: Activates or deactivates an MOTD (admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MOTD ID to toggle
 *     responses:
 *       200:
 *         description: MOTD toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     motd:
 *                       type: object
 *                     activated:
 *                       type: boolean
 *       404:
 *         description: MOTD not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/admin/toggle/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const motdId = req.params.id;
        const userId = req.user.id;

        const motd = await prisma.messageOfTheDay.findUnique({
            where: { id: motdId }
        });

        if (!motd) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }

        const newActiveState = !motd.isActive;

        // If activating, deactivate other active MOTDs
        if (newActiveState) {
            await prisma.messageOfTheDay.updateMany({
                where: { isActive: true, id: { not: motdId } },
                data: { isActive: false }
            });
        }

        const updatedMOTD = await prisma.messageOfTheDay.update({
            where: { id: motdId },
            data: { isActive: newActiveState }
        });

        // Log the action
        await prisma.mOTDLog.create({
            data: {
                motdId,
                action: newActiveState ? 'activated' : 'deactivated',
                performedById: userId,
                notes: `${newActiveState ? 'Activated' : 'Deactivated'} MOTD`
            }
        });

        res.json({ success: true, data: { motd: updatedMOTD, activated: newActiveState } });
    } catch (error) {
        logger.error({ error, motdId: req.params.id }, 'Toggle MOTD error');
        res.status(500).json({ success: false, error: 'Failed to toggle MOTD' });
    }
});

/**
 * @swagger
 * /api/motd/admin/delete/{id}:
 *   delete:
 *     tags: [MOTD Admin]
 *     summary: Delete MOTD
 *     description: Permanently deletes an MOTD with TOTP verification and audit logging (admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MOTD ID to delete
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totpToken
 *               - reason
 *             properties:
 *               totpToken:
 *                 type: string
 *                 description: TOTP token for verification
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Reason for deletion (10-500 chars)
 *               adminUserId:
 *                 type: string
 *                 description: Admin user ID (optional, defaults to authenticated user)
 *     responses:
 *       200:
 *         description: MOTD deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *                     auditId:
 *                       type: string
 *       400:
 *         description: Validation error (missing TOTP/reason, invalid reason length)
 *       401:
 *         description: Unauthorized or invalid TOTP
 *       403:
 *         description: Forbidden
 *       404:
 *         description: MOTD not found
 *       500:
 *         description: Server error
 */
router.delete('/admin/delete/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const motdId = req.params.id;
        const userId = req.user.id;
        const { totpToken, reason, adminUserId } = req.body;

        // Validate required fields
        if (!totpToken) {
            return res.status(400).json({ success: false, error: 'TOTP token is required' });
        }

        if (!reason) {
            return res.status(400).json({ success: false, error: 'Deletion reason is required' });
        }

        if (reason.length < 10 || reason.length > 500) {
            return res.status(400).json({ success: false, error: 'Deletion reason must be between 10 and 500 characters' });
        }

        // Verify TOTP
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true }
        });

        if (!user || !user.totpEnabled || !user.totpSecret) {
            return res.status(401).json({ success: false, error: 'TOTP not configured for user' });
        }

        const isValidTOTP = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token: totpToken,
            window: 2
        });

        if (!isValidTOTP) {
            return res.status(401).json({ success: false, error: 'Invalid TOTP token' });
        }

        // Find MOTD to get details for audit log
        const motd = await prisma.messageOfTheDay.findUnique({
            where: { id: motdId },
            include: {
                _count: {
                    select: {
                        views: true,
                        dismissals: true
                    }
                }
            }
        });

        if (!motd) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }

        // Create audit log BEFORE deletion (since cascade will delete associated logs)
        const auditLog = await prisma.mOTDLog.create({
            data: {
                motdId,
                action: 'deleted',
                changes: {
                    title: motd.title,
                    viewCount: motd._count.views,
                    dismissalCount: motd._count.dismissals,
                    wasActive: motd.isActive
                },
                performedById: adminUserId || userId,
                notes: `Deleted MOTD: ${motd.title || 'Untitled'}. Reason: ${reason}`
            }
        });

        // Delete MOTD (cascades to dismissals and views)
        await prisma.messageOfTheDay.delete({
            where: { id: motdId }
        });

        res.json({
            success: true,
            data: {
                deleted: true,
                auditId: auditLog.id
            }
        });
    } catch (error) {
        logger.error({ error, motdId: req.params.id }, 'Delete MOTD error');
        res.status(500).json({ success: false, error: 'Failed to delete MOTD' });
    }
});

/**
 * @swagger
 * /api/motd/admin/analytics/{id}:
 *   get:
 *     tags: [MOTD Admin]
 *     summary: Get MOTD analytics
 *     description: Retrieves detailed analytics including views, dismissals, and audit logs (admin only)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MOTD ID
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: object
 *                       description: MOTD with view and dismissal details
 *                     logs:
 *                       type: array
 *                       description: Audit log entries
 *       404:
 *         description: MOTD not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/admin/analytics/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const motdId = req.params.id;

        const analytics = await prisma.messageOfTheDay.findUnique({
            where: { id: motdId },
            include: {
                views: {
                    select: {
                        viewedAt: true,
                        user: {
                            select: { id: true, username: true }
                        }
                    },
                    orderBy: { viewedAt: 'desc' }
                },
                dismissals: {
                    select: {
                        dismissedAt: true,
                        user: {
                            select: { id: true, username: true }
                        }
                    },
                    orderBy: { dismissedAt: 'desc' }
                },
                _count: {
                    select: {
                        views: true,
                        dismissals: true
                    }
                }
            }
        });

        if (!analytics) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }

        const logs = await prisma.mOTDLog.findMany({
            where: { motdId },
            include: {
                performedBy: {
                    select: { id: true, username: true, firstName: true, lastName: true }
                }
            },
            orderBy: { performedAt: 'desc' }
        });

        res.json({ success: true, data: { analytics, logs } });
    } catch (error) {
        logger.error({ error, motdId: req.params.id }, 'Get MOTD analytics error');
        res.status(500).json({ success: false, error: 'Failed to get MOTD analytics' });
    }
});

export default router;
