import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

// 🎯 OPTIMIZED: Unified search endpoint (replaces 4 separate API calls)
// Replaces: /search/users + /search/posts + /search/officials + /search/topics
router.get('/unified', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { q, types = 'all', limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        const currentUserId = req.user!.id;
        const searchTypes = types.toString().split(',');
        const includeAll = searchTypes.includes('all');

        // Prepare search promises based on requested types
        const searchPromises: Promise<any>[] = [];
        const resultTypes: string[] = [];

        // Search Users
        if (includeAll || searchTypes.includes('users')) {
            resultTypes.push('users');
            searchPromises.push(
                prisma.user.findMany({
                    where: {
                        OR: [
                            {
                                username: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                firstName: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                lastName: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    },
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        bio: true,
                        verified: true,
                        followersCount: true,
                        state: true,
                        zipCode: true,
                        city: true,
                        office: true,
                        politicalProfileType: true,
                        followers: {
                            where: { followerId: currentUserId },
                            select: { id: true }
                        }
                    },
                    take: limitNum,
                    orderBy: [
                        { followersCount: 'desc' },
                        { username: 'asc' }
                    ]
                })
            );
        }

        // Search Posts
        if (includeAll || searchTypes.includes('posts')) {
            resultTypes.push('posts');
            searchPromises.push(
                prisma.post.findMany({
                    where: {
                        content: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                                verified: true,
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
                    take: limitNum,
                    orderBy: [
                        { createdAt: 'desc' }
                    ]
                })
            );
        }

        // Search Officials/Representatives (both User model and Candidate model)
        if (includeAll || searchTypes.includes('officials')) {
            resultTypes.push('officials');
            
            // Combined search for both User-based and Candidate model results
            searchPromises.push(
                Promise.all([
                    // Search User-based officials and candidates
                    prisma.user.findMany({
                        where: {
                            AND: [
                                {
                                    politicalProfileType: {
                                        in: ['ELECTED_OFFICIAL', 'CANDIDATE']
                                    }
                                },
                                {
                                    OR: [
                                        {
                                            username: {
                                                contains: searchTerm,
                                                mode: 'insensitive'
                                            }
                                        },
                                        {
                                            firstName: {
                                                contains: searchTerm,
                                                mode: 'insensitive'
                                            }
                                        },
                                        {
                                            lastName: {
                                                contains: searchTerm,
                                                mode: 'insensitive'
                                            }
                                        },
                                        {
                                            office: {
                                                contains: searchTerm,
                                                mode: 'insensitive'
                                            }
                                        },
                                        {
                                            officialTitle: {
                                                contains: searchTerm,
                                                mode: 'insensitive'
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                            bio: true,
                            verified: true,
                            politicalProfileType: true,
                            office: true,
                            officialTitle: true,
                            politicalParty: true,
                            state: true,
                            city: true,
                            followersCount: true
                        },
                        take: Math.ceil(limitNum / 2),
                        orderBy: [
                            { followersCount: 'desc' },
                            { username: 'asc' }
                        ]
                    }),
                    // Search Candidate model candidates
                    prisma.candidate.findMany({
                        where: {
                            AND: [
                                { status: 'ACTIVE' },
                                { isWithdrawn: false },
                                {
                                    OR: [
                                        {
                                            name: {
                                                contains: searchTerm,
                                                mode: 'insensitive'
                                            }
                                        },
                                        {
                                            user: {
                                                OR: [
                                                    {
                                                        username: {
                                                            contains: searchTerm,
                                                            mode: 'insensitive'
                                                        }
                                                    },
                                                    {
                                                        firstName: {
                                                            contains: searchTerm,
                                                            mode: 'insensitive'
                                                        }
                                                    },
                                                    {
                                                        lastName: {
                                                            contains: searchTerm,
                                                            mode: 'insensitive'
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            office: {
                                                OR: [
                                                    {
                                                        title: {
                                                            contains: searchTerm,
                                                            mode: 'insensitive'
                                                        }
                                                    },
                                                    {
                                                        state: {
                                                            contains: searchTerm,
                                                            mode: 'insensitive'
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    firstName: true,
                                    lastName: true,
                                    avatar: true,
                                    bio: true,
                                    verified: true,
                                    followersCount: true
                                }
                            },
                            office: {
                                select: {
                                    title: true,
                                    level: true,
                                    state: true,
                                    district: true
                                }
                            }
                        },
                        take: Math.ceil(limitNum / 2),
                        orderBy: [
                            { createdAt: 'desc' }
                        ]
                    })
                ]).then(([users, candidates]) => {
                    // Convert Candidate model results to match User model format
                    const convertedCandidates = candidates.map(candidate => ({
                        id: candidate.user.id, // Use user ID for consistency
                        username: candidate.user.username,
                        firstName: candidate.user.firstName,
                        lastName: candidate.user.lastName,
                        avatar: candidate.user.avatar,
                        bio: candidate.user.bio,
                        verified: candidate.user.verified || candidate.isVerified,
                        politicalProfileType: 'CANDIDATE' as const,
                        office: candidate.office.title,
                        officialTitle: candidate.office.title,
                        politicalParty: candidate.party,
                        state: candidate.office.state,
                        city: null,
                        followersCount: candidate.user.followersCount,
                        candidateId: candidate.id, // Add candidate ID for reference
                        candidateStatus: candidate.status
                    }));

                    // Combine and deduplicate by user ID
                    const combined = [...users, ...convertedCandidates];
                    const seen = new Set();
                    const deduplicated = combined.filter(item => {
                        if (seen.has(item.id)) return false;
                        seen.add(item.id);
                        return true;
                    });

                    // Sort by followers and return top results
                    return deduplicated
                        .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
                        .slice(0, limitNum);
                })
            );
        }

        // Search Topics (simplified for now - topics are stored as JSON array)
        if (includeAll || searchTypes.includes('topics')) {
            resultTypes.push('topics');
            searchPromises.push(
                prisma.post.findMany({
                    where: {
                        content: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    select: {
                        topics: true,
                        id: true
                    },
                    take: limitNum * 2, // Get more to extract unique topics
                    orderBy: {
                        createdAt: 'desc'
                    }
                })
            );
        }

        // Execute all searches in parallel
        const results = await Promise.all(searchPromises);
        
        // Process results
        const response: any = {
            success: true,
            query: searchTerm,
            data: {},
            optimized: true // Flag to indicate this is the batched endpoint
        };

        let resultIndex = 0;
        
        if (includeAll || searchTypes.includes('users')) {
            const users = results[resultIndex++];
            response.data.users = users.map((user: any) => ({
                ...user,
                isFollowing: user.followers.length > 0,
                followers: undefined // Remove the followers array from response
            }));
        }

        if (includeAll || searchTypes.includes('posts')) {
            response.data.posts = results[resultIndex++];
        }

        if (includeAll || searchTypes.includes('officials')) {
            response.data.officials = results[resultIndex++];
        }

        if (includeAll || searchTypes.includes('topics')) {
            const topicPosts = results[resultIndex++];
            // Extract unique topics from posts
            const topicsSet = new Set();
            const topics: any[] = [];
            
            topicPosts.forEach((post: any) => {
                if (post.topics && Array.isArray(post.topics)) {
                    post.topics.forEach((topic: string) => {
                        if (topic.toLowerCase().includes(searchTerm) && !topicsSet.has(topic.toLowerCase())) {
                            topicsSet.add(topic.toLowerCase());
                            topics.push({
                                name: topic,
                                postCount: 1, // Would need aggregation for accurate count
                                id: topic.toLowerCase().replace(/\s+/g, '-')
                            });
                        }
                    });
                }
            });
            
            response.data.topics = topics.slice(0, limitNum);
        }

        res.json(response);
    } catch (error) {
        console.error('Unified search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Legacy individual search endpoints for backward compatibility
router.get('/users', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        const currentUserId = req.user!.id;
        
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        username: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        firstName: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        lastName: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                verified: true,
                followersCount: true,
                state: true,
                zipCode: true,
                city: true,
                office: true,
                politicalProfileType: true,
                followers: {
                    where: { followerId: currentUserId },
                    select: { id: true }
                }
            },
            take: limitNum,
            orderBy: [
                { followersCount: 'desc' },
                { username: 'asc' }
            ]
        });

        const usersWithFollowStatus = users.map(user => ({
            ...user,
            isFollowing: user.followers.length > 0,
            followers: undefined
        }));

        res.json({ users: usersWithFollowStatus });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/posts', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        
        const posts = await prisma.post.findMany({
            where: {
                content: {
                    contains: searchTerm,
                    mode: 'insensitive'
                }
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                        verified: true,
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
            take: limitNum,
            orderBy: [
                { createdAt: 'desc' }
            ]
        });

        res.json({ posts });
    } catch (error) {
        console.error('Post search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/officials', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        
        const officials = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        politicalProfileType: {
                            in: ['ELECTED_OFFICIAL', 'CANDIDATE']
                        }
                    },
                    {
                        OR: [
                            {
                                username: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                firstName: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                lastName: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                office: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                officialTitle: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                verified: true,
                politicalProfileType: true,
                office: true,
                officialTitle: true,
                politicalParty: true,
                state: true,
                city: true,
                followersCount: true
            },
            take: limitNum,
            orderBy: [
                { followersCount: 'desc' },
                { username: 'asc' }
            ]
        });

        res.json({ officials });
    } catch (error) {
        console.error('Officials search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/topics', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { q, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchTerm = q.toString().toLowerCase();
        const limitNum = parseInt(limit.toString());
        
        // Search for posts containing the topic term
        const topicPosts = await prisma.post.findMany({
            where: {
                content: {
                    contains: searchTerm,
                    mode: 'insensitive'
                }
            },
            select: {
                topics: true,
                id: true
            },
            take: limitNum * 2,
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Extract unique topics
        const topicsSet = new Set();
        const topics: any[] = [];
        
        topicPosts.forEach((post: any) => {
            if (post.topics && Array.isArray(post.topics)) {
                post.topics.forEach((topic: string) => {
                    if (topic.toLowerCase().includes(searchTerm) && !topicsSet.has(topic.toLowerCase())) {
                        topicsSet.add(topic.toLowerCase());
                        topics.push({
                            name: topic,
                            postCount: 1,
                            id: topic.toLowerCase().replace(/\s+/g, '-')
                        });
                    }
                });
            }
        });

        res.json({ topics: topics.slice(0, limitNum) });
    } catch (error) {
        console.error('Topics search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;