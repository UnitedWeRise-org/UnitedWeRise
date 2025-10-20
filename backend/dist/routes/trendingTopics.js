"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
;
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * @swagger
 * /api/trending/topics:
 *   get:
 *     tags: [Trending]
 *     summary: Get trending topics (Mock Data)
 *     description: Returns trending civic discussion topics with mock data for demonstration. This is a simplified fallback implementation showing the intended trending topic functionality with support/oppose percentages and prevailing positions.
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           default: national
 *           enum: [national, state, local]
 *         description: Geographic scope for trending topics
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 7
 *           minimum: 1
 *           maximum: 20
 *         description: Maximum number of topics to return
 *     responses:
 *       200:
 *         description: Trending topics retrieved successfully (demo data)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 scope:
 *                   type: string
 *                   example: national
 *                 topics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: topic-1
 *                       title:
 *                         type: string
 *                         example: Infrastructure Investment
 *                       description:
 *                         type: string
 *                         example: Discussion about federal infrastructure funding priorities
 *                       postCount:
 *                         type: integer
 *                         example: 45
 *                       support:
 *                         type: object
 *                         properties:
 *                           percentage:
 *                             type: integer
 *                             example: 65
 *                           count:
 *                             type: integer
 *                             example: 29
 *                       oppose:
 *                         type: object
 *                         properties:
 *                           percentage:
 *                             type: integer
 *                             example: 35
 *                           count:
 *                             type: integer
 *                             example: 16
 *                       prevailingPosition:
 *                         type: string
 *                         description: AI-generated summary of majority viewpoint
 *                         example: Support for increased infrastructure spending with focus on green energy and broadband expansion
 *                       leadingCritique:
 *                         type: string
 *                         description: AI-generated summary of main opposition arguments
 *                         example: Concerns about fiscal responsibility and project efficiency oversight
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       scope:
 *                         type: string
 *                         example: national
 *                 message:
 *                   type: string
 *                   example: Showing 3 trending topics (demo data)
 *       500:
 *         description: Failed to fetch trending topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to fetch trending topics
 */
// Get trending topics - simplified fallback implementation with mock data
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
    }
    catch (error) {
        console.error('Error fetching trending topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trending topics'
        });
    }
});
/**
 * @swagger
 * /api/trending/map-topics:
 *   get:
 *     tags: [Trending]
 *     summary: Get topics for map visualization (Mock Data)
 *     description: Returns trending topics with geographic coordinates for map display. Mock implementation demonstrating how topics would be distributed geographically across the United States for map-based visualization.
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 3
 *           minimum: 1
 *           maximum: 10
 *         description: Number of map topics to return
 *     responses:
 *       200:
 *         description: Map topics retrieved successfully (demo data)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 topics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: map-topic-1
 *                       title:
 *                         type: string
 *                         example: Infrastructure Investment
 *                       summary:
 *                         type: string
 *                         example: Federal infrastructure funding debate
 *                       coordinates:
 *                         type: array
 *                         description: [longitude, latitude] for map marker
 *                         items:
 *                           type: number
 *                         example: [-97.5, 39.0]
 *                       postCount:
 *                         type: integer
 *                         example: 45
 *                       support:
 *                         type: integer
 *                         description: Support percentage
 *                         example: 65
 *                       oppose:
 *                         type: integer
 *                         description: Opposition percentage
 *                         example: 35
 *                 message:
 *                   type: string
 *                   example: Showing 3 map topics (demo data)
 *       500:
 *         description: Failed to fetch map topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to fetch map topics
 */
// Get topics for map display
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
    }
    catch (error) {
        console.error('Error fetching map topics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch map topics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=trendingTopics.js.map