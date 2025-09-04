"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const externalCandidateService_1 = require("../services/externalCandidateService");
const metricsService_1 = require("../services/metricsService");
const rateLimiting_1 = require("../middleware/rateLimiting");
const prisma_1 = require("../lib/prisma");
const router = express_1.default.Router();
// Admin Routes
// POST /api/external-candidates/import-address - Import candidates for specific address (Admin only)
router.post('/import-address', auth_1.requireAuth, rateLimiting_1.apiLimiter, async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }
        const result = await externalCandidateService_1.ExternalCandidateService.importCandidatesForAddress(address);
        metricsService_1.metricsService.incrementCounter('external_candidates_imported', {
            imported: result.imported.toString(),
            updated: result.updated.toString()
        });
        res.json({
            success: true,
            message: `Imported ${result.imported} new candidates, updated ${result.updated} existing`,
            ...result
        });
    }
    catch (error) {
        console.error('Import candidates error:', error);
        res.status(500).json({ error: 'Failed to import candidates' });
    }
});
// POST /api/external-candidates/bulk-import - Bulk import from all user locations (Admin only)
router.post('/bulk-import', auth_1.requireAuth, rateLimiting_1.apiLimiter, async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        // Start bulk import (this could take a while)
        const result = await externalCandidateService_1.ExternalCandidateService.bulkImportFromUserLocations();
        metricsService_1.metricsService.incrementCounter('external_candidates_bulk_imported', {
            addresses: result.addressesProcessed.toString(),
            imported: result.totalImported.toString(),
            updated: result.totalUpdated.toString()
        });
        res.json({
            success: true,
            message: `Processed ${result.addressesProcessed} addresses`,
            ...result
        });
    }
    catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to perform bulk import' });
    }
});
// User Routes
// GET /api/external-candidates/for-address - Get all candidates (internal + external) for an address
router.get('/for-address', auth_1.requireAuth, async (req, res) => {
    try {
        const { address } = req.query;
        const userId = req.user.id;
        // If no address provided, try to use user's profile address
        let searchAddress = address?.toString();
        if (!searchAddress) {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    streetAddress: true,
                    city: true,
                    state: true,
                    zipCode: true
                }
            });
            if (user?.streetAddress && user?.city && user?.state) {
                searchAddress = `${user.streetAddress}, ${user.city}, ${user.state} ${user.zipCode || ''}`.trim();
            }
        }
        if (!searchAddress) {
            return res.json({
                success: true,
                races: [],
                userAddress: null,
                message: 'Please provide an address or complete your profile address to find candidates'
            });
        }
        // Import/refresh external candidates for this address
        const importResult = await externalCandidateService_1.ExternalCandidateService.importCandidatesForAddress(searchAddress);
        // Get all candidates for races in this area - both internal and external
        const raceGroups = await externalCandidateService_1.ExternalCandidateService.getCandidatesForAddress(searchAddress);
        res.json({
            success: true,
            races: raceGroups,
            userAddress: searchAddress,
            importStats: importResult,
            message: `Found ${raceGroups.length} races with candidates for your area`
        });
    }
    catch (error) {
        console.error('Get candidates for address error:', error);
        res.status(500).json({ error: 'Failed to get candidates for address' });
    }
});
// GET /api/external-candidates/claimable - Get candidates this user can claim
router.get('/claimable', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const claimableCandidates = await externalCandidateService_1.ExternalCandidateService.getClaimableCandidates(userId);
        res.json({
            candidates: claimableCandidates,
            count: claimableCandidates.length,
            message: claimableCandidates.length > 0
                ? 'Found potential candidate profiles you can claim'
                : 'No claimable candidate profiles found'
        });
    }
    catch (error) {
        console.error('Get claimable candidates error:', error);
        res.status(500).json({ error: 'Failed to get claimable candidates' });
    }
});
// POST /api/external-candidates/:id/claim - Claim a candidate profile
router.post('/:id/claim', auth_1.requireAuth, async (req, res) => {
    try {
        const { id: candidateId } = req.params;
        const userId = req.user.id;
        const { verificationData } = req.body;
        const claimedCandidate = await externalCandidateService_1.ExternalCandidateService.claimCandidateProfile(userId, candidateId, verificationData);
        metricsService_1.metricsService.incrementCounter('candidate_profiles_claimed', {
            dataSource: claimedCandidate.dataSource || 'unknown'
        });
        res.json({
            success: true,
            message: 'Candidate profile claimed successfully',
            candidate: claimedCandidate,
            nextSteps: {
                verification: 'Complete identity verification process',
                documentation: 'Submit required verification documents',
                profile: 'Enhance your candidate profile with additional information'
            }
        });
    }
    catch (error) {
        console.error('Claim candidate error:', error);
        if (error.message.includes('not found') ||
            error.message.includes('already claimed') ||
            error.message.includes('not externally sourced')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to claim candidate profile' });
    }
});
// GET /api/external-candidates/search - Search external candidates  
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchTerm = q.toString();
        const limitNum = parseInt(limit.toString());
        const candidates = await externalCandidateService_1.ExternalCandidateService.searchExternalCandidates(searchTerm, limitNum);
        res.json({
            candidates,
            count: candidates.length,
            includesExternal: true
        });
    }
    catch (error) {
        console.error('Search external candidates error:', error);
        res.status(500).json({ error: 'Failed to search external candidates' });
    }
});
// GET /api/external-candidates/health - Check external API health and cache stats
router.get('/health', async (req, res) => {
    try {
        const health = await externalCandidateService_1.ExternalCandidateService.healthCheck();
        // Get cache statistics for external candidate data
        const { ApiCacheService } = await Promise.resolve().then(() => __importStar(require('../services/apiCache')));
        const cacheStats = await Promise.all([
            ApiCacheService.getStats('google_civic_candidates'),
            ApiCacheService.getStats('candidate_search'),
            ApiCacheService.getStats('representatives') // Existing cached data
        ]);
        const overallStatus = health.googleCivic.status === 'healthy' || health.fec.status === 'healthy'
            ? 'healthy' : 'degraded';
        res.json({
            status: overallStatus,
            apis: health,
            cache: {
                googleCivicCandidates: cacheStats[0],
                candidateSearch: cacheStats[1],
                representatives: cacheStats[2],
                message: 'Candidate data cached for 30 days, search results for 3 days'
            },
            timestamp: new Date()
        });
    }
    catch (error) {
        console.error('External candidate health check error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Health check failed'
        });
    }
});
// POST /api/external-candidates/cache/clear - Clear cache for external candidates (Admin only)
router.post('/cache/clear', auth_1.requireAuth, async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { provider } = req.body;
        const { ApiCacheService } = await Promise.resolve().then(() => __importStar(require('../services/apiCache')));
        if (provider) {
            // Clear specific provider cache
            const stats = await ApiCacheService.getStats(provider);
            res.json({
                message: `Cache cleared for ${provider}`,
                entriesCleared: stats.total
            });
        }
        else {
            // Clear all external candidate caches
            const cleared = await ApiCacheService.clearExpired();
            res.json({
                message: 'Expired cache entries cleared',
                entriesCleared: cleared
            });
        }
    }
    catch (error) {
        console.error('Cache clear error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});
exports.default = router;
//# sourceMappingURL=externalCandidates.js.map