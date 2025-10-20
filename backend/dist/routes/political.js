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
/**
 * @swagger
 * /api/political/profile:
 *   put:
 *     tags: [Political]
 *     summary: Update political profile
 *     description: Updates user's address and political profile information including office, title, and term dates
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               streetAddress:
 *                 type: string
 *                 description: Street address
 *               city:
 *                 type: string
 *                 description: City (required if streetAddress provided)
 *               state:
 *                 type: string
 *                 description: State (required if streetAddress provided)
 *               zipCode:
 *                 type: string
 *                 description: ZIP code (required if streetAddress provided)
 *               campaignWebsite:
 *                 type: string
 *                 format: uri
 *                 description: Campaign or official website URL
 *               politicalProfileType:
 *                 type: string
 *                 enum: [CITIZEN, CANDIDATE, ELECTED_OFFICIAL, GOVERNMENT_EMPLOYEE, POLITICAL_STAFF]
 *                 description: Political profile type
 *               office:
 *                 type: string
 *                 description: Office held or running for
 *               officialTitle:
 *                 type: string
 *                 description: Official title
 *               termStart:
 *                 type: string
 *                 format: date
 *                 description: Term start date
 *               termEnd:
 *                 type: string
 *                 format: date
 *                 description: Term end date
 *     responses:
 *       200:
 *         description: Political profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Political profile updated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     streetAddress:
 *                       type: string
 *                     city:
 *                       type: string
 *                     state:
 *                       type: string
 *                     zipCode:
 *                       type: string
 *                     politicalProfileType:
 *                       type: string
 *                     verificationStatus:
 *                       type: string
 *                     campaignWebsite:
 *                       type: string
 *                     office:
 *                       type: string
 *                     officialTitle:
 *                       type: string
 *                     termStart:
 *                       type: string
 *                       format: date
 *                     termEnd:
 *                       type: string
 *                       format: date
 *       400:
 *         description: Validation error - missing required fields
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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
/**
 * @swagger
 * /api/political/officials:
 *   get:
 *     tags: [Political]
 *     summary: Get user's elected officials
 *     description: Retrieves elected officials based on authenticated user's location (federal, state, and local)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force refresh from external API instead of using cache
 *     responses:
 *       200:
 *         description: Officials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 representatives:
 *                   type: object
 *                   properties:
 *                     federal:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                     state:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                     local:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                 totalCount:
 *                   type: integer
 *                 location:
 *                   type: object
 *                   properties:
 *                     zipCode:
 *                       type: string
 *                     state:
 *                       type: string
 *                     city:
 *                       type: string
 *                 source:
 *                   type: string
 *                   enum: [cache, api, none]
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 cached:
 *                   type: boolean
 *       400:
 *         description: User address not set - must add address in profile settings
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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
/**
 * @swagger
 * /api/political/representatives:
 *   get:
 *     tags: [Political]
 *     summary: Get user's representatives (alias for /officials)
 *     description: Retrieves elected representatives based on authenticated user's location - same as /officials endpoint
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force refresh from external API instead of using cache
 *     responses:
 *       200:
 *         description: Representatives retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 representatives:
 *                   type: object
 *                   properties:
 *                     federal:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                     state:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                     local:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                 totalCount:
 *                   type: integer
 *                 location:
 *                   type: object
 *                   properties:
 *                     zipCode:
 *                       type: string
 *                     state:
 *                       type: string
 *                     city:
 *                       type: string
 *                 source:
 *                   type: string
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 cached:
 *                   type: boolean
 *       400:
 *         description: User address not set
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
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
/**
 * @swagger
 * /api/political/representatives/lookup:
 *   get:
 *     tags: [Political]
 *     summary: Look up representatives by address (public)
 *     description: Retrieves elected representatives for any address - no authentication required
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Full address to look up representatives for
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force refresh from external API
 *     responses:
 *       200:
 *         description: Representatives retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 representatives:
 *                   type: object
 *                   properties:
 *                     federal:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                     state:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                     local:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Representative'
 *                 totalCount:
 *                   type: integer
 *                 location:
 *                   type: object
 *                 source:
 *                   type: string
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                 cached:
 *                   type: boolean
 *       400:
 *         description: Address parameter is required
 *       404:
 *         description: No representatives found for this address
 *       500:
 *         description: Internal server error
 */
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
/**
 * @swagger
 * /api/political/officials/refresh:
 *   post:
 *     tags: [Political]
 *     summary: Refresh officials data
 *     description: Forces a refresh of elected officials data for the authenticated user's location
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Representatives data refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Representatives data refreshed successfully
 *                 refreshed:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: User address not set - must add address to refresh data
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 *       503:
 *         description: Unable to refresh data - service unavailable
 */
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
/**
 * @swagger
 * /api/political/officials/{zipCode}/{state}:
 *   get:
 *     tags: [Political]
 *     summary: Get officials by ZIP code and state (public)
 *     description: Retrieves elected officials for a specific ZIP code and state - no authentication required
 *     parameters:
 *       - in: path
 *         name: zipCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{5}$'
 *         description: 5-digit ZIP code
 *       - in: path
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]{2}$'
 *         description: 2-letter state code (e.g., CA, NY)
 *       - in: query
 *         name: forceRefresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force refresh from external API
 *     responses:
 *       200:
 *         description: Officials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 representatives:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Representative'
 *                 location:
 *                   type: object
 *                   properties:
 *                     zipCode:
 *                       type: string
 *                     state:
 *                       type: string
 *                 count:
 *                   type: integer
 *                 source:
 *                   type: string
 *       400:
 *         description: Invalid zip code or state format
 *       500:
 *         description: Internal server error
 */
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