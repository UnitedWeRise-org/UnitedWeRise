import { PrismaClient } from '@prisma/client';
import { ApiCacheService } from './apiCache';
import { GoogleCivicService } from './googleCivicService';
import { addressToH3, geocodeAddress } from '../utils/geospatial';

const prisma = new PrismaClient();

export interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
}

export interface DistrictIdentification {
  districts: {
    id: string;
    name: string;
    type: string;
    level: string;
    identifier: string;
    confidence: number;
  }[];
  location: {
    lat: number;
    lng: number;
    h3Index: string;
    zipCode: string;
    state: string;
  };
  source: 'DATABASE' | 'GEOCODIO' | 'GOOGLE_CIVIC' | 'CENSUS' | 'CROWDSOURCED';
  cached: boolean;
}

export interface MissingDistrictOffice {
  districtId: string;
  districtName: string;
  officeTitle: string;
  level: string;
  estimatedTermLength?: number;
  nextElectionDate?: Date;
  confidence: number; // How confident we are this office exists
}

export class DistrictIdentificationService {
  /**
   * Identify all electoral districts for a given address
   */
  static async identifyDistricts(
    address: AddressComponents,
    forceRefresh: boolean = false
  ): Promise<DistrictIdentification> {
    // Generate H3 index for geospatial lookup
    const h3Index = await addressToH3(address);
    
    // Generate cache key
    const cacheKey = `districts_${h3Index || `${address.zipCode}_${address.state}`}`;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = await ApiCacheService.get('district_mapping', cacheKey);
      if (cached) {
        return { ...(cached as DistrictIdentification), cached: true };
      }
    }

    // Try database lookup first (fastest)
    const dbDistricts = await this.getDistrictsFromDatabase(address, h3Index);
    if (dbDistricts.districts.length > 0) {
      // Cache the result
      await ApiCacheService.set('district_mapping', cacheKey, dbDistricts, 30 * 24 * 60); // 30 days
      return { ...dbDistricts, cached: false };
    }

    // Fall back to external APIs
    const apiDistricts = await this.getDistrictsFromAPIs(address);
    if (apiDistricts) {
      // Store in database for future lookups
      await this.storeDistrictsInDatabase(apiDistricts, address, h3Index);
      
      // Cache the result
      await ApiCacheService.set('district_mapping', cacheKey, apiDistricts, 30 * 24 * 60);
      return { ...apiDistricts, cached: false };
    }

    // Return empty result if no districts found
    return {
      districts: [],
      location: {
        lat: address.lat || 0,
        lng: address.lng || 0,
        h3Index: h3Index || '',
        zipCode: address.zipCode,
        state: address.state
      },
      source: 'DATABASE',
      cached: false
    };
  }

  /**
   * Get districts from our database
   */
  private static async getDistrictsFromDatabase(
    address: AddressComponents, 
    h3Index?: string
  ): Promise<DistrictIdentification> {
    const districts = [];
    
    // Look up by H3 index (most precise)
    if (h3Index) {
      const h3Mappings = await prisma.addressDistrictMapping.findMany({
        where: { h3Index },
        include: { district: true },
        orderBy: { confidence: 'desc' }
      });
      
      for (const mapping of h3Mappings) {
        districts.push({
          id: mapping.district.id,
          name: mapping.district.name,
          type: mapping.district.type,
          level: mapping.district.level,
          identifier: mapping.district.identifier,
          confidence: mapping.confidence
        });
      }
    }

    // Fallback to ZIP+State lookup
    if (districts.length === 0) {
      const zipMappings = await prisma.addressDistrictMapping.findMany({
        where: {
          zipCode: address.zipCode,
          state: address.state
        },
        include: { district: true },
        orderBy: { confidence: 'desc' }
      });
      
      for (const mapping of zipMappings) {
        districts.push({
          id: mapping.district.id,
          name: mapping.district.name,
          type: mapping.district.type,
          level: mapping.district.level,
          identifier: mapping.district.identifier,
          confidence: mapping.confidence * 0.8 // Lower confidence for ZIP-only match
        });
      }
    }

    return {
      districts,
      location: {
        lat: address.lat || 0,
        lng: address.lng || 0,
        h3Index: h3Index || '',
        zipCode: address.zipCode,
        state: address.state
      },
      source: 'DATABASE',
      cached: false
    };
  }

  /**
   * Get districts from external APIs (Geocodio, Google Civic)
   */
  private static async getDistrictsFromAPIs(
    address: AddressComponents
  ): Promise<DistrictIdentification | null> {
    const fullAddress = `${address.streetAddress || ''} ${address.city || ''} ${address.state} ${address.zipCode}`.trim();
    
    // Try Google Civic API first
    if (process.env.GOOGLE_API_KEY) {
      try {
        const civicData = await GoogleCivicService.getRepresentativesByAddress(fullAddress);
        if (civicData) {
          return this.transformGoogleCivicResponse(civicData, address);
        }
      } catch (error) {
        console.error('Google Civic API failed for district lookup:', error);
      }
    }

    // Try Geocodio API
    if (process.env.GEOCODIO_API_KEY) {
      try {
        const geocodioData = await this.fetchDistrictsFromGeocodio(fullAddress);
        if (geocodioData) {
          return geocodioData;
        }
      } catch (error) {
        console.error('Geocodio API failed for district lookup:', error);
      }
    }

    return null;
  }

  /**
   * Fetch district data from Geocodio API
   */
  private static async fetchDistrictsFromGeocodio(address: string): Promise<DistrictIdentification | null> {
    const url = 'https://api.geocod.io/v1.7/geocode';
    const params = new URLSearchParams({
      api_key: process.env.GEOCODIO_API_KEY!,
      q: address,
      fields: 'cd,stateleg,school,census2020' // Congressional, state legislative, school, census districts
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      throw new Error(`Geocodio API error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformGeocodioResponse(data);
  }

  /**
   * Transform Geocodio response to our format
   */
  private static transformGeocodioResponse(data: any): DistrictIdentification | null {
    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const districts = [];

    // Extract location info
    const location = {
      lat: result.location.lat,
      lng: result.location.lng,
      h3Index: '', // Will be calculated later
      zipCode: this.extractZipFromAddress(result.formatted_address),
      state: this.extractStateFromAddress(result.formatted_address)
    };

    // Congressional districts
    if (result.fields?.congressional_districts?.[0]) {
      const cd = result.fields.congressional_districts[0];
      districts.push({
        id: `congressional-${location.state}-${cd.district_number}`,
        name: `${location.state} Congressional District ${cd.district_number}`,
        type: 'CONGRESSIONAL',
        level: 'FEDERAL',
        identifier: `${location.state}-${cd.district_number}`,
        confidence: 0.95
      });
    }

    // State legislative districts
    if (result.fields?.state_legislative_districts) {
      const stateDistricts = result.fields.state_legislative_districts;
      
      // State House
      if (stateDistricts.house) {
        stateDistricts.house.forEach((district: any) => {
          districts.push({
            id: `state-house-${location.state}-${district.district_number}`,
            name: `${location.state} State House District ${district.district_number}`,
            type: 'STATE_HOUSE',
            level: 'STATE',
            identifier: `${location.state}-H-${district.district_number}`,
            confidence: 0.90
          });
        });
      }
      
      // State Senate
      if (stateDistricts.senate) {
        stateDistricts.senate.forEach((district: any) => {
          districts.push({
            id: `state-senate-${location.state}-${district.district_number}`,
            name: `${location.state} State Senate District ${district.district_number}`,
            type: 'STATE_SENATE',
            level: 'STATE',
            identifier: `${location.state}-S-${district.district_number}`,
            confidence: 0.90
          });
        });
      }
    }

    // School districts
    if (result.fields?.school_districts) {
      result.fields.school_districts.forEach((district: any) => {
        districts.push({
          id: `school-${location.state}-${district.lea_code}`,
          name: district.name,
          type: 'SCHOOL',
          level: 'LOCAL',
          identifier: `${location.state}-SCHOOL-${district.lea_code}`,
          confidence: 0.85
        });
      });
    }

    return {
      districts,
      location,
      source: 'GEOCODIO',
      cached: false
    };
  }

  /**
   * Transform Google Civic response to our format
   */
  private static transformGoogleCivicResponse(data: any, address: AddressComponents): DistrictIdentification {
    const districts = [];
    const location = {
      lat: address.lat || 0,
      lng: address.lng || 0,
      h3Index: '',
      zipCode: address.zipCode,
      state: address.state
    };

    // Process Google Civic districts (they provide offices, we infer districts)
    if (data.offices) {
      data.offices.forEach((office: any) => {
        const level = this.inferDistrictLevel(office.name);
        const type = this.inferDistrictType(office.name);
        
        if (office.divisionId) {
          districts.push({
            id: office.divisionId,
            name: this.formatDistrictName(office.name, office.divisionId),
            type,
            level,
            identifier: office.divisionId,
            confidence: 0.90
          });
        }
      });
    }

    return {
      districts,
      location,
      source: 'GOOGLE_CIVIC',
      cached: false
    };
  }

  /**
   * Store identified districts in our database
   */
  private static async storeDistrictsInDatabase(
    identification: DistrictIdentification,
    address: AddressComponents,
    h3Index?: string
  ): Promise<void> {
    try {
      for (const district of identification.districts) {
        // Create or update electoral district
        const dbDistrict = await prisma.electoralDistrict.upsert({
          where: {
            identifier_state_type: {
              identifier: district.identifier,
              state: identification.location.state,
              type: district.type as any
            }
          },
          create: {
            name: district.name,
            type: district.type as any,
            level: district.level as any,
            identifier: district.identifier,
            state: identification.location.state,
            dataSource: identification.source,
            verificationLevel: 'UNVERIFIED'
          },
          update: {
            name: district.name,
            dataSource: identification.source,
            updatedAt: new Date()
          }
        });

        // Create address mapping
        await prisma.addressDistrictMapping.create({
          data: {
            address: `${address.streetAddress || ''} ${address.city || ''} ${address.state} ${address.zipCode}`.trim(),
            lat: identification.location.lat,
            lng: identification.location.lng,
            h3Index,
            zipCode: identification.location.zipCode,
            state: identification.location.state,
            confidence: district.confidence,
            source: identification.source,
            districtId: dbDistrict.id
          }
        });
      }
    } catch (error) {
      console.error('Error storing districts in database:', error);
    }
  }

  /**
   * Find offices that should exist but are missing data
   */
  static async findMissingOffices(districtIds: string[]): Promise<MissingDistrictOffice[]> {
    const missingOffices = [];

    for (const districtId of districtIds) {
      const district = await prisma.electoralDistrict.findUnique({
        where: { id: districtId },
        include: { offices: true }
      });

      if (!district) continue;

      // Define expected offices based on district type
      const expectedOffices = this.getExpectedOffices(district.type as any, district.level as any);
      
      for (const expectedOffice of expectedOffices) {
        // Check if office exists
        const existingOffice = district.offices.find(office => 
          office.title.toLowerCase().includes(expectedOffice.title.toLowerCase())
        );

        if (!existingOffice) {
          missingOffices.push({
            districtId: district.id,
            districtName: district.name,
            officeTitle: expectedOffice.title,
            level: district.level,
            estimatedTermLength: expectedOffice.termLength,
            nextElectionDate: expectedOffice.nextElection,
            confidence: expectedOffice.confidence
          });
        }
      }
    }

    return missingOffices;
  }

  /**
   * Get expected offices for a district type
   */
  private static getExpectedOffices(type: string, level: string): Array<{
    title: string;
    termLength?: number;
    nextElection?: Date;
    confidence: number;
  }> {
    const offices = [];

    switch (type) {
      case 'CONGRESSIONAL':
        offices.push({
          title: 'U.S. Representative',
          termLength: 2,
          confidence: 0.95
        });
        break;
        
      case 'STATE_SENATE':
        offices.push({
          title: 'State Senator',
          termLength: 4,
          confidence: 0.90
        });
        break;
        
      case 'STATE_HOUSE':
        offices.push({
          title: 'State Representative',
          termLength: 2,
          confidence: 0.90
        });
        break;
        
      case 'SCHOOL':
        offices.push({
          title: 'School Board Member',
          termLength: 4,
          confidence: 0.80
        });
        break;
        
      case 'COUNTY':
        offices.push(
          { title: 'County Commissioner', termLength: 4, confidence: 0.85 },
          { title: 'County Sheriff', termLength: 4, confidence: 0.85 },
          { title: 'County Clerk', termLength: 4, confidence: 0.75 }
        );
        break;
        
      case 'MUNICIPAL':
        offices.push(
          { title: 'Mayor', termLength: 4, confidence: 0.80 },
          { title: 'City Council Member', termLength: 4, confidence: 0.85 }
        );
        break;
    }

    return offices;
  }

  // Helper methods
  private static extractZipFromAddress(address: string): string {
    const zipMatch = address.match(/(\d{5}(-\d{4})?)/);
    return zipMatch ? zipMatch[1] : '';
  }

  private static extractStateFromAddress(address: string): string {
    const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
    return stateMatch ? stateMatch[1] : '';
  }

  private static inferDistrictLevel(officeName: string): string {
    if (officeName.includes('U.S.') || officeName.includes('United States')) {
      return 'FEDERAL';
    }
    if (officeName.includes('State') || officeName.includes('Governor')) {
      return 'STATE';
    }
    if (officeName.includes('County')) {
      return 'COUNTY';
    }
    if (officeName.includes('City') || officeName.includes('Mayor')) {
      return 'MUNICIPAL';
    }
    if (officeName.includes('School')) {
      return 'LOCAL';
    }
    return 'LOCAL';
  }

  private static inferDistrictType(officeName: string): string {
    if (officeName.includes('Representative') && officeName.includes('U.S.')) {
      return 'CONGRESSIONAL';
    }
    if (officeName.includes('Senate') || officeName.includes('Senator')) {
      return officeName.includes('State') ? 'STATE_SENATE' : 'CONGRESSIONAL';
    }
    if (officeName.includes('Representative') || officeName.includes('Assembly')) {
      return 'STATE_HOUSE';
    }
    if (officeName.includes('School')) {
      return 'SCHOOL';
    }
    if (officeName.includes('County')) {
      return 'COUNTY';
    }
    if (officeName.includes('City') || officeName.includes('Municipal')) {
      return 'MUNICIPAL';
    }
    return 'OTHER_SPECIAL';
  }

  private static formatDistrictName(officeName: string, divisionId: string): string {
    // Extract meaningful district name from division ID
    const parts = divisionId.split('/');
    const lastPart = parts[parts.length - 1];
    
    if (lastPart.includes(':cd:')) {
      const district = lastPart.split(':')[2];
      return `Congressional District ${district}`;
    }
    
    return officeName;
  }
}