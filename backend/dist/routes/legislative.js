"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const legislativeDataService_1 = require("../services/legislativeDataService");
const newsAggregationService_1 = require("../services/newsAggregationService");
const newsApiRateLimiter_1 = require("../services/newsApiRateLimiter");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
// Get voting records for a specific official
router.get('/voting-records/:bioguideId', async (req, res) => {
    try {
        const { bioguideId } = req.params;
        const { limit = 20 } = req.query;
        // Get voting records from service
        const votingRecords = await legislativeDataService_1.LegislativeDataService.getVotingRecords(bioguideId, parseInt(limit.toString()));
        // Get voting statistics from database
        const membership = await prisma_1.prisma.legislativeMembership.findFirst({
            where: { bioguideId },
            include: { votingSummary: true }
        });
        res.json({
            bioguideId,
            votingRecords,
            statistics: membership?.votingSummary || null,
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching voting records:', error);
        res.status(500).json({ error: 'Failed to fetch voting records' });
    }
});
// Get news coverage for a specific official
router.get('/news/:officialName', async (req, res) => {
    try {
        const { officialName } = req.params;
        const { limit = 10, daysBack = 30 } = req.query;
        const newsData = await newsAggregationService_1.NewsAggregationService.searchPoliticianNews(officialName, undefined, // officialId
        parseInt(limit.toString()), parseInt(daysBack.toString()));
        res.json(newsData);
    }
    catch (error) {
        console.error('Error fetching news coverage:', error);
        res.status(500).json({ error: 'Failed to fetch news coverage' });
    }
});
// Sync federal legislators (admin endpoint)
router.post('/sync/federal', auth_1.requireAuth, async (req, res) => {
    try {
        // Check if user is admin
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { isAdmin: true }
        });
        if (!user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        await legislativeDataService_1.LegislativeDataService.syncFederalLegislators(true);
        res.json({
            message: 'Federal legislators sync initiated',
            status: 'success'
        });
    }
    catch (error) {
        console.error('Error syncing federal legislators:', error);
        res.status(500).json({ error: 'Failed to sync federal legislators' });
    }
});
// Sync state legislators for a specific state (admin endpoint)
router.post('/sync/state/:stateCode', auth_1.requireAuth, async (req, res) => {
    try {
        const { stateCode } = req.params;
        // Check if user is admin
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { isAdmin: true }
        });
        if (!user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        await legislativeDataService_1.LegislativeDataService.syncStateLegislators(stateCode.toUpperCase(), true);
        res.json({
            message: `${stateCode} legislators sync initiated`,
            status: 'success'
        });
    }
    catch (error) {
        console.error('Error syncing state legislators:', error);
        res.status(500).json({ error: 'Failed to sync state legislators' });
    }
});
// Get trending political news
router.get('/news/trending', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const trendingNews = await newsAggregationService_1.NewsAggregationService.getTrendingPoliticalNews(parseInt(limit.toString()));
        res.json({
            articles: trendingNews,
            count: trendingNews.length,
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching trending news:', error);
        res.status(500).json({ error: 'Failed to fetch trending news' });
    }
});
// Get stored news articles with filtering
router.get('/news/stored', async (req, res) => {
    try {
        const { officialId, sentiment, limit = 20, offset = 0 } = req.query;
        const result = await newsAggregationService_1.NewsAggregationService.getStoredArticles(officialId?.toString(), sentiment, parseInt(limit.toString()), parseInt(offset.toString()));
        res.json({
            articles: result.articles,
            total: result.total,
            limit: parseInt(limit.toString()),
            offset: parseInt(offset.toString())
        });
    }
    catch (error) {
        console.error('Error fetching stored articles:', error);
        res.status(500).json({ error: 'Failed to fetch stored articles' });
    }
});
// Get voting statistics for multiple officials
router.post('/voting-statistics', async (req, res) => {
    try {
        const { bioguideIds } = req.body;
        if (!Array.isArray(bioguideIds) || bioguideIds.length === 0) {
            return res.status(400).json({ error: 'Array of bioguide IDs required' });
        }
        if (bioguideIds.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 bioguide IDs per request' });
        }
        const statistics = await prisma_1.prisma.legislativeMembership.findMany({
            where: {
                bioguideId: { in: bioguideIds }
            },
            include: {
                votingSummary: true
            }
        });
        res.json({
            statistics,
            count: statistics.length
        });
    }
    catch (error) {
        console.error('Error fetching voting statistics:', error);
        res.status(500).json({ error: 'Failed to fetch voting statistics' });
    }
});
// Get recent bills for a legislator
router.get('/bills/:bioguideId', async (req, res) => {
    try {
        const { bioguideId } = req.params;
        const { limit = 10 } = req.query;
        // Find the membership
        const membership = await prisma_1.prisma.legislativeMembership.findFirst({
            where: { bioguideId }
        });
        if (!membership) {
            return res.status(404).json({ error: 'Legislator not found' });
        }
        // Get bills they sponsored
        const sponsoredBills = await prisma_1.prisma.billSponsorship.findMany({
            where: { membershipId: membership.id },
            include: {
                bill: {
                    include: {
                        votes: {
                            take: 1,
                            orderBy: { date: 'desc' }
                        }
                    }
                }
            },
            orderBy: { dateSigned: 'desc' },
            take: parseInt(limit.toString())
        });
        const bills = sponsoredBills.map(sponsorship => ({
            ...sponsorship.bill,
            sponsorshipType: sponsorship.isPrimary ? 'primary' : 'cosponsor',
            sponsorshipDate: sponsorship.dateSigned
        }));
        res.json({
            bioguideId,
            bills,
            count: bills.length
        });
    }
    catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});
// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Quick database check
        const legislatureCount = await prisma_1.prisma.legislature.count();
        const membershipCount = await prisma_1.prisma.legislativeMembership.count();
        const newsCount = await prisma_1.prisma.newsArticle.count();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            databases: {
                legislatures: legislatureCount,
                memberships: membershipCount,
                newsArticles: newsCount
            },
            features: [
                'voting_records',
                'news_aggregation',
                'bill_tracking',
                'statistics'
            ]
        });
    }
    catch (error) {
        console.error('Legislative health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// News API rate limiting status endpoint
router.get('/news-api-status', async (req, res) => {
    try {
        const status = await newsApiRateLimiter_1.NewsApiRateLimiter.getStatus();
        res.json({
            newsapi: {
                hasKey: !!process.env.NEWS_API_KEY,
                unlimited: true, // NewsAPI.org has higher limits
                note: "NewsAPI.org Developer plan: 1000 requests/day"
            },
            thenewsapi: {
                hasKey: !!process.env.THE_NEWS_API_KEY,
                ...status
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('News API status check failed:', error);
        res.status(500).json({
            error: 'Failed to get news API status',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=legislative.js.map