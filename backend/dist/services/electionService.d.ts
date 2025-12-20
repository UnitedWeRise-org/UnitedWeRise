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
            title: string;
            description: string;
            type: import(".prisma/client").$Enums.BallotMeasureType;
            county: string | null;
            electionId: string;
            fullText: string | null;
            fiscalImpact: string | null;
            arguments: import("@prisma/client/runtime/client").JsonValue | null;
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
                    totalRaised: import("@prisma/client-runtime-utils").Decimal;
                    totalSpent: import("@prisma/client-runtime-utils").Decimal;
                    cashOnHand: import("@prisma/client-runtime-utils").Decimal;
                    debts: import("@prisma/client-runtime-utils").Decimal;
                    individualDonations: import("@prisma/client-runtime-utils").Decimal;
                    pacDonations: import("@prisma/client-runtime-utils").Decimal;
                    selfFunding: import("@prisma/client-runtime-utils").Decimal;
                    publicFunding: import("@prisma/client-runtime-utils").Decimal;
                    reportingPeriod: string | null;
                    lastUpdated: Date;
                };
            } & {
                userId: string | null;
                name: string;
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                verificationStatus: string | null;
                campaignWebsite: string | null;
                status: import(".prisma/client").$Enums.CandidateStatus | null;
                withdrawnAt: Date | null;
                party: string | null;
                officeId: string;
                dataSource: string | null;
                isVerified: boolean;
                claimedAt: Date | null;
                isIncumbent: boolean;
                campaignEmail: string | null;
                campaignPhone: string | null;
                platformSummary: string | null;
                keyIssues: string[];
                isWithdrawn: boolean;
                withdrawnReason: string | null;
                statusChangedAt: Date | null;
                statusChangedBy: string | null;
                statusReason: string | null;
                suspendedUntil: Date | null;
                appealDeadline: Date | null;
                appealNotes: string | null;
                lastVerificationDate: Date | null;
                nextVerificationDue: Date | null;
                thirdPartyVerification: boolean;
                isExternallySourced: boolean;
                externalSourceId: string | null;
                lastExternalSync: Date | null;
                externalDataConfidence: number | null;
                isClaimed: boolean;
                claimedBy: string | null;
                googleCivicId: string | null;
                fecCandidateId: string | null;
                ballotpediaId: string | null;
                externalPhotoUrl: string | null;
                externalBiography: string | null;
                externalKeyIssues: string[];
            })[];
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            title: string;
            description: string | null;
            termLength: number | null;
            salary: import("@prisma/client-runtime-utils").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        })[];
    } & {
        level: import(".prisma/client").$Enums.ElectionLevel;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        district: string | null;
        isActive: boolean;
        description: string | null;
        type: import(".prisma/client").$Enums.ElectionType;
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
            title: string;
            description: string;
            type: import(".prisma/client").$Enums.BallotMeasureType;
            county: string | null;
            electionId: string;
            fullText: string | null;
            fiscalImpact: string | null;
            arguments: import("@prisma/client/runtime/client").JsonValue | null;
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
                    totalRaised: import("@prisma/client-runtime-utils").Decimal;
                    totalSpent: import("@prisma/client-runtime-utils").Decimal;
                    cashOnHand: import("@prisma/client-runtime-utils").Decimal;
                    debts: import("@prisma/client-runtime-utils").Decimal;
                    individualDonations: import("@prisma/client-runtime-utils").Decimal;
                    pacDonations: import("@prisma/client-runtime-utils").Decimal;
                    selfFunding: import("@prisma/client-runtime-utils").Decimal;
                    publicFunding: import("@prisma/client-runtime-utils").Decimal;
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
                    userId: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    reason: string | null;
                    candidateId: string;
                    isPublic: boolean;
                })[];
            } & {
                userId: string | null;
                name: string;
                id: string;
                embedding: number[];
                createdAt: Date;
                updatedAt: Date;
                verificationStatus: string | null;
                campaignWebsite: string | null;
                status: import(".prisma/client").$Enums.CandidateStatus | null;
                withdrawnAt: Date | null;
                party: string | null;
                officeId: string;
                dataSource: string | null;
                isVerified: boolean;
                claimedAt: Date | null;
                isIncumbent: boolean;
                campaignEmail: string | null;
                campaignPhone: string | null;
                platformSummary: string | null;
                keyIssues: string[];
                isWithdrawn: boolean;
                withdrawnReason: string | null;
                statusChangedAt: Date | null;
                statusChangedBy: string | null;
                statusReason: string | null;
                suspendedUntil: Date | null;
                appealDeadline: Date | null;
                appealNotes: string | null;
                lastVerificationDate: Date | null;
                nextVerificationDue: Date | null;
                thirdPartyVerification: boolean;
                isExternallySourced: boolean;
                externalSourceId: string | null;
                lastExternalSync: Date | null;
                externalDataConfidence: number | null;
                isClaimed: boolean;
                claimedBy: string | null;
                googleCivicId: string | null;
                fecCandidateId: string | null;
                ballotpediaId: string | null;
                externalPhotoUrl: string | null;
                externalBiography: string | null;
                externalKeyIssues: string[];
            })[];
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            title: string;
            description: string | null;
            termLength: number | null;
            salary: import("@prisma/client-runtime-utils").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        })[];
    } & {
        level: import(".prisma/client").$Enums.ElectionLevel;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        city: string | null;
        state: string;
        district: string | null;
        isActive: boolean;
        description: string | null;
        type: import(".prisma/client").$Enums.ElectionType;
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
                level: import(".prisma/client").$Enums.ElectionLevel;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                description: string | null;
                type: import(".prisma/client").$Enums.ElectionType;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            title: string;
            description: string | null;
            termLength: number | null;
            salary: import("@prisma/client-runtime-utils").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
        financialData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            candidateId: string;
            sourceUrl: string | null;
            totalRaised: import("@prisma/client-runtime-utils").Decimal;
            totalSpent: import("@prisma/client-runtime-utils").Decimal;
            cashOnHand: import("@prisma/client-runtime-utils").Decimal;
            debts: import("@prisma/client-runtime-utils").Decimal;
            individualDonations: import("@prisma/client-runtime-utils").Decimal;
            pacDonations: import("@prisma/client-runtime-utils").Decimal;
            selfFunding: import("@prisma/client-runtime-utils").Decimal;
            publicFunding: import("@prisma/client-runtime-utils").Decimal;
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
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            reason: string | null;
            candidateId: string;
            isPublic: boolean;
        })[];
    } & {
        userId: string | null;
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        verificationStatus: string | null;
        campaignWebsite: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus | null;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        dataSource: string | null;
        isVerified: boolean;
        claimedAt: Date | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        lastVerificationDate: Date | null;
        nextVerificationDue: Date | null;
        thirdPartyVerification: boolean;
        isExternallySourced: boolean;
        externalSourceId: string | null;
        lastExternalSync: Date | null;
        externalDataConfidence: number | null;
        isClaimed: boolean;
        claimedBy: string | null;
        googleCivicId: string | null;
        fecCandidateId: string | null;
        ballotpediaId: string | null;
        externalPhotoUrl: string | null;
        externalBiography: string | null;
        externalKeyIssues: string[];
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
                level: import(".prisma/client").$Enums.ElectionLevel;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                description: string | null;
                type: import(".prisma/client").$Enums.ElectionType;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            title: string;
            description: string | null;
            termLength: number | null;
            salary: import("@prisma/client-runtime-utils").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
    } & {
        userId: string | null;
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        verificationStatus: string | null;
        campaignWebsite: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus | null;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        dataSource: string | null;
        isVerified: boolean;
        claimedAt: Date | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        lastVerificationDate: Date | null;
        nextVerificationDue: Date | null;
        thirdPartyVerification: boolean;
        isExternallySourced: boolean;
        externalSourceId: string | null;
        lastExternalSync: Date | null;
        externalDataConfidence: number | null;
        isClaimed: boolean;
        claimedBy: string | null;
        googleCivicId: string | null;
        fecCandidateId: string | null;
        ballotpediaId: string | null;
        externalPhotoUrl: string | null;
        externalBiography: string | null;
        externalKeyIssues: string[];
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
                level: import(".prisma/client").$Enums.ElectionLevel;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                description: string | null;
                type: import(".prisma/client").$Enums.ElectionType;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            title: string;
            description: string | null;
            termLength: number | null;
            salary: import("@prisma/client-runtime-utils").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
    } & {
        userId: string | null;
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        verificationStatus: string | null;
        campaignWebsite: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus | null;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        dataSource: string | null;
        isVerified: boolean;
        claimedAt: Date | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        lastVerificationDate: Date | null;
        nextVerificationDue: Date | null;
        thirdPartyVerification: boolean;
        isExternallySourced: boolean;
        externalSourceId: string | null;
        lastExternalSync: Date | null;
        externalDataConfidence: number | null;
        isClaimed: boolean;
        claimedBy: string | null;
        googleCivicId: string | null;
        fecCandidateId: string | null;
        ballotpediaId: string | null;
        externalPhotoUrl: string | null;
        externalBiography: string | null;
        externalKeyIssues: string[];
    }>;
    /**
     * Withdraw candidacy
     */
    static withdrawCandidacy(candidateId: string, userId: string, reason?: string): Promise<{
        userId: string | null;
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        verificationStatus: string | null;
        campaignWebsite: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus | null;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        dataSource: string | null;
        isVerified: boolean;
        claimedAt: Date | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        lastVerificationDate: Date | null;
        nextVerificationDue: Date | null;
        thirdPartyVerification: boolean;
        isExternallySourced: boolean;
        externalSourceId: string | null;
        lastExternalSync: Date | null;
        externalDataConfidence: number | null;
        isClaimed: boolean;
        claimedBy: string | null;
        googleCivicId: string | null;
        fecCandidateId: string | null;
        ballotpediaId: string | null;
        externalPhotoUrl: string | null;
        externalBiography: string | null;
        externalKeyIssues: string[];
    }>;
    /**
     * Endorse a candidate
     */
    static endorseCandidate(userId: string, candidateId: string, reason?: string, isPublic?: boolean): Promise<{
        candidate: {
            office: {
                election: {
                    level: import(".prisma/client").$Enums.ElectionLevel;
                    name: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    city: string | null;
                    state: string;
                    district: string | null;
                    isActive: boolean;
                    description: string | null;
                    type: import(".prisma/client").$Enums.ElectionType;
                    county: string | null;
                    date: Date;
                    registrationDeadline: Date | null;
                    officialUrl: string | null;
                };
            } & {
                level: import(".prisma/client").$Enums.OfficeLevel;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                state: string;
                district: string | null;
                title: string;
                description: string | null;
                termLength: number | null;
                salary: import("@prisma/client-runtime-utils").Decimal | null;
                jurisdiction: string | null;
                electionId: string;
            };
        } & {
            userId: string | null;
            name: string;
            id: string;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            verificationStatus: string | null;
            campaignWebsite: string | null;
            status: import(".prisma/client").$Enums.CandidateStatus | null;
            withdrawnAt: Date | null;
            party: string | null;
            officeId: string;
            dataSource: string | null;
            isVerified: boolean;
            claimedAt: Date | null;
            isIncumbent: boolean;
            campaignEmail: string | null;
            campaignPhone: string | null;
            platformSummary: string | null;
            keyIssues: string[];
            isWithdrawn: boolean;
            withdrawnReason: string | null;
            statusChangedAt: Date | null;
            statusChangedBy: string | null;
            statusReason: string | null;
            suspendedUntil: Date | null;
            appealDeadline: Date | null;
            appealNotes: string | null;
            lastVerificationDate: Date | null;
            nextVerificationDue: Date | null;
            thirdPartyVerification: boolean;
            isExternallySourced: boolean;
            externalSourceId: string | null;
            lastExternalSync: Date | null;
            externalDataConfidence: number | null;
            isClaimed: boolean;
            claimedBy: string | null;
            googleCivicId: string | null;
            fecCandidateId: string | null;
            ballotpediaId: string | null;
            externalPhotoUrl: string | null;
            externalBiography: string | null;
            externalKeyIssues: string[];
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
                level: import(".prisma/client").$Enums.ElectionLevel;
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                state: string;
                district: string | null;
                isActive: boolean;
                description: string | null;
                type: import(".prisma/client").$Enums.ElectionType;
                county: string | null;
                date: Date;
                registrationDeadline: Date | null;
                officialUrl: string | null;
            };
        } & {
            level: import(".prisma/client").$Enums.OfficeLevel;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            state: string;
            district: string | null;
            title: string;
            description: string | null;
            termLength: number | null;
            salary: import("@prisma/client-runtime-utils").Decimal | null;
            jurisdiction: string | null;
            electionId: string;
        };
        financialData: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            candidateId: string;
            sourceUrl: string | null;
            totalRaised: import("@prisma/client-runtime-utils").Decimal;
            totalSpent: import("@prisma/client-runtime-utils").Decimal;
            cashOnHand: import("@prisma/client-runtime-utils").Decimal;
            debts: import("@prisma/client-runtime-utils").Decimal;
            individualDonations: import("@prisma/client-runtime-utils").Decimal;
            pacDonations: import("@prisma/client-runtime-utils").Decimal;
            selfFunding: import("@prisma/client-runtime-utils").Decimal;
            publicFunding: import("@prisma/client-runtime-utils").Decimal;
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
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            reason: string | null;
            candidateId: string;
            isPublic: boolean;
        })[];
    } & {
        userId: string | null;
        name: string;
        id: string;
        embedding: number[];
        createdAt: Date;
        updatedAt: Date;
        verificationStatus: string | null;
        campaignWebsite: string | null;
        status: import(".prisma/client").$Enums.CandidateStatus | null;
        withdrawnAt: Date | null;
        party: string | null;
        officeId: string;
        dataSource: string | null;
        isVerified: boolean;
        claimedAt: Date | null;
        isIncumbent: boolean;
        campaignEmail: string | null;
        campaignPhone: string | null;
        platformSummary: string | null;
        keyIssues: string[];
        isWithdrawn: boolean;
        withdrawnReason: string | null;
        statusChangedAt: Date | null;
        statusChangedBy: string | null;
        statusReason: string | null;
        suspendedUntil: Date | null;
        appealDeadline: Date | null;
        appealNotes: string | null;
        lastVerificationDate: Date | null;
        nextVerificationDue: Date | null;
        thirdPartyVerification: boolean;
        isExternallySourced: boolean;
        externalSourceId: string | null;
        lastExternalSync: Date | null;
        externalDataConfidence: number | null;
        isClaimed: boolean;
        claimedBy: string | null;
        googleCivicId: string | null;
        fecCandidateId: string | null;
        ballotpediaId: string | null;
        externalPhotoUrl: string | null;
        externalBiography: string | null;
        externalKeyIssues: string[];
    })[]>;
}
export {};
//# sourceMappingURL=electionService.d.ts.map