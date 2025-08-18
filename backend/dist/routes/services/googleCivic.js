"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCivicService = exports.GeolocationService = void 0;
const apiCache_1 = require("./apiCache");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;
const GEOCODIO_BASE_URL = 'https://api.geocod.io/v1.7';
class GeolocationService {
    /**
     * Get elected officials by address with caching
     */
    static async getOfficialsByAddress(address, zipCode, state, forceRefresh = false) {
        if (!GEOCODIO_API_KEY) {
            console.warn('Geocodio API key not configured');
            return null;
        }
        // Generate cache key (prefer zip/state if available for better caching)
        const cacheKey = zipCode && state
            ? apiCache_1.ApiCacheService.generateGeoKey(zipCode, state, 'officials')
            : `officials_${Buffer.from(address).toString('base64').substring(0, 20)}`;
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = await apiCache_1.ApiCacheService.get('geocodio', cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            const url = `${GEOCODIO_BASE_URL}/geocode`;
            const params = new URLSearchParams({
                api_key: GEOCODIO_API_KEY,
                q: address,
                fields: 'cd,cd116' // Congressional districts current and 116th
            });
            const response = await fetch(`${url}?${params}`);
            if (!response.ok) {
                console.error('Geocodio API error:', response.status, await response.text());
                return null;
            }
            const data = await response.json();
            // Transform the response to our format
            const civicResponse = this.transformGeocodioResponse(data);
            // Cache the response (30 days TTL for elected officials)
            await apiCache_1.ApiCacheService.set('geocodio', cacheKey, civicResponse, 30 * 24 * 60);
            // Store officials in our database for enhanced lookup
            if (zipCode && state) {
                await this.storeOfficialsInDb(civicResponse.officials, zipCode, state);
            }
            return civicResponse;
        }
        catch (error) {
            console.error('Geocodio API request failed:', error);
            return null;
        }
    }
    /**
     * Transform Geocodio's response format to our standardized format
     */
    static transformGeocodioResponse(geocodioData) {
        var _a;
        const officials = [];
        const offices = [];
        if (!geocodioData.results || geocodioData.results.length === 0) {
            return { officials: [], offices: [] };
        }
        // Get the first result (most accurate)
        const result = geocodioData.results[0];
        const fields = result.fields || {};
        const congressionalDistrict = ((_a = fields.congressional_districts) === null || _a === void 0 ? void 0 : _a[0]) || fields.congressional_district;
        if (!congressionalDistrict) {
            return { officials: [], offices: [] };
        }
        // Create officials from congressional district data
        if (congressionalDistrict.current_legislators) {
            congressionalDistrict.current_legislators.forEach((legislator) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const official = {
                    name: `${((_a = legislator.bio) === null || _a === void 0 ? void 0 : _a.first_name) || ''} ${((_b = legislator.bio) === null || _b === void 0 ? void 0 : _b.last_name) || ''}`.trim() || 'Unknown',
                    office: this.formatOfficeTitle(legislator.type, congressionalDistrict.district_number, congressionalDistrict.state_abbreviation),
                    party: (_c = legislator.bio) === null || _c === void 0 ? void 0 : _c.party,
                    phones: ((_d = legislator.contact) === null || _d === void 0 ? void 0 : _d.phone) ? [legislator.contact.phone] : [],
                    emails: ((_e = legislator.contact) === null || _e === void 0 ? void 0 : _e.contact_form) ? [] : [], // Geocodio doesn't provide direct emails
                    urls: ((_f = legislator.references) === null || _f === void 0 ? void 0 : _f.bioguide_id) ?
                        [`https://bioguide.congress.gov/search/bio/${legislator.references.bioguide_id}`] : [],
                    photoUrl: (_g = legislator.bio) === null || _g === void 0 ? void 0 : _g.photo_url,
                    address: ((_h = legislator.contact) === null || _h === void 0 ? void 0 : _h.address) ? {
                        line1: legislator.contact.address,
                        city: legislator.contact.city,
                        state: legislator.contact.state,
                        zip: legislator.contact.zip
                    } : undefined,
                    channels: [] // Geocodio doesn't provide social media channels
                };
                officials.push(official);
                // Create corresponding office entry
                offices.push({
                    name: official.office,
                    level: this.determineLevelFromType(legislator.type),
                    roles: [legislator.type],
                    officials: [officials.length - 1] // Index of the official we just added
                });
            });
        }
        return { officials, offices };
    }
    /**
     * Format office title from legislator type and district info
     */
    static formatOfficeTitle(type, districtNumber, state) {
        switch (type) {
            case 'representative':
                return `U.S. Representative, ${state}-${districtNumber}`;
            case 'senator':
                return `U.S. Senator, ${state}`;
            default:
                return `${type}, ${state}`;
        }
    }
    /**
     * Determine government level from legislator type
     */
    static determineLevelFromType(type) {
        if (type === 'representative' || type === 'senator') {
            return 'federal';
        }
        return 'federal'; // Geocodio CD data is federal only
    }
    /**
     * Store officials in our database for enhanced searching
     */
    static async storeOfficialsInDb(officials, zipCode, state) {
        try {
            // Clear existing officials for this location to avoid duplicates
            await prisma.externalOfficial.deleteMany({
                where: {
                    provider: 'geocodio',
                    zipCode,
                    state
                }
            });
            // Store new officials
            for (const official of officials) {
                if (!official.name || !official.office)
                    continue;
                await prisma.externalOfficial.create({
                    data: {
                        externalId: `${official.name}_${official.office}`.replace(/[^a-zA-Z0-9]/g, '_'),
                        provider: 'geocodio',
                        name: official.name,
                        office: official.office,
                        party: official.party,
                        contactInfo: {
                            phones: official.phones,
                            emails: official.emails,
                            urls: official.urls,
                            address: official.address,
                            channels: official.channels
                        },
                        photoUrl: official.photoUrl,
                        zipCode,
                        state,
                        lastUpdated: new Date()
                    }
                });
            }
        }
        catch (error) {
            console.error('Error storing officials in database:', error);
            // Don't throw - this is enhancement, not critical
        }
    }
    /**
     * Get cached officials from our database (faster than API)
     */
    static async getCachedOfficialsByLocation(zipCode, state) {
        try {
            const officials = await prisma.externalOfficial.findMany({
                where: {
                    provider: 'geocodio',
                    zipCode,
                    state,
                    lastUpdated: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                },
                orderBy: [
                    { office: 'asc' },
                    { name: 'asc' }
                ]
            });
            return officials.map(official => {
                var _a, _b, _c, _d, _e;
                return ({
                    name: official.name,
                    office: official.office,
                    party: official.party || undefined,
                    phones: ((_a = official.contactInfo) === null || _a === void 0 ? void 0 : _a.phones) || [],
                    emails: ((_b = official.contactInfo) === null || _b === void 0 ? void 0 : _b.emails) || [],
                    urls: ((_c = official.contactInfo) === null || _c === void 0 ? void 0 : _c.urls) || [],
                    photoUrl: official.photoUrl || undefined,
                    address: (_d = official.contactInfo) === null || _d === void 0 ? void 0 : _d.address,
                    channels: ((_e = official.contactInfo) === null || _e === void 0 ? void 0 : _e.channels) || []
                });
            });
        }
        catch (error) {
            console.error('Error fetching cached officials:', error);
            return [];
        }
    }
    /**
     * Refresh officials data for a location
     */
    static async refreshLocation(zipCode, state) {
        const address = `${zipCode}, ${state}`;
        const result = await this.getOfficialsByAddress(address, zipCode, state, true);
        return result !== null;
    }
}
exports.GeolocationService = GeolocationService;
exports.googleCivicService = GeolocationService;
