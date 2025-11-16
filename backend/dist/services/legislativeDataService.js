"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegislativeDataService = void 0;
const prisma_1 = require("../lib/prisma");
;
const apiCache_1 = require("./apiCache");
const logger_1 = require("./logger");
// Using singleton prisma from lib/prisma.ts
// API Configuration
const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const OPEN_STATES_API_KEY = process.env.OPEN_STATES_API_KEY;
const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY;
class LegislativeDataService {
    /**
     * Sync federal legislators from Congress.gov API
     */
    static async syncFederalLegislators(forceRefresh = false) {
        if (!CONGRESS_API_KEY) {
            logger_1.logger.warn('Congress.gov API key not configured');
            return;
        }
        const cacheKey = 'federal_legislators_118th';
        // Check cache first
        if (!forceRefresh) {
            const cached = await apiCache_1.ApiCacheService.get('legislative_data', cacheKey);
            if (cached) {
                logger_1.logger.info('Using cached federal legislators data');
                return;
            }
        }
        try {
            // Get current Congress session (118th Congress)
            const congressResponse = await fetch(`https://api.congress.gov/v3/congress/118/member?api_key=${CONGRESS_API_KEY}&format=json&limit=550`);
            if (!congressResponse.ok) {
                throw new Error(`Congress API error: ${congressResponse.status}`);
            }
            const data = await congressResponse.json();
            // Create or update 118th Congress legislature record
            const legislature = await prisma_1.prisma.legislature.upsert({
                where: {
                    level_state_session: {
                        level: 'FEDERAL',
                        state: null,
                        session: '118th'
                    }
                },
                create: {
                    name: '118th Congress',
                    level: 'FEDERAL',
                    session: '118th',
                    startDate: new Date('2023-01-03'),
                    endDate: new Date('2025-01-03'),
                    isActive: true
                },
                update: {
                    name: '118th Congress',
                    isActive: true
                }
            });
            // Process legislators
            const apiData = data;
            for (const member of apiData.members || []) {
                await this.processFederalLegislator(member, legislature.id);
            }
            // Cache the result for 24 hours
            await apiCache_1.ApiCacheService.set('legislative_data', cacheKey, { synced: true }, 24 * 60);
            logger_1.logger.info({ count: apiData.members?.length || 0 }, 'Synced federal legislators');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to sync federal legislators');
        }
    }
    /**
     * Sync state legislators from Open States API
     */
    static async syncStateLegislators(state, forceRefresh = false) {
        if (!OPEN_STATES_API_KEY) {
            logger_1.logger.warn('Open States API key not configured');
            return;
        }
        const cacheKey = `state_legislators_${state}_2025`;
        // Check cache first
        if (!forceRefresh) {
            const cached = await apiCache_1.ApiCacheService.get('legislative_data', cacheKey);
            if (cached) {
                logger_1.logger.info({ state }, 'Using cached state legislators data');
                return;
            }
        }
        try {
            // Get current state session
            const peopleResponse = await fetch(`https://v3.openstates.org/people?jurisdiction=${state}&page=1&per_page=200`, {
                headers: {
                    'X-API-KEY': OPEN_STATES_API_KEY
                }
            });
            if (!peopleResponse.ok) {
                throw new Error(`Open States API error: ${peopleResponse.status}`);
            }
            const data = await peopleResponse.json();
            // Create or update state legislature record
            const legislature = await prisma_1.prisma.legislature.upsert({
                where: {
                    level_state_session: {
                        level: 'STATE',
                        state: state,
                        session: '2025'
                    }
                },
                create: {
                    name: `${state} 2025 Session`,
                    level: 'STATE',
                    state: state,
                    session: '2025',
                    startDate: new Date('2025-01-01'),
                    isActive: true
                },
                update: {
                    name: `${state} 2025 Session`,
                    isActive: true
                }
            });
            // Process legislators
            const stateData = data;
            for (const person of stateData.results || []) {
                await this.processStateLegislator(person, legislature.id, state);
            }
            // Cache the result for 24 hours
            await apiCache_1.ApiCacheService.set('legislative_data', cacheKey, { synced: true }, 24 * 60);
            logger_1.logger.info({ state, count: stateData.results?.length || 0 }, 'Synced state legislators');
        }
        catch (error) {
            logger_1.logger.error({ state, error }, 'Failed to sync state legislators');
        }
    }
    /**
     * Get voting records for a specific legislator
     */
    static async getVotingRecords(bioguideId, limit = 50) {
        if (!CONGRESS_API_KEY) {
            return [];
        }
        const cacheKey = `voting_records_${bioguideId}_${limit}`;
        // Check cache first
        const cached = await apiCache_1.ApiCacheService.get('voting_records', cacheKey);
        if (cached) {
            return cached;
        }
        try {
            // Get votes from Congress API
            const votesResponse = await fetch(`https://api.congress.gov/v3/member/${bioguideId}/votes?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`);
            if (!votesResponse.ok) {
                throw new Error(`Congress API error: ${votesResponse.status}`);
            }
            const data = await votesResponse.json();
            const votesData = data;
            const votingRecords = [];
            for (const vote of votesData.votes || []) {
                votingRecords.push({
                    voteId: vote.rollCall?.number || vote.url.split('/').pop(),
                    billNumber: vote.bill?.number,
                    question: vote.description || vote.question,
                    date: vote.date,
                    position: this.mapVotePosition(vote.position),
                    chamber: vote.chamber === 'House of Representatives' ? 'HOUSE' : 'SENATE',
                    passed: vote.result?.includes('Passed') || false,
                    yesCount: vote.yesCount || 0,
                    noCount: vote.noCount || 0
                });
            }
            // Cache for 1 hour
            await apiCache_1.ApiCacheService.set('voting_records', cacheKey, votingRecords, 60);
            return votingRecords;
        }
        catch (error) {
            logger_1.logger.error({ error, bioguideId }, 'Failed to get voting records');
            return [];
        }
    }
    /**
     * Sync voting records for all legislators
     */
    static async syncVotingRecords(chamber) {
        if (!CONGRESS_API_KEY) {
            logger_1.logger.warn('Congress.gov API key not configured');
            return;
        }
        try {
            // Get recent roll call votes
            const year = new Date().getFullYear();
            let apiUrl = `https://api.congress.gov/v3/vote/${year}?api_key=${CONGRESS_API_KEY}&format=json&limit=100`;
            if (chamber) {
                apiUrl += `&chamber=${chamber.toLowerCase()}`;
            }
            const votesResponse = await fetch(apiUrl);
            if (!votesResponse.ok) {
                throw new Error(`Congress API error: ${votesResponse.status}`);
            }
            const data = await votesResponse.json();
            const syncVotesData = data;
            for (const vote of syncVotesData.votes || []) {
                await this.processVote(vote);
            }
            logger_1.logger.info({ count: syncVotesData.votes?.length || 0, chamber }, 'Synced voting records');
        }
        catch (error) {
            logger_1.logger.error({ error, chamber }, 'Failed to sync voting records');
        }
    }
    /**
     * Get bills and legislation
     */
    static async syncBills(congress = '118', limit = 100) {
        if (!CONGRESS_API_KEY) {
            logger_1.logger.warn('Congress.gov API key not configured');
            return;
        }
        const cacheKey = `bills_${congress}_recent`;
        try {
            const billsResponse = await fetch(`https://api.congress.gov/v3/bill/${congress}?api_key=${CONGRESS_API_KEY}&format=json&limit=${limit}`);
            if (!billsResponse.ok) {
                throw new Error(`Congress API error: ${billsResponse.status}`);
            }
            const data = await billsResponse.json();
            // Get legislature record
            const legislature = await prisma_1.prisma.legislature.findFirst({
                where: {
                    level: 'FEDERAL',
                    session: `${congress}th`
                }
            });
            if (!legislature) {
                logger_1.logger.warn({ congress }, 'Legislature record not found for Congress');
                return;
            }
            const billsData = data;
            for (const bill of billsData.bills || []) {
                await this.processBill(bill, legislature.id);
            }
            logger_1.logger.info({ count: billsData.bills?.length || 0, congress }, 'Synced bills');
        }
        catch (error) {
            logger_1.logger.error({ error, congress }, 'Failed to sync bills');
        }
    }
    /**
     * Calculate voting statistics for a legislator
     */
    static async calculateVotingStatistics(membershipId) {
        try {
            const membership = await prisma_1.prisma.legislativeMembership.findUnique({
                where: { id: membershipId },
                include: { votes: true }
            });
            if (!membership) {
                logger_1.logger.warn({ membershipId }, 'Membership not found');
                return;
            }
            const votes = membership.votes;
            const totalVotes = votes.length;
            if (totalVotes === 0) {
                return;
            }
            const yesVotes = votes.filter(v => v.position === 'YEA').length;
            const noVotes = votes.filter(v => v.position === 'NAY').length;
            const presentVotes = votes.filter(v => v.position === 'PRESENT').length;
            const notVotingCount = votes.filter(v => v.position === 'NOT_VOTING').length;
            const abstainVotes = votes.filter(v => v.position === 'ABSTAIN').length;
            const participationRate = ((totalVotes - notVotingCount) / totalVotes) * 100;
            // Update or create voting summary
            await prisma_1.prisma.votingRecordSummary.upsert({
                where: { membershipId },
                create: {
                    membershipId,
                    totalVotes,
                    yesVotes,
                    noVotes,
                    presentVotes,
                    notVotingCount,
                    abstainVotes,
                    participationRate,
                    periodStart: membership.startDate,
                    periodEnd: membership.endDate || new Date(),
                    lastCalculated: new Date()
                },
                update: {
                    totalVotes,
                    yesVotes,
                    noVotes,
                    presentVotes,
                    notVotingCount,
                    abstainVotes,
                    participationRate,
                    lastCalculated: new Date()
                }
            });
            logger_1.logger.info({ membershipId }, 'Updated voting statistics for membership');
        }
        catch (error) {
            logger_1.logger.error({ error, membershipId }, 'Failed to calculate voting statistics');
        }
    }
    // Private helper methods
    static async processFederalLegislator(member, legislatureId) {
        try {
            const bioguideId = member.bioguideId;
            const chamber = member.terms?.[0]?.chamber === 'House of Representatives' ? 'HOUSE' : 'SENATE';
            const district = member.terms?.[0]?.district;
            const party = member.partyName;
            const state = member.terms?.[0]?.stateCode;
            await prisma_1.prisma.legislativeMembership.upsert({
                where: {
                    bioguideId_legislatureId: {
                        bioguideId: bioguideId,
                        legislatureId: legislatureId
                    }
                },
                create: {
                    legislatorId: bioguideId, // We'll link this to our official records later
                    legislatureId,
                    district,
                    party,
                    startDate: new Date(member.terms?.[0]?.startYear + '-01-01'),
                    endDate: member.terms?.[0]?.endYear ? new Date(member.terms[0].endYear + '-01-01') : undefined,
                    bioguideId,
                    isActive: true
                },
                update: {
                    party,
                    district,
                    isActive: true
                }
            });
        }
        catch (error) {
            logger_1.logger.error({ error, bioguideId: member.bioguideId }, 'Failed to process federal legislator');
        }
    }
    static async processStateLegislator(person, legislatureId, state) {
        try {
            const chamber = person.current_role?.chamber === 'upper' ? 'SENATE' : 'HOUSE';
            const district = person.current_role?.district;
            const party = person.current_role?.party;
            await prisma_1.prisma.legislativeMembership.upsert({
                where: {
                    openStatesId_legislatureId: {
                        openStatesId: person.id,
                        legislatureId: legislatureId
                    }
                },
                create: {
                    legislatorId: person.id,
                    legislatureId,
                    district,
                    party,
                    startDate: person.current_role?.start_date ? new Date(person.current_role.start_date) : new Date(),
                    endDate: person.current_role?.end_date ? new Date(person.current_role.end_date) : undefined,
                    isActive: true
                },
                update: {
                    party,
                    district,
                    isActive: true
                }
            });
        }
        catch (error) {
            logger_1.logger.error({ error, personId: person.id }, 'Failed to process state legislator');
        }
    }
    static async processVote(voteData) {
        try {
            const chamber = voteData.chamber === 'House of Representatives' ? 'HOUSE' : 'SENATE';
            const voteId = `${voteData.congress}-${chamber}-${voteData.number}`;
            // Find the legislature
            const legislature = await prisma_1.prisma.legislature.findFirst({
                where: {
                    level: 'FEDERAL',
                    session: `${voteData.congress}th`
                }
            });
            if (!legislature) {
                logger_1.logger.warn({ congress: voteData.congress }, 'Legislature not found for congress');
                return;
            }
            // Create or update vote record
            await prisma_1.prisma.vote.upsert({
                where: {
                    externalId_chamber: {
                        externalId: voteId,
                        chamber: chamber
                    }
                },
                create: {
                    externalId: voteId,
                    number: voteData.number,
                    question: voteData.question || voteData.description,
                    description: voteData.description,
                    date: new Date(voteData.date),
                    chamber,
                    yesCount: voteData.totals?.yes || 0,
                    noCount: voteData.totals?.no || 0,
                    presentCount: voteData.totals?.present || 0,
                    notVotingCount: voteData.totals?.notVoting || 0,
                    passed: voteData.result?.includes('Passed') || false,
                    legislatureId: legislature.id,
                    dataSource: 'congress_gov',
                    apiUrl: voteData.url
                },
                update: {
                    question: voteData.question || voteData.description,
                    description: voteData.description,
                    yesCount: voteData.totals?.yes || 0,
                    noCount: voteData.totals?.no || 0,
                    presentCount: voteData.totals?.present || 0,
                    notVotingCount: voteData.totals?.notVoting || 0,
                    passed: voteData.result?.includes('Passed') || false,
                    lastSynced: new Date()
                }
            });
            logger_1.logger.debug({ voteId }, 'Processed vote');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to process vote');
        }
    }
    static async processBill(billData, legislatureId) {
        try {
            const billId = `${billData.type.toLowerCase()}${billData.number}-${billData.congress}`;
            const chamber = billData.originChamber === 'House' ? 'HOUSE' : 'SENATE';
            await prisma_1.prisma.bill.upsert({
                where: {
                    externalId_level: {
                        externalId: billId,
                        level: 'FEDERAL'
                    }
                },
                create: {
                    externalId: billId,
                    number: `${billData.type} ${billData.number}`,
                    title: billData.title,
                    summary: billData.summary?.text,
                    status: this.mapBillStatus(billData.latestAction?.text),
                    introducedDate: new Date(billData.introducedDate),
                    lastActionDate: billData.latestAction?.actionDate ? new Date(billData.latestAction.actionDate) : undefined,
                    chamber,
                    level: 'FEDERAL',
                    subjects: billData.subjects || [],
                    policyAreas: billData.policyArea ? [billData.policyArea.name] : [],
                    dataSource: 'congress_gov',
                    apiUrl: billData.url,
                    legislatureId
                },
                update: {
                    title: billData.title,
                    summary: billData.summary?.text,
                    status: this.mapBillStatus(billData.latestAction?.text),
                    lastActionDate: billData.latestAction?.actionDate ? new Date(billData.latestAction.actionDate) : undefined,
                    subjects: billData.subjects || [],
                    policyAreas: billData.policyArea ? [billData.policyArea.name] : [],
                    lastSynced: new Date()
                }
            });
            logger_1.logger.debug({ billId }, 'Processed bill');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to process bill');
        }
    }
    static mapVotePosition(position) {
        switch (position?.toLowerCase()) {
            case 'yes':
            case 'yea':
            case 'aye':
                return 'YEA';
            case 'no':
            case 'nay':
                return 'NAY';
            case 'present':
                return 'PRESENT';
            case 'not voting':
            case 'not_voting':
                return 'NOT_VOTING';
            default:
                return 'ABSTAIN';
        }
    }
    static mapBillStatus(latestAction) {
        if (!latestAction)
            return 'INTRODUCED';
        const action = latestAction.toLowerCase();
        if (action.includes('introduced'))
            return 'INTRODUCED';
        if (action.includes('committee'))
            return 'COMMITTEE';
        if (action.includes('floor') || action.includes('vote'))
            return 'FLOOR_VOTE';
        if (action.includes('passed'))
            return 'PASSED_CHAMBER';
        if (action.includes('sent to') || action.includes('received in'))
            return 'SENT_TO_OTHER_CHAMBER';
        if (action.includes('enrolled'))
            return 'PASSED_BOTH';
        if (action.includes('presented to president'))
            return 'SENT_TO_EXECUTIVE';
        if (action.includes('signed by president'))
            return 'SIGNED';
        if (action.includes('became public law'))
            return 'BECAME_LAW';
        if (action.includes('vetoed'))
            return 'VETOED';
        return 'INTRODUCED';
    }
}
exports.LegislativeDataService = LegislativeDataService;
//# sourceMappingURL=legislativeDataService.js.map