"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
const auth_1 = require("../middleware/auth");
const geospatial_1 = require("../utils/geospatial");
const representativeService_1 = require("../services/representativeService");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
// Update user's address and political info (existing route - enhanced)
router.put('/profile', auth_1.requireAuth, validation_1.validatePoliticalProfile, async (req, res) => {
    try {
        const userId = req.user.id;
        const { streetAddress, city, state, zipCode, campaignWebsite, politicalProfileType, office, officialTitle, termStart, termEnd } = req.body;
        // Basic validation
        if (streetAddress && (!city || !state || !zipCode)) {
            return res.status(400).json({
                error: 'City, state, and zip code are required when providing street address'
            });
        }
        // Calculate H3 geospatial index
        let h3Index = null;
        if (streetAddress && city && state && zipCode) {
            h3Index = await (0, geospatial_1.addressToH3)({
                streetAddress,
                city,
                state,
                zipCode
            });
        }
        // Prepare update data
        const updateData = {
            streetAddress,
            city,
            state,
            zipCode,
            h3Index,
            campaignWebsite,
            office,
            officialTitle
        };
        // Add political profile type if provided
        if (politicalProfileType) {
            updateData.politicalProfileType = politicalProfileType;
            // If changing to a political role, set verification to pending
            if (politicalProfileType !== 'CITIZEN') {
                updateData.verificationStatus = 'PENDING';
            }
            else {
                updateData.verificationStatus = 'NOT_REQUIRED';
            }
        }
        // Add date fields if provided
        if (termStart) {
            updateData.termStart = new Date(termStart);
        }
        if (termEnd) {
            updateData.termEnd = new Date(termEnd);
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                streetAddress: true,
                city: true,
                state: true,
                zipCode: true,
                politicalProfileType: true,
                verificationStatus: true,
                campaignWebsite: true,
                office: true,
                officialTitle: true,
                termStart: true,
                termEnd: true
            }
        });
        // If user provided full address, pre-load their elected officials
        if (streetAddress && city && state && zipCode) {
            // Background task - don't wait for it
            representativeService_1.RepresentativeService.getRepresentativesByAddress(`${streetAddress}, ${city}, ${state} ${zipCode}`, zipCode, state).catch(error => {
                console.error('Background representative loading failed:', error);
            });
        }
        res.json({
            message: 'Political profile updated successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update political profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get elected officials for user's location
router.get('/officials', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { forceRefresh } = req.query;
        // Get user's address
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { streetAddress: true, city: true, state: true, zipCode: true }
        });
        if (!user?.zipCode || !user?.state) {
            return res.status(400).json({
                error: 'Please add your address in profile settings to see your elected officials'
            });
        }
        let representatives = [];
        let responseSource = 'cache';
        // Try to get from our database cache first (fastest)
        if (forceRefresh !== 'true') {
            representatives = await representativeService_1.RepresentativeService.getCachedRepresentativesByLocation(user.zipCode, user.state);
        }
        // If no cached data or force refresh, get from API
        if (representatives.length === 0 || forceRefresh === 'true') {
            const fullAddress = user.streetAddress
                ? `${user.streetAddress}, ${user.city}, ${user.state} ${user.zipCode}`
                : `${user.zipCode}, ${user.state}`;
            const repResponse = await representativeService_1.RepresentativeService.getRepresentativesByAddress(fullAddress, user.zipCode, user.state, forceRefresh === 'true');
            const repsData = repResponse?.representatives || [];
            // Handle both array and grouped formats
            if (Array.isArray(repsData)) {
                representatives = repsData;
            }
            else {
                representatives = [
                    ...(repsData.federal || []),
                    ...(repsData.state || []),
                    ...(repsData.local || [])
                ];
            }
            responseSource = repResponse?.source || 'none';
        }
        // Group representatives by government level
        const groupedRepresentatives = {
            federal: representatives.filter((r) => r.level === 'federal'),
            state: representatives.filter((r) => r.level === 'state'),
            local: representatives.filter((r) => r.level === 'local')
        };
        res.json({
            representatives: groupedRepresentatives,
            totalCount: representatives.length,
            location: {
                zipCode: user.zipCode,
                state: user.state,
                city: user.city
            },
            source: responseSource,
            lastUpdated: new Date().toISOString(),
            cached: forceRefresh !== 'true'
        });
    }
    catch (error) {
        console.error('Get representatives error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Alias for /officials endpoint (for frontend compatibility)
router.get('/representatives', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { forceRefresh } = req.query;
        // Get user's address
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { streetAddress: true, city: true, state: true, zipCode: true }
        });
        if (!user?.zipCode || !user?.state) {
            return res.status(400).json({
                error: 'Please add your address in profile settings to see your representatives'
            });
        }
        let representatives = [];
        let responseSource = 'cache';
        // Try to get from our database cache first (fastest)
        if (forceRefresh !== 'true') {
            representatives = await representativeService_1.RepresentativeService.getCachedRepresentativesByLocation(user.zipCode, user.state);
        }
        // If no cached data or force refresh, get from API
        if (representatives.length === 0 || forceRefresh === 'true') {
            const fullAddress = user.streetAddress
                ? `${user.streetAddress}, ${user.city}, ${user.state} ${user.zipCode}`
                : `${user.zipCode}, ${user.state}`;
            const repResponse = await representativeService_1.RepresentativeService.getRepresentativesByAddress(fullAddress, user.zipCode, user.state, forceRefresh === 'true');
            const repsData = repResponse?.representatives || [];
            // Handle both array and grouped formats
            if (Array.isArray(repsData)) {
                representatives = repsData;
            }
            else {
                representatives = [
                    ...(repsData.federal || []),
                    ...(repsData.state || []),
                    ...(repsData.local || [])
                ];
            }
            responseSource = repResponse?.source || 'none';
        }
        // Group representatives by government level
        const groupedRepresentatives = {
            federal: representatives.filter((r) => r.level === 'federal'),
            state: representatives.filter((r) => r.level === 'state'),
            local: representatives.filter((r) => r.level === 'local')
        };
        res.json({
            representatives: groupedRepresentatives,
            totalCount: representatives.length,
            location: {
                zipCode: user.zipCode,
                state: user.state,
                city: user.city
            },
            source: responseSource,
            lastUpdated: new Date().toISOString(),
            cached: forceRefresh !== 'true'
        });
    }
    catch (error) {
        console.error('Get representatives error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get representatives by address (PUBLIC - no authentication required)
router.get('/representatives/lookup', async (req, res) => {
    try {
        const { address, forceRefresh } = req.query;
        if (!address) {
            return res.status(400).json({
                error: 'Address parameter is required'
            });
        }
        // Call the representative service with the provided address
        const repResponse = await representativeService_1.RepresentativeService.getRepresentativesByAddress(address, undefined, // zipCode - will be extracted from address
        undefined, // state - will be extracted from address  
        forceRefresh === 'true');
        if (!repResponse) {
            return res.status(404).json({
                error: 'No representatives found for this address'
            });
        }
        // Group representatives by government level
        const repsData = repResponse.representatives || [];
        let representatives = [];
        // Handle both array and grouped formats
        if (Array.isArray(repsData)) {
            representatives = repsData;
        }
        else {
            representatives = [
                ...(repsData.federal || []),
                ...(repsData.state || []),
                ...(repsData.local || [])
            ];
        }
        const groupedRepresentatives = {
            federal: representatives.filter((r) => r.level === 'federal'),
            state: representatives.filter((r) => r.level === 'state'),
            local: representatives.filter((r) => r.level === 'local')
        };
        res.json({
            representatives: groupedRepresentatives,
            totalCount: representatives.length,
            location: repResponse.location || {},
            source: repResponse.source,
            lastUpdated: new Date().toISOString(),
            cached: forceRefresh !== 'true'
        });
    }
    catch (error) {
        console.error('Get representatives by address error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Refresh elected officials data
router.post('/officials/refresh', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { zipCode: true, state: true }
        });
        if (!user?.zipCode || !user?.state) {
            return res.status(400).json({
                error: 'Please add your address to refresh elected officials data'
            });
        }
        const success = await representativeService_1.RepresentativeService.refreshLocation(user.zipCode, user.state);
        if (success) {
            res.json({
                message: 'Representatives data refreshed successfully',
                refreshed: true
            });
        }
        else {
            res.status(503).json({
                error: 'Unable to refresh data at this time. Please try again later.',
                refreshed: false
            });
        }
    }
    catch (error) {
        console.error('Refresh representatives error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get officials by location (public endpoint for search)
router.get('/officials/:zipCode/:state', async (req, res) => {
    try {
        const { zipCode, state } = req.params;
        const { forceRefresh } = req.query;
        // Basic validation
        if (!/^\d{5}$/.test(zipCode) || !/^[A-Z]{2}$/i.test(state)) {
            return res.status(400).json({
                error: 'Invalid zip code or state format'
            });
        }
        let representatives = [];
        let responseSource = 'cache';
        // Get cached data first
        if (forceRefresh !== 'true') {
            representatives = await representativeService_1.RepresentativeService.getCachedRepresentativesByLocation(zipCode, state.toUpperCase());
        }
        // Get fresh data if needed
        if (representatives.length === 0 || forceRefresh === 'true') {
            const repResponse = await representativeService_1.RepresentativeService.getRepresentativesByAddress(`${zipCode}, ${state}`, zipCode, state.toUpperCase(), forceRefresh === 'true');
            const repsData = repResponse?.representatives || [];
            // Handle both array and grouped formats
            if (Array.isArray(repsData)) {
                representatives = repsData;
            }
            else {
                representatives = [
                    ...(repsData.federal || []),
                    ...(repsData.state || []),
                    ...(repsData.local || [])
                ];
            }
            responseSource = repResponse?.source || 'none';
        }
        res.json({
            representatives,
            location: { zipCode, state: state.toUpperCase() },
            count: representatives.length,
            source: responseSource
        });
    }
    catch (error) {
        console.error('Get representatives by location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Existing routes (verify, local, admin/approve) remain unchanged...
// [Keep all your existing routes here]
exports.default = router;
//# sourceMappingURL=political.js.map