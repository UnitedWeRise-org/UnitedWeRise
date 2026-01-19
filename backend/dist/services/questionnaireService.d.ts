/**
 * EndorsementQuestionnaire Service
 *
 * Handles endorsement questionnaire creation and management.
 * Organizations can create questionnaires that candidates must fill out
 * when seeking endorsement.
 *
 * @module services/questionnaireService
 */
import { EndorsementQuestionnaire, QuestionnaireQuestion, QuestionType } from '@prisma/client';
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
export declare class QuestionnaireService {
    /**
     * Create a new questionnaire with questions
     */
    createQuestionnaire(organizationId: string, createdBy: string, data: CreateEndorsementQuestionnaireRequest): Promise<EndorsementQuestionnaire>;
    /**
     * Get a questionnaire by ID
     */
    getQuestionnaire(questionnaireId: string): Promise<EndorsementQuestionnaire | null>;
    /**
     * Get questionnaire for public viewing (candidates applying)
     * Only returns public questions
     */
    getQuestionnaireForApplication(questionnaireId: string): Promise<EndorsementQuestionnaire | null>;
    /**
     * Update questionnaire metadata
     */
    updateQuestionnaire(questionnaireId: string, data: {
        title?: string;
        description?: string;
        isActive?: boolean;
    }): Promise<EndorsementQuestionnaire>;
    /**
     * Deactivate a questionnaire
     */
    deactivateQuestionnaire(questionnaireId: string): Promise<EndorsementQuestionnaire>;
    /**
     * Delete a questionnaire (only if no applications exist)
     */
    deleteQuestionnaire(questionnaireId: string): Promise<void>;
    /**
     * List questionnaires for an organization
     */
    listQuestionnaires(organizationId: string, options?: {
        includeInactive?: boolean;
    }): Promise<EndorsementQuestionnaire[]>;
    /**
     * QUESTION MANAGEMENT
     */
    /**
     * Add a question to a questionnaire
     */
    addQuestion(questionnaireId: string, data: CreateQuestionRequest): Promise<QuestionnaireQuestion>;
    /**
     * Update a question
     */
    updateQuestion(questionId: string, data: UpdateQuestionRequest): Promise<QuestionnaireQuestion>;
    /**
     * Delete a question (only if questionnaire has no applications)
     */
    deleteQuestion(questionId: string): Promise<void>;
    /**
     * Reorder questions
     */
    reorderQuestions(questionnaireId: string, questionOrders: {
        questionId: string;
        displayOrder: number;
    }[]): Promise<void>;
    /**
     * Get active questionnaires for organizations with jurisdiction over a candidate
     */
    getQuestionnairesForCandidate(candidateId: string): Promise<EndorsementQuestionnaire[]>;
}
export declare const questionnaireService: QuestionnaireService;
export {};
//# sourceMappingURL=questionnaireService.d.ts.map