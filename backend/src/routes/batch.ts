import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Batch endpoint for page initialization - reduces multiple API calls to one
router.get('/initialize', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Parallel fetch all initialization data
    const [user, notifications, recentPosts, trendingTopics, trendingPosts] = await Promise.all([
      // User data (already have basic info from auth, but get fresh data)
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          emailVerified: true,
          phoneVerified: true,
          politicalProfileType: true,
          verificationStatus: true,
          createdAt: true,
          city: true,
          state: true,
          streetAddress: true,
          zipCode: true,
          _count: {
            select: {
              posts: true,
              following: true,
              followers: true
            }
          }
        }
      }),
      
      // Unread notifications count
      prisma.notification.count({
        where: {
          receiverId: userId,
          read: false
        }
      }),
      
      // Recent posts for feed (limit to 10 for initial load)
      prisma.post.findMany({
        where: {
          OR: [
            { authorId: userId }, // User's own posts
            {
              author: {
                followers: {
                  some: { followerId: userId }
                }
              }
            } // Posts from followed users
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              politicalProfileType: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Trending topics (consolidate multiple trending endpoints)
      prisma.post.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        select: {
          id: true,
          content: true,
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          },
          createdAt: true,
          topics: true
        },
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } }
        ],
        take: 20
      }),

      // Trending posts (popular posts for feed)
      prisma.post.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              politicalProfileType: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        },
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } }
        ],
        take: 12
      })
    ]);

    // Return all data in a single response
    res.json({
      success: true,
      data: {
        user: user,
        unreadNotifications: notifications,
        recentPosts: recentPosts,
        trendingTopics: trendingTopics,
        trendingPosts: trendingPosts,
        initializationTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Batch initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize application data'
    });
  }
});

// Lightweight endpoint for auth status check only
router.get('/auth-status', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Minimal response for auth checking - no database queries needed
    res.json({
      success: true,
      user: {
        id: req.user!.id,
        username: req.user!.username,
        firstName: req.user!.firstName,
        lastName: req.user!.lastName,
        emailVerified: false // Will be properly fetched if needed
      },
      authenticated: true
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication failed'
    });
  }
});

// Health check that doesn't require auth
router.get('/health-check', async (req, res) => {
  try {
    // Simple database ping
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

export default router;