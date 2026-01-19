/**
 * Endorsement Service
 *
 * Handles the full endorsement workflow: applications, voting, and publication.
 * Candidates apply for endorsement, org members vote, and endorsements are published.
 *
 * @module services/endorsementService
 */

import {
  EndorsementApplication,
  OrganizationEndorsement,
  EndorsementVote,
  QuestionResponse,
  EndorsementApplicationStatus,
  EndorsementVoteChoice,
  VotingThresholdType,
  MembershipStatus,
  OrgCapability,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';
import { jurisdictionService } from './jurisdictionService';

/**
 * Standard user select fields
 */
const USER_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

/**
 * Standard candidate select fields
 */
const CANDIDATE_SELECT = {
  id: true,
  officeType: true,
  party: true,
  platform: true,
  user: {
    select: USER_SELECT,
  },
  office: {
    select: { state: true },
  },
} as const;

/**
 * Request interface for submitting an application
 */
interface SubmitApplicationRequest {
  responses: {
    questionId: string;
    response: string; // JSON string for complex types
  }[];
}

/**
 * Endorsement Service Class
 */
export class EndorsementService {
  /**
   * APPLICATION MANAGEMENT
   */

  /**
   * Submit an endorsement application
   */
  async submitApplication(
    questionnaireId: string,
    candidateId: string,
    data: SubmitApplicationRequest
  ): Promise<EndorsementApplication> {
    // Verify questionnaire exists and is active
    const questionnaire = await prisma.endorsementQuestionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        organization: {
          select: {
            id: true,
            endorsementsEnabled: true,
            jurisdictionType: true,
            jurisdictionValue: true,
            h3Cells: true,
          },
        },
        questions: {
          select: {
            id: true,
            isRequired: true,
          },
        },
      },
    });

    if (!questionnaire) {
      throw new Error('Questionnaire not found');
    }

    if (!questionnaire.isActive) {
      throw new Error('This questionnaire is no longer accepting applications');
    }

    if (!questionnaire.organization.endorsementsEnabled) {
      throw new Error('This organization has not enabled endorsements');
    }

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true, userId: true },
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Check if candidate is in organization's jurisdiction
    const inJurisdiction = await jurisdictionService.isCandidateInJurisdiction(
      candidateId,
      questionnaire.organization.id
    );

    if (!inJurisdiction) {
      throw new Error('Candidate is not within this organization\'s jurisdiction');
    }

    // Check for existing application
    const existingApplication = await prisma.endorsementApplication.findUnique({
      where: {
        questionnaireId_candidateId: { questionnaireId, candidateId },
      },
    });

    if (existingApplication) {
      throw new Error('An application has already been submitted for this questionnaire');
    }

    // Validate required questions are answered
    const requiredQuestionIds = questionnaire.questions
      .filter(q => q.isRequired)
      .map(q => q.id);

    const answeredQuestionIds = data.responses.map(r => r.questionId);

    for (const requiredId of requiredQuestionIds) {
      if (!answeredQuestionIds.includes(requiredId)) {
        throw new Error('All required questions must be answered');
      }
    }

    // Create application with responses
    const application = await prisma.endorsementApplication.create({
      data: {
        questionnaireId,
        candidateId,
        status: EndorsementApplicationStatus.SUBMITTED,
        responses: {
          create: data.responses.map(r => ({
            questionId: r.questionId,
            response: r.response,
          })),
        },
      },
      include: {
        candidate: {
          select: CANDIDATE_SELECT,
        },
        questionnaire: {
          select: {
            id: true,
            title: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        responses: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                isPublic: true,
              },
            },
          },
        },
      },
    });

    logger.info({
      applicationId: application.id,
      questionnaireId,
      candidateId,
    }, 'Endorsement application submitted');

    return application;
  }

  /**
   * Get an application by ID
   */
  async getApplication(applicationId: string): Promise<EndorsementApplication | null> {
    return prisma.endorsementApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          select: CANDIDATE_SELECT,
        },
        questionnaire: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatar: true,
                votingThresholdType: true,
                votingThresholdValue: true,
                votingQuorumPercent: true,
              },
            },
            questions: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
        votes: {
          include: {
            member: {
              include: {
                user: {
                  select: USER_SELECT,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * List applications for a questionnaire
   */
  async listApplications(
    questionnaireId: string,
    options: { status?: EndorsementApplicationStatus; limit?: number; offset?: number } = {}
  ): Promise<{ applications: EndorsementApplication[]; total: number }> {
    const { status, limit = 20, offset = 0 } = options;

    const where = {
      questionnaireId,
      ...(status ? { status } : {}),
    };

    const [applications, total] = await Promise.all([
      prisma.endorsementApplication.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { submittedAt: 'desc' },
        include: {
          candidate: {
            select: CANDIDATE_SELECT,
          },
          _count: {
            select: {
              votes: true,
            },
          },
        },
      }),
      prisma.endorsementApplication.count({ where }),
    ]);

    return { applications, total };
  }

  /**
   * Update application status
   */
  async updateEndorsementApplicationStatus(
    applicationId: string,
    status: EndorsementApplicationStatus
  ): Promise<EndorsementApplication> {
    return prisma.endorsementApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewedAt: status !== EndorsementApplicationStatus.SUBMITTED ? new Date() : null,
      },
    });
  }

  /**
   * Withdraw an application (by candidate)
   */
  async withdrawApplication(applicationId: string): Promise<EndorsementApplication> {
    const application = await prisma.endorsementApplication.findUnique({
      where: { id: applicationId },
      select: { status: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status === EndorsementApplicationStatus.APPROVED) {
      throw new Error('Cannot withdraw an approved application');
    }

    return prisma.endorsementApplication.update({
      where: { id: applicationId },
      data: { status: EndorsementApplicationStatus.WITHDRAWN },
    });
  }

  /**
   * VOTING MANAGEMENT
   */

  /**
   * Cast a vote on an application
   */
  async castVote(
    applicationId: string,
    memberId: string,
    vote: EndorsementVoteChoice,
    comment?: string
  ): Promise<EndorsementVote> {
    // Verify application is under review
    const application = await prisma.endorsementApplication.findUnique({
      where: { id: applicationId },
      select: { status: true },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== EndorsementApplicationStatus.UNDER_REVIEW) {
      throw new Error('Application is not currently under review');
    }

    // Upsert vote (allow changing vote)
    const existingVote = await prisma.endorsementVote.findUnique({
      where: {
        applicationId_memberId: { applicationId, memberId },
      },
    });

    let voteRecord: EndorsementVote;

    if (existingVote) {
      voteRecord = await prisma.endorsementVote.update({
        where: { id: existingVote.id },
        data: {
          vote,
          comment,
        },
      });
    } else {
      voteRecord = await prisma.endorsementVote.create({
        data: {
          applicationId,
          memberId,
          vote,
          comment,
        },
      });
    }

    // Update vote counts on application
    await this.updateVoteCounts(applicationId);

    logger.info({ applicationId, memberId, vote }, 'Vote cast on endorsement application');

    return voteRecord;
  }

  /**
   * Update denormalized vote counts
   */
  private async updateVoteCounts(applicationId: string): Promise<void> {
    const votes = await prisma.endorsementVote.groupBy({
      by: ['vote'],
      where: { applicationId },
      _count: true,
    });

    const counts = {
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
    };

    for (const v of votes) {
      if (v.vote === EndorsementVoteChoice.FOR) counts.votesFor = v._count;
      if (v.vote === EndorsementVoteChoice.AGAINST) counts.votesAgainst = v._count;
      if (v.vote === EndorsementVoteChoice.ABSTAIN) counts.votesAbstain = v._count;
    }

    await prisma.endorsementApplication.update({
      where: { id: applicationId },
      data: counts,
    });
  }

  /**
   * Check if voting threshold is met
   */
  async checkVotingThreshold(applicationId: string): Promise<{
    passed: boolean;
    quorumMet: boolean;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    totalVotes: number;
    eligibleVoters: number;
    threshold: string;
  }> {
    const application = await prisma.endorsementApplication.findUnique({
      where: { id: applicationId },
      select: {
        votesFor: true,
        votesAgainst: true,
        votesAbstain: true,
        questionnaire: {
          select: {
            organization: {
              select: {
                id: true,
                votingThresholdType: true,
                votingThresholdValue: true,
                votingQuorumPercent: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const org = application.questionnaire.organization;
    const { votesFor, votesAgainst, votesAbstain } = application;
    const totalVotes = votesFor + votesAgainst + votesAbstain;

    // Count eligible voters (members with VOTE_ENDORSEMENT capability)
    const eligibleVoters = await this.countEligibleVoters(org.id);

    // Check quorum
    const quorumPercent = org.votingQuorumPercent;
    const quorumMet = quorumPercent === 0 || (totalVotes / eligibleVoters) * 100 >= quorumPercent;

    // Calculate if threshold is met (only count FOR vs AGAINST, ignore ABSTAIN)
    const effectiveVotes = votesFor + votesAgainst;
    let passed = false;
    let threshold = '';

    if (effectiveVotes > 0) {
      const forPercent = (votesFor / effectiveVotes) * 100;

      switch (org.votingThresholdType) {
        case VotingThresholdType.SIMPLE_MAJORITY:
          passed = forPercent > 50;
          threshold = '>50%';
          break;

        case VotingThresholdType.TWO_THIRDS:
          passed = forPercent >= 66.67;
          threshold = '≥66.67%';
          break;

        case VotingThresholdType.THREE_QUARTERS:
          passed = forPercent >= 75;
          threshold = '≥75%';
          break;

        case VotingThresholdType.UNANIMOUS:
          passed = votesAgainst === 0;
          threshold = '100% (no against votes)';
          break;

        case VotingThresholdType.PERCENTAGE:
          const requiredPercent = org.votingThresholdValue ?? 50;
          passed = forPercent >= requiredPercent;
          threshold = `≥${requiredPercent}%`;
          break;
      }
    }

    return {
      passed: passed && quorumMet,
      quorumMet,
      votesFor,
      votesAgainst,
      votesAbstain,
      totalVotes,
      eligibleVoters,
      threshold,
    };
  }

  /**
   * Count members eligible to vote (have VOTE_ENDORSEMENT capability)
   */
  private async countEligibleVoters(organizationId: string): Promise<number> {
    // Head is always eligible
    let count = 1;

    // Count members with roles that have VOTE_ENDORSEMENT
    const membersWithCapability = await prisma.organizationMember.count({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        role: {
          capabilities: {
            has: OrgCapability.VOTE_ENDORSEMENT,
          },
        },
      },
    });

    count += membersWithCapability;

    return count;
  }

  /**
   * ENDORSEMENT PUBLICATION
   */

  /**
   * Publish an endorsement (after voting approval)
   */
  async publishEndorsement(
    applicationId: string,
    publishedBy: string,
    statement?: string
  ): Promise<OrganizationEndorsement> {
    const application = await prisma.endorsementApplication.findUnique({
      where: { id: applicationId },
      select: {
        status: true,
        candidateId: true,
        questionnaire: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== EndorsementApplicationStatus.UNDER_REVIEW) {
      throw new Error('Application must be under review to publish');
    }

    // Verify voting threshold is met
    const voteResult = await this.checkVotingThreshold(applicationId);
    if (!voteResult.passed) {
      throw new Error('Voting threshold not met. Cannot publish endorsement.');
    }

    // Check for existing endorsement
    const existingEndorsement = await prisma.organizationEndorsement.findFirst({
      where: {
        organizationId: application.questionnaire.organizationId,
        candidateId: application.candidateId,
        isActive: true,
      },
    });

    if (existingEndorsement) {
      throw new Error('This organization has already endorsed this candidate');
    }

    // Create endorsement and update application status in transaction
    const [endorsement] = await prisma.$transaction([
      prisma.organizationEndorsement.create({
        data: {
          organizationId: application.questionnaire.organizationId,
          candidateId: application.candidateId,
          applicationId,
          statement,
          publishedBy,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatar: true,
              isVerified: true,
            },
          },
          candidate: {
            select: CANDIDATE_SELECT,
          },
        },
      }),
      prisma.endorsementApplication.update({
        where: { id: applicationId },
        data: { status: EndorsementApplicationStatus.APPROVED },
      }),
    ]);

    logger.info({
      endorsementId: endorsement.id,
      organizationId: application.questionnaire.organizationId,
      candidateId: application.candidateId,
    }, 'Endorsement published');

    return endorsement;
  }

  /**
   * Deny an application (mark as DENIED)
   */
  async denyApplication(applicationId: string): Promise<EndorsementApplication> {
    return prisma.endorsementApplication.update({
      where: { id: applicationId },
      data: {
        status: EndorsementApplicationStatus.DENIED,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Revoke an endorsement
   */
  async revokeEndorsement(
    endorsementId: string,
    revokedBy: string,
    reason?: string
  ): Promise<OrganizationEndorsement> {
    return prisma.organizationEndorsement.update({
      where: { id: endorsementId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revocationReason: reason,
      },
    });
  }

  /**
   * Get endorsement by ID
   */
  async getEndorsement(endorsementId: string): Promise<OrganizationEndorsement | null> {
    return prisma.organizationEndorsement.findUnique({
      where: { id: endorsementId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true,
            isVerified: true,
          },
        },
        candidate: {
          select: CANDIDATE_SELECT,
        },
        application: {
          include: {
            questionnaire: true,
            responses: {
              where: {
                question: {
                  isPublic: true,
                },
              },
              include: {
                question: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List endorsements for an organization
   */
  async listOrganizationEndorsements(
    organizationId: string,
    options: { includeRevoked?: boolean; limit?: number; offset?: number } = {}
  ): Promise<{ endorsements: OrganizationEndorsement[]; total: number }> {
    const { includeRevoked = false, limit = 20, offset = 0 } = options;

    const where = {
      organizationId,
      ...(includeRevoked ? {} : { isActive: true }),
    };

    const [endorsements, total] = await Promise.all([
      prisma.organizationEndorsement.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { publishedAt: 'desc' },
        include: {
          candidate: {
            select: CANDIDATE_SELECT,
          },
        },
      }),
      prisma.organizationEndorsement.count({ where }),
    ]);

    return { endorsements, total };
  }

  /**
   * List endorsements for a candidate
   */
  async listCandidateEndorsements(
    candidateId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ endorsements: OrganizationEndorsement[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const where = {
      candidateId,
      isActive: true,
    };

    const [endorsements, total] = await Promise.all([
      prisma.organizationEndorsement.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          { organization: { isVerified: 'desc' } },
          { publishedAt: 'desc' },
        ],
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatar: true,
              isVerified: true,
              jurisdictionType: true,
              jurisdictionValue: true,
            },
          },
          application: {
            include: {
              responses: {
                where: {
                  question: {
                    isPublic: true,
                  },
                },
                include: {
                  question: true,
                },
              },
            },
          },
        },
      }),
      prisma.organizationEndorsement.count({ where }),
    ]);

    return { endorsements, total };
  }

  /**
   * Get candidate's pending applications
   */
  async getCandidatePendingApplications(candidateId: string): Promise<EndorsementApplication[]> {
    return prisma.endorsementApplication.findMany({
      where: {
        candidateId,
        status: {
          in: [EndorsementApplicationStatus.SUBMITTED, EndorsementApplicationStatus.UNDER_REVIEW],
        },
      },
      include: {
        questionnaire: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                avatar: true,
                isVerified: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}

// Export singleton instance
export const endorsementService = new EndorsementService();
