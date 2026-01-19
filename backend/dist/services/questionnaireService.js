"use strict";
/**
 * EndorsementQuestionnaire Service
 *
 * Handles endorsement questionnaire creation and management.
 * Organizations can create questionnaires that candidates must fill out
 * when seeking endorsement.
 *
 * @module services/questionnaireService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionnaireService = exports.QuestionnaireService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
/**
 * Standard user select fields
 */
const USER_SELECT = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatar: true,
};
/**
 * EndorsementQuestionnaire Service Class
 */
class QuestionnaireService {
    /**
     * Create a new questionnaire with questions
     */
    async createQuestionnaire(organizationId, createdBy, data) {
        // Validate questions
        if (!data.questions || data.questions.length === 0) {
            throw new Error('EndorsementQuestionnaire must have at least one question');
        }
        // Validate question options for types that require them
        for (const question of data.questions) {
            if ((question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOX') &&
                (!question.options || question.options.length < 2)) {
                throw new Error(`Question "${question.text}" requires at least 2 options for ${question.type} type`);
            }
        }
        const questionnaire = await prisma_1.prisma.endorsementQuestionnaire.create({
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
        logger_1.logger.info({ questionnaireId: questionnaire.id, organizationId }, 'EndorsementQuestionnaire created');
        return questionnaire;
    }
    /**
     * Get a questionnaire by ID
     */
    async getQuestionnaire(questionnaireId) {
        return prisma_1.prisma.endorsementQuestionnaire.findUnique({
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
    async getQuestionnaireForApplication(questionnaireId) {
        const questionnaire = await prisma_1.prisma.endorsementQuestionnaire.findUnique({
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
    async updateQuestionnaire(questionnaireId, data) {
        return prisma_1.prisma.endorsementQuestionnaire.update({
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
    async deactivateQuestionnaire(questionnaireId) {
        return prisma_1.prisma.endorsementQuestionnaire.update({
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
    async deleteQuestionnaire(questionnaireId) {
        const applicationCount = await prisma_1.prisma.endorsementApplication.count({
            where: { questionnaireId },
        });
        if (applicationCount > 0) {
            throw new Error('Cannot delete questionnaire with existing applications. Deactivate instead.');
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.questionnaireQuestion.deleteMany({
                where: { questionnaireId },
            }),
            prisma_1.prisma.endorsementQuestionnaire.delete({
                where: { id: questionnaireId },
            }),
        ]);
        logger_1.logger.info({ questionnaireId }, 'EndorsementQuestionnaire deleted');
    }
    /**
     * List questionnaires for an organization
     */
    async listQuestionnaires(organizationId, options = {}) {
        return prisma_1.prisma.endorsementQuestionnaire.findMany({
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
    async addQuestion(questionnaireId, data) {
        // Validate options for types that require them
        if ((data.type === 'MULTIPLE_CHOICE' || data.type === 'CHECKBOX') &&
            (!data.options || data.options.length < 2)) {
            throw new Error(`${data.type} questions require at least 2 options`);
        }
        return prisma_1.prisma.questionnaireQuestion.create({
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
    async updateQuestion(questionId, data) {
        // Validate options if type is being changed
        if (data.type && (data.type === 'MULTIPLE_CHOICE' || data.type === 'CHECKBOX')) {
            const question = await prisma_1.prisma.questionnaireQuestion.findUnique({
                where: { id: questionId },
                select: { options: true },
            });
            const options = data.options ?? question?.options ?? [];
            if (options.length < 2) {
                throw new Error(`${data.type} questions require at least 2 options`);
            }
        }
        return prisma_1.prisma.questionnaireQuestion.update({
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
    async deleteQuestion(questionId) {
        const question = await prisma_1.prisma.questionnaireQuestion.findUnique({
            where: { id: questionId },
            select: { questionnaireId: true },
        });
        if (!question) {
            throw new Error('Question not found');
        }
        const applicationCount = await prisma_1.prisma.endorsementApplication.count({
            where: { questionnaireId: question.questionnaireId },
        });
        if (applicationCount > 0) {
            throw new Error('Cannot delete question from questionnaire with existing applications');
        }
        await prisma_1.prisma.questionnaireQuestion.delete({
            where: { id: questionId },
        });
    }
    /**
     * Reorder questions
     */
    async reorderQuestions(questionnaireId, questionOrders) {
        await prisma_1.prisma.$transaction(questionOrders.map(({ questionId, displayOrder }) => prisma_1.prisma.questionnaireQuestion.update({
            where: { id: questionId },
            data: { displayOrder },
        })));
    }
    /**
     * Get active questionnaires for organizations with jurisdiction over a candidate
     */
    async getQuestionnairesForCandidate(candidateId) {
        // Get candidate info with office for state
        const candidate = await prisma_1.prisma.candidate.findUnique({
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
        const orgs = await prisma_1.prisma.organization.findMany({
            where: {
                isActive: true,
                endorsementsEnabled: true,
                OR: [
                    { jurisdictionType: 'NATIONAL' },
                    ...(candidateState
                        ? [{
                                jurisdictionType: 'STATE',
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
        return prisma_1.prisma.endorsementQuestionnaire.findMany({
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
exports.QuestionnaireService = QuestionnaireService;
// Export singleton instance
exports.questionnaireService = new QuestionnaireService();
//# sourceMappingURL=questionnaireService.js.map