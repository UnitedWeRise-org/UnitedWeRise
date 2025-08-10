"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const moderationService_1 = require("../services/moderationService");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Admin-only middleware
const requireAdmin = async (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
};
// Dashboard Overview
router.get('/dashboard', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalPosts, totalComments, pendingReports, resolvedReports, activeSuspensions, totalFlags, moderatorCount] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: {
                    lastSeenAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                }
            }),
            prisma.post.count(),
            prisma.comment.count(),
            prisma.report.count({ where: { status: 'PENDING' } }),
            prisma.report.count({ where: { status: 'RESOLVED' } }),
            prisma.userSuspension.count({ where: { isActive: true } }),
            prisma.contentFlag.count({ where: { resolved: false } }),
            prisma.user.count({ where: { isModerator: true } })
        ]);
        // Growth metrics
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [newUsers, newPosts, newReports] = await Promise.all([
            prisma.user.count({ where: { createdAt: { gte: last30Days } } }),
            prisma.post.count({ where: { createdAt: { gte: last30Days } } }),
            prisma.report.count({ where: { createdAt: { gte: last30Days } } })
        ]);
        // Recent activity
        const recentReports = await prisma.report.findMany({
            where: { priority: { in: ['HIGH', 'URGENT'] } },
            include: {
                reporter: {
                    select: { id: true, username: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        res.json({
            overview: {
                totalUsers,
                activeUsers,
                totalPosts,
                totalComments,
                pendingReports,
                resolvedReports,
                activeSuspensions,
                totalFlags,
                moderatorCount
            },
            growth: {
                newUsers,
                newPosts,
                newReports,
                period: '30 days'
            },
            recentActivity: {
                highPriorityReports: recentReports,
                lastUpdated: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});
// User Management
router.get('/users', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const search = req.query.search;
        const status = req.query.status; // 'active', 'suspended', 'verified'
        const role = req.query.role; // 'user', 'moderator', 'admin'
        const offset = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (status === 'suspended')
            where.isSuspended = true;
        if (status === 'active')
            where.isSuspended = false;
        if (status === 'verified')
            where.emailVerified = true;
        if (role === 'moderator')
            where.isModerator = true;
        if (role === 'admin')
            where.isAdmin = true;
        if (role === 'user') {
            where.isModerator = false;
            where.isAdmin = false;
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    emailVerified: true,
                    phoneVerified: true,
                    isModerator: true,
                    isAdmin: true,
                    isSuspended: true,
                    createdAt: true,
                    lastSeenAt: true,
                    followersCount: true,
                    followingCount: true,
                    _count: {
                        select: {
                            posts: true,
                            comments: true,
                            reports: true,
                            receivedWarnings: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit
            }),
            prisma.user.count({ where })
        ]);
        // Get suspension details for suspended users
        const suspendedUserIds = users.filter(u => u.isSuspended).map(u => u.id);
        const activeSuspensions = suspendedUserIds.length > 0 ? await prisma.userSuspension.findMany({
            where: {
                userId: { in: suspendedUserIds },
                isActive: true
            },
            select: {
                userId: true,
                type: true,
                reason: true,
                endsAt: true,
                createdAt: true
            }
        }) : [];
        const enrichedUsers = users.map(user => ({
            ...user,
            suspension: activeSuspensions.find(s => s.userId === user.id) || null,
            stats: {
                posts: user._count.posts,
                comments: user._count.comments,
                reports: user._count.reports,
                warnings: user._count.receivedWarnings
            },
            _count: undefined
        }));
        res.json({
            users: enrichedUsers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});
// Get detailed user info
router.get('/users/:userId', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        posts: true,
                        comments: true,
                        likes: true,
                        followers: true,
                        following: true,
                        reports: true,
                        receivedWarnings: true,
                        suspensions: true
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get recent activity
        const [recentPosts, recentComments, recentReports, warnings, suspensions] = await Promise.all([
            prisma.post.findMany({
                where: { authorId: userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    likesCount: true,
                    commentsCount: true
                }
            }),
            prisma.comment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    post: {
                        select: { id: true, content: true }
                    }
                }
            }),
            prisma.report.findMany({
                where: { reporterId: userId },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    targetType: true,
                    reason: true,
                    status: true,
                    createdAt: true
                }
            }),
            prisma.userWarning.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    moderator: {
                        select: { id: true, username: true }
                    }
                }
            }),
            prisma.userSuspension.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                include: {
                    moderator: {
                        select: { id: true, username: true }
                    }
                }
            })
        ]);
        res.json({
            user: {
                ...user,
                stats: {
                    posts: user._count.posts,
                    comments: user._count.comments,
                    likes: user._count.likes,
                    followers: user._count.followers,
                    following: user._count.following,
                    reports: user._count.reports,
                    warnings: user._count.receivedWarnings,
                    suspensions: user._count.suspensions
                },
                _count: undefined
            },
            activity: {
                recentPosts,
                recentComments,
                recentReports
            },
            moderation: {
                warnings,
                suspensions
            }
        });
    }
    catch (error) {
        console.error('Admin user detail error:', error);
        res.status(500).json({ error: 'Failed to retrieve user details' });
    }
});
// Suspend user
router.post('/users/:userId/suspend', auth_1.requireAuth, requireAdmin, [
    (0, express_validator_1.body)('reason').notEmpty().trim().withMessage('Reason is required'),
    (0, express_validator_1.body)('type').isIn(['TEMPORARY', 'PERMANENT', 'POSTING_RESTRICTED', 'COMMENTING_RESTRICTED']),
    (0, express_validator_1.body)('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, type, duration } = req.body;
        const adminId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Cannot suspend admin users' });
        }
        let endsAt;
        if (type === 'TEMPORARY' && duration) {
            endsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000); // duration in days
        }
        await moderationService_1.moderationService.suspendUser(userId, adminId, reason, type, endsAt);
        res.json({
            message: 'User suspended successfully',
            suspension: {
                type,
                reason,
                endsAt,
                issuedBy: req.user.username
            }
        });
    }
    catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});
// Lift suspension
router.post('/users/:userId/unsuspend', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        // Deactivate all active suspensions
        await prisma.userSuspension.updateMany({
            where: { userId, isActive: true },
            data: { isActive: false }
        });
        // Update user suspension status
        await prisma.user.update({
            where: { id: userId },
            data: { isSuspended: false }
        });
        res.json({ message: 'User suspension lifted successfully' });
    }
    catch (error) {
        console.error('Unsuspend user error:', error);
        res.status(500).json({ error: 'Failed to lift suspension' });
    }
});
// Promote/demote user roles
router.post('/users/:userId/role', auth_1.requireAuth, requireAdmin, [
    (0, express_validator_1.body)('role').isIn(['user', 'moderator', 'admin']).withMessage('Invalid role'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updates = {
            isModerator: false,
            isAdmin: false
        };
        if (role === 'moderator')
            updates.isModerator = true;
        if (role === 'admin') {
            updates.isModerator = true;
            updates.isAdmin = true;
        }
        await prisma.user.update({
            where: { id: userId },
            data: updates
        });
        res.json({
            message: `User role updated to ${role}`,
            newRole: role
        });
    }
    catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
// Content Management
router.get('/content/flagged', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const flagType = req.query.flagType;
        const confidence = parseFloat(req.query.minConfidence) || 0;
        const offset = (page - 1) * limit;
        const where = { resolved: false };
        if (flagType)
            where.flagType = flagType;
        if (confidence > 0)
            where.confidence = { gte: confidence };
        const [flags, total] = await Promise.all([
            prisma.contentFlag.findMany({
                where,
                orderBy: [
                    { confidence: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip: offset,
                take: limit
            }),
            prisma.contentFlag.count({ where })
        ]);
        // Get content details for each flag
        const enrichedFlags = await Promise.all(flags.map(async (flag) => {
            let content = null;
            try {
                switch (flag.contentType) {
                    case 'POST':
                        content = await prisma.post.findUnique({
                            where: { id: flag.contentId },
                            include: {
                                author: { select: { id: true, username: true, email: true } }
                            }
                        });
                        break;
                    case 'COMMENT':
                        content = await prisma.comment.findUnique({
                            where: { id: flag.contentId },
                            include: {
                                user: { select: { id: true, username: true, email: true } }
                            }
                        });
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to fetch ${flag.contentType} ${flag.contentId}:`, error);
            }
            return {
                ...flag,
                content
            };
        }));
        res.json({
            flags: enrichedFlags,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get flagged content error:', error);
        res.status(500).json({ error: 'Failed to retrieve flagged content' });
    }
});
// Resolve content flag
router.post('/content/flags/:flagId/resolve', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const { flagId } = req.params;
        const adminId = req.user.id;
        await prisma.contentFlag.update({
            where: { id: flagId },
            data: {
                resolved: true,
                resolvedBy: adminId,
                resolvedAt: new Date()
            }
        });
        res.json({ message: 'Flag resolved successfully' });
    }
    catch (error) {
        console.error('Resolve flag error:', error);
        res.status(500).json({ error: 'Failed to resolve flag' });
    }
});
// System Analytics
router.get('/analytics', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        // Daily activity metrics
        const dailyStats = await prisma.$queryRaw `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'users' as type
      FROM "User"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'posts' as type
      FROM "Post"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        'reports' as type
      FROM "Report"
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      
      ORDER BY date DESC
    `;
        // Report breakdown by reason
        const reportReasons = await prisma.report.groupBy({
            by: ['reason'],
            where: {
                createdAt: { gte: startDate }
            },
            _count: {
                reason: true
            },
            orderBy: {
                _count: {
                    reason: 'desc'
                }
            }
        });
        // Flag distribution
        const flagDistribution = await prisma.contentFlag.groupBy({
            by: ['flagType'],
            where: {
                createdAt: { gte: startDate }
            },
            _count: {
                flagType: true
            },
            _avg: {
                confidence: true
            }
        });
        res.json({
            period: `${days} days`,
            dailyActivity: dailyStats,
            reportBreakdown: reportReasons,
            flagDistribution: flagDistribution,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});
// System Settings
router.get('/settings', auth_1.requireAuth, requireAdmin, async (req, res) => {
    try {
        // Return current system configuration
        const settings = {
            moderation: {
                autoModeration: true,
                toxicityThreshold: 0.8,
                spamDetection: true,
                duplicateContentCheck: true
            },
            registration: {
                emailVerificationRequired: true,
                phoneVerificationRequired: false,
                captchaRequired: true
            },
            rateLimiting: {
                authRequests: '5 per 15 minutes',
                postCreation: '10 per 15 minutes',
                generalApi: '100 per 15 minutes'
            },
            features: {
                politicalProfiles: true,
                messaging: true,
                contentReporting: true
            }
        };
        res.json({ settings });
    }
    catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map