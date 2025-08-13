"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCivicService = void 0;
const apiCache_1 = require("./apiCache");
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
class GoogleCivicService {
    /**
     * Get representatives using Google Civic Information API
     */
    static async getRepresentativesByAddress(address, includeOffices = true) {
        if (!GOOGLE_API_KEY) {
            console.warn('Google API key not configured');
            return null;
        }
        // Generate cache key
        const cacheKey = `google_civic_${Buffer.from(address).toString('base64').substring(0, 30)}`;
        // Check cache first
        const cached = await apiCache_1.ApiCacheService.get('representatives', cacheKey);
        if (cached) {
            return { ...cached, source: 'cache' };
        }
        try {
            // Call Google Civic Information API
            const params = new URLSearchParams({
                key: GOOGLE_API_KEY,
                address: address,
                includeOffices: includeOffices.toString()
            });
            const response = await fetch(`https://www.googleapis.com/civicinfo/v2/representatives?${params}`);
            if (!response.ok) {
                const error = await response.json();
                console.error('Google Civic API error:', error);
                return null;
            }
            const data = await response.json();
            // Transform to our format
            const transformed = this.transformGoogleCivicResponse(data);
            // Cache for 7 days
            await apiCache_1.ApiCacheService.set('representatives', cacheKey, transformed, 7 * 24 * 60);
            return { ...transformed, source: 'google_civic' };
        }
        catch (error) {
            console.error('Failed to fetch from Google Civic API:', error);
            return null;
        }
    }
    /**
     * Get election information
     */
    static async getElectionInfo(address) {
        if (!GOOGLE_API_KEY) {
            console.warn('Google API key not configured');
            return null;
        }
        try {
            // First get the elections list
            const electionsResponse = await fetch(`https://www.googleapis.com/civicinfo/v2/elections?key=${GOOGLE_API_KEY}`);
            if (!electionsResponse.ok) {
                console.error('Failed to fetch elections');
                return null;
            }
            const elections = await electionsResponse.json();
            // Get voter info for the next election
            if (elections.elections && elections.elections.length > 0) {
                const nextElection = elections.elections[0];
                const params = new URLSearchParams({
                    key: GOOGLE_API_KEY,
                    address: address,
                    electionId: nextElection.id
                });
                const voterInfoResponse = await fetch(`https://www.googleapis.com/civicinfo/v2/voterinfo?${params}`);
                if (voterInfoResponse.ok) {
                    const voterInfo = await voterInfoResponse.json();
                    return {
                        election: nextElection,
                        voterInfo: voterInfo,
                        source: 'google_civic'
                    };
                }
            }
            return { elections: elections.elections, source: 'google_civic' };
        }
        catch (error) {
            console.error('Failed to fetch election info:', error);
            return null;
        }
    }
    /**
     * Transform Google Civic response to our standard format
     */
    static transformGoogleCivicResponse(data) {
        const representatives = {
            federal: [],
            state: [],
            local: []
        };
        if (!data.offices || !data.officials) {
            return { representatives, location: {} };
        }
        // Process each office
        data.offices.forEach(office => {
            const officials = office.officialIndices.map(index => {
                const official = data.officials[index];
                // Determine level based on office levels
                let level = 'local';
                if (office.levels?.includes('country')) {
                    level = 'federal';
                }
                else if (office.levels?.includes('administrativeArea1')) {
                    level = 'state';
                }
                return {
                    name: official.name,
                    office: office.name,
                    party: official.party,
                    phones: official.phones,
                    emails: official.emails,
                    urls: official.urls,
                    photoUrl: official.photoUrl,
                    address: official.address?.[0] ? {
                        line1: official.address[0].line1,
                        city: official.address[0].city,
                        state: official.address[0].state,
                        zip: official.address[0].zip
                    } : undefined,
                    level: level,
                    social: this.extractSocialMedia(official.channels)
                };
            });
            // Add officials to appropriate category
            officials.forEach(official => {
                representatives[official.level].push(official);
            });
        });
        return {
            representatives,
            location: {
                address: data.normalizedInput ?
                    `${data.normalizedInput.line1}, ${data.normalizedInput.city}, ${data.normalizedInput.state} ${data.normalizedInput.zip}` :
                    undefined,
                city: data.normalizedInput?.city,
                state: data.normalizedInput?.state,
                zipCode: data.normalizedInput?.zip
            }
        };
    }
    /**
     * Extract social media handles from channels
     */
    static extractSocialMedia(channels) {
        if (!channels)
            return {};
        const social = {};
        channels.forEach(channel => {
            switch (channel.type.toLowerCase()) {
                case 'facebook':
                    social.facebook = channel.id;
                    break;
                case 'twitter':
                    social.twitter = channel.id;
                    break;
                case 'youtube':
                    social.youtube = channel.id;
                    break;
            }
        });
        return social;
    }
}
exports.GoogleCivicService = GoogleCivicService;
exports.default = GoogleCivicService;
//# sourceMappingURL=googleCivicService.js.map