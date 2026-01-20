"use strict";
/**
 * @fileoverview District Discovery Routes
 *
 * Provides endpoints for discovering political districts by type and state.
 * Used by organizations to select jurisdiction when creating/editing.
 *
 * @module routes/districts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("../services/logger");
const router = (0, express_1.Router)();
// Valid US state codes
const VALID_STATE_CODES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];
// Approximate number of congressional districts per state (2024 apportionment)
const CONGRESSIONAL_DISTRICTS_BY_STATE = {
    AL: 7, AK: 1, AZ: 9, AR: 4, CA: 52, CO: 8, CT: 5, DE: 1, FL: 28, GA: 14,
    HI: 2, ID: 2, IL: 17, IN: 9, IA: 4, KS: 4, KY: 6, LA: 6, ME: 2, MD: 8,
    MA: 9, MI: 13, MN: 8, MS: 4, MO: 8, MT: 2, NE: 3, NV: 4, NH: 2, NJ: 12,
    NM: 3, NY: 26, NC: 14, ND: 1, OH: 15, OK: 5, OR: 6, PA: 17, RI: 2, SC: 7,
    SD: 1, TN: 9, TX: 38, UT: 4, VT: 1, VA: 11, WA: 10, WV: 2, WI: 8, WY: 1,
    DC: 0, // DC has no voting congressional representative
};
// Approximate number of state senate districts per state
const STATE_SENATE_DISTRICTS_BY_STATE = {
    AL: 35, AK: 20, AZ: 30, AR: 35, CA: 40, CO: 35, CT: 36, DE: 21, FL: 40, GA: 56,
    HI: 25, ID: 35, IL: 59, IN: 50, IA: 50, KS: 40, KY: 38, LA: 39, ME: 35, MD: 47,
    MA: 40, MI: 38, MN: 67, MS: 52, MO: 34, MT: 50, NE: 49, NV: 21, NH: 24, NJ: 40,
    NM: 42, NY: 63, NC: 50, ND: 47, OH: 33, OK: 48, OR: 30, PA: 50, RI: 38, SC: 46,
    SD: 35, TN: 33, TX: 31, UT: 29, VT: 30, VA: 40, WA: 49, WV: 17, WI: 33, WY: 30,
    DC: 0, // DC uses different structure
};
// Approximate number of state house districts per state
const STATE_HOUSE_DISTRICTS_BY_STATE = {
    AL: 105, AK: 40, AZ: 30, AR: 100, CA: 80, CO: 65, CT: 151, DE: 41, FL: 120, GA: 180,
    HI: 51, ID: 70, IL: 118, IN: 100, IA: 100, KS: 125, KY: 100, LA: 105, ME: 151, MD: 141,
    MA: 160, MI: 110, MN: 134, MS: 122, MO: 163, MT: 100, NE: 49, NV: 42, NH: 400, NJ: 80,
    NM: 70, NY: 150, NC: 120, ND: 94, OH: 99, OK: 101, OR: 60, PA: 203, RI: 75, SC: 124,
    SD: 70, TN: 99, TX: 150, UT: 75, VT: 150, VA: 100, WA: 98, WV: 100, WI: 99, WY: 60,
    DC: 0, // DC uses different structure
};
/**
 * @swagger
 * /api/districts:
 *   get:
 *     tags: [Districts]
 *     summary: Get available districts for a state
 *     description: Returns list of districts for a given type and state, used for organization jurisdiction selection
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CONGRESSIONAL, STATE_SENATE, STATE_HOUSE]
 *         description: Type of district
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: Two-letter state code (e.g., TX, CA)
 *     responses:
 *       200:
 *         description: List of available districts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 districts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       districtNumber:
 *                         type: integer
 *                       identifier:
 *                         type: string
 *                       label:
 *                         type: string
 *       400:
 *         description: Invalid parameters
 */
router.get('/', async (req, res) => {
    try {
        const { type, state } = req.query;
        // Validate type
        const validTypes = ['CONGRESSIONAL', 'STATE_SENATE', 'STATE_HOUSE'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Invalid type. Must be one of: CONGRESSIONAL, STATE_SENATE, STATE_HOUSE',
            });
        }
        // Validate state
        const stateCode = state?.toUpperCase();
        if (!stateCode || !VALID_STATE_CODES.includes(stateCode)) {
            return res.status(400).json({
                error: 'Invalid state code. Must be a valid two-letter US state code.',
            });
        }
        // Get max districts for this state and type
        let maxDistricts = 0;
        let labelPrefix = '';
        let identifierFormat;
        switch (type) {
            case 'CONGRESSIONAL':
                maxDistricts = CONGRESSIONAL_DISTRICTS_BY_STATE[stateCode] || 0;
                labelPrefix = 'Congressional District';
                identifierFormat = (num) => `${stateCode}-${num}`;
                break;
            case 'STATE_SENATE':
                maxDistricts = STATE_SENATE_DISTRICTS_BY_STATE[stateCode] || 0;
                labelPrefix = 'State Senate District';
                identifierFormat = (num) => `${stateCode}-S-${num}`;
                break;
            case 'STATE_HOUSE':
                maxDistricts = STATE_HOUSE_DISTRICTS_BY_STATE[stateCode] || 0;
                labelPrefix = 'State House District';
                identifierFormat = (num) => `${stateCode}-H-${num}`;
                break;
        }
        if (maxDistricts === 0) {
            return res.json({
                success: true,
                districts: [],
                message: `No ${type.toString().toLowerCase().replace('_', ' ')} districts available for ${stateCode}`,
            });
        }
        // Generate district list
        const districts = [];
        for (let i = 1; i <= maxDistricts; i++) {
            districts.push({
                districtNumber: i,
                identifier: identifierFormat(i),
                label: `${labelPrefix} ${i}`,
            });
        }
        // Try to enhance with existing data from ElectoralDistrict table
        try {
            const existingDistricts = await prisma_1.prisma.electoralDistrict.findMany({
                where: {
                    type: type,
                    state: stateCode,
                },
                select: {
                    identifier: true,
                    name: true,
                },
            });
            if (existingDistricts.length > 0) {
                // Merge existing district names if available
                const districtMap = new Map(existingDistricts.map((d) => [d.identifier, d.name]));
                for (const district of districts) {
                    const existingName = districtMap.get(district.identifier);
                    if (existingName) {
                        district.label = existingName;
                    }
                }
            }
        }
        catch (dbError) {
            // Silently continue with generated list if DB query fails
            logger_1.logger.debug({ error: dbError, state: stateCode, type }, 'Could not fetch existing districts');
        }
        res.json({
            success: true,
            state: stateCode,
            type,
            districts,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to fetch districts');
        res.status(500).json({ error: 'Failed to fetch districts' });
    }
});
/**
 * @swagger
 * /api/districts/states:
 *   get:
 *     tags: [Districts]
 *     summary: Get list of US states
 *     description: Returns list of valid US state codes and names for district selection
 *     responses:
 *       200:
 *         description: List of states
 */
router.get('/states', (req, res) => {
    const states = [
        { code: 'AL', name: 'Alabama' },
        { code: 'AK', name: 'Alaska' },
        { code: 'AZ', name: 'Arizona' },
        { code: 'AR', name: 'Arkansas' },
        { code: 'CA', name: 'California' },
        { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' },
        { code: 'DE', name: 'Delaware' },
        { code: 'FL', name: 'Florida' },
        { code: 'GA', name: 'Georgia' },
        { code: 'HI', name: 'Hawaii' },
        { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' },
        { code: 'IN', name: 'Indiana' },
        { code: 'IA', name: 'Iowa' },
        { code: 'KS', name: 'Kansas' },
        { code: 'KY', name: 'Kentucky' },
        { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' },
        { code: 'MD', name: 'Maryland' },
        { code: 'MA', name: 'Massachusetts' },
        { code: 'MI', name: 'Michigan' },
        { code: 'MN', name: 'Minnesota' },
        { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' },
        { code: 'MT', name: 'Montana' },
        { code: 'NE', name: 'Nebraska' },
        { code: 'NV', name: 'Nevada' },
        { code: 'NH', name: 'New Hampshire' },
        { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' },
        { code: 'NY', name: 'New York' },
        { code: 'NC', name: 'North Carolina' },
        { code: 'ND', name: 'North Dakota' },
        { code: 'OH', name: 'Ohio' },
        { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' },
        { code: 'PA', name: 'Pennsylvania' },
        { code: 'RI', name: 'Rhode Island' },
        { code: 'SC', name: 'South Carolina' },
        { code: 'SD', name: 'South Dakota' },
        { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' },
        { code: 'UT', name: 'Utah' },
        { code: 'VT', name: 'Vermont' },
        { code: 'VA', name: 'Virginia' },
        { code: 'WA', name: 'Washington' },
        { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' },
        { code: 'WY', name: 'Wyoming' },
        { code: 'DC', name: 'District of Columbia' },
    ];
    res.json({
        success: true,
        states,
    });
});
exports.default = router;
//# sourceMappingURL=districts.js.map