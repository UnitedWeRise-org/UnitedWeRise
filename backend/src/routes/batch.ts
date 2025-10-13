import { prisma } from '../lib/prisma';
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
;

const router = Router();
// Using singleton prisma from lib/prisma.ts

// Batch endpoint for page initialization - reduces multiple API calls to one
router.get('/initialize', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Parallel fetch all initialization data
    const [user, notifications, recentPosts, trendingTopics, trendingPosts, relationships] = await Promise.all([
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
      // NOTE: Fetch recent posts and sort by engagement in-memory since Prisma doesn't support orderBy on relation counts
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
        orderBy: { createdAt: 'desc' }, // Sort by recency, will sort by engagement after fetching
        take: 100 // Fetch more to sort later
      }),

      // Trending posts (popular posts for feed)
      // NOTE: Fetch recent posts and sort by engagement in-memory since Prisma doesn't support orderBy on relation counts
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
        orderBy: { createdAt: 'desc' }, // Sort by recency, will sort by engagement after fetching
        take: 50 // Fetch more to sort later
      }),

      // Get all relationships in parallel (no blocking system implemented yet)
      Promise.all([
        // Friends (both directions)
        prisma.friendship.findMany({
          where: {
            OR: [
              { requesterId: userId },
              { recipientId: userId }
            ]
          },
          select: {
            requesterId: true,
            recipientId: true,
            status: true
          }
        }),
        // Following/Followers
        prisma.follow.findMany({
          where: {
            OR: [
              { followerId: userId },
              { followingId: userId }
            ]
          },
          select: {
            followerId: true,
            followingId: true
          }
        })
      ])
    ]);

    // Sort trending topics and posts by engagement (likes + comments)
    const sortedTrendingTopics = trendingTopics
      .sort((a, b) => {
        const aEngagement = (a._count?.likes || 0) + (a._count?.comments || 0);
        const bEngagement = (b._count?.likes || 0) + (b._count?.comments || 0);
        return bEngagement - aEngagement;
      })
      .slice(0, 20); // Take top 20

    const sortedTrendingPosts = trendingPosts
      .sort((a, b) => {
        const aEngagement = (a._count?.likes || 0) + (a._count?.comments || 0);
        const bEngagement = (b._count?.likes || 0) + (b._count?.comments || 0);
        return bEngagement - aEngagement;
      })
      .slice(0, 12); // Take top 12

    // Process relationships into efficient lookup structures
    const friendsList = new Set<string>();
    const friendRequests = {
      sent: new Set<string>(),
      received: new Set<string>()
    };
    const followingList = new Set<string>();
    const followersList = new Set<string>();

    // Process relationships
    if (relationships) {
      const [friendships, follows] = relationships;

      // Process friendships
      friendships.forEach(f => {
        if (f.status === 'ACCEPTED') {
          // Add both directions for accepted friendships
          if (f.requesterId === userId) {
            friendsList.add(f.recipientId);
          } else {
            friendsList.add(f.requesterId);
          }
        } else if (f.status === 'PENDING') {
          // Track pending requests
          if (f.requesterId === userId) {
            friendRequests.sent.add(f.recipientId);
          } else {
            friendRequests.received.add(f.requesterId);
          }
        }
      });

      // Process follows
      follows.forEach(f => {
        if (f.followerId === userId) {
          followingList.add(f.followingId);
        }
        if (f.followingId === userId) {
          followersList.add(f.followerId);
        }
      });
    }

    // Return all data in a single response
    res.json({
      success: true,
      data: {
        user: user,
        unreadNotifications: notifications,
        recentPosts: recentPosts,
        trendingTopics: sortedTrendingTopics,
        trendingPosts: sortedTrendingPosts,
        relationships: {
          friends: Array.from(friendsList),
          friendRequests: {
            sent: Array.from(friendRequests.sent),
            received: Array.from(friendRequests.received)
          },
          following: Array.from(followingList),
          followers: Array.from(followersList)
          // TODO: Add blocked users when blocking system is implemented
        },
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