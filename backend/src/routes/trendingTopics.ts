import { prisma } from '../lib/prisma';
import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
;

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

/**
 * Get trending topics - simplified fallback implementation with mock data
 */
router.get('/topics', async (req, res) => {
  try {
    const { scope = 'national', limit = 7 } = req.query;
    
    // Mock trending topics to demonstrate AI topic functionality
    const mockTopics = [
      {
        id: 'topic-1',
        title: 'Infrastructure Investment',
        description: 'Discussion about federal infrastructure funding priorities',
        postCount: 45,
        support: { percentage: 65, count: 29 },
        oppose: { percentage: 35, count: 16 },
        prevailingPosition: 'Support for increased infrastructure spending with focus on green energy and broadband expansion',
        leadingCritique: 'Concerns about fiscal responsibility and project efficiency oversight',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        scope: scope
      },
      {
        id: 'topic-2', 
        title: 'Healthcare Access',
        description: 'Debate on expanding healthcare coverage and reducing costs',
        postCount: 32,
        support: { percentage: 58, count: 19 },
        oppose: { percentage: 42, count: 13 },
        prevailingPosition: 'Support for expanding access while controlling costs through various reform approaches',
        leadingCritique: 'Disagreement on implementation methods and funding mechanisms',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        scope: scope
      },
      {
        id: 'topic-3',
        title: 'Education Funding',
        description: 'Discussion about public education investment and reform',
        postCount: 28,
        support: { percentage: 72, count: 20 },
        oppose: { percentage: 28, count: 8 },
        prevailingPosition: 'Strong support for increased education funding and teacher support',
        leadingCritique: 'Questions about accountability measures and resource allocation',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        scope: scope
      }
    ];
    
    const limitNum = parseInt(limit.toString()) || 7;
    const topics = mockTopics.slice(0, limitNum);
    
    res.json({
      success: true,
      scope,
      topics,
      message: `Showing ${topics.length} trending topics (demo data)`
    });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics'
    });
  }
});

/**
 * Get topics for map display
 */
router.get('/map-topics', async (req, res) => {
  try {
    const { count = 3 } = req.query;
    
    // Mock map topics with geographic distribution
    const mapTopics = [
      {
        id: 'map-topic-1',
        title: 'Infrastructure Investment',
        summary: 'Federal infrastructure funding debate',
        coordinates: [-97.5, 39.0], // Central US
        postCount: 45,
        support: 65,
        oppose: 35
      },
      {
        id: 'map-topic-2',
        title: 'Healthcare Access',
        summary: 'Healthcare coverage expansion discussion',
        coordinates: [-84.5, 38.5], // Eastern US
        postCount: 32,
        support: 58,
        oppose: 42
      },
      {
        id: 'map-topic-3',
        title: 'Education Funding',
        summary: 'Public education investment debate',
        coordinates: [-105.0, 40.0], // Western US
        postCount: 28,
        support: 72,
        oppose: 28
      }
    ];
    
    const countNum = parseInt(count.toString()) || 3;
    const topics = mapTopics.slice(0, countNum);
    
    res.json({
      success: true,
      topics,
      message: `Showing ${topics.length} map topics (demo data)`
    });
  } catch (error) {
    console.error('Error fetching map topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch map topics'
    });
  }
});

export default router;