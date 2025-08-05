import { ApiCacheService } from './apiCache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;
const GOOGLE_CIVIC_BASE_URL = 'https://www.googleapis.com/civicinfo/v2';

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

export class GoogleCivicService {
    /**
     * Get elected officials by address with caching
     */
    static async getOfficialsByAddress(
        address: string,
        zipCode?: string,
        state?: string,
        forceRefresh: boolean = false
    ): Promise<CivicResponse | null> {
        if (!GOOGLE_CIVIC_API_KEY) {
            console.warn('Google Civic API key not configured');
            return null;
        }

        // Generate cache key (prefer zip/state if available for better caching)
        const cacheKey = zipCode && state
            ? ApiCacheService.generateGeoKey(zipCode, state, 'officials')
            : `officials_${Buffer.from(address).toString('base64').substring(0, 20)}`;

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = await ApiCacheService.get('google_civic', cacheKey);
            if (cached) {
                return cached as CivicResponse;
            }
        }

        try {
            const url = `${GOOGLE_CIVIC_BASE_URL}/representatives`;
            const params = new URLSearchParams({
                key: GOOGLE_CIVIC_API_KEY,
                address: address,
                includeOffices: 'true',
            });

            const response = await fetch(`${url}?${params}`);

            if (!response.ok) {
                console.error('Google Civic API error:', response.status, await response.text());
                return null;
            }

            const data = await response.json();

            // Transform the response to our format
            const civicResponse = this.transformGoogleResponse(data);

            // Cache the response (30 days TTL for elected officials)
            await ApiCacheService.set('google_civic', cacheKey, civicResponse, 30 * 24 * 60);

            // Store officials in our database for enhanced lookup
            if (zipCode && state) {
                await this.storeOfficialsInDb(civicResponse.officials, zipCode, state);
            }

            return civicResponse;
        } catch (error) {
            console.error('Google Civic API request failed:', error);
            return null;
        }
    }

    /**
     * Transform Google's response format to our standardized format
     */
    private static transformGoogleResponse(googleData: any): CivicResponse {
        const officials: CivicOfficial[] = [];
        const offices: any[] = [];

        if (!googleData.officials || !googleData.offices) {
            return { officials: [], offices: [] };
        }

        // Transform officials
        googleData.officials.forEach((official: any) => {
            officials.push({
                name: official.name || 'Unknown',
                office: '', // Will be filled from offices data
                party: official.party,
                phones: official.phones || [],
                emails: official.emails || [],
                urls: official.urls || [],
                photoUrl: official.photoUrl,
                address: official.address ? {
                    line1: official.address[0]?.line1,
                    city: official.address[0]?.city,
                    state: official.address[0]?.state,
                    zip: official.address[0]?.zip
                } : undefined,
                channels: official.channels || []
            });
        });

        // Transform offices and link to officials
        googleData.offices.forEach((office: any) => {
            const transformedOffice = {
                name: office.name,
                level: this.determineLevel(office.levels?.[0] || ''),
                roles: office.roles || [],
                officials: office.officialIndices || []
            };

            // Update officials with office names
            transformedOffice.officials.forEach((officialIndex: number) => {
                if (officials[officialIndex]) {
                    officials[officialIndex].office = office.name;
                }
            });

            offices.push(transformedOffice);
        });

        return { officials, offices };
    }

    /**
     * Determine government level from Google's level codes
     */
    private static determineLevel(googleLevel: string): string {
        const levelMap: { [key: string]: string } = {
            'country': 'federal',
            'administrativeArea1': 'state',
            'administrativeArea2': 'county',
            'locality': 'local',
            'subLocality1': 'local',
            'subLocality2': 'local'
        };
        return levelMap[googleLevel] || 'local';
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
                    provider: 'google_civic',
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
                        provider: 'google_civic',
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
                    provider: 'google_civic',
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