"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedElectionService = void 0;
const prisma_1 = require("../lib/prisma");
const axios_1 = __importDefault(require("axios"));
const electionService_1 = require("./electionService");
const logger_1 = require("./logger");
class EnhancedElectionService {
    /**
     * Main entry point - get election data using multi-tier strategy
     */
    static async getElectionData(state, zipCode) {
        try {
            logger_1.logger.info({ state, zipCode }, 'Fetching election data');
            // Tier 1: Check cache
            const cachedData = await this.getCachedData(state);
            if (cachedData && this.isCacheValid(cachedData)) {
                logger_1.logger.info('Using cached election data');
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
                logger_1.logger.info('Retrieved election data from external API');
                await this.setCachedData(state, apiData, 'api');
                return {
                    elections: apiData,
                    source: 'api',
                    lastUpdated: new Date(),
                    message: 'Real-time data from election APIs'
                };
            }
            // Tier 3: Use fallback with typical election cycles
            logger_1.logger.warn('Using fallback election data (typical cycles)');
            const fallbackData = await this.generateFallbackData(state);
            await this.setCachedData(state, fallbackData, 'fallback');
            return {
                elections: fallbackData,
                source: 'fallback',
                lastUpdated: new Date(),
                message: 'Showing typical election cycles. Real election data will be updated when available.'
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Election data retrieval failed');
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
    static async getInternalElectionData(state) {
        try {
            const elections = await electionService_1.ElectionService.getElectionsByLocation({
                state: state.toUpperCase(),
                includeUpcoming: true
            });
            if (elections && elections.length > 0) {
                logger_1.logger.info({ state, count: elections.length }, 'Found internal elections');
                return elections;
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Internal election data query failed');
            return [];
        }
    }
    /**
     * Tier 1: Cache management
     */
    static async getCachedData(state) {
        try {
            // Using Prisma to store cache (could also use Redis in production)
            const cacheEntry = await prisma_1.prisma.electionCache.findUnique({
                where: { stateCode: state.toUpperCase() }
            });
            if (!cacheEntry) {
                return null;
            }
            return {
                elections: JSON.parse(cacheEntry.data),
                lastUpdated: cacheEntry.lastUpdated,
                source: cacheEntry.source,
                refreshInterval: this.CACHE_DURATION_HOURS
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Cache retrieval failed');
            return null;
        }
    }
    static async setCachedData(state, elections, source) {
        try {
            await prisma_1.prisma.electionCache.upsert({
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
            logger_1.logger.debug({ state, source }, 'Cached election data');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Cache storage failed');
        }
    }
    static isCacheValid(cachedData) {
        const hoursOld = (Date.now() - cachedData.lastUpdated.getTime()) / (1000 * 60 * 60);
        return hoursOld < this.CACHE_DURATION_HOURS;
    }
    /**
     * Tier 2: External API integration
     */
    static async fetchFromExternalAPIs(state, zipCode) {
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
            }
            catch (error) {
                logger_1.logger.warn({ error, apiName: api.name }, 'API failed');
                continue;
            }
        }
        return null;
    }
    static async fetchFromAPI(api, state, zipCode) {
        try {
            logger_1.logger.info({ apiName: api.name, state }, 'Trying API for state');
            if (api.name === 'Google Civic Info') {
                return await this.fetchFromGoogleCivic(state, zipCode);
            }
            // Other APIs would be implemented here when keys are available
            logger_1.logger.warn({ apiName: api.name }, 'API integration not yet implemented');
            return null;
        }
        catch (error) {
            logger_1.logger.error({ error, apiName: api.name }, 'API error');
            return null;
        }
    }
    static async fetchFromGoogleCivic(state, zipCode) {
        if (!process.env.GOOGLE_CIVIC_API_KEY) {
            return null;
        }
        try {
            const address = zipCode || state;
            const url = `${this.EXTERNAL_APIS[2].baseUrl}/elections`;
            const response = await axios_1.default.get(url, {
                params: {
                    key: process.env.GOOGLE_CIVIC_API_KEY
                },
                timeout: this.API_TIMEOUT_MS
            });
            if (response.data && response.data.elections) {
                // Transform Google Civic data to our format
                return response.data.elections.map((election) => ({
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Google Civic API error');
            return null;
        }
    }
    /**
     * Tier 3: Fallback system with typical election cycles
     */
    static async generateFallbackData(state) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const fallbackElections = [];
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
    static getTypicalElectionCycles(currentYear, state) {
        const cycles = [];
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
    static async getBasicFallback(state) {
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
    static getFirstTuesdayAfterFirstMonday(year, month) {
        const firstDay = new Date(year, month, 1);
        const firstMonday = 1 + (7 - firstDay.getDay() + 1) % 7;
        return firstMonday + 1; // Tuesday after first Monday
    }
    static isSenateElectionYear(state, year) {
        // Simplified - in reality this would need state-specific Senate cycles
        return year % 6 === 0 || year % 6 === 2 || year % 6 === 4;
    }
    static getNextStateElectionYear(state, currentYear) {
        // Most governors elected every 4 years, but varies by state
        // This is simplified - would need state-specific data
        const baseYear = 2024; // Known gubernatorial election year for many states
        let nextYear = baseYear;
        while (nextYear <= currentYear) {
            nextYear += 4;
        }
        return nextYear;
    }
    static inferElectionType(name) {
        name = name.toLowerCase();
        if (name.includes('primary'))
            return 'PRIMARY';
        if (name.includes('runoff'))
            return 'RUNOFF';
        if (name.includes('special'))
            return 'SPECIAL';
        return 'GENERAL';
    }
    static inferElectionLevel(name) {
        name = name.toLowerCase();
        if (name.includes('president') || name.includes('congress') || name.includes('senate'))
            return 'FEDERAL';
        if (name.includes('governor') || name.includes('state'))
            return 'STATE';
        if (name.includes('mayor') || name.includes('city') || name.includes('municipal'))
            return 'MUNICIPAL';
        return 'LOCAL';
    }
    static inferElectionTypeFromLevel(level) {
        return 'GENERAL'; // Most common type
    }
    /**
     * Force refresh cache (admin function)
     */
    static async refreshCache(state) {
        try {
            if (state) {
                await prisma_1.prisma.electionCache.delete({
                    where: { stateCode: state.toUpperCase() }
                });
                logger_1.logger.info({ state }, 'Cleared cache for state');
            }
            else {
                await prisma_1.prisma.electionCache.deleteMany({});
                logger_1.logger.info('Cleared all election cache');
            }
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Cache refresh failed');
        }
    }
}
exports.EnhancedElectionService = EnhancedElectionService;
EnhancedElectionService.CACHE_DURATION_HOURS = 6;
EnhancedElectionService.API_TIMEOUT_MS = 5000;
EnhancedElectionService.CACHE_KEY = 'election_data_cache';
// External API configurations
EnhancedElectionService.EXTERNAL_APIS = [
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
//# sourceMappingURL=enhancedElectionService.js.map