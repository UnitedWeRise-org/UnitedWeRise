"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepresentativeService = void 0;
const prisma_1 = require("../lib/prisma");
const apiCache_1 = require("./apiCache");
const logger_1 = require("./logger");
;
const googleCivicService_1 = require("./googleCivicService");
// Using singleton prisma from lib/prisma.ts
// API Configuration
const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;
const FEC_API_KEY = process.env.FEC_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
class RepresentativeService {
    /**
     * Get representatives by address using available APIs
     */
    static async getRepresentativesByAddress(address, zipCode, state, forceRefresh = false) {
        // Generate cache key
        const cacheKey = zipCode && state
            ? apiCache_1.ApiCacheService.generateGeoKey(zipCode, state, 'reps')
            : `reps_${Buffer.from(address).toString('base64').substring(0, 20)}`;
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = await apiCache_1.ApiCacheService.get('representatives', cacheKey);
            if (cached) {
                return { ...cached, source: 'cache' };
            }
        }
        // Fetch from both sources for comprehensive data
        let googleResult = null;
        let geocodioResult = null;
        // Try Google Civic API (good for federal/state officials)
        if (GOOGLE_API_KEY) {
            try {
                googleResult = await googleCivicService_1.GoogleCivicService.getRepresentativesByAddress(address);
            }
            catch (error) {
                logger_1.logger.error({ error, address }, 'Google Civic API failed');
            }
        }
        // Try Geocodio (good for districts, school boards, additional data)
        if (GEOCODIO_API_KEY) {
            try {
                geocodioResult = await this.fetchFromGeocodio(address);
            }
            catch (error) {
                logger_1.logger.error({ error, address }, 'Geocodio API failed');
            }
        }
        // Merge results from both sources for comprehensive data
        if (googleResult || geocodioResult) {
            const mergedResult = this.mergeRepresentativeData(googleResult, geocodioResult);
            // Cache the merged response (7 days TTL)
            await apiCache_1.ApiCacheService.set('representatives', cacheKey, mergedResult, 7 * 24 * 60);
            // Store in our database for enhanced lookup
            if (zipCode && state) {
                let allReps = [];
                if (Array.isArray(mergedResult.representatives)) {
                    allReps = mergedResult.representatives;
                }
                else {
                    allReps = [
                        ...(mergedResult.representatives.federal || []),
                        ...(mergedResult.representatives.state || []),
                        ...(mergedResult.representatives.local || [])
                    ];
                }
                await this.storeRepresentativesInDb(allReps, zipCode, state);
            }
            return mergedResult;
        }
        // Fallback to FEC API for federal representatives only
        if (FEC_API_KEY && zipCode && state) {
            try {
                const fecResult = await this.fetchFromFEC(zipCode, state);
                if (fecResult) {
                    // Cache the response (7 days TTL for FEC data)
                    await apiCache_1.ApiCacheService.set('representatives', cacheKey, fecResult, 7 * 24 * 60);
                    return { ...fecResult, source: 'fec' };
                }
            }
            catch (error) {
                logger_1.logger.error({ error, zipCode, state }, 'FEC API failed');
            }
        }
        logger_1.logger.warn('No API keys configured for representative lookup');
        return null;
    }
    /**
     * Fetch representatives from Geocodio API
     */
    static async fetchFromGeocodio(address) {
        const url = 'https://api.geocod.io/v1.7/geocode';
        const params = new URLSearchParams({
            api_key: GEOCODIO_API_KEY,
            q: address,
            fields: 'cd,stateleg,school' // Congressional, state legislative, and school districts
        });
        const response = await fetch(`${url}?${params}`);
        if (!response.ok) {
            throw new Error(`Geocodio API error: ${response.status}`);
        }
        const data = await response.json();
        return this.transformGeocodioResponse(data);
    }
    /**
     * Fetch representatives from FEC API (federal only)
     */
    static async fetchFromFEC(zipCode, state) {
        // FEC API doesn't directly provide address->representative lookup
        // This is a simplified example - you'd need to implement district lookup first
        const url = 'https://api.open.fec.gov/v1/candidates/search/';
        const params = new URLSearchParams({
            api_key: FEC_API_KEY,
            state: state,
            election_year: '2024',
            incumbent_challenge: 'I', // Incumbents only
            candidate_status: 'C' // Current candidates
        });
        const response = await fetch(`${url}?${params}`);
        if (!response.ok) {
            throw new Error(`FEC API error: ${response.status}`);
        }
        const data = await response.json();
        return this.transformFECResponse(data, zipCode, state);
    }
    /**
     * Transform Geocodio response to our format
     */
    static transformGeocodioResponse(data) {
        if (!data.results || data.results.length === 0) {
            return null;
        }
        const result = data.results[0];
        const representatives = [];
        const location = {
            zipCode: this.extractZipFromAddress(result.formatted_address),
            state: this.extractStateFromAddress(result.formatted_address),
            city: result.address_components?.city,
            coordinates: {
                lat: result.location.lat,
                lng: result.location.lng
            }
        };
        // Helper function to process legislators
        const processLegislators = (legislators, districtInfo, level) => {
            legislators.forEach((legislator) => {
                // Build URLs array
                const urls = [];
                if (legislator.contact?.url)
                    urls.push(legislator.contact.url);
                if (legislator.references?.bioguide_id) {
                    urls.push(`https://bioguide.congress.gov/search/bio/${legislator.references.bioguide_id}`);
                }
                // Build contact phones array
                const phones = [];
                if (legislator.contact?.phone)
                    phones.push(legislator.contact.phone);
                // Parse address from contact info
                let addressInfo;
                if (legislator.contact?.address) {
                    const addressParts = legislator.contact.address.split(',').map((s) => s.trim());
                    addressInfo = {
                        line1: addressParts[0] || legislator.contact.address,
                        city: addressParts[1] || undefined,
                        state: addressParts[2]?.split(' ')[0] || undefined,
                        zip: addressParts[2]?.split(' ')[1] || undefined
                    };
                }
                representatives.push({
                    name: `${legislator.bio?.first_name || ''} ${legislator.bio?.last_name || ''}`.trim(),
                    office: this.formatOfficeTitle(legislator.type, districtInfo.district_number || districtInfo.name, this.extractStateFromAddress(result.formatted_address), level),
                    party: legislator.bio?.party,
                    phones,
                    emails: legislator.contact?.contact_form ? [legislator.contact.contact_form] : [],
                    urls,
                    photoUrl: legislator.bio?.photo_url,
                    address: addressInfo,
                    district: districtInfo.ocd_id || `${this.extractStateFromAddress(result.formatted_address)}-${districtInfo.district_number}`,
                    level,
                    type: legislator.type,
                    bio: legislator.bio,
                    social: legislator.social,
                    references: legislator.references
                });
            });
        };
        // Process congressional districts (federal)
        const cd = result.fields?.congressional_districts?.[0];
        if (cd?.current_legislators) {
            processLegislators(cd.current_legislators, cd, 'federal');
        }
        // Process state legislative districts
        const stateDistricts = result.fields?.state_legislative_districts;
        if (stateDistricts) {
            // Process house districts
            if (stateDistricts.house) {
                stateDistricts.house.forEach((district) => {
                    if (district.current_legislators) {
                        processLegislators(district.current_legislators, district, 'state');
                    }
                });
            }
            // Process senate districts
            if (stateDistricts.senate) {
                stateDistricts.senate.forEach((district) => {
                    if (district.current_legislators) {
                        processLegislators(district.current_legislators, district, 'state');
                    }
                });
            }
        }
        // Process school districts (Note: Geocodio doesn't provide school board member data)
        // School district info is available but not individual board members
        // This could be expanded with other data sources in the future
        return { representatives, location, source: 'geocodio' };
    }
    /**
     * Merge representative data from multiple sources
     */
    static mergeRepresentativeData(googleData, geocodioData) {
        const merged = {
            representatives: {
                federal: [],
                state: [],
                local: []
            },
            location: {
                zipCode: undefined,
                state: undefined,
                city: undefined
            },
            source: 'merged'
        };
        // Start with Google data if available (usually more complete for federal/state)
        if (googleData && googleData.representatives) {
            merged.representatives = googleData.representatives;
            merged.location = googleData.location || {};
        }
        // Enhance with Geocodio data
        if (geocodioData) {
            // Add location data if missing
            if (!merged.location.zipCode && geocodioData.location?.zipCode) {
                merged.location.zipCode = geocodioData.location.zipCode;
            }
            if (!merged.location.state && geocodioData.location?.state) {
                merged.location.state = geocodioData.location.state;
            }
            // Add school district info (unique to Geocodio)
            if (geocodioData.districts) {
                merged.location.districts = geocodioData.districts;
            }
            // Merge representatives, avoiding duplicates
            if (geocodioData.representatives) {
                const reps = merged.representatives;
                // Get all existing names for duplicate checking
                const allExisting = [...reps.federal, ...reps.state, ...reps.local];
                const existingNames = new Set(allExisting.map(r => r.name.toLowerCase()));
                // Handle both array and grouped formats from geocodio
                const geocodioReps = Array.isArray(geocodioData.representatives)
                    ? geocodioData.representatives
                    : [
                        ...(geocodioData.representatives.federal || []),
                        ...(geocodioData.representatives.state || []),
                        ...(geocodioData.representatives.local || [])
                    ];
                geocodioReps.forEach((rep) => {
                    // Add if not already present (by name)
                    if (!existingNames.has(rep.name.toLowerCase())) {
                        // Add to appropriate category based on level
                        if (rep.level === 'federal') {
                            reps.federal.push(rep);
                        }
                        else if (rep.level === 'state') {
                            reps.state.push(rep);
                        }
                        else {
                            reps.local.push(rep);
                        }
                    }
                    else {
                        // Enhance existing entry with additional data
                        const existing = allExisting.find(r => r.name.toLowerCase() === rep.name.toLowerCase());
                        if (existing) {
                            // Add any missing fields from Geocodio
                            if (!existing.bio && rep.bio)
                                existing.bio = rep.bio;
                            if (!existing.social && rep.social)
                                existing.social = rep.social;
                            if (!existing.references && rep.references)
                                existing.references = rep.references;
                            if (!existing.district && rep.district)
                                existing.district = rep.district;
                        }
                    }
                });
            }
        }
        // Add source information
        if (googleData && geocodioData) {
            merged.source = 'google_civic+geocodio';
        }
        else if (googleData) {
            merged.source = 'google_civic';
        }
        else if (geocodioData) {
            merged.source = 'geocodio';
        }
        return merged;
    }
    /**
     * Transform FEC response to our format (simplified)
     */
    static transformFECResponse(data, zipCode, state) {
        const representatives = [];
        // FEC data would need significant processing to match with districts
        // This is a placeholder implementation
        return {
            representatives,
            location: { zipCode, state },
            source: 'fec'
        };
    }
    /**
     * Format office title from legislator type and district info
     */
    static formatOfficeTitle(type, districtInfo, state, level = 'federal') {
        switch (level) {
            case 'federal':
                if (type === 'representative') {
                    return `U.S. Representative, ${state}-${districtInfo}`;
                }
                else if (type === 'senator') {
                    return `U.S. Senator, ${state}`;
                }
                return `${type}, ${state}`;
            case 'state':
                if (type === 'lower') {
                    return `State Representative, ${state} District ${districtInfo}`;
                }
                else if (type === 'upper') {
                    return `State Senator, ${state} District ${districtInfo}`;
                }
                return `State ${type}, ${state} District ${districtInfo}`;
            case 'local':
                if (typeof districtInfo === 'string') {
                    return `${districtInfo} School Board Member`;
                }
                return `School Board Member, District ${districtInfo}`;
            default:
                return `${type}, ${state}`;
        }
    }
    /**
     * Extract ZIP code from formatted address
     */
    static extractZipFromAddress(address) {
        const zipMatch = address.match(/(\d{5}(-\d{4})?)/);
        return zipMatch ? zipMatch[1] : '';
    }
    /**
     * Extract state from formatted address
     */
    static extractStateFromAddress(address) {
        const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
        return stateMatch ? stateMatch[1] : '';
    }
    /**
     * Store representatives in our database
     */
    static async storeRepresentativesInDb(representatives, zipCode, state) {
        try {
            // Clear existing representatives for this location
            await prisma_1.prisma.externalOfficial.deleteMany({
                where: {
                    provider: 'representatives_service',
                    zipCode,
                    state
                }
            });
            // Store new representatives
            for (const rep of representatives) {
                if (!rep.name || !rep.office)
                    continue;
                await prisma_1.prisma.externalOfficial.create({
                    data: {
                        externalId: `${rep.name}_${rep.office}`.replace(/[^a-zA-Z0-9]/g, '_'),
                        provider: 'representatives_service',
                        name: rep.name,
                        office: rep.office,
                        district: rep.district,
                        party: rep.party,
                        contactInfo: {
                            phones: rep.phones,
                            emails: rep.emails,
                            urls: rep.urls,
                            address: rep.address
                        },
                        photoUrl: rep.photoUrl,
                        zipCode,
                        state,
                        lastUpdated: new Date()
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error({ error, zipCode, state }, 'Error storing representatives in database');
        }
    }
    /**
     * Get cached representatives from our database
     */
    static async getCachedRepresentativesByLocation(zipCode, state) {
        try {
            const officials = await prisma_1.prisma.externalOfficial.findMany({
                where: {
                    provider: 'representatives_service',
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
            return officials.map(official => ({
                name: official.name,
                office: official.office,
                party: official.party || undefined,
                phones: official.contactInfo?.phones || [],
                emails: official.contactInfo?.emails || [],
                urls: official.contactInfo?.urls || [],
                photoUrl: official.photoUrl || undefined,
                address: official.contactInfo?.address,
                district: official.district || undefined,
                level: 'federal'
            }));
        }
        catch (error) {
            logger_1.logger.error({ error, zipCode, state }, 'Error fetching cached representatives');
            return [];
        }
    }
    /**
     * Refresh representatives data for a location
     */
    static async refreshLocation(zipCode, state) {
        const address = `${zipCode}, ${state}`;
        const result = await this.getRepresentativesByAddress(address, zipCode, state, true);
        return result !== null;
    }
}
exports.RepresentativeService = RepresentativeService;
//# sourceMappingURL=representativeService.js.map