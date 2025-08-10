interface ElectionSearchParams {
    state?: string;
    zipCode?: string;
    level?: 'FEDERAL' | 'STATE' | 'LOCAL' | 'MUNICIPAL';
    includeUpcoming?: boolean;
}
interface CandidateSearchParams {
    officeId?: string;
    electionId?: string;
    party?: string;
    isIncumbent?: boolean;
}
export declare class ElectionService {
    /**
     * Get elections by user location
     */
    static getElectionsByLocation(params: ElectionSearchParams): Promise<({
        offices: ({
            candidates: ({
                user: {
                    id: string;
                    username: string;
                    firstName: string;
                    lastName: string;
                    avatar: string;
                };
                financialData: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    candidateId: string;
                    lastUpdated: Date;
                    totalRaised: import("@prisma/client/runtime/library").Decimal;
                    totalSpent: import("@prisma/client/runtime/library").Decimal;
                    cashOnHand: import("@prisma/client/runtime/library").Decimal;
                    debts: import("@prisma/client/runtime/library").Decimal;
                    individualDonations: import("@prisma/client/runtime/library").Decimal;
                    pacDonations: import("@prisma/client/runtime/library").Decimal;
                    selfFunding: import("@prisma/client/runtime/library").Decimal;
                    publicFunding: import("@prisma/client/runtime/library").Decimal;
                    reportingPeriod: string | null;
                    sourceUrl: string | null;
                };
            } & {
                userId: string | null;
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                campaignWebsite: string | null;
                name: string;
                withdrawnAt: Date | null;
                party: string | null;
                isIncumbent: boolean;
                campaignEmail: string | null;
                campaignPhone: string | null;
                platformSummary: string | null;
                keyIssues: string[];
                isVerified: boolean;
                isWithdrawn: boolean;
                withdrawnReason: string | null;
                officeId: string;
            })[];
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            description: string | null;
            district: string | null;
            title: string;
            jurisdiction: string | null;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            electionId: string;
        })[];
        ballotMeasures: {
            number: string | null;
            type: import(".prisma/client").$Enums.BallotMeasureType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            city: string | null;
            state: string;
            description: string;
            county: string | null;
            title: string;
            electionId: string;
            fullText: string | null;
            fiscalImpact: string | null;
            arguments: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        type: import(".prisma/client").$Enums.ElectionType;
        level: import(".prisma/client").$Enums.ElectionLevel;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        name: string;
        description: string | null;
        date: Date;
        isActive: boolean;
        district: string | null;
        registrationDeadline: Date | null;
        county: string | null;
        officialUrl: string | null;
    })[]>;
    /**
     * Get specific election with all details
     */
    static getElectionById(electionId: string): Promise<{
        offices: ({
            candidates: ({
                endorsements: ({
                    user: {
                        id: string;
                        username: string;
                        firstName: string;
                        lastName: string;
                    };
                } & {
                    userId: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    reason: string | null;
                    candidateId: string;
                    isPublic: boolean;
                })[];
                user: {
                    id: string;
                    username: string;
                    firstName: string;
                    lastName: string;
                    avatar: string;
                    verified: boolean;
                };
                financialData: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    candidateId: string;
                    lastUpdated: Date;
                    totalRaised: import("@prisma/client/runtime/library").Decimal;
                    totalSpent: import("@prisma/client/runtime/library").Decimal;
                    cashOnHand: import("@prisma/client/runtime/library").Decimal;
                    debts: import("@prisma/client/runtime/library").Decimal;
                    individualDonations: import("@prisma/client/runtime/library").Decimal;
                    pacDonations: import("@prisma/client/runtime/library").Decimal;
                    selfFunding: import("@prisma/client/runtime/library").Decimal;
                    publicFunding: import("@prisma/client/runtime/library").Decimal;
                    reportingPeriod: string | null;
                    sourceUrl: string | null;
                };
            } & {
                userId: string | null;
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                campaignWebsite: string | null;
                name: string;
                withdrawnAt: Date | null;
                party: string | null;
                isIncumbent: boolean;
                campaignEmail: string | null;
                campaignPhone: string | null;
                platformSummary: string | null;
                keyIssues: string[];
                isVerified: boolean;
                isWithdrawn: boolean;
                withdrawnReason: string | null;
                officeId: string;
            })[];
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            description: string | null;
            district: string | null;
            title: string;
            jurisdiction: string | null;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            electionId: string;
        })[];
        ballotMeasures: {
            number: string | null;
            type: import(".prisma/client").$Enums.BallotMeasureType;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            city: string | null;
            state: string;
            description: string;
            county: string | null;
            title: string;
            electionId: string;
            fullText: string | null;
            fiscalImpact: string | null;
            arguments: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    } & {
        type: import(".prisma/client").$Enums.ElectionType;
        level: import(".prisma/client").$Enums.ElectionLevel;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        name: string;
        description: string | null;
        date: Date;
        isActive: boolean;
        district: string | null;
        registrationDeadline: Date | null;
        county: string | null;
        officialUrl: string | null;
    }>;
    /**
     * Search candidates with filtering
     */
    static searchCandidates(params: CandidateSearchParams): Promise<({
        office: {
            election: {
                type: import(".prisma/client").$Enums.ElectionType;
                level: import(".prisma/client").$Enums.ElectionLevel;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                name: string;
                description: string | null;
                date: Date;
                isActive: boolean;
                district: string | null;
                registrationDeadline: Date | null;
                county: string | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            description: string | null;
            district: string | null;
            title: string;
            jurisdiction: string | null;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            electionId: string;
        };
        endorsements: ({
            user: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            reason: string | null;
            candidateId: string;
            isPublic: boolean;
        })[];
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
            verified: boolean;
        };
        financialData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            candidateId: string;
            lastUpdated: Date;
            totalRaised: import("@prisma/client/runtime/library").Decimal;
            totalSpent: import("@prisma/client/runtime/library").Decimal;
            cashOnHand: import("@prisma/client/runtime/library").Decimal;
            debts: import("@prisma/client/runtime/library").Decimal;
            individualDonations: import("@prisma/client/runtime/library").Decimal;
            pacDonations: import("@prisma/client/runtime/library").Decimal;
            selfFunding: import("@prisma/client/runtime/library").Decimal;
            publicFunding: import("@prisma/client/runtime/library").Decimal;
            reportingPeriod: string | null;
            sourceUrl: string | null;
        };
    } & {
        userId: string | null;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        name: string;
        withdrawnAt: Date | null;
        party: string | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isVerified: boolean;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        officeId: string;
    })[]>;
    /**
     * Create or update candidate profile for a platform user
     */
    static createCandidateProfile(userId: string, candidateData: {
        name: string;
        party?: string;
        officeId: string;
        platformSummary?: string;
        keyIssues?: string[];
        campaignWebsite?: string;
        campaignEmail?: string;
        campaignPhone?: string;
    }): Promise<{
        office: {
            election: {
                type: import(".prisma/client").$Enums.ElectionType;
                level: import(".prisma/client").$Enums.ElectionLevel;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                name: string;
                description: string | null;
                date: Date;
                isActive: boolean;
                district: string | null;
                registrationDeadline: Date | null;
                county: string | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            description: string | null;
            district: string | null;
            title: string;
            jurisdiction: string | null;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            electionId: string;
        };
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
        };
    } & {
        userId: string | null;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        name: string;
        withdrawnAt: Date | null;
        party: string | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isVerified: boolean;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        officeId: string;
    }>;
    /**
     * Update candidate platform and information
     */
    static updateCandidateProfile(candidateId: string, userId: string, updates: {
        platformSummary?: string;
        keyIssues?: string[];
        campaignWebsite?: string;
        campaignEmail?: string;
        campaignPhone?: string;
    }): Promise<{
        office: {
            election: {
                type: import(".prisma/client").$Enums.ElectionType;
                level: import(".prisma/client").$Enums.ElectionLevel;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                name: string;
                description: string | null;
                date: Date;
                isActive: boolean;
                district: string | null;
                registrationDeadline: Date | null;
                county: string | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            description: string | null;
            district: string | null;
            title: string;
            jurisdiction: string | null;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            electionId: string;
        };
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
        };
    } & {
        userId: string | null;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        name: string;
        withdrawnAt: Date | null;
        party: string | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isVerified: boolean;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        officeId: string;
    }>;
    /**
     * Withdraw candidacy
     */
    static withdrawCandidacy(candidateId: string, userId: string, reason?: string): Promise<{
        userId: string | null;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        name: string;
        withdrawnAt: Date | null;
        party: string | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isVerified: boolean;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        officeId: string;
    }>;
    /**
     * Endorse a candidate
     */
    static endorseCandidate(userId: string, candidateId: string, reason?: string, isPublic?: boolean): Promise<{
        candidate: {
            office: {
                election: {
                    type: import(".prisma/client").$Enums.ElectionType;
                    level: import(".prisma/client").$Enums.ElectionLevel;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    city: string | null;
                    state: string;
                    name: string;
                    description: string | null;
                    date: Date;
                    isActive: boolean;
                    district: string | null;
                    registrationDeadline: Date | null;
                    county: string | null;
                    officialUrl: string | null;
                };
            } & {
                level: import(".prisma/client").$Enums.OfficeLevel;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                state: string;
                description: string | null;
                district: string | null;
                title: string;
                jurisdiction: string | null;
                termLength: number | null;
                salary: import("@prisma/client/runtime/library").Decimal | null;
                electionId: string;
            };
        } & {
            userId: string | null;
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            campaignWebsite: string | null;
            name: string;
            withdrawnAt: Date | null;
            party: string | null;
            isIncumbent: boolean;
            campaignEmail: string | null;
            campaignPhone: string | null;
            platformSummary: string | null;
            keyIssues: string[];
            isVerified: boolean;
            isWithdrawn: boolean;
            withdrawnReason: string | null;
            officeId: string;
        };
    } & {
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
        candidateId: string;
        isPublic: boolean;
    }>;
    /**
     * Remove endorsement
     */
    static removeEndorsement(userId: string, candidateId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        reason: string | null;
        candidateId: string;
        isPublic: boolean;
    }>;
    /**
     * Get candidate comparison data
     */
    static compareCandidates(candidateIds: string[]): Promise<({
        office: {
            election: {
                type: import(".prisma/client").$Enums.ElectionType;
                level: import(".prisma/client").$Enums.ElectionLevel;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                name: string;
                description: string | null;
                date: Date;
                isActive: boolean;
                district: string | null;
                registrationDeadline: Date | null;
                county: string | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            description: string | null;
            district: string | null;
            title: string;
            jurisdiction: string | null;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            electionId: string;
        };
        endorsements: ({
            user: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
            };
        } & {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            reason: string | null;
            candidateId: string;
            isPublic: boolean;
        })[];
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
            verified: boolean;
        };
        financialData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            candidateId: string;
            lastUpdated: Date;
            totalRaised: import("@prisma/client/runtime/library").Decimal;
            totalSpent: import("@prisma/client/runtime/library").Decimal;
            cashOnHand: import("@prisma/client/runtime/library").Decimal;
            debts: import("@prisma/client/runtime/library").Decimal;
            individualDonations: import("@prisma/client/runtime/library").Decimal;
            pacDonations: import("@prisma/client/runtime/library").Decimal;
            selfFunding: import("@prisma/client/runtime/library").Decimal;
            publicFunding: import("@prisma/client/runtime/library").Decimal;
            reportingPeriod: string | null;
            sourceUrl: string | null;
        };
    } & {
        userId: string | null;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        name: string;
        withdrawnAt: Date | null;
        party: string | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isVerified: boolean;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        officeId: string;
    })[]>;
}
export {};
//# sourceMappingURL=electionService.d.ts.map