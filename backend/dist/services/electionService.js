"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElectionService = void 0;
const prisma_1 = require("../lib/prisma");
class ElectionService {
    /**
     * Get elections by user location
     */
    static async getElectionsByLocation(params) {
        const { state, level, includeUpcoming = true } = params;
        const where = {};
        if (state) {
            where.state = state.toUpperCase();
        }
        if (level) {
            where.level = level;
        }
        if (includeUpcoming) {
            where.date = {
                gte: new Date()
            };
        }
        where.isActive = true;
        return await prisma_1.prisma.election.findMany({
            where,
            include: {
                offices: {
                    include: {
                        candidates: {
                            where: { isWithdrawn: false },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        firstName: true,
                                        lastName: true,
                                        avatar: true
                                    }
                                },
                                financialData: true
                            }
                        }
                    }
                },
                ballotMeasures: true
            },
            orderBy: {
                date: 'asc'
            }
        });
    }
    /**
     * Get specific election with all details
     */
    static async getElectionById(electionId) {
        return await prisma_1.prisma.election.findUnique({
            where: { id: electionId },
            include: {
                offices: {
                    include: {
                        candidates: {
                            where: { isWithdrawn: false },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        firstName: true,
                                        lastName: true,
                                        avatar: true,
                                        verified: true
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
                        }
                    }
                },
                ballotMeasures: true
            }
        });
    }
    /**
     * Search candidates with filtering
     */
    static async searchCandidates(params) {
        const where = { isWithdrawn: false };
        if (params.officeId) {
            where.officeId = params.officeId;
        }
        if (params.party) {
            where.party = {
                contains: params.party,
                mode: 'insensitive'
            };
        }
        if (params.isIncumbent !== undefined) {
            where.isIncumbent = params.isIncumbent;
        }
        // If electionId is provided, filter by offices in that election
        if (params.electionId) {
            where.office = {
                electionId: params.electionId
            };
        }
        return await prisma_1.prisma.candidate.findMany({
            where,
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
                        avatar: true,
                        verified: true
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
            },
            orderBy: [
                { isIncumbent: 'desc' },
                { name: 'asc' }
            ]
        });
    }
    /**
     * Create or update candidate profile for a platform user
     */
    static async createCandidateProfile(userId, candidateData) {
        // Check if user is already a candidate for any active office
        const existingCandidate = await prisma_1.prisma.candidate.findFirst({
            where: {
                userId,
                isWithdrawn: false,
                office: {
                    election: {
                        date: { gte: new Date() },
                        isActive: true
                    }
                }
            }
        });
        if (existingCandidate) {
            throw new Error('User is already registered as a candidate for an active election');
        }
        // Verify the office exists and election is active
        const office = await prisma_1.prisma.office.findUnique({
            where: { id: candidateData.officeId },
            include: { election: true }
        });
        if (!office) {
            throw new Error('Office not found');
        }
        if (!office.election.isActive) {
            throw new Error('Election is not active for candidate registration');
        }
        if (office.election.date < new Date()) {
            throw new Error('Cannot register for past elections');
        }
        // Create candidate profile
        const candidate = await prisma_1.prisma.candidate.create({
            data: {
                userId,
                name: candidateData.name,
                party: candidateData.party,
                officeId: candidateData.officeId,
                platformSummary: candidateData.platformSummary,
                keyIssues: candidateData.keyIssues || [],
                campaignWebsite: candidateData.campaignWebsite,
                campaignEmail: candidateData.campaignEmail,
                campaignPhone: candidateData.campaignPhone
            },
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
                        lastName: true
                    }
                }
            }
        });
        // Update user's political profile type if they're not already a candidate
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                politicalProfileType: 'CANDIDATE'
            }
        });
        return candidate;
    }
    /**
     * Update candidate platform and information
     */
    static async updateCandidateProfile(candidateId, userId, updates) {
        // Verify user owns this candidate profile
        const candidate = await prisma_1.prisma.candidate.findFirst({
            where: {
                id: candidateId,
                userId,
                isWithdrawn: false
            }
        });
        if (!candidate) {
            throw new Error('Candidate profile not found or access denied');
        }
        return await prisma_1.prisma.candidate.update({
            where: { id: candidateId },
            data: updates,
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
                        lastName: true
                    }
                }
            }
        });
    }
    /**
     * Withdraw candidacy
     */
    static async withdrawCandidacy(candidateId, userId, reason) {
        const candidate = await prisma_1.prisma.candidate.findFirst({
            where: {
                id: candidateId,
                userId,
                isWithdrawn: false
            }
        });
        if (!candidate) {
            throw new Error('Candidate profile not found or access denied');
        }
        return await prisma_1.prisma.candidate.update({
            where: { id: candidateId },
            data: {
                isWithdrawn: true,
                withdrawnAt: new Date(),
                withdrawnReason: reason
            }
        });
    }
    /**
     * Endorse a candidate
     */
    static async endorseCandidate(userId, candidateId, reason, isPublic = false) {
        // Check if user has already endorsed this candidate
        const existingEndorsement = await prisma_1.prisma.endorsement.findUnique({
            where: {
                userId_candidateId: {
                    userId,
                    candidateId
                }
            }
        });
        if (existingEndorsement) {
            // Update existing endorsement
            return await prisma_1.prisma.endorsement.update({
                where: {
                    id: existingEndorsement.id
                },
                data: {
                    reason,
                    isPublic
                },
                include: {
                    candidate: {
                        include: {
                            office: {
                                include: {
                                    election: true
                                }
                            }
                        }
                    }
                }
            });
        }
        // Create new endorsement
        return await prisma_1.prisma.endorsement.create({
            data: {
                userId,
                candidateId,
                reason,
                isPublic
            },
            include: {
                candidate: {
                    include: {
                        office: {
                            include: {
                                election: true
                            }
                        }
                    }
                }
            }
        });
    }
    /**
     * Remove endorsement
     */
    static async removeEndorsement(userId, candidateId) {
        const endorsement = await prisma_1.prisma.endorsement.findUnique({
            where: {
                userId_candidateId: {
                    userId,
                    candidateId
                }
            }
        });
        if (!endorsement) {
            throw new Error('Endorsement not found');
        }
        return await prisma_1.prisma.endorsement.delete({
            where: { id: endorsement.id }
        });
    }
    /**
     * Get candidate comparison data
     */
    static async compareCandidates(candidateIds) {
        if (candidateIds.length < 2) {
            throw new Error('At least 2 candidates required for comparison');
        }
        return await prisma_1.prisma.candidate.findMany({
            where: {
                id: { in: candidateIds },
                isWithdrawn: false
            },
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
                        avatar: true,
                        verified: true
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
    }
}
exports.ElectionService = ElectionService;
//# sourceMappingURL=electionService.js.map