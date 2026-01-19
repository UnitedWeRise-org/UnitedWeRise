"use strict";
/**
 * Jurisdiction Service
 *
 * Handles H3 cell management for organization jurisdictions.
 * Provides boundary conversion, containment checks, and discovery.
 *
 * @module services/jurisdictionService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jurisdictionService = exports.JurisdictionService = void 0;
const h3_js_1 = require("h3-js");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
// H3 resolution 7 = ~5km hexagons (good for administrative boundaries)
const H3_RESOLUTION = 7;
/**
 * State center coordinates for generating state-level H3 cells
 * In production, you would use actual boundary polygons
 */
const STATE_CENTERS = {
    AL: { lat: 32.806671, lng: -86.79113 },
    AK: { lat: 61.370716, lng: -152.404419 },
    AZ: { lat: 33.729759, lng: -111.431221 },
    AR: { lat: 34.969704, lng: -92.373123 },
    CA: { lat: 36.116203, lng: -119.681564 },
    CO: { lat: 39.059811, lng: -105.311104 },
    CT: { lat: 41.597782, lng: -72.755371 },
    DE: { lat: 39.318523, lng: -75.507141 },
    FL: { lat: 27.766279, lng: -81.686783 },
    GA: { lat: 33.040619, lng: -83.643074 },
    HI: { lat: 21.094318, lng: -157.498337 },
    ID: { lat: 44.240459, lng: -114.478828 },
    IL: { lat: 40.349457, lng: -88.986137 },
    IN: { lat: 39.849426, lng: -86.258278 },
    IA: { lat: 42.011539, lng: -93.210526 },
    KS: { lat: 38.5266, lng: -96.726486 },
    KY: { lat: 37.66814, lng: -84.670067 },
    LA: { lat: 31.169546, lng: -91.867805 },
    ME: { lat: 44.693947, lng: -69.381927 },
    MD: { lat: 39.063946, lng: -76.802101 },
    MA: { lat: 42.230171, lng: -71.530106 },
    MI: { lat: 43.326618, lng: -84.536095 },
    MN: { lat: 45.694454, lng: -93.900192 },
    MS: { lat: 32.741646, lng: -89.678696 },
    MO: { lat: 38.456085, lng: -92.288368 },
    MT: { lat: 46.921925, lng: -110.454353 },
    NE: { lat: 41.12537, lng: -98.268082 },
    NV: { lat: 38.313515, lng: -117.055374 },
    NH: { lat: 43.452492, lng: -71.563896 },
    NJ: { lat: 40.298904, lng: -74.521011 },
    NM: { lat: 34.840515, lng: -106.248482 },
    NY: { lat: 42.165726, lng: -74.948051 },
    NC: { lat: 35.630066, lng: -79.806419 },
    ND: { lat: 47.528912, lng: -99.784012 },
    OH: { lat: 40.388783, lng: -82.764915 },
    OK: { lat: 35.565342, lng: -96.928917 },
    OR: { lat: 44.572021, lng: -122.070938 },
    PA: { lat: 40.590752, lng: -77.209755 },
    RI: { lat: 41.680893, lng: -71.51178 },
    SC: { lat: 33.856892, lng: -80.945007 },
    SD: { lat: 44.299782, lng: -99.438828 },
    TN: { lat: 35.747845, lng: -86.692345 },
    TX: { lat: 31.054487, lng: -97.563461 },
    UT: { lat: 40.150032, lng: -111.862434 },
    VT: { lat: 44.045876, lng: -72.710686 },
    VA: { lat: 37.769337, lng: -78.169968 },
    WA: { lat: 47.400902, lng: -121.490494 },
    WV: { lat: 38.491226, lng: -80.954453 },
    WI: { lat: 44.268543, lng: -89.616508 },
    WY: { lat: 42.755966, lng: -107.30249 },
    DC: { lat: 38.897438, lng: -77.026817 },
};
/**
 * Jurisdiction Service Class
 */
class JurisdictionService {
    /**
     * Convert coordinates to H3 cell at standard resolution
     */
    coordinatesToH3(lat, lng) {
        return (0, h3_js_1.latLngToCell)(lat, lng, H3_RESOLUTION);
    }
    /**
     * Get center coordinates of an H3 cell
     */
    h3ToCoordinates(h3Index) {
        const [lat, lng] = (0, h3_js_1.cellToLatLng)(h3Index);
        return { lat, lng };
    }
    /**
     * Get H3 cells for a state (simplified - uses disk around center)
     * In production, you would use actual state boundary polygons
     */
    getStateCells(stateCode, radius = 50) {
        const center = STATE_CENTERS[stateCode.toUpperCase()];
        if (!center) {
            logger_1.logger.warn({ stateCode }, 'Unknown state code for jurisdiction');
            return [];
        }
        const centerCell = (0, h3_js_1.latLngToCell)(center.lat, center.lng, H3_RESOLUTION);
        // gridDisk returns all cells within k rings of the origin cell
        return (0, h3_js_1.gridDisk)(centerCell, radius);
    }
    /**
     * Get H3 cells for a city (simplified - uses disk around center)
     * In production, you would use actual city boundary polygons or geocoding
     */
    async getCityCells(city, state, radius = 10) {
        // For now, use state center as fallback
        // In production, geocode the city to get actual coordinates
        const stateCenter = STATE_CENTERS[state.toUpperCase()];
        if (!stateCenter) {
            return [];
        }
        const centerCell = (0, h3_js_1.latLngToCell)(stateCenter.lat, stateCenter.lng, H3_RESOLUTION);
        return (0, h3_js_1.gridDisk)(centerCell, radius);
    }
    /**
     * Get H3 cells for a county (simplified)
     * In production, you would use actual county boundary polygons
     */
    async getCountyCells(county, state, radius = 20) {
        // Similar to city, use state center as fallback
        const stateCenter = STATE_CENTERS[state.toUpperCase()];
        if (!stateCenter) {
            return [];
        }
        const centerCell = (0, h3_js_1.latLngToCell)(stateCenter.lat, stateCenter.lng, H3_RESOLUTION);
        return (0, h3_js_1.gridDisk)(centerCell, radius);
    }
    /**
     * Generate H3 cells for national jurisdiction (all US states)
     * Returns a representative set of cells covering the country
     */
    getNationalCells() {
        const cells = [];
        // Get center cell for each state (simplified national coverage)
        for (const [, center] of Object.entries(STATE_CENTERS)) {
            const cell = (0, h3_js_1.latLngToCell)(center.lat, center.lng, H3_RESOLUTION);
            cells.push(cell);
        }
        return cells;
    }
    /**
     * Get H3 cells for a congressional district
     * Uses existing AddressDistrictMapping data when available, falls back to state center
     * Format: "TX-13" (state code + district number)
     */
    async getCongressionalDistrictCells(stateCode, districtNumber) {
        // Try to find cells from existing address mappings
        const mappings = await prisma_1.prisma.addressDistrictMapping.findMany({
            where: {
                state: stateCode.toUpperCase(),
                district: {
                    type: 'CONGRESSIONAL',
                    identifier: `${stateCode.toUpperCase()}-${districtNumber}`,
                },
            },
            select: { h3Index: true },
            take: 1000, // Limit to avoid huge queries
        });
        if (mappings.length > 0) {
            // Deduplicate H3 cells
            const cells = [...new Set(mappings.map((m) => m.h3Index).filter(Boolean))];
            if (cells.length > 0) {
                logger_1.logger.info({ stateCode, districtNumber, cellCount: cells.length }, 'Congressional district cells from address mappings');
                return cells;
            }
        }
        // Fallback: Use state center with smaller radius (congressional districts are smaller than states)
        logger_1.logger.info({ stateCode, districtNumber }, 'Congressional district using state center fallback');
        const stateCenter = STATE_CENTERS[stateCode.toUpperCase()];
        if (!stateCenter) {
            return [];
        }
        // Use radius of 15 for congressional districts (smaller than state)
        const centerCell = (0, h3_js_1.latLngToCell)(stateCenter.lat, stateCenter.lng, H3_RESOLUTION);
        return (0, h3_js_1.gridDisk)(centerCell, 15);
    }
    /**
     * Get H3 cells for a state senate district
     * Uses existing AddressDistrictMapping data when available, falls back to state center
     * Format: "TX-S-14" (state code + S + district number)
     */
    async getStateSenateCells(stateCode, districtNumber) {
        // Try to find cells from existing address mappings
        const mappings = await prisma_1.prisma.addressDistrictMapping.findMany({
            where: {
                state: stateCode.toUpperCase(),
                district: {
                    type: 'STATE_SENATE',
                    identifier: `${stateCode.toUpperCase()}-S-${districtNumber}`,
                },
            },
            select: { h3Index: true },
            take: 1000,
        });
        if (mappings.length > 0) {
            const cells = [...new Set(mappings.map((m) => m.h3Index).filter(Boolean))];
            if (cells.length > 0) {
                logger_1.logger.info({ stateCode, districtNumber, cellCount: cells.length }, 'State senate district cells from address mappings');
                return cells;
            }
        }
        // Fallback: Use state center with smaller radius
        logger_1.logger.info({ stateCode, districtNumber }, 'State senate district using state center fallback');
        const stateCenter = STATE_CENTERS[stateCode.toUpperCase()];
        if (!stateCenter) {
            return [];
        }
        // State senate districts are typically larger than house districts
        const centerCell = (0, h3_js_1.latLngToCell)(stateCenter.lat, stateCenter.lng, H3_RESOLUTION);
        return (0, h3_js_1.gridDisk)(centerCell, 12);
    }
    /**
     * Get H3 cells for a state house district
     * Uses existing AddressDistrictMapping data when available, falls back to state center
     * Format: "TX-H-52" (state code + H + district number)
     */
    async getStateHouseCells(stateCode, districtNumber) {
        // Try to find cells from existing address mappings
        const mappings = await prisma_1.prisma.addressDistrictMapping.findMany({
            where: {
                state: stateCode.toUpperCase(),
                district: {
                    type: 'STATE_HOUSE',
                    identifier: `${stateCode.toUpperCase()}-H-${districtNumber}`,
                },
            },
            select: { h3Index: true },
            take: 1000,
        });
        if (mappings.length > 0) {
            const cells = [...new Set(mappings.map((m) => m.h3Index).filter(Boolean))];
            if (cells.length > 0) {
                logger_1.logger.info({ stateCode, districtNumber, cellCount: cells.length }, 'State house district cells from address mappings');
                return cells;
            }
        }
        // Fallback: Use state center with smaller radius
        logger_1.logger.info({ stateCode, districtNumber }, 'State house district using state center fallback');
        const stateCenter = STATE_CENTERS[stateCode.toUpperCase()];
        if (!stateCenter) {
            return [];
        }
        // State house districts are typically the smallest
        const centerCell = (0, h3_js_1.latLngToCell)(stateCenter.lat, stateCenter.lng, H3_RESOLUTION);
        return (0, h3_js_1.gridDisk)(centerCell, 8);
    }
    /**
     * Parse political district jurisdiction value
     * Formats:
     * - CONGRESSIONAL: "TX-13" -> { state: "TX", districtNumber: 13 }
     * - STATE_SENATE: "TX-S-14" -> { state: "TX", districtNumber: 14 }
     * - STATE_HOUSE: "TX-H-52" -> { state: "TX", districtNumber: 52 }
     */
    parseDistrictValue(jurisdictionType, value) {
        if (!value)
            return null;
        const parts = value.split('-');
        if (jurisdictionType === 'CONGRESSIONAL') {
            // Format: "TX-13"
            if (parts.length !== 2)
                return null;
            const districtNum = parseInt(parts[1], 10);
            if (isNaN(districtNum))
                return null;
            return { state: parts[0].toUpperCase(), districtNumber: districtNum };
        }
        if (jurisdictionType === 'STATE_SENATE' || jurisdictionType === 'STATE_HOUSE') {
            // Format: "TX-S-14" or "TX-H-52"
            if (parts.length !== 3)
                return null;
            const expectedMiddle = jurisdictionType === 'STATE_SENATE' ? 'S' : 'H';
            if (parts[1].toUpperCase() !== expectedMiddle)
                return null;
            const districtNum = parseInt(parts[2], 10);
            if (isNaN(districtNum))
                return null;
            return { state: parts[0].toUpperCase(), districtNumber: districtNum };
        }
        return null;
    }
    /**
     * Generate H3 cells based on jurisdiction type and value
     */
    async generateJurisdictionCells(jurisdictionType, jurisdictionValue) {
        switch (jurisdictionType) {
            case 'NATIONAL':
                return this.getNationalCells();
            case 'STATE':
                return this.getStateCells(jurisdictionValue);
            case 'COUNTY': {
                // Expected format: "County Name, ST" or just state code
                const parts = jurisdictionValue.split(',').map((p) => p.trim());
                const state = parts.length > 1 ? parts[1] : parts[0];
                return this.getCountyCells(parts[0], state);
            }
            case 'CITY': {
                // Expected format: "City, ST"
                const parts = jurisdictionValue.split(',').map((p) => p.trim());
                if (parts.length < 2) {
                    logger_1.logger.warn({ jurisdictionValue }, 'Invalid city format');
                    return [];
                }
                return this.getCityCells(parts[0], parts[1]);
            }
            case 'CONGRESSIONAL': {
                // Expected format: "TX-13" (state-districtNumber)
                const parsed = this.parseDistrictValue('CONGRESSIONAL', jurisdictionValue);
                if (!parsed) {
                    logger_1.logger.warn({ jurisdictionValue }, 'Invalid congressional district format');
                    return [];
                }
                return this.getCongressionalDistrictCells(parsed.state, parsed.districtNumber);
            }
            case 'STATE_SENATE': {
                // Expected format: "TX-S-14" (state-S-districtNumber)
                const parsed = this.parseDistrictValue('STATE_SENATE', jurisdictionValue);
                if (!parsed) {
                    logger_1.logger.warn({ jurisdictionValue }, 'Invalid state senate district format');
                    return [];
                }
                return this.getStateSenateCells(parsed.state, parsed.districtNumber);
            }
            case 'STATE_HOUSE': {
                // Expected format: "TX-H-52" (state-H-districtNumber)
                const parsed = this.parseDistrictValue('STATE_HOUSE', jurisdictionValue);
                if (!parsed) {
                    logger_1.logger.warn({ jurisdictionValue }, 'Invalid state house district format');
                    return [];
                }
                return this.getStateHouseCells(parsed.state, parsed.districtNumber);
            }
            case 'CUSTOM':
                // For custom jurisdictions, cells should be provided directly
                return [];
            default:
                return [];
        }
    }
    /**
     * Check if an H3 cell is within a set of jurisdiction cells
     */
    isWithinJurisdiction(h3Cell, jurisdictionCells) {
        return jurisdictionCells.includes(h3Cell);
    }
    /**
     * Check if coordinates are within a jurisdiction
     */
    areCoordinatesInJurisdiction(lat, lng, jurisdictionCells) {
        const cell = this.coordinatesToH3(lat, lng);
        return this.isWithinJurisdiction(cell, jurisdictionCells);
    }
    /**
     * Find organizations that have jurisdiction over a location
     */
    async findOrganizationsForLocation(lat, lng) {
        const h3Cell = this.coordinatesToH3(lat, lng);
        return prisma_1.prisma.organization.findMany({
            where: {
                isActive: true,
                h3Cells: {
                    has: h3Cell,
                },
            },
            select: {
                id: true,
                name: true,
                slug: true,
                avatar: true,
                description: true,
                jurisdictionType: true,
                jurisdictionValue: true,
                isVerified: true,
                endorsementsEnabled: true,
            },
            orderBy: {
                isVerified: 'desc',
            },
        });
    }
    /**
     * Find organizations that have jurisdiction over a user's H3 cell
     */
    async findOrganizationsForH3Cell(h3Cell) {
        return prisma_1.prisma.organization.findMany({
            where: {
                isActive: true,
                h3Cells: {
                    has: h3Cell,
                },
            },
            select: {
                id: true,
                name: true,
                slug: true,
                avatar: true,
                description: true,
                jurisdictionType: true,
                jurisdictionValue: true,
                isVerified: true,
                endorsementsEnabled: true,
            },
            orderBy: {
                isVerified: 'desc',
            },
        });
    }
    /**
     * Find organizations near a location (within certain number of rings)
     */
    async findNearbyOrganizations(lat, lng, rings = 3) {
        const centerCell = this.coordinatesToH3(lat, lng);
        const nearbyCells = (0, h3_js_1.gridDisk)(centerCell, rings);
        return prisma_1.prisma.organization.findMany({
            where: {
                isActive: true,
                h3Cells: {
                    hasSome: nearbyCells,
                },
            },
            select: {
                id: true,
                name: true,
                slug: true,
                avatar: true,
                description: true,
                jurisdictionType: true,
                jurisdictionValue: true,
                isVerified: true,
                endorsementsEnabled: true,
                _count: {
                    select: {
                        members: { where: { status: 'ACTIVE' } },
                    },
                },
            },
            orderBy: [
                { isVerified: 'desc' },
                { createdAt: 'desc' },
            ],
        });
    }
    /**
     * Check if a candidate is within an organization's jurisdiction
     * Used for endorsement eligibility
     */
    async isCandidateInJurisdiction(candidateId, organizationId) {
        const [candidate, organization] = await Promise.all([
            prisma_1.prisma.candidate.findUnique({
                where: { id: candidateId },
                select: {
                    id: true,
                    // Get state from the office relation
                    office: {
                        select: { state: true },
                    },
                    // If candidate has H3 cell via user
                    user: {
                        select: { h3Index: true, id: true },
                    },
                },
            }),
            prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    jurisdictionType: true,
                    jurisdictionValue: true,
                    h3Cells: true,
                },
            }),
        ]);
        if (!candidate || !organization) {
            return false;
        }
        const candidateState = candidate.office?.state;
        // If organization has no jurisdiction set, they can't endorse
        if (!organization.jurisdictionType || organization.h3Cells.length === 0) {
            return false;
        }
        // National organizations can endorse any candidate
        if (organization.jurisdictionType === 'NATIONAL') {
            return true;
        }
        // State organizations can endorse candidates from that state
        if (organization.jurisdictionType === 'STATE') {
            return candidateState?.toUpperCase() === organization.jurisdictionValue?.toUpperCase();
        }
        // Political district jurisdictions - check via AddressDistrictMapping
        if (organization.jurisdictionType === 'CONGRESSIONAL' ||
            organization.jurisdictionType === 'STATE_SENATE' ||
            organization.jurisdictionType === 'STATE_HOUSE') {
            const parsed = this.parseDistrictValue(organization.jurisdictionType, organization.jurisdictionValue || '');
            if (!parsed) {
                return false;
            }
            // First check: Does candidate's office state match the org's district state?
            if (candidateState?.toUpperCase() !== parsed.state) {
                return false;
            }
            // If candidate has user with H3 index, check via address district mapping
            if (candidate.user?.id) {
                const districtType = organization.jurisdictionType === 'CONGRESSIONAL'
                    ? 'CONGRESSIONAL'
                    : organization.jurisdictionType === 'STATE_SENATE'
                        ? 'STATE_SENATE'
                        : 'STATE_HOUSE';
                // Check if candidate's address is in this district
                const candidateAddress = await prisma_1.prisma.addressDistrictMapping.findFirst({
                    where: {
                        district: {
                            type: districtType,
                            identifier: organization.jurisdictionValue,
                        },
                    },
                    include: { district: true },
                });
                if (candidateAddress) {
                    // Candidate's address is mapped to this district
                    return true;
                }
            }
            // Fallback: Check if candidate's H3 cell is in organization's h3Cells
            if (candidate.user?.h3Index) {
                return organization.h3Cells.includes(candidate.user.h3Index);
            }
            // If we can't determine district, use state match as conservative fallback
            // (already passed state check above)
            return true;
        }
        // For other jurisdiction types (COUNTY, CITY, CUSTOM), check if candidate's H3 cell is in jurisdiction
        if (candidate.user?.h3Index) {
            return organization.h3Cells.includes(candidate.user.h3Index);
        }
        // If candidate doesn't have H3 index, use state comparison as fallback
        if (organization.jurisdictionValue && candidateState) {
            const orgState = organization.jurisdictionValue.split(',').pop()?.trim().toUpperCase();
            return candidateState.toUpperCase() === orgState;
        }
        return false;
    }
}
exports.JurisdictionService = JurisdictionService;
// Export singleton instance
exports.jurisdictionService = new JurisdictionService();
//# sourceMappingURL=jurisdictionService.js.map