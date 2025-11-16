"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedCandidateService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
class EnhancedCandidateService {
    /**
     * Get enhanced candidate profile with photos and AI-analyzed positions
     */
    static async getCandidateProfile(candidateId) {
        try {
            logger_1.logger.info({ candidateId }, 'Loading enhanced profile for candidate');
            const candidate = await prisma_1.prisma.candidate.findUnique({
                where: { id: candidateId },
                include: {
                    office: {
                        include: {
                            election: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    },
                    financialData: true,
                    endorsements: {
                        where: { isPublic: true },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    firstName: true,
                                    lastName: true
                                }
                            }
                        }
                    }
                }
            });
            if (!candidate) {
                return null;
            }
            // Photos functionality removed - PhotoService deleted
            const photos = {
                avatar: undefined,
                campaignHeadshot: undefined,
                gallery: []
            };
            // Get AI-analyzed policy positions
            let policyPositions = [];
            try {
                logger_1.logger.debug('Analyzing candidate policy positions');
                // AI policy analysis now handled by individual policy creation process
                policyPositions = [];
            }
            catch (error) {
                logger_1.logger.warn({ error }, 'Policy position analysis failed, continuing without AI analysis');
            }
            const profile = {
                id: candidate.id,
                name: candidate.name,
                party: candidate.party || undefined,
                isIncumbent: candidate.isIncumbent,
                campaignWebsite: candidate.campaignWebsite || undefined,
                campaignEmail: candidate.campaignEmail || undefined,
                platformSummary: candidate.platformSummary || undefined,
                keyIssues: candidate.keyIssues,
                isVerified: candidate.isVerified,
                photos,
                policyPositions,
                office: {
                    id: candidate.office.id,
                    title: candidate.office.title,
                    level: candidate.office.level,
                    description: candidate.office.description || undefined
                },
                election: {
                    id: candidate.office.election.id,
                    name: candidate.office.election.name,
                    date: candidate.office.election.date,
                    type: candidate.office.election.type
                }
            };
            logger_1.logger.info({ candidateId, candidateName: candidate.name }, 'Enhanced profile loaded for candidate');
            return profile;
        }
        catch (error) {
            logger_1.logger.error({ error, candidateId }, 'Failed to load candidate profile');
            return null;
        }
    }
    /**
     * Compare multiple candidates using AI-powered analysis
     */
    static async compareCandidates(candidateIds, officeId) {
        try {
            logger_1.logger.info({ candidateCount: candidateIds.length, officeId }, 'Creating AI-powered comparison of candidates');
            if (candidateIds.length < 2) {
                throw new Error('At least 2 candidates required for comparison');
            }
            // Load candidate profiles
            const candidates = await Promise.all(candidateIds.map(id => this.getCandidateProfile(id)));
            const validCandidates = candidates.filter(c => c !== null);
            if (validCandidates.length < 2) {
                throw new Error('Could not load enough valid candidate profiles for comparison');
            }
            // Use Qwen3 for intelligent comparison
            let comparison;
            try {
                logger_1.logger.debug('Generating AI-powered candidate comparison');
                // TODO: Implement candidate comparison using Azure OpenAI
                comparison = {
                    candidates: validCandidates.map(c => ({ id: c.id, name: c.name, party: c.party })),
                    sharedIssues: [],
                    uniqueIssues: [],
                    overallSummary: 'Candidate comparison temporarily disabled - migrating from Qwen to Azure OpenAI'
                };
            }
            catch (error) {
                logger_1.logger.warn({ error }, 'AI comparison failed, generating fallback comparison');
                comparison = this.generateFallbackComparison(validCandidates);
            }
            const result = {
                candidates: validCandidates,
                comparison: {
                    sharedIssues: comparison.sharedIssues.map(issue => ({
                        issue: issue.issue,
                        positions: issue.positions.map(pos => {
                            const candidate = validCandidates.find(c => c.id === pos.candidateId);
                            return {
                                candidateId: pos.candidateId,
                                candidateName: candidate?.name || 'Unknown',
                                position: pos.position,
                                stance: pos.stance,
                                confidence: pos.confidence
                            };
                        }),
                        agreement: issue.agreement,
                        summary: issue.summary
                    })),
                    uniqueIssues: comparison.uniqueIssues.map(ui => {
                        const candidate = validCandidates.find(c => c.id === ui.candidateId);
                        return {
                            candidateId: ui.candidateId,
                            candidateName: candidate?.name || 'Unknown',
                            issues: ui.issues
                        };
                    }),
                    overallSummary: comparison.overallSummary,
                    generatedAt: new Date()
                }
            };
            logger_1.logger.info({ candidateCount: validCandidates.length }, 'Comparison complete for candidates');
            return result;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Candidate comparison failed');
            return null;
        }
    }
    /**
     * Get candidates by office with enhanced data
     */
    static async getCandidatesByOffice(officeId, includeAnalysis = true) {
        try {
            const candidates = await prisma_1.prisma.candidate.findMany({
                where: {
                    officeId,
                    isWithdrawn: false
                },
                include: {
                    office: {
                        include: {
                            election: true
                        }
                    }
                },
                orderBy: [
                    { isIncumbent: 'desc' },
                    { name: 'asc' }
                ]
            });
            const profiles = await Promise.all(candidates.map(async (candidate) => {
                if (includeAnalysis) {
                    return await this.getCandidateProfile(candidate.id);
                }
                else {
                    // Return basic profile without AI analysis for performance
                    return this.buildBasicProfile(candidate);
                }
            }));
            return profiles.filter(p => p !== null);
        }
        catch (error) {
            logger_1.logger.error({ error, officeId }, 'Failed to get candidates for office');
            return [];
        }
    }
    /**
     * Search candidates with enhanced filtering
     */
    static async searchCandidates(params) {
        try {
            const { query, state, party, office, isIncumbent, limit = 20 } = params;
            const where = {
                isWithdrawn: false
            };
            if (query) {
                where.OR = [
                    { name: { contains: query, mode: 'insensitive' } },
                    { platformSummary: { contains: query, mode: 'insensitive' } }
                ];
            }
            if (party) {
                where.party = { contains: party, mode: 'insensitive' };
            }
            if (isIncumbent !== undefined) {
                where.isIncumbent = isIncumbent;
            }
            if (state || office) {
                where.office = {};
                if (state)
                    where.office.state = state.toUpperCase();
                if (office)
                    where.office.title = { contains: office, mode: 'insensitive' };
            }
            const candidates = await prisma_1.prisma.candidate.findMany({
                where,
                include: {
                    office: {
                        include: {
                            election: true
                        }
                    }
                },
                take: limit,
                orderBy: [
                    { isVerified: 'desc' },
                    { isIncumbent: 'desc' },
                    { name: 'asc' }
                ]
            });
            // Return basic profiles for search results (no AI analysis for performance)
            const profiles = await Promise.all(candidates.map(candidate => this.buildBasicProfile(candidate)));
            return profiles.filter(p => p !== null);
        }
        catch (error) {
            logger_1.logger.error({ error, params }, 'Candidate search failed');
            return [];
        }
    }
    /**
     * Update candidate policy positions (for candidates updating their own profiles)
     */
    static async updateCandidatePlatform(candidateId, updates) {
        try {
            await prisma_1.prisma.candidate.update({
                where: { id: candidateId },
                data: {
                    ...updates,
                    updatedAt: new Date()
                }
            });
            logger_1.logger.info({ candidateId }, 'Updated platform for candidate');
            // Trigger re-analysis of policy positions
            try {
                // Policy analysis now handled during individual policy creation
                logger_1.logger.debug('Policy positions will be analyzed when created/updated');
                logger_1.logger.debug('Policy positions re-analyzed');
            }
            catch (error) {
                logger_1.logger.warn({ error }, 'Policy re-analysis failed');
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, candidateId }, 'Failed to update candidate platform');
            return false;
        }
    }
    // Private helper methods
    static async buildBasicProfile(candidate) {
        // Photos functionality removed - PhotoService deleted
        const photos = {
            avatar: undefined,
            campaignHeadshot: undefined,
            gallery: []
        };
        return {
            id: candidate.id,
            name: candidate.name,
            party: candidate.party || undefined,
            isIncumbent: candidate.isIncumbent,
            campaignWebsite: candidate.campaignWebsite || undefined,
            campaignEmail: candidate.campaignEmail || undefined,
            platformSummary: candidate.platformSummary || undefined,
            keyIssues: candidate.keyIssues,
            isVerified: candidate.isVerified,
            photos,
            office: {
                id: candidate.office.id,
                title: candidate.office.title,
                level: candidate.office.level,
                description: candidate.office.description || undefined
            },
            election: {
                id: candidate.office.election.id,
                name: candidate.office.election.name,
                date: candidate.office.election.date,
                type: candidate.office.election.type
            }
        };
    }
    static generateFallbackComparison(candidates) {
        // Generate a basic comparison when AI analysis fails
        const sharedIssues = this.findSharedIssues(candidates);
        const uniqueIssues = this.findUniqueIssues(candidates);
        return {
            candidates: candidates.map(c => ({ id: c.id, name: c.name, party: c.party })),
            sharedIssues: sharedIssues.map(issue => ({
                issue,
                positions: candidates
                    .filter(c => c.keyIssues.some(ki => ki.toLowerCase().includes(issue.toLowerCase())))
                    .map(c => ({
                    candidateId: c.id,
                    position: c.platformSummary || 'No detailed position available',
                    stance: 'nuanced',
                    confidence: 0.5
                })),
                agreement: 'mixed',
                summary: `Candidates have different approaches to ${issue}.`
            })),
            uniqueIssues: uniqueIssues.map(ui => ({
                candidateId: ui.candidateId,
                issues: ui.issues.map(issue => ({
                    issue,
                    position: 'Position details not available',
                    defaultMessage: `${ui.candidateName} has not provided a position on ${issue}`
                }))
            })),
            overallSummary: `${candidates.length} candidates are running for this office with varying policy positions.`
        };
    }
    static findSharedIssues(candidates) {
        const allIssues = candidates.flatMap(c => c.keyIssues);
        const issueCounts = allIssues.reduce((acc, issue) => {
            const normalized = issue.toLowerCase().trim();
            acc[normalized] = (acc[normalized] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(issueCounts)
            .filter(([_, count]) => count > 1)
            .map(([issue, _]) => issue);
    }
    static findUniqueIssues(candidates) {
        const sharedIssues = this.findSharedIssues(candidates);
        return candidates.map(candidate => ({
            candidateId: candidate.id,
            candidateName: candidate.name,
            issues: candidate.keyIssues.filter(issue => !sharedIssues.some(shared => issue.toLowerCase().includes(shared.toLowerCase())))
        })).filter(ui => ui.issues.length > 0);
    }
    /**
     * Get candidate messaging inbox (for DM system integration)
     */
    static async getCandidateInbox(candidateId, userId) {
        // This will integrate with the messaging system we'll build next
        // For now, return placeholder
        return {
            candidateId,
            inboxUrl: `/messages/candidate/${candidateId}`,
            canMessage: true,
            messageCount: 0
        };
    }
}
exports.EnhancedCandidateService = EnhancedCandidateService;
//# sourceMappingURL=enhancedCandidateService.js.map