import { ApiCacheService } from './apiCache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;
const GEOCODIO_BASE_URL = 'https://api.geocod.io/v1.7';

export interface CivicOfficial {
    name: string;
    office: string;
    party?: string;
    phones?: string[];
    emails?: string[];
    urls?: string[];
    photoUrl?: string;
    address?: {
        line1?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    channels?: Array<{
        type: string; // 'Facebook', 'Twitter', etc.
        id: string;
    }>;
}

export interface CivicResponse {
    officials: CivicOfficial[];
    offices: Array<{
        name: string;
        level: string; // 'federal', 'state', 'local'
        roles: string[];
        officials: number[]; // indices into officials array
    }>;
}

export class GeolocationService {
    /**
     * Get elected officials by address with caching
     */
    static async getOfficialsByAddress(
        address: string,
        zipCode?: string,
        state?: string,
        forceRefresh: boolean = false
    ): Promise<CivicResponse | null> {
        if (!GEOCODIO_API_KEY) {
            console.warn('Geocodio API key not configured');
            return null;
        }

        // Generate cache key (prefer zip/state if available for better caching)
        const cacheKey = zipCode && state
            ? ApiCacheService.generateGeoKey(zipCode, state, 'officials')
            : `officials_${Buffer.from(address).toString('base64').substring(0, 20)}`;

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = await ApiCacheService.get('geocodio', cacheKey);
            if (cached) {
                return cached as CivicResponse;
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
            await ApiCacheService.set('geocodio', cacheKey, civicResponse, 30 * 24 * 60);

            // Store officials in our database for enhanced lookup
            if (zipCode && state) {
                await this.storeOfficialsInDb(civicResponse.officials, zipCode, state);
            }

            return civicResponse;
        } catch (error) {
            console.error('Geocodio API request failed:', error);
            return null;
        }
    }

    /**
     * Transform Geocodio's response format to our standardized format
     */
    private static transformGeocodioResponse(geocodioData: any): CivicResponse {
        const officials: CivicOfficial[] = [];
        const offices: any[] = [];

        if (!geocodioData.results || geocodioData.results.length === 0) {
            return { officials: [], offices: [] };
        }

        // Get the first result (most accurate)
        const result = geocodioData.results[0];
        const fields = result.fields || {};
        const congressionalDistrict = fields.congressional_districts?.[0] || fields.congressional_district;

        if (!congressionalDistrict) {
            return { officials: [], offices: [] };
        }

        // Create officials from congressional district data
        if (congressionalDistrict.current_legislators) {
            congressionalDistrict.current_legislators.forEach((legislator: any) => {
                const official: CivicOfficial = {
                    name: `${legislator.bio?.first_name || ''} ${legislator.bio?.last_name || ''}`.trim() || 'Unknown',
                    office: this.formatOfficeTitle(legislator.type, congressionalDistrict.district_number, congressionalDistrict.state_abbreviation),
                    party: legislator.bio?.party,
                    phones: legislator.contact?.phone ? [legislator.contact.phone] : [],
                    emails: legislator.contact?.contact_form ? [] : [], // Geocodio doesn't provide direct emails
                    urls: legislator.references?.bioguide_id ? 
                        [`https://bioguide.congress.gov/search/bio/${legislator.references.bioguide_id}`] : [],
                    photoUrl: legislator.bio?.photo_url,
                    address: legislator.contact?.address ? {
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
    private static formatOfficeTitle(type: string, districtNumber: number, state: string): string {
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
    private static determineLevelFromType(type: string): string {
        if (type === 'representative' || type === 'senator') {
            return 'federal';
        }
        return 'federal'; // Geocodio CD data is federal only
    }

    /**
     * Store officials in our database for enhanced searching
     */
    private static async storeOfficialsInDb(
        officials: CivicOfficial[],
        zipCode: string,
        state: string
    ): Promise<void> {
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
                if (!official.name || !official.office) continue;

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
        } catch (error) {
            console.error('Error storing officials in database:', error);
            // Don't throw - this is enhancement, not critical
        }
    }

    /**
     * Get cached officials from our database (faster than API)
     */
    static async getCachedOfficialsByLocation(
        zipCode: string,
        state: string
    ): Promise<CivicOfficial[]> {
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

            return officials.map(official => ({
                name: official.name,
                office: official.office,
                party: official.party || undefined,
                phones: (official.contactInfo as any)?.phones || [],
                emails: (official.contactInfo as any)?.emails || [],
                urls: (official.contactInfo as any)?.urls || [],
                photoUrl: official.photoUrl || undefined,
                address: (official.contactInfo as any)?.address,
                channels: (official.contactInfo as any)?.channels || []
            }));
        } catch (error) {
            console.error('Error fetching cached officials:', error);
            return [];
        }
    }

    /**
     * Refresh officials data for a location
     */
    static async refreshLocation(zipCode: string, state: string): Promise<boolean> {
        const address = `${zipCode}, ${state}`;
        const result = await this.getOfficialsByAddress(address, zipCode, state, true);
        return result !== null;
    }
}

export const googleCivicService = GeolocationService;