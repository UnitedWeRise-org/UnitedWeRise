"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const embeddingService_1 = require("../services/embeddingService");
const azureOpenAIService_1 = require("../services/azureOpenAIService");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Check if current user is a verified candidate
router.get('/candidate/status', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if user is a candidate
        const candidate = await prisma.candidate.findUnique({
            where: { userId },
            select: {
                id: true,
                name: true,
                status: true,
                office: {
                    select: {
                        title: true,
                        level: true,
                        district: true
                    }
                }
            },
        });
        if (!candidate) {
            return res.status(404).json({
                success: false,
                error: 'User is not a registered candidate',
            });
        }
        res.json({
            success: true,
            data: {
                id: candidate.id,
                name: candidate.name,
                status: candidate.status,
                office: candidate.office
            },
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error checking candidate status');
        res.status(500).json({
            success: false,
            error: 'Failed to check candidate status',
        });
    }
});
// Get current candidate's policy positions
router.get('/candidate/my-positions', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get candidate ID
        const candidate = await prisma.candidate.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!candidate) {
            return res.status(403).json({
                success: false,
                error: 'User must be a registered candidate',
            });
        }
        // Get all positions for this candidate
        const positions = await prisma.policyPosition.findMany({
            where: {
                candidateId: candidate.id,
            },
            include: {
                category: {
                    select: {
                        name: true,
                        icon: true,
                    },
                },
            },
            orderBy: [
                { isPublished: 'desc' },
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        res.json({
            success: true,
            data: positions,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error fetching candidate positions');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch policy positions',
        });
    }
});
// Get all policy categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await prisma.policyCategory.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: {
                positions: {
                    where: { isPublished: true },
                    select: { id: true, candidateId: true },
                },
            },
        });
        res.json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error fetching policy categories');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch policy categories',
        });
    }
});
// Get policy positions for a specific candidate
router.get('/candidate/:candidateId/positions', async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { published = 'true' } = req.query;
        const whereClause = { candidateId };
        if (published === 'true') {
            whereClause.isPublished = true;
        }
        const positions = await prisma.policyPosition.findMany({
            where: whereClause,
            include: {
                category: {
                    select: { id: true, name: true, icon: true },
                },
            },
            orderBy: [
                { category: { displayOrder: 'asc' } },
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        res.json({
            success: true,
            data: positions,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, candidateId: req.params.candidateId }, 'Error fetching candidate policy positions');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch policy positions',
        });
    }
});
// Get policy positions for race comparison (all candidates in same office)
router.get('/race/:officeId/comparison', async (req, res) => {
    try {
        const { officeId } = req.params;
        // Get all active candidates for this office
        const candidates = await prisma.candidate.findMany({
            where: {
                officeId,
                status: 'ACTIVE',
                isWithdrawn: false,
            },
            select: {
                id: true,
                name: true,
                party: true,
                campaignWebsite: true,
            },
        });
        // Get all published policy positions for these candidates
        const candidateIds = candidates.map(c => c.id);
        const positions = await prisma.policyPosition.findMany({
            where: {
                candidateId: { in: candidateIds },
                isPublished: true,
            },
            include: {
                category: {
                    select: { id: true, name: true, icon: true, displayOrder: true },
                },
                candidate: {
                    select: { id: true, name: true, party: true },
                },
            },
            orderBy: [
                { category: { displayOrder: 'asc' } },
                { priority: 'desc' },
            ],
        });
        // Get policy categories for structure
        const categories = await prisma.policyCategory.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
        // Organize data for comparison view
        const comparisonData = {
            candidates,
            categories: categories.map(category => ({
                ...category,
                positions: positions.filter(p => p.categoryId === category.id),
            })),
        };
        res.json({
            success: true,
            data: comparisonData,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, officeId: req.params.officeId }, 'Error fetching race comparison data');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch race comparison data',
        });
    }
});
// Create or update a policy position (requires candidate authentication)
router.post('/positions', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { categoryId, title, summary, content, stance, priority = 5, evidenceLinks = [], keyPoints = [], isPublished = false, } = req.body;
        // Validate required fields
        if (!categoryId || !title || !summary || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: categoryId, title, summary, content',
            });
        }
        // Verify user is a candidate
        const candidate = await prisma.candidate.findUnique({
            where: { userId },
            select: { id: true, name: true },
        });
        if (!candidate) {
            return res.status(403).json({
                success: false,
                error: 'User must be a registered candidate to create policy positions',
            });
        }
        // Check if position already exists for this category
        const existingPosition = await prisma.policyPosition.findFirst({
            where: {
                candidateId: candidate.id,
                categoryId,
                version: { gte: 1 }, // Get latest version
            },
            orderBy: { version: 'desc' },
        });
        let newPosition;
        if (existingPosition) {
            // Create new version of existing position
            newPosition = await prisma.policyPosition.create({
                data: {
                    candidateId: candidate.id,
                    categoryId,
                    title,
                    summary,
                    content,
                    stance,
                    priority,
                    evidenceLinks,
                    keyPoints,
                    isPublished,
                    version: existingPosition.version + 1,
                    previousVersionId: existingPosition.id,
                    publishedAt: isPublished ? new Date() : null,
                },
                include: {
                    category: {
                        select: { name: true, icon: true },
                    },
                },
            });
        }
        else {
            // Create new position
            newPosition = await prisma.policyPosition.create({
                data: {
                    candidateId: candidate.id,
                    categoryId,
                    title,
                    summary,
                    content,
                    stance,
                    priority,
                    evidenceLinks,
                    keyPoints,
                    isPublished,
                    version: 1,
                    publishedAt: isPublished ? new Date() : null,
                },
                include: {
                    category: {
                        select: { name: true, icon: true },
                    },
                },
            });
        }
        // AI Processing for published positions
        if (isPublished) {
            try {
                // Generate embedding for semantic analysis
                const textForEmbedding = `${title}\n${summary}\n${content}\n${keyPoints.join('\n')}`;
                const embedding = await embeddingService_1.EmbeddingService.generateEmbedding(textForEmbedding);
                // AI analysis for keywords, category, stance, and summary
                const aiAnalysis = await analyzePolicyContent(title, content, summary);
                await prisma.policyPosition.update({
                    where: { id: newPosition.id },
                    data: {
                        embedding,
                        aiExtractedKeywords: aiAnalysis.keywords,
                        aiExtractedCategory: aiAnalysis.category,
                        aiExtractedStance: aiAnalysis.stance,
                        aiGeneratedSummary: aiAnalysis.generatedSummary,
                        aiProcessedAt: new Date()
                    },
                });
                logger_1.logger.info({ positionId: newPosition.id }, 'Generated AI analysis for policy position');
            }
            catch (embeddingError) {
                logger_1.logger.error({ error: embeddingError, positionId: newPosition.id }, 'Failed to generate AI analysis');
                // Don't fail the request if AI processing fails
            }
        }
        res.json({
            success: true,
            data: newPosition,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Error creating policy position');
        res.status(500).json({
            success: false,
            error: 'Failed to create policy position',
        });
    }
});
// Get single policy position by ID
router.get('/positions/:positionId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { positionId } = req.params;
        // Verify user is a candidate and owns this position
        const candidate = await prisma.candidate.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!candidate) {
            return res.status(403).json({
                success: false,
                error: 'User must be a registered candidate',
            });
        }
        const position = await prisma.policyPosition.findFirst({
            where: {
                id: positionId,
                candidateId: candidate.id,
            },
            include: {
                category: {
                    select: { name: true, icon: true },
                },
            },
        });
        if (!position) {
            return res.status(404).json({
                success: false,
                error: 'Policy position not found',
            });
        }
        res.json({
            success: true,
            data: position,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, positionId: req.params.positionId, userId: req.user?.id }, 'Error fetching policy position');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch policy position',
        });
    }
});
// Update policy position (creates new version)
router.put('/positions/:positionId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { positionId } = req.params;
        const { title, summary, content, stance, priority = 5, evidenceLinks = [], keyPoints = [], isPublished = false, } = req.body;
        // Validate required fields
        if (!title || !summary || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: title, summary, content',
            });
        }
        // Verify user is a candidate and owns this position
        const candidate = await prisma.candidate.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!candidate) {
            return res.status(403).json({
                success: false,
                error: 'User must be a registered candidate',
            });
        }
        const existingPosition = await prisma.policyPosition.findFirst({
            where: {
                id: positionId,
                candidateId: candidate.id,
            },
        });
        if (!existingPosition) {
            return res.status(404).json({
                success: false,
                error: 'Policy position not found',
            });
        }
        // Create new version of the position
        const newVersion = await prisma.policyPosition.create({
            data: {
                candidateId: candidate.id,
                categoryId: existingPosition.categoryId,
                title,
                summary,
                content,
                stance,
                priority,
                evidenceLinks,
                keyPoints,
                isPublished,
                version: existingPosition.version + 1,
                previousVersionId: existingPosition.id,
                publishedAt: isPublished ? new Date() : null,
            },
            include: {
                category: {
                    select: { name: true, icon: true },
                },
            },
        });
        // AI Processing for published positions
        if (isPublished) {
            try {
                // Generate embedding for semantic analysis
                const textForEmbedding = `${title}\n${summary}\n${content}\n${keyPoints.join('\n')}`;
                const embedding = await embeddingService_1.EmbeddingService.generateEmbedding(textForEmbedding);
                // AI analysis for keywords, category, stance, and summary
                const aiAnalysis = await analyzePolicyContent(title, content, summary);
                await prisma.policyPosition.update({
                    where: { id: newVersion.id },
                    data: {
                        embedding,
                        aiExtractedKeywords: aiAnalysis.keywords,
                        aiExtractedCategory: aiAnalysis.category,
                        aiExtractedStance: aiAnalysis.stance,
                        aiGeneratedSummary: aiAnalysis.generatedSummary,
                        aiProcessedAt: new Date()
                    },
                });
                logger_1.logger.info({ positionId: newVersion.id }, 'Generated AI analysis for updated policy position');
            }
            catch (embeddingError) {
                logger_1.logger.error({ error: embeddingError, positionId: newVersion.id }, 'Failed to generate AI analysis');
                // Don't fail the request if AI processing fails
            }
        }
        res.json({
            success: true,
            data: newVersion,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, positionId: req.params.positionId, userId: req.user?.id }, 'Error updating policy position');
        res.status(500).json({
            success: false,
            error: 'Failed to update policy position',
        });
    }
});
// Update policy position publish status
router.patch('/positions/:positionId/publish', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { positionId } = req.params;
        const { isPublished } = req.body;
        // Verify user owns this position
        const position = await prisma.policyPosition.findFirst({
            where: {
                id: positionId,
                candidate: { userId },
            },
        });
        if (!position) {
            return res.status(404).json({
                success: false,
                error: 'Policy position not found or access denied',
            });
        }
        // Update publish status
        const updatedPosition = await prisma.policyPosition.update({
            where: { id: positionId },
            data: {
                isPublished,
                publishedAt: isPublished ? new Date() : null,
            },
        });
        // Generate embedding if publishing for first time
        if (isPublished && (!position.embedding || position.embedding.length === 0)) {
            try {
                const textForEmbedding = `${position.title}\n${position.summary}\n${position.content}\n${position.keyPoints.join('\n')}`;
                const embedding = await embeddingService_1.EmbeddingService.generateEmbedding(textForEmbedding);
                await prisma.policyPosition.update({
                    where: { id: positionId },
                    data: { embedding },
                });
            }
            catch (embeddingError) {
                logger_1.logger.error({ error: embeddingError, positionId }, 'Failed to generate embedding');
            }
        }
        res.json({
            success: true,
            data: updatedPosition,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, positionId: req.params.positionId, userId: req.user?.id }, 'Error updating policy position publish status');
        res.status(500).json({
            success: false,
            error: 'Failed to update policy position',
        });
    }
});
// Delete policy position (soft delete by unpublishing)
router.delete('/positions/:positionId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { positionId } = req.params;
        // Verify user owns this position
        const position = await prisma.policyPosition.findFirst({
            where: {
                id: positionId,
                candidate: { userId },
            },
        });
        if (!position) {
            return res.status(404).json({
                success: false,
                error: 'Policy position not found or access denied',
            });
        }
        // Soft delete by unpublishing
        await prisma.policyPosition.update({
            where: { id: positionId },
            data: {
                isPublished: false,
                publishedAt: null,
            },
        });
        res.json({
            success: true,
            message: 'Policy position unpublished successfully',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, positionId: req.params.positionId, userId: req.user?.id }, 'Error deleting policy position');
        res.status(500).json({
            success: false,
            error: 'Failed to delete policy position',
        });
    }
});
/**
 * AI Analysis for Policy Content using Azure OpenAI
 * Extracts keywords, category, stance, and generates summary
 */
async function analyzePolicyContent(title, content, summary) {
    try {
        const analysisPrompt = `Analyze this policy position for a political candidate:

TITLE: "${title}"
CONTENT: "${content}"
${summary ? `EXISTING_SUMMARY: "${summary}"` : ''}

TASK: Extract policy information and generate analysis.

Respond in JSON format:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "healthcare|education|economy|environment|immigration|foreign_policy|criminal_justice|infrastructure|housing|labor|technology|civil_rights|budget_taxes|energy|agriculture|veterans|seniors|youth|family_values|other",
  "stance": "SUPPORT|OPPOSE|NEUTRAL|CONDITIONAL",
  "generatedSummary": "1-2 sentence summary of the position"
}

INSTRUCTIONS:
- Extract 3-8 relevant policy keywords from the content
- Determine the most appropriate policy category from the list
- Identify the candidate's stance (SUPPORT/OPPOSE/NEUTRAL/CONDITIONAL)
- Generate a concise summary ${summary ? 'ONLY if the existing summary is empty or inadequate' : 'since no summary was provided'}
- Focus on actionable policy positions and specific proposals`;
        const response = await azureOpenAIService_1.azureOpenAI.generateCompletion(analysisPrompt, {
            temperature: 0.3,
            maxTokens: 400,
            systemMessage: "You are a policy analysis system for political candidates. Extract structured data from policy positions objectively and accurately."
        });
        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }
        const analysis = JSON.parse(jsonMatch[0]);
        return {
            keywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
            category: analysis.category || 'other',
            stance: analysis.stance || 'NEUTRAL',
            generatedSummary: (summary && summary.trim()) ? summary : (analysis.generatedSummary || '')
        };
    }
    catch (error) {
        logger_1.logger.error({ error, title }, 'AI policy analysis failed');
        // Fallback analysis
        return {
            keywords: [],
            category: 'other',
            stance: 'NEUTRAL',
            generatedSummary: summary || ''
        };
    }
}
exports.default = router;
//# sourceMappingURL=candidatePolicyPlatform.js.map