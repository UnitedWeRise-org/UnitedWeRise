/**
 * EndorsementQuestionnaire Service
 *
 * Handles endorsement questionnaire creation and management.
 * Organizations can create questionnaires that candidates must fill out
 * when seeking endorsement.
 *
 * @module services/questionnaireService
 */

import {
  EndorsementQuestionnaire,
  QuestionnaireQuestion,
  QuestionType,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

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
 * Request interface for creating a questionnaire
 */
interface CreateEndorsementQuestionnaireRequest {
  title: string;
  description?: string;
  questions: CreateQuestionRequest[];
}

/**
 * Request interface for creating a question
 */
interface CreateQuestionRequest {
  text: string;
  description?: string;
  type: QuestionType;
  options?: string[];
  isRequired?: boolean;
  isPublic?: boolean;
  displayOrder: number;
}

/**
 * Request interface for updating a question
 */
interface UpdateQuestionRequest {
  text?: string;
  description?: string;
  type?: QuestionType;
  options?: string[];
  isRequired?: boolean;
  isPublic?: boolean;
  displayOrder?: number;
}

/**
 * EndorsementQuestionnaire Service Class
 */
export class QuestionnaireService {
  /**
   * Create a new questionnaire with questions
   */
  async createQuestionnaire(
    organizationId: string,
    createdBy: string,
    data: CreateEndorsementQuestionnaireRequest
  ): Promise<EndorsementQuestionnaire> {
    // Validate questions
    if (!data.questions || data.questions.length === 0) {
      throw new Error('EndorsementQuestionnaire must have at least one question');
    }

    // Validate question options for types that require them
    for (const question of data.questions) {
      if (
        (question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOX') &&
        (!question.options || question.options.length < 2)
      ) {
        throw new Error(`Question "${question.text}" requires at least 2 options for ${question.type} type`);
      }
    }

    const questionnaire = await prisma.endorsementQuestionnaire.create({
      data: {
        organizationId,
        createdBy,
        title: data.title,
        description: data.description,
        questions: {
          create: data.questions.map((q, index) => ({
            text: q.text,
            description: q.description,
            type: q.type,
            options: q.options || [],
            isRequired: q.isRequired ?? true,
            isPublic: q.isPublic ?? true,
            displayOrder: q.displayOrder ?? index,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    logger.info({ questionnaireId: questionnaire.id, organizationId }, 'EndorsementQuestionnaire created');

    return questionnaire;
  }

  /**
   * Get a questionnaire by ID
   */
  async getQuestionnaire(questionnaireId: string): Promise<EndorsementQuestionnaire | null> {
    return prisma.endorsementQuestionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });
  }

  /**
   * Get questionnaire for public viewing (candidates applying)
   * Only returns public questions
   */
  async getQuestionnaireForApplication(questionnaireId: string): Promise<EndorsementQuestionnaire | null> {
    const questionnaire = await prisma.endorsementQuestionnaire.findUnique({
      where: { id: questionnaireId, isActive: true },
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
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
      },
    });

    return questionnaire;
  }

  /**
   * Update questionnaire metadata
   */
  async updateQuestionnaire(
    questionnaireId: string,
    data: { title?: string; description?: string; isActive?: boolean }
  ): Promise<EndorsementQuestionnaire> {
    return prisma.endorsementQuestionnaire.update({
      where: { id: questionnaireId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        questions: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Deactivate a questionnaire
   */
  async deactivateQuestionnaire(questionnaireId: string): Promise<EndorsementQuestionnaire> {
    return prisma.endorsementQuestionnaire.update({
      where: { id: questionnaireId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a questionnaire (only if no applications exist)
   */
  async deleteQuestionnaire(questionnaireId: string): Promise<void> {
    const applicationCount = await prisma.endorsementApplication.count({
      where: { questionnaireId },
    });

    if (applicationCount > 0) {
      throw new Error('Cannot delete questionnaire with existing applications. Deactivate instead.');
    }

    await prisma.$transaction([
      prisma.questionnaireQuestion.deleteMany({
        where: { questionnaireId },
      }),
      prisma.endorsementQuestionnaire.delete({
        where: { id: questionnaireId },
      }),
    ]);

    logger.info({ questionnaireId }, 'EndorsementQuestionnaire deleted');
  }

  /**
   * List questionnaires for an organization
   */
  async listQuestionnaires(
    organizationId: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<EndorsementQuestionnaire[]> {
    return prisma.endorsementQuestionnaire.findMany({
      where: {
        organizationId,
        ...(options.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            questions: true,
            applications: true,
          },
        },
      },
    });
  }

  /**
   * QUESTION MANAGEMENT
   */

  /**
   * Add a question to a questionnaire
   */
  async addQuestion(
    questionnaireId: string,
    data: CreateQuestionRequest
  ): Promise<QuestionnaireQuestion> {
    // Validate options for types that require them
    if (
      (data.type === 'MULTIPLE_CHOICE' || data.type === 'CHECKBOX') &&
      (!data.options || data.options.length < 2)
    ) {
      throw new Error(`${data.type} questions require at least 2 options`);
    }

    return prisma.questionnaireQuestion.create({
      data: {
        questionnaireId,
        text: data.text,
        description: data.description,
        type: data.type,
        options: data.options || [],
        isRequired: data.isRequired ?? true,
        isPublic: data.isPublic ?? true,
        displayOrder: data.displayOrder,
      },
    });
  }

  /**
   * Update a question
   */
  async updateQuestion(
    questionId: string,
    data: UpdateQuestionRequest
  ): Promise<QuestionnaireQuestion> {
    // Validate options if type is being changed
    if (data.type && (data.type === 'MULTIPLE_CHOICE' || data.type === 'CHECKBOX')) {
      const question = await prisma.questionnaireQuestion.findUnique({
        where: { id: questionId },
        select: { options: true },
      });

      const options = data.options ?? question?.options ?? [];
      if (options.length < 2) {
        throw new Error(`${data.type} questions require at least 2 options`);
      }
    }

    return prisma.questionnaireQuestion.update({
      where: { id: questionId },
      data: {
        ...(data.text !== undefined ? { text: data.text } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.options !== undefined ? { options: data.options } : {}),
        ...(data.isRequired !== undefined ? { isRequired: data.isRequired } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      },
    });
  }

  /**
   * Delete a question (only if questionnaire has no applications)
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const question = await prisma.questionnaireQuestion.findUnique({
      where: { id: questionId },
      select: { questionnaireId: true },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const applicationCount = await prisma.endorsementApplication.count({
      where: { questionnaireId: question.questionnaireId },
    });

    if (applicationCount > 0) {
      throw new Error('Cannot delete question from questionnaire with existing applications');
    }

    await prisma.questionnaireQuestion.delete({
      where: { id: questionId },
    });
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(
    questionnaireId: string,
    questionOrders: { questionId: string; displayOrder: number }[]
  ): Promise<void> {
    await prisma.$transaction(
      questionOrders.map(({ questionId, displayOrder }) =>
        prisma.questionnaireQuestion.update({
          where: { id: questionId },
          data: { displayOrder },
        })
      )
    );
  }

  /**
   * Get active questionnaires for organizations with jurisdiction over a candidate
   */
  async getQuestionnairesForCandidate(candidateId: string): Promise<EndorsementQuestionnaire[]> {
    // Get candidate info with office for state
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        office: {
          select: { state: true },
        },
        user: {
          select: { h3Index: true },
        },
      },
    });

    if (!candidate) {
      return [];
    }

    const candidateState = candidate.office?.state;

    // Find organizations that can endorse this candidate
    // This is simplified - full implementation would use jurisdictionService
    const orgs = await prisma.organization.findMany({
      where: {
        isActive: true,
        endorsementsEnabled: true,
        OR: [
          { jurisdictionType: 'NATIONAL' },
          ...(candidateState
            ? [{
                jurisdictionType: 'STATE' as const,
                jurisdictionValue: candidateState.toUpperCase(),
              }]
            : []),
          ...(candidate.user?.h3Index
            ? [{ h3Cells: { has: candidate.user.h3Index } }]
            : []),
        ],
      },
      select: { id: true },
    });

    const orgIds = orgs.map(o => o.id);

    return prisma.endorsementQuestionnaire.findMany({
      where: {
        organizationId: { in: orgIds },
        isActive: true,
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
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: [
        { organization: { isVerified: 'desc' } },
        { createdAt: 'desc' },
      ],
    });
  }
}

// Export singleton instance
export const questionnaireService = new QuestionnaireService();
