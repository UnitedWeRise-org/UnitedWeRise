import { ApiCacheService } from './apiCache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API Configuration
const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;
const FEC_API_KEY = process.env.FEC_API_KEY;

export interface Representative {
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
    district?: string;
    level: 'federal' | 'state' | 'local';
    // Additional Geocodio-specific fields
    type?: 'representative' | 'senator';
    bio?: {
        first_name?: string;
        last_name?: string;
        birthday?: string;
        gender?: string;
        party?: string;
    };
    social?: {
        twitter?: string;
        facebook?: string;
        youtube?: string;
    };
    references?: {
        bioguide_id?: string;
        thomas_id?: string;
        opensecrets_id?: string;
        votesmart_id?: string;
        fec_ids?: string[];
        cspan_id?: string;
        govtrack_id?: string;
        house_history_id?: string;
        maplight_id?: string;
        washington_post_id?: string;
        icpsr_id?: string;
    };
}

export interface RepresentativeResponse {
    representatives: Representative[];
    location: {
        zipCode: string;
        state: string;
        city?: string;
        coordinates?: { lat: number; lng: number };
    };
    source: 'geocodio' | 'fec' | 'cache';
}

export class RepresentativeService {
    /**
     * Get representatives by address using available APIs
     */
    static async getRepresentativesByAddress(
        address: string,
        zipCode?: string,
        state?: string,
        forceRefresh: boolean = false
    ): Promise<RepresentativeResponse | null> {
        // Generate cache key
        const cacheKey = zipCode && state
            ? ApiCacheService.generateGeoKey(zipCode, state, 'reps')
            : `reps_${Buffer.from(address).toString('base64').substring(0, 20)}`;

        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = await ApiCacheService.get('representatives', cacheKey);
            if (cached) {
                return { ...(cached as RepresentativeResponse), source: 'cache' };
            }
        }

        // Try Geocodio first (most comprehensive)
        if (GEOCODIO_API_KEY) {
            try {
                const geocodioResult = await this.fetchFromGeocodio(address);
                if (geocodioResult) {
                    // Cache the response (30 days TTL)
                    await ApiCacheService.set('representatives', cacheKey, geocodioResult, 30 * 24 * 60);
                    
                    // Store in our database for enhanced lookup
                    if (zipCode && state) {
                        await this.storeRepresentativesInDb(geocodioResult.representatives, zipCode, state);
                    }
                    
                    return { ...geocodioResult, source: 'geocodio' };
                }
            } catch (error) {
                console.error('Geocodio API failed:', error);
            }
        }

        // Fallback to FEC API for federal representatives only
        if (FEC_API_KEY && zipCode && state) {
            try {
                const fecResult = await this.fetchFromFEC(zipCode, state);
                if (fecResult) {
                    // Cache the response (7 days TTL for FEC data)
                    await ApiCacheService.set('representatives', cacheKey, fecResult, 7 * 24 * 60);
                    return { ...fecResult, source: 'fec' };
                }
            } catch (error) {
                console.error('FEC API failed:', error);
            }
        }

        console.warn('No API keys configured for representative lookup');
        return null;
    }

    /**
     * Fetch representatives from Geocodio API
     */
    private static async fetchFromGeocodio(address: string): Promise<RepresentativeResponse | null> {
        const url = 'https://api.geocod.io/v1.7/geocode';
        const params = new URLSearchParams({
            api_key: GEOCODIO_API_KEY!,
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
    private static async fetchFromFEC(zipCode: string, state: string): Promise<RepresentativeResponse | null> {
        // FEC API doesn't directly provide address->representative lookup
        // This is a simplified example - you'd need to implement district lookup first
        const url = 'https://api.open.fec.gov/v1/candidates/search/';
        const params = new URLSearchParams({
            api_key: FEC_API_KEY!,
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
    private static transformGeocodioResponse(data: any): RepresentativeResponse | null {
        if (!data.results || data.results.length === 0) {
            return null;
        }

        const result = data.results[0];
        const representatives: Representative[] = [];
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
        const processLegislators = (legislators: any[], districtInfo: any, level: 'federal' | 'state' | 'local') => {
            legislators.forEach((legislator: any) => {
                // Build URLs array
                const urls: string[] = [];
                if (legislator.contact?.url) urls.push(legislator.contact.url);
                if (legislator.references?.bioguide_id) {
                    urls.push(`https://bioguide.congress.gov/search/bio/${legislator.references.bioguide_id}`);
                }
                
                // Build contact phones array
                const phones: string[] = [];
                if (legislator.contact?.phone) phones.push(legislator.contact.phone);
                
                // Parse address from contact info
                let addressInfo;
                if (legislator.contact?.address) {
                    const addressParts = legislator.contact.address.split(',').map((s: string) => s.trim());
                    addressInfo = {
                        line1: addressParts[0] || legislator.contact.address,
                        city: addressParts[1] || undefined,
                        state: addressParts[2]?.split(' ')[0] || undefined,
                        zip: addressParts[2]?.split(' ')[1] || undefined
                    };
                }

                representatives.push({
                    name: `${legislator.bio?.first_name || ''} ${legislator.bio?.last_name || ''}`.trim(),
                    office: this.formatOfficeTitle(
                        legislator.type, 
                        districtInfo.district_number || districtInfo.name, 
                        this.extractStateFromAddress(result.formatted_address),
                        level
                    ),
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
                stateDistricts.house.forEach((district: any) => {
                    if (district.current_legislators) {
                        processLegislators(district.current_legislators, district, 'state');
                    }
                });
            }
            
            // Process senate districts
            if (stateDistricts.senate) {
                stateDistricts.senate.forEach((district: any) => {
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
     * Transform FEC response to our format (simplified)
     */
    private static transformFECResponse(data: any, zipCode: string, state: string): RepresentativeResponse | null {
        const representatives: Representative[] = [];
        
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
    private static formatOfficeTitle(
        type: string, 
        districtInfo: number | string, 
        state: string, 
        level: 'federal' | 'state' | 'local' = 'federal'
    ): string {
        switch (level) {
            case 'federal':
                if (type === 'representative') {
                    return `U.S. Representative, ${state}-${districtInfo}`;
                } else if (type === 'senator') {
                    return `U.S. Senator, ${state}`;
                }
                return `${type}, ${state}`;
                
            case 'state':
                if (type === 'lower') {
                    return `State Representative, ${state} District ${districtInfo}`;
                } else if (type === 'upper') {
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
    private static extractZipFromAddress(address: string): string {
        const zipMatch = address.match(/(\d{5}(-\d{4})?)/);
        return zipMatch ? zipMatch[1] : '';
    }

    /**
     * Extract state from formatted address
     */
    private static extractStateFromAddress(address: string): string {
        const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
        return stateMatch ? stateMatch[1] : '';
    }

    /**
     * Store representatives in our database
     */
    private static async storeRepresentativesInDb(
        representatives: Representative[],
        zipCode: string,
        state: string
    ): Promise<void> {
        try {
            // Clear existing representatives for this location
            await prisma.externalOfficial.deleteMany({
                where: {
                    provider: 'representatives_service',
                    zipCode,
                    state
                }
            });

            // Store new representatives
            for (const rep of representatives) {
                if (!rep.name || !rep.office) continue;

                await prisma.externalOfficial.create({
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
        } catch (error) {
            console.error('Error storing representatives in database:', error);
        }
    }

    /**
     * Get cached representatives from our database
     */
    static async getCachedRepresentativesByLocation(
        zipCode: string,
        state: string
    ): Promise<Representative[]> {
        try {
            const officials = await prisma.externalOfficial.findMany({
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
                phones: (official.contactInfo as any)?.phones || [],
                emails: (official.contactInfo as any)?.emails || [],
                urls: (official.contactInfo as any)?.urls || [],
                photoUrl: official.photoUrl || undefined,
                address: (official.contactInfo as any)?.address,
                district: official.district || undefined,
                level: 'federal' as const
            }));
        } catch (error) {
            console.error('Error fetching cached representatives:', error);
            return [];
        }
    }

    /**
     * Refresh representatives data for a location
     */
    static async refreshLocation(zipCode: string, state: string): Promise<boolean> {
        const address = `${zipCode}, ${state}`;
        const result = await this.getRepresentativesByAddress(address, zipCode, state, true);
        return result !== null;
    }
}