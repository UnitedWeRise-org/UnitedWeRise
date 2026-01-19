/**
 * Endorsement Service
 *
 * Handles the full endorsement workflow: applications, voting, and publication.
 * Candidates apply for endorsement, org members vote, and endorsements are published.
 *
 * @module services/endorsementService
 */
import { EndorsementApplication, OrganizationEndorsement, EndorsementVote, EndorsementApplicationStatus, EndorsementVoteChoice } from '@prisma/client';
/**
 * Request interface for submitting an application
 */
interface SubmitApplicationRequest {
    responses: {
        questionId: string;
        response: string;
    }[];
}
/**
 * Endorsement Service Class
 */
export declare class EndorsementService {
    /**
     * APPLICATION MANAGEMENT
     */
    /**
     * Submit an endorsement application
     */
    submitApplication(questionnaireId: string, candidateId: string, data: SubmitApplicationRequest): Promise<EndorsementApplication>;
    /**
     * Get an application by ID
     */
    getApplication(applicationId: string): Promise<EndorsementApplication | null>;
    /**
     * List applications for a questionnaire
     */
    listApplications(questionnaireId: string, options?: {
        status?: EndorsementApplicationStatus;
        limit?: number;
        offset?: number;
    }): Promise<{
        applications: EndorsementApplication[];
        total: number;
    }>;
    /**
     * Update application status
     */
    updateEndorsementApplicationStatus(applicationId: string, status: EndorsementApplicationStatus): Promise<EndorsementApplication>;
    /**
     * Withdraw an application (by candidate)
     */
    withdrawApplication(applicationId: string): Promise<EndorsementApplication>;
    /**
     * VOTING MANAGEMENT
     */
    /**
     * Cast a vote on an application
     */
    castVote(applicationId: string, memberId: string, vote: EndorsementVoteChoice, comment?: string): Promise<EndorsementVote>;
    /**
     * Update denormalized vote counts
     */
    private updateVoteCounts;
    /**
     * Check if voting threshold is met
     */
    checkVotingThreshold(applicationId: string): Promise<{
        passed: boolean;
        quorumMet: boolean;
        votesFor: number;
        votesAgainst: number;
        votesAbstain: number;
        totalVotes: number;
        eligibleVoters: number;
        threshold: string;
    }>;
    /**
     * Count members eligible to vote (have VOTE_ENDORSEMENT capability)
     */
    private countEligibleVoters;
    /**
     * ENDORSEMENT PUBLICATION
     */
    /**
     * Publish an endorsement (after voting approval)
     */
    publishEndorsement(applicationId: string, publishedBy: string, statement?: string): Promise<OrganizationEndorsement>;
    /**
     * Deny an application (mark as DENIED)
     */
    denyApplication(applicationId: string): Promise<EndorsementApplication>;
    /**
     * Revoke an endorsement
     */
    revokeEndorsement(endorsementId: string, revokedBy: string, reason?: string): Promise<OrganizationEndorsement>;
    /**
     * Get endorsement by ID
     */
    getEndorsement(endorsementId: string): Promise<OrganizationEndorsement | null>;
    /**
     * List endorsements for an organization
     */
    listOrganizationEndorsements(organizationId: string, options?: {
        includeRevoked?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        endorsements: OrganizationEndorsement[];
        total: number;
    }>;
    /**
     * List endorsements for a candidate
     */
    listCandidateEndorsements(candidateId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        endorsements: OrganizationEndorsement[];
        total: number;
    }>;
    /**
     * Get candidate's pending applications
     */
    getCandidatePendingApplications(candidateId: string): Promise<EndorsementApplication[]>;
}
export declare const endorsementService: EndorsementService;
export {};
//# sourceMappingURL=endorsementService.d.ts.map