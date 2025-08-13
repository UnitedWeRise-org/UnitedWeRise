import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { moderationService } from '../services/moderationService';
import { body, query, validationResult } from 'express-validator';
import { apiLimiter } from '../middleware/rateLimiting';
import { SecurityService } from '../services/securityService';

const router = express.Router();
const prisma = new PrismaClient();

// Admin-only middleware
const requireAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Dashboard Overview
router.get('/dashboard', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      totalComments,
      pendingReports,
      resolvedReports,
      activeSuspensions,
      totalFlags,
      moderatorCount
    ] = await Promise.all([
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
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// User Management
router.get('/users', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const search = req.query.search as string;
    const status = req.query.status as string; // 'active', 'suspended', 'verified'
    const role = req.query.role as string; // 'user', 'moderator', 'admin'
    const offset = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'suspended') where.isSuspended = true;
    if (status === 'active') where.isSuspended = false;
    if (status === 'verified') where.emailVerified = true;

    if (role === 'moderator') where.isModerator = true;
    if (role === 'admin') where.isAdmin = true;
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
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get detailed user info
router.get('/users/:userId', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
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
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve user details' });
  }
});

// Suspend user
router.post('/users/:userId/suspend', 
  requireAuth, 
  requireAdmin,
  [
    body('reason').notEmpty().trim().withMessage('Reason is required'),
    body('type').isIn(['TEMPORARY', 'PERMANENT', 'POSTING_RESTRICTED', 'COMMENTING_RESTRICTED']),
    body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive number'),
    handleValidationErrors
  ],
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { reason, type, duration } = req.body;
      const adminId = req.user!.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isAdmin) {
        return res.status(403).json({ error: 'Cannot suspend admin users' });
      }

      let endsAt: Date | undefined;
      if (type === 'TEMPORARY' && duration) {
        endsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000); // duration in days
      }

      await moderationService.suspendUser(userId, adminId, reason, type, endsAt);

      res.json({
        message: 'User suspended successfully',
        suspension: {
          type,
          reason,
          endsAt,
          issuedBy: req.user!.username
        }
      });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({ error: 'Failed to suspend user' });
    }
  }
);

// Lift suspension
router.post('/users/:userId/unsuspend', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
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
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Failed to lift suspension' });
  }
});

// Promote/demote user roles
router.post('/users/:userId/role', 
  requireAuth, 
  requireAdmin,
  [
    body('role').isIn(['user', 'moderator', 'admin']).withMessage('Invalid role'),
    handleValidationErrors
  ],
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updates: any = {
        isModerator: false,
        isAdmin: false
      };

      if (role === 'moderator') updates.isModerator = true;
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
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// Content Management
router.get('/content/flagged', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const flagType = req.query.flagType as string;
    const confidence = parseFloat(req.query.minConfidence as string) || 0;
    const offset = (page - 1) * limit;

    const where: any = { resolved: false };
    if (flagType) where.flagType = flagType;
    if (confidence > 0) where.confidence = { gte: confidence };

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
    const enrichedFlags = await Promise.all(
      flags.map(async (flag) => {
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
        } catch (error) {
          console.error(`Failed to fetch ${flag.contentType} ${flag.contentId}:`, error);
        }

        return {
          ...flag,
          content
        };
      })
    );

    res.json({
      flags: enrichedFlags,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get flagged content error:', error);
    res.status(500).json({ error: 'Failed to retrieve flagged content' });
  }
});

// Resolve content flag
router.post('/content/flags/:flagId/resolve', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { flagId } = req.params;
    const adminId = req.user!.id;

    await prisma.contentFlag.update({
      where: { id: flagId },
      data: {
        resolved: true,
        resolvedBy: adminId,
        resolvedAt: new Date()
      }
    });

    res.json({ message: 'Flag resolved successfully' });
  } catch (error) {
    console.error('Resolve flag error:', error);
    res.status(500).json({ error: 'Failed to resolve flag' });
  }
});

// System Analytics
router.get('/analytics', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily activity metrics
    const dailyStats = await prisma.$queryRaw`
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
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// System Settings
router.get('/settings', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
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
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// Security Events Endpoint
router.get('/security/events', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const eventType = req.query.eventType as string;
    const minRiskScore = parseInt(req.query.minRiskScore as string) || 0;
    const days = parseInt(req.query.days as string) || 7;
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const offset = (page - 1) * limit;

    const events = await SecurityService.getSecurityEvents({
      limit,
      offset,
      eventType,
      minRiskScore,
      startDate,
      endDate: new Date()
    });

    res.json({
      events,
      pagination: {
        page,
        limit,
        hasMore: events.length === limit
      },
      filters: {
        eventType,
        minRiskScore,
        days
      }
    });
  } catch (error) {
    console.error('Security events error:', error);
    res.status(500).json({ error: 'Failed to retrieve security events' });
  }
});

// Security Statistics Endpoint
router.get('/security/stats', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const timeframe = (req.query.timeframe as '24h' | '7d' | '30d') || '24h';
    const stats = await SecurityService.getSecurityStats(timeframe);
    
    res.json(stats);
  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve security statistics' });
  }
});

// Enhanced Dashboard with Security Metrics
router.get('/dashboard/enhanced', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [
      basicDashboard,
      securityStats,
      recentSecurityEvents
    ] = await Promise.all([
      // Get basic dashboard data
      Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastSeenAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.post.count(),
        prisma.comment.count(),
        prisma.report.count({ where: { status: 'PENDING' } })
      ]).then(([totalUsers, activeUsers, totalPosts, totalComments, pendingReports]) => ({
        totalUsers,
        activeUsers,
        totalPosts,
        totalComments,
        pendingReports
      })),
      
      // Get security statistics
      SecurityService.getSecurityStats('24h'),
      
      // Get recent high-risk security events
      SecurityService.getSecurityEvents({
        limit: 10,
        minRiskScore: SecurityService.RISK_THRESHOLDS.HIGH,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      })
    ]);

    res.json({
      overview: basicDashboard,
      security: {
        stats: securityStats,
        recentHighRiskEvents: recentSecurityEvents
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Enhanced dashboard error:', error);
    res.status(500).json({ error: 'Failed to load enhanced dashboard' });
  }
});

export default router;