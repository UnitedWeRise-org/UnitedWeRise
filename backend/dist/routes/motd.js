"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get current active MOTD for display
router.get('/current', async (req, res) => {
    try {
        const userId = req.user?.id;
        const dismissalToken = req.headers['x-dismissal-token'];
        // Find active MOTDs that haven't been dismissed by this user/token
        const currentMOTD = await prisma_1.prisma.messageOfTheDay.findFirst({
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
        // Record view
        await prisma_1.prisma.mOTDView.create({
            data: {
                motdId: currentMOTD.id,
                userId: userId || null,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || null
            }
        });
        res.json({
            success: true,
            data: {
                motd: currentMOTD,
                dismissalToken: dismissalToken || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
        });
    }
    catch (error) {
        console.error('Get current MOTD error:', error);
        res.status(500).json({ success: false, error: 'Failed to get current MOTD' });
    }
});
// Dismiss MOTD
router.post('/dismiss/:id', async (req, res) => {
    try {
        const motdId = req.params.id;
        const userId = req.user?.id;
        const dismissalToken = req.headers['x-dismissal-token'];
        if (!userId && !dismissalToken) {
            return res.status(400).json({ success: false, error: 'User authentication or dismissal token required' });
        }
        // Create dismissal record
        await prisma_1.prisma.mOTDDismissal.create({
            data: {
                motdId,
                userId: userId || null,
                dismissalToken: dismissalToken || null
            }
        });
        res.json({ success: true, data: { dismissed: true } });
    }
    catch (error) {
        if (error.code === 'P2002') {
            // Already dismissed
            return res.json({ success: true, data: { dismissed: true } });
        }
        console.error('Dismiss MOTD error:', error);
        res.status(500).json({ success: false, error: 'Failed to dismiss MOTD' });
    }
});
// Admin routes - require authentication and admin privileges
// Get all MOTDs for admin management
router.get('/admin/list', auth_1.requireStagingAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const motds = await prisma_1.prisma.messageOfTheDay.findMany({
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
    }
    catch (error) {
        console.error('Get MOTDs admin error:', error);
        res.status(500).json({ success: false, error: 'Failed to get MOTDs' });
    }
});
// Create new MOTD
router.post('/admin/create', auth_1.requireStagingAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { title, content, isActive = false, startDate, endDate, showToNewUsers = true } = req.body;
        const userId = req.user.id;
        if (!content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }
        // If setting as active, deactivate other active MOTDs
        if (isActive) {
            await prisma_1.prisma.messageOfTheDay.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            });
        }
        const motd = await prisma_1.prisma.messageOfTheDay.create({
            data: {
                title,
                content,
                isActive,
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
        await prisma_1.prisma.mOTDLog.create({
            data: {
                motdId: motd.id,
                action: 'created',
                performedById: userId,
                notes: `Created MOTD: ${title || 'Untitled'}`
            }
        });
        res.json({ success: true, data: { motd } });
    }
    catch (error) {
        console.error('Create MOTD error:', error);
        res.status(500).json({ success: false, error: 'Failed to create MOTD' });
    }
});
// Update MOTD
router.put('/admin/update/:id', auth_1.requireStagingAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const motdId = req.params.id;
        const { title, content, isActive, startDate, endDate, showToNewUsers } = req.body;
        const userId = req.user.id;
        // Get current MOTD for comparison
        const currentMOTD = await prisma_1.prisma.messageOfTheDay.findUnique({
            where: { id: motdId }
        });
        if (!currentMOTD) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }
        // If setting as active, deactivate other active MOTDs
        if (isActive && !currentMOTD.isActive) {
            await prisma_1.prisma.messageOfTheDay.updateMany({
                where: { isActive: true, id: { not: motdId } },
                data: { isActive: false }
            });
        }
        const updatedMOTD = await prisma_1.prisma.messageOfTheDay.update({
            where: { id: motdId },
            data: {
                title,
                content,
                isActive,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                showToNewUsers
            },
            include: {
                createdBy: {
                    select: { id: true, username: true, firstName: true, lastName: true }
                }
            }
        });
        // Log the action with changes
        const changes = {};
        if (title !== currentMOTD.title)
            changes.title = { from: currentMOTD.title, to: title };
        if (content !== currentMOTD.content)
            changes.content = { changed: true };
        if (isActive !== currentMOTD.isActive)
            changes.isActive = { from: currentMOTD.isActive, to: isActive };
        await prisma_1.prisma.mOTDLog.create({
            data: {
                motdId,
                action: 'updated',
                changes,
                performedById: userId,
                notes: `Updated MOTD: ${title || currentMOTD.title || 'Untitled'}`
            }
        });
        res.json({ success: true, data: { motd: updatedMOTD } });
    }
    catch (error) {
        console.error('Update MOTD error:', error);
        res.status(500).json({ success: false, error: 'Failed to update MOTD' });
    }
});
// Activate/Deactivate MOTD
router.post('/admin/toggle/:id', auth_1.requireStagingAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const motdId = req.params.id;
        const userId = req.user.id;
        const motd = await prisma_1.prisma.messageOfTheDay.findUnique({
            where: { id: motdId }
        });
        if (!motd) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }
        const newActiveState = !motd.isActive;
        // If activating, deactivate other active MOTDs
        if (newActiveState) {
            await prisma_1.prisma.messageOfTheDay.updateMany({
                where: { isActive: true, id: { not: motdId } },
                data: { isActive: false }
            });
        }
        const updatedMOTD = await prisma_1.prisma.messageOfTheDay.update({
            where: { id: motdId },
            data: { isActive: newActiveState }
        });
        // Log the action
        await prisma_1.prisma.mOTDLog.create({
            data: {
                motdId,
                action: newActiveState ? 'activated' : 'deactivated',
                performedById: userId,
                notes: `${newActiveState ? 'Activated' : 'Deactivated'} MOTD`
            }
        });
        res.json({ success: true, data: { motd: updatedMOTD, activated: newActiveState } });
    }
    catch (error) {
        console.error('Toggle MOTD error:', error);
        res.status(500).json({ success: false, error: 'Failed to toggle MOTD' });
    }
});
// Delete MOTD
router.delete('/admin/delete/:id', auth_1.requireStagingAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const motdId = req.params.id;
        const userId = req.user.id;
        const motd = await prisma_1.prisma.messageOfTheDay.findUnique({
            where: { id: motdId }
        });
        if (!motd) {
            return res.status(404).json({ success: false, error: 'MOTD not found' });
        }
        await prisma_1.prisma.messageOfTheDay.delete({
            where: { id: motdId }
        });
        // Log the action (log will be deleted with cascade, so we need to create it elsewhere if needed)
        // For now, we'll just return success
        res.json({ success: true, data: { deleted: true } });
    }
    catch (error) {
        console.error('Delete MOTD error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete MOTD' });
    }
});
// Get MOTD analytics and logs
router.get('/admin/analytics/:id', auth_1.requireStagingAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const motdId = req.params.id;
        const analytics = await prisma_1.prisma.messageOfTheDay.findUnique({
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
        const logs = await prisma_1.prisma.mOTDLog.findMany({
            where: { motdId },
            include: {
                performedBy: {
                    select: { id: true, username: true, firstName: true, lastName: true }
                }
            },
            orderBy: { performedAt: 'desc' }
        });
        res.json({ success: true, data: { analytics, logs } });
    }
    catch (error) {
        console.error('Get MOTD analytics error:', error);
        res.status(500).json({ success: false, error: 'Failed to get MOTD analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=motd.js.map