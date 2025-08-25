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
        ballotMeasures: {
            number: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            city: string | null;
            state: string;
            type: import(".prisma/client").$Enums.BallotMeasureType;
            description: string;
            county: string | null;
            title: string;
            electionId: string;
            fullText: string | null;
            fiscalImpact: string | null;
            arguments: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
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
                    sourceUrl: string | null;
                    totalRaised: import("@prisma/client/runtime/library").Decimal;
                    totalSpent: import("@prisma/client/runtime/library").Decimal;
                    cashOnHand: import("@prisma/client/runtime/library").Decimal;
                    debts: import("@prisma/client/runtime/library").Decimal;
                    individualDonations: import("@prisma/client/runtime/library").Decimal;
                    pacDonations: import("@prisma/client/runtime/library").Decimal;
                    selfFunding: import("@prisma/client/runtime/library").Decimal;
                    publicFunding: import("@prisma/client/runtime/library").Decimal;
                    reportingPeriod: string | null;
                    lastUpdated: Date;
                };
            } & {
                name: string;
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                campaignWebsite: string | null;
                userId: string | null;
                status: import(".prisma/client").$Enums.CandidateStatus;
                withdrawnAt: Date | null;
                party: string | null;
                officeId: string;
                isVerified: boolean;
                isIncumbent: boolean;
                campaignEmail: string | null;
                campaignPhone: string | null;
                platformSummary: string | null;
                keyIssues: string[];
                statusChangedAt: Date | null;
                statusChangedBy: string | null;
                statusReason: string | null;
                suspendedUntil: Date | null;
                appealDeadline: Date | null;
                appealNotes: string | null;
                isWithdrawn: boolean;
                withdrawnReason: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            description: string | null;
            level: import(".prisma/client").$Enums.OfficeLevel;
            title: string;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        district: string | null;
        isActive: boolean;
        type: import(".prisma/client").$Enums.ElectionType;
        description: string | null;
        level: import(".prisma/client").$Enums.ElectionLevel;
        county: string | null;
        date: Date;
        registrationDeadline: Date | null;
        officialUrl: string | null;
    })[]>;
    /**
     * Get specific election with all details
     */
    static getElectionById(electionId: string): Promise<{
        ballotMeasures: {
            number: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            city: string | null;
            state: string;
            type: import(".prisma/client").$Enums.BallotMeasureType;
            description: string;
            county: string | null;
            title: string;
            electionId: string;
            fullText: string | null;
            fiscalImpact: string | null;
            arguments: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        offices: ({
            candidates: ({
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
                    sourceUrl: string | null;
                    totalRaised: import("@prisma/client/runtime/library").Decimal;
                    totalSpent: import("@prisma/client/runtime/library").Decimal;
                    cashOnHand: import("@prisma/client/runtime/library").Decimal;
                    debts: import("@prisma/client/runtime/library").Decimal;
                    individualDonations: import("@prisma/client/runtime/library").Decimal;
                    pacDonations: import("@prisma/client/runtime/library").Decimal;
                    selfFunding: import("@prisma/client/runtime/library").Decimal;
                    publicFunding: import("@prisma/client/runtime/library").Decimal;
                    reportingPeriod: string | null;
                    lastUpdated: Date;
                };
                endorsements: ({
                    user: {
                        id: string;
                        username: string;
                        firstName: string;
                        lastName: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    reason: string | null;
                    candidateId: string;
                    isPublic: boolean;
                })[];
            } & {
                name: string;
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                campaignWebsite: string | null;
                userId: string | null;
                status: import(".prisma/client").$Enums.CandidateStatus;
                withdrawnAt: Date | null;
                party: string | null;
                officeId: string;
                isVerified: boolean;
                isIncumbent: boolean;
                campaignEmail: string | null;
                campaignPhone: string | null;
                platformSummary: string | null;
                keyIssues: string[];
                statusChangedAt: Date | null;
                statusChangedBy: string | null;
                statusReason: string | null;
                suspendedUntil: Date | null;
                appealDeadline: Date | null;
                appealNotes: string | null;
                isWithdrawn: boolean;
                withdrawnReason: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            description: string | null;
            level: import(".prisma/client").$Enums.OfficeLevel;
            title: string;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        district: string | null;
        isActive: boolean;
        type: import(".prisma/client").$Enums.ElectionType;
        description: string | null;
        level: import(".prisma/client").$Enums.ElectionLevel;
        county: string | null;
        date: Date;
        registrationDeadline: Date | null;
        officialUrl: string | null;
    }>;
    /**
     * Search candidates with filtering
     */
    static searchCandidates(params: CandidateSearchParams): Promise<({
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
            verified: boolean;
        };
        office: {
            election: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                type: import(".prisma/client").$Enums.ElectionType;
                description: string | null;
                level: import(".prisma/client").$Enums.ElectionLevel;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            description: string | null;
            level: import(".prisma/client").$Enums.OfficeLevel;
            title: string;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
        financialData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            candidateId: string;
            sourceUrl: string | null;
            totalRaised: import("@prisma/client/runtime/library").Decimal;
            totalSpent: import("@prisma/client/runtime/library").Decimal;
            cashOnHand: import("@prisma/client/runtime/library").Decimal;
            debts: import("@prisma/client/runtime/library").Decimal;
            individualDonations: import("@prisma/client/runtime/library").Decimal;
            pacDonations: import("@prisma/client/runtime/library").Decimal;
            selfFunding: import("@prisma/client/runtime/library").Decimal;
            publicFunding: import("@prisma/client/runtime/library").Decimal;
            reportingPeriod: string | null;
            lastUpdated: Date;
        };
        endorsements: ({
            user: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            reason: string | null;
            candidateId: string;
            isPublic: boolean;
        })[];
    } & {
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        userId: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        isVerified: boolean;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
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
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
        };
        office: {
            election: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                type: import(".prisma/client").$Enums.ElectionType;
                description: string | null;
                level: import(".prisma/client").$Enums.ElectionLevel;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            description: string | null;
            level: import(".prisma/client").$Enums.OfficeLevel;
            title: string;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
    } & {
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        userId: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        isVerified: boolean;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
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
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
        };
        office: {
            election: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                type: import(".prisma/client").$Enums.ElectionType;
                description: string | null;
                level: import(".prisma/client").$Enums.ElectionLevel;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            description: string | null;
            level: import(".prisma/client").$Enums.OfficeLevel;
            title: string;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
    } & {
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        userId: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        isVerified: boolean;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
    }>;
    /**
     * Withdraw candidacy
     */
    static withdrawCandidacy(candidateId: string, userId: string, reason?: string): Promise<{
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        userId: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        isVerified: boolean;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
    }>;
    /**
     * Endorse a candidate
     */
    static endorseCandidate(userId: string, candidateId: string, reason?: string, isPublic?: boolean): Promise<{
        candidate: {
            office: {
                election: {
                    name: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    city: string | null;
                    state: string;
                    district: string | null;
                    isActive: boolean;
                    type: import(".prisma/client").$Enums.ElectionType;
                    description: string | null;
                    level: import(".prisma/client").$Enums.ElectionLevel;
                    county: string | null;
                    date: Date;
                    registrationDeadline: Date | null;
                    officialUrl: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                state: string;
                district: string | null;
                description: string | null;
                level: import(".prisma/client").$Enums.OfficeLevel;
                title: string;
                termLength: number | null;
                salary: import("@prisma/client/runtime/library").Decimal | null;
                jurisdiction: string | null;
                electionId: string;
            };
        } & {
            name: string;
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            campaignWebsite: string | null;
            userId: string | null;
            status: import(".prisma/client").$Enums.CandidateStatus;
            withdrawnAt: Date | null;
            party: string | null;
            officeId: string;
            isVerified: boolean;
            isIncumbent: boolean;
            campaignEmail: string | null;
            campaignPhone: string | null;
            platformSummary: string | null;
            keyIssues: string[];
            statusChangedAt: Date | null;
            statusChangedBy: string | null;
            statusReason: string | null;
            suspendedUntil: Date | null;
            appealDeadline: Date | null;
            appealNotes: string | null;
            isWithdrawn: boolean;
            withdrawnReason: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        reason: string | null;
        candidateId: string;
        isPublic: boolean;
    }>;
    /**
     * Remove endorsement
     */
    static removeEndorsement(userId: string, candidateId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        reason: string | null;
        candidateId: string;
        isPublic: boolean;
    }>;
    /**
     * Get candidate comparison data
     */
    static compareCandidates(candidateIds: string[]): Promise<({
        user: {
            id: string;
            username: string;
            firstName: string;
            lastName: string;
            avatar: string;
            verified: boolean;
        };
        office: {
            election: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                type: import(".prisma/client").$Enums.ElectionType;
                description: string | null;
                level: import(".prisma/client").$Enums.ElectionLevel;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            description: string | null;
            level: import(".prisma/client").$Enums.OfficeLevel;
            title: string;
            termLength: number | null;
            salary: import("@prisma/client/runtime/library").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
        financialData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            candidateId: string;
            sourceUrl: string | null;
            totalRaised: import("@prisma/client/runtime/library").Decimal;
            totalSpent: import("@prisma/client/runtime/library").Decimal;
            cashOnHand: import("@prisma/client/runtime/library").Decimal;
            debts: import("@prisma/client/runtime/library").Decimal;
            individualDonations: import("@prisma/client/runtime/library").Decimal;
            pacDonations: import("@prisma/client/runtime/library").Decimal;
            selfFunding: import("@prisma/client/runtime/library").Decimal;
            publicFunding: import("@prisma/client/runtime/library").Decimal;
            reportingPeriod: string | null;
            lastUpdated: Date;
        };
        endorsements: ({
            user: {
                id: string;
                username: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            reason: string | null;
            candidateId: string;
            isPublic: boolean;
        })[];
    } & {
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        campaignWebsite: string | null;
        userId: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        isVerified: boolean;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        isWithdrawn: boolean;
        withdrawnReason: string | null;
    })[]>;
}
export {};
//# sourceMappingURL=electionService.d.ts.map