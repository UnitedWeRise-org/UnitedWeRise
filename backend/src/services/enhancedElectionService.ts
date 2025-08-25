import { Election, Candidate, Office, BallotMeasure } from '@prisma/client';
import { prisma } from '../lib/prisma';
import axios from 'axios';
import { ElectionService } from './electionService';

// Using singleton prisma from lib/prisma.ts

interface CachedElectionData {
  elections: any[];
  lastUpdated: Date;
  source: 'cache' | 'api' | 'fallback';
  refreshInterval: number; // hours
}

interface FallbackElectionCycle {
  title: string;
  level: 'FEDERAL' | 'STATE' | 'LOCAL';
  date: Date;
  offices: {
    title: string;
    level: 'FEDERAL' | 'STATE' | 'LOCAL';
    description: string;
    termLength: number;
    isTypicallyContested: boolean;
  }[];
}

interface ExternalElectionAPI {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimitPerHour: number;
  isAvailable: boolean;
}

export class EnhancedElectionService {
  private static readonly CACHE_DURATION_HOURS = 6;
  private static readonly API_TIMEOUT_MS = 5000;
  private static readonly CACHE_KEY = 'election_data_cache';
  
  // External API configurations
  private static readonly EXTERNAL_APIS: ExternalElectionAPI[] = [
    {
      name: 'Ballotpedia',
      baseUrl: 'https://api.ballotpedia.org',
      rateLimitPerHour: 100,
      isAvailable: false // Will be enabled when API keys are configured
    },
    {
      name: 'Vote Smart',
      baseUrl: 'https://api.votesmart.org',
      rateLimitPerHour: 1000,
      isAvailable: false
    },
    {
      name: 'Google Civic Info',
      baseUrl: 'https://www.googleapis.com/civicinfo/v2',
      rateLimitPerHour: 25000,
      isAvailable: !!process.env.GOOGLE_CIVIC_API_KEY
    }
  ];

  /**
   * Main entry point - get election data using multi-tier strategy
   */
  static async getElectionData(state: string, zipCode?: string): Promise<{
    elections: any[];
    source: 'cache' | 'api' | 'fallback';
    lastUpdated: Date;
    message?: string;
  }> {
    try {
      console.log(`🗳️  Fetching election data for ${state}${zipCode ? ` (${zipCode})` : ''}`);

      // Tier 1: Check cache
      const cachedData = await this.getCachedData(state);
      if (cachedData && this.isCacheValid(cachedData)) {
        console.log('✅ Using cached election data');
        return {
          elections: cachedData.elections,
          source: 'cache',
          lastUpdated: cachedData.lastUpdated,
          message: 'Data from cache (updated within last 6 hours)'
        };
      }

      // Tier 2: Try external APIs
      const apiData = await this.fetchFromExternalAPIs(state, zipCode);
      if (apiData && apiData.length > 0) {
        console.log('✅ Retrieved election data from external API');
        await this.setCachedData(state, apiData, 'api');
        return {
          elections: apiData,
          source: 'api',
          lastUpdated: new Date(),
          message: 'Real-time data from election APIs'
        };
      }

      // Tier 3: Use fallback with typical election cycles
      console.log('⚠️  Using fallback election data (typical cycles)');
      const fallbackData = await this.generateFallbackData(state);
      await this.setCachedData(state, fallbackData, 'fallback');
      
      return {
        elections: fallbackData,
        source: 'fallback',
        lastUpdated: new Date(),
        message: 'Showing typical election cycles. Real election data will be updated when available.'
      };

    } catch (error) {
      console.error('Election data retrieval failed:', error);
      
      // Last resort - return basic fallback
      const basicFallback = await this.getBasicFallback(state);
      return {
        elections: basicFallback,
        source: 'fallback',
        lastUpdated: new Date(),
        message: 'Using basic election schedule. Full data will be available soon.'
      };
    }
  }

  /**
   * Get election data from our internal database first (existing system)
   */
  static async getInternalElectionData(state: string): Promise<any[]> {
    try {
      const elections = await ElectionService.getElectionsByLocation({ 
        state: state.toUpperCase(),
        includeUpcoming: true 
      });
      
      if (elections && elections.length > 0) {
        console.log(`✅ Found ${elections.length} internal elections for ${state}`);
        return elections;
      }
      
      return [];
    } catch (error) {
      console.error('Internal election data query failed:', error);
      return [];
    }
  }

  /**
   * Tier 1: Cache management
   */
  private static async getCachedData(state: string): Promise<CachedElectionData | null> {
    try {
      // Using Prisma to store cache (could also use Redis in production)
      const cacheEntry = await prisma.electionCache.findUnique({
        where: { stateCode: state.toUpperCase() }
      });

      if (!cacheEntry) {
        return null;
      }

      return {
        elections: JSON.parse(cacheEntry.data),
        lastUpdated: cacheEntry.lastUpdated,
        source: cacheEntry.source as 'cache' | 'api' | 'fallback',
        refreshInterval: this.CACHE_DURATION_HOURS
      };
    } catch (error) {
      console.error('Cache retrieval failed:', error);
      return null;
    }
  }

  private static async setCachedData(state: string, elections: any[], source: 'api' | 'fallback') {
    try {
      await prisma.electionCache.upsert({
        where: { stateCode: state.toUpperCase() },
        create: {
          stateCode: state.toUpperCase(),
          data: JSON.stringify(elections),
          source,
          lastUpdated: new Date()
        },
        update: {
          data: JSON.stringify(elections),
          source,
          lastUpdated: new Date()
        }
      });
      console.log(`💾 Cached election data for ${state} (${source})`);
    } catch (error) {
      console.error('Cache storage failed:', error);
    }
  }

  private static isCacheValid(cachedData: CachedElectionData): boolean {
    const hoursOld = (Date.now() - cachedData.lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursOld < this.CACHE_DURATION_HOURS;
  }

  /**
   * Tier 2: External API integration
   */
  private static async fetchFromExternalAPIs(state: string, zipCode?: string): Promise<any[] | null> {
    // Try internal database first
    const internalData = await this.getInternalElectionData(state);
    if (internalData.length > 0) {
      return internalData;
    }

    // Try external APIs
    for (const api of this.EXTERNAL_APIS.filter(api => api.isAvailable)) {
      try {
        const data = await this.fetchFromAPI(api, state, zipCode);
        if (data && data.length > 0) {
          return data;
        }
      } catch (error) {
        console.warn(`${api.name} API failed:`, error);
        continue;
      }
    }

    return null;
  }

  private static async fetchFromAPI(api: ExternalElectionAPI, state: string, zipCode?: string): Promise<any[] | null> {
    try {
      console.log(`🔄 Trying ${api.name} API for ${state}`);

      if (api.name === 'Google Civic Info') {
        return await this.fetchFromGoogleCivic(state, zipCode);
      }
      
      // Other APIs would be implemented here when keys are available
      console.log(`⚠️  ${api.name} integration not yet implemented`);
      return null;

    } catch (error) {
      console.error(`${api.name} API error:`, error);
      return null;
    }
  }

  private static async fetchFromGoogleCivic(state: string, zipCode?: string): Promise<any[] | null> {
    if (!process.env.GOOGLE_CIVIC_API_KEY) {
      return null;
    }

    try {
      const address = zipCode || state;
      const url = `${this.EXTERNAL_APIS[2].baseUrl}/elections`;
      
      const response = await axios.get(url, {
        params: {
          key: process.env.GOOGLE_CIVIC_API_KEY
        },
        timeout: this.API_TIMEOUT_MS
      });

      if (response.data && response.data.elections) {
        // Transform Google Civic data to our format
        return response.data.elections.map((election: any) => ({
          id: `google_${election.id}`,
          name: election.name,
          type: this.inferElectionType(election.name),
          level: this.inferElectionLevel(election.name),
          date: new Date(election.electionDay),
          state: state.toUpperCase(),
          isActive: new Date(election.electionDay) > new Date(),
          source: 'google_civic',
          offices: [], // Would need additional API calls to get offices
          description: `${election.name} - Data from Google Civic Information API`
        }));
      }

      return null;
    } catch (error) {
      console.error('Google Civic API error:', error);
      return null;
    }
  }

  /**
   * Tier 3: Fallback system with typical election cycles
   */
  private static async generateFallbackData(state: string): Promise<any[]> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const fallbackElections: any[] = [];

    // Generate typical election cycles
    const cycles = this.getTypicalElectionCycles(currentYear, state);
    
    for (const cycle of cycles) {
      const election = {
        id: `fallback_${state}_${cycle.level}_${cycle.date.getFullYear()}`,
        name: cycle.title,
        type: this.inferElectionTypeFromLevel(cycle.level),
        level: cycle.level,
        date: cycle.date,
        state: state.toUpperCase(),
        isActive: cycle.date > currentDate,
        source: 'fallback',
        description: `Typical ${cycle.level.toLowerCase()} election cycle for ${state}. Actual dates and candidates will be updated when official information becomes available.`,
        offices: cycle.offices.map(office => ({
          id: `fallback_office_${office.title.replace(/\s+/g, '_').toLowerCase()}`,
          title: office.title,
          level: office.level,
          description: office.description,
          termLength: office.termLength,
          state: state.toUpperCase(),
          candidates: [] // Will be populated when real candidates register
        }))
      };
      
      fallbackElections.push(election);
    }

    return fallbackElections.filter(e => e.isActive).slice(0, 5); // Next 5 upcoming elections
  }

  private static getTypicalElectionCycles(currentYear: number, state: string): FallbackElectionCycle[] {
    const cycles: FallbackElectionCycle[] = [];

    // Presidential Election (every 4 years)
    if (currentYear % 4 === 0 || (currentYear + 4) % 4 === 0) {
      const nextPresidentialYear = currentYear % 4 === 0 ? currentYear : currentYear + (4 - (currentYear % 4));
      cycles.push({
        title: `${nextPresidentialYear} Presidential Election`,
        level: 'FEDERAL',
        date: new Date(nextPresidentialYear, 10, this.getFirstTuesdayAfterFirstMonday(nextPresidentialYear, 10)), // November
        offices: [
          {
            title: 'President of the United States',
            level: 'FEDERAL',
            description: 'Chief Executive of the United States',
            termLength: 4,
            isTypicallyContested: true
          },
          {
            title: 'U.S. House of Representatives',
            level: 'FEDERAL',
            description: `Representative for ${state}`,
            termLength: 2,
            isTypicallyContested: true
          }
        ]
      });
    }

    // Congressional Midterms (every 2 years)
    const nextMidtermYear = currentYear % 2 === 0 ? currentYear + 2 : currentYear + 1;
    if (nextMidtermYear % 4 !== 0) { // Not a presidential year
      cycles.push({
        title: `${nextMidtermYear} Congressional Election`,
        level: 'FEDERAL',
        date: new Date(nextMidtermYear, 10, this.getFirstTuesdayAfterFirstMonday(nextMidtermYear, 10)),
        offices: [
          {
            title: 'U.S. House of Representatives',
            level: 'FEDERAL',
            description: `Representative for ${state}`,
            termLength: 2,
            isTypicallyContested: true
          },
          {
            title: 'U.S. Senate',
            level: 'FEDERAL',
            description: `Senator for ${state}`,
            termLength: 6,
            isTypicallyContested: this.isSenateElectionYear(state, nextMidtermYear)
          }
        ]
      });
    }

    // State Elections (Governor typically every 4 years, varies by state)
    const nextStateElectionYear = this.getNextStateElectionYear(state, currentYear);
    if (nextStateElectionYear) {
      cycles.push({
        title: `${nextStateElectionYear} ${state} State Election`,
        level: 'STATE',
        date: new Date(nextStateElectionYear, 10, this.getFirstTuesdayAfterFirstMonday(nextStateElectionYear, 10)),
        offices: [
          {
            title: 'Governor',
            level: 'STATE',
            description: `Governor of ${state}`,
            termLength: 4,
            isTypicallyContested: true
          },
          {
            title: 'State Legislature',
            level: 'STATE',
            description: 'State Representative or Senator',
            termLength: 2,
            isTypicallyContested: true
          }
        ]
      });
    }

    return cycles.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Last resort fallback
   */
  private static async getBasicFallback(state: string): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const nextElectionYear = currentYear % 2 === 0 ? currentYear + 2 : currentYear + 1;
    
    return [{
      id: `basic_fallback_${state}`,
      name: `${nextElectionYear} General Election`,
      type: 'GENERAL',
      level: 'FEDERAL',
      date: new Date(nextElectionYear, 10, 8), // Rough estimate
      state: state.toUpperCase(),
      isActive: true,
      source: 'basic_fallback',
      description: 'Election schedule will be updated with official information.',
      offices: [
        {
          id: `basic_office_congress_${state}`,
          title: 'U.S. House of Representatives',
          level: 'FEDERAL',
          description: 'Federal legislative representative',
          candidates: []
        }
      ]
    }];
  }

  // Helper methods for election cycle calculations
  private static getFirstTuesdayAfterFirstMonday(year: number, month: number): number {
    const firstDay = new Date(year, month, 1);
    const firstMonday = 1 + (7 - firstDay.getDay() + 1) % 7;
    return firstMonday + 1; // Tuesday after first Monday
  }

  private static isSenateElectionYear(state: string, year: number): boolean {
    // Simplified - in reality this would need state-specific Senate cycles
    return year % 6 === 0 || year % 6 === 2 || year % 6 === 4;
  }

  private static getNextStateElectionYear(state: string, currentYear: number): number | null {
    // Most governors elected every 4 years, but varies by state
    // This is simplified - would need state-specific data
    const baseYear = 2024; // Known gubernatorial election year for many states
    let nextYear = baseYear;
    
    while (nextYear <= currentYear) {
      nextYear += 4;
    }
    
    return nextYear;
  }

  private static inferElectionType(name: string): string {
    name = name.toLowerCase();
    if (name.includes('primary')) return 'PRIMARY';
    if (name.includes('runoff')) return 'RUNOFF';
    if (name.includes('special')) return 'SPECIAL';
    return 'GENERAL';
  }

  private static inferElectionLevel(name: string): string {
    name = name.toLowerCase();
    if (name.includes('president') || name.includes('congress') || name.includes('senate')) return 'FEDERAL';
    if (name.includes('governor') || name.includes('state')) return 'STATE';
    if (name.includes('mayor') || name.includes('city') || name.includes('municipal')) return 'MUNICIPAL';
    return 'LOCAL';
  }

  private static inferElectionTypeFromLevel(level: string): string {
    return 'GENERAL'; // Most common type
  }

  /**
   * Force refresh cache (admin function)
   */
  static async refreshCache(state?: string): Promise<void> {
    try {
      if (state) {
        await prisma.electionCache.delete({
          where: { stateCode: state.toUpperCase() }
        });
        console.log(`🗑️  Cleared cache for ${state}`);
      } else {
        await prisma.electionCache.deleteMany({});
        console.log('🗑️  Cleared all election cache');
      }
    } catch (error) {
      console.error('Cache refresh failed:', error);
    }
  }
}