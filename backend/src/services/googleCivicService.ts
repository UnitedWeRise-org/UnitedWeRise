import { ApiCacheService } from './apiCache';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;

export interface GoogleCivicRepresentative {
    name: string;
    office: string;
    party?: string;
    phones?: string[];
    emails?: string[];
    urls?: string[];
    photoUrl?: string;
    channels?: Array<{
        type: string;
        id: string;
    }>;
    address?: Array<{
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
    }>;
}

export interface GoogleCivicResponse {
    kind?: string;
    normalizedInput?: {
        line1?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    divisions?: Record<string, any>;
    offices?: Array<{
        name: string;
        divisionId: string;
        levels?: string[];
        roles?: string[];
        officialIndices: number[];
    }>;
    officials?: GoogleCivicRepresentative[];
}

export class GoogleCivicService {
    /**
     * Get representatives using Google Civic Information API
     */
    static async getRepresentativesByAddress(
        address: string,
        includeOffices: boolean = true
    ): Promise<any> {
        if (!GOOGLE_API_KEY) {
            console.warn('Google API key not configured');
            return null;
        }

        // Generate cache key
        const cacheKey = `google_civic_${Buffer.from(address).toString('base64').substring(0, 30)}`;

        // Check cache first
        const cached = await ApiCacheService.get('representatives', cacheKey);
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

            const response = await fetch(
                `https://www.googleapis.com/civicinfo/v2/representatives?${params}`
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('Google Civic API error:', error);
                return null;
            }

            const data: GoogleCivicResponse = await response.json();
            
            // Transform to our format
            const transformed = this.transformGoogleCivicResponse(data);
            
            // Cache for 7 days
            await ApiCacheService.set('representatives', cacheKey, transformed, 7 * 24 * 60);
            
            return { ...transformed, source: 'google_civic' };
        } catch (error) {
            console.error('Failed to fetch from Google Civic API:', error);
            return null;
        }
    }

    /**
     * Get election information
     */
    static async getElectionInfo(address: string): Promise<any> {
        if (!GOOGLE_API_KEY) {
            console.warn('Google API key not configured');
            return null;
        }

        try {
            // First get the elections list
            const electionsResponse = await fetch(
                `https://www.googleapis.com/civicinfo/v2/elections?key=${GOOGLE_API_KEY}`
            );

            if (!electionsResponse.ok) {
                console.error('Failed to fetch elections');
                return null;
            }

            const elections: any = await electionsResponse.json();
            
            // Get voter info for the next election
            if (elections.elections && elections.elections.length > 0) {
                const nextElection = elections.elections[0];
                
                const params = new URLSearchParams({
                    key: GOOGLE_API_KEY,
                    address: address,
                    electionId: nextElection.id
                });

                const voterInfoResponse = await fetch(
                    `https://www.googleapis.com/civicinfo/v2/voterinfo?${params}`
                );

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
        } catch (error) {
            console.error('Failed to fetch election info:', error);
            return null;
        }
    }

    /**
     * Transform Google Civic response to our standard format
     */
    private static transformGoogleCivicResponse(data: GoogleCivicResponse): any {
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
                const official = data.officials![index];
                
                // Determine level based on office levels
                let level: 'federal' | 'state' | 'local' = 'local';
                if (office.levels?.includes('country')) {
                    level = 'federal';
                } else if (office.levels?.includes('administrativeArea1')) {
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
    private static extractSocialMedia(channels?: Array<{ type: string; id: string }>): any {
        if (!channels) return {};

        const social: any = {};
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

export default GoogleCivicService;