"use strict";
/**
 * FactClaim Service
 *
 * Manages factual claims that underlie arguments.
 * When facts are challenged or debunked, confidence cascades to dependent arguments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactClaimService = void 0;
const prisma_1 = require("../lib/prisma");
const embeddingService_1 = require("./embeddingService");
const argumentLedgerService_1 = require("./argumentLedgerService");
const logger_1 = require("./logger");
class FactClaimService {
    /**
     * Create a new fact claim with embedding
     */
    static async createFact(params) {
        try {
            const embedding = await embeddingService_1.EmbeddingService.generateEmbedding(params.claim);
            const initialConfidence = params.initialConfidence ?? 0.5;
            const fact = await prisma_1.prisma.factClaim.create({
                data: {
                    claim: params.claim,
                    sourcePostId: params.sourcePostId,
                    sourceUserId: params.sourceUserId,
                    embedding,
                    confidence: initialConfidence,
                    confidenceHistory: [{
                            confidence: initialConfidence,
                            timestamp: new Date().toISOString(),
                            reason: 'initial'
                        }]
                }
            });
            logger_1.logger.info({ factId: fact.id }, 'Created new fact claim');
            return fact;
        }
        catch (error) {
            logger_1.logger.error({ error, params }, 'Failed to create fact claim');
            throw error;
        }
    }
    /**
     * Find similar facts using embedding similarity
     */
    static async findSimilarFacts(claim, limit = 5, minSimilarity = 0.8) {
        try {
            const embedding = await embeddingService_1.EmbeddingService.generateEmbedding(claim);
            const facts = await prisma_1.prisma.factClaim.findMany({
                select: {
                    id: true,
                    claim: true,
                    confidence: true,
                    embedding: true,
                    citationCount: true,
                    challengeCount: true
                }
            });
            const similar = facts
                .filter(f => f.embedding && f.embedding.length > 0)
                .map(fact => ({
                ...fact,
                embedding: undefined,
                similarity: embeddingService_1.EmbeddingService.calculateSimilarity(embedding, fact.embedding)
            }))
                .filter(f => f.similarity >= minSimilarity)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
            return similar;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to find similar facts');
            return [];
        }
    }
    /**
     * Update fact confidence and cascade to dependent arguments
     */
    static async updateFactConfidence(factId, newConfidence, reason) {
        try {
            newConfidence = Math.max(0, Math.min(1, newConfidence));
            const fact = await prisma_1.prisma.factClaim.findUnique({
                where: { id: factId },
                include: {
                    dependentArguments: {
                        select: { argumentId: true }
                    }
                }
            });
            if (!fact) {
                throw new Error(`Fact ${factId} not found`);
            }
            const oldConfidence = fact.confidence;
            // Update confidence history
            const history = fact.confidenceHistory || [];
            history.push({
                confidence: newConfidence,
                previousConfidence: oldConfidence,
                timestamp: new Date().toISOString(),
                reason
            });
            // Update the fact
            await prisma_1.prisma.factClaim.update({
                where: { id: factId },
                data: {
                    confidence: newConfidence,
                    confidenceHistory: history
                }
            });
            // Cascade to all dependent arguments
            const affectedArguments = [];
            for (const link of fact.dependentArguments) {
                await argumentLedgerService_1.ArgumentLedgerService.recalculateEffectiveConfidence(link.argumentId);
                affectedArguments.push(link.argumentId);
            }
            logger_1.logger.info({
                factId,
                oldConfidence,
                newConfidence,
                affectedCount: affectedArguments.length
            }, 'Updated fact confidence with cascade');
            return {
                factId,
                oldConfidence,
                newConfidence,
                affectedArguments
            };
        }
        catch (error) {
            logger_1.logger.error({ error, factId }, 'Failed to update fact confidence');
            throw error;
        }
    }
    /**
     * Challenge a fact (reduces confidence)
     */
    static async challengeFact(factId, reason) {
        await prisma_1.prisma.factClaim.update({
            where: { id: factId },
            data: { challengeCount: { increment: 1 } }
        });
        const fact = await prisma_1.prisma.factClaim.findUnique({
            where: { id: factId },
            select: { confidence: true, challengeCount: true }
        });
        if (!fact) {
            throw new Error(`Fact ${factId} not found`);
        }
        // Reduce confidence based on challenge count
        // More challenges = bigger impact, but with diminishing returns
        const challengeImpact = 0.05 / Math.sqrt(fact.challengeCount);
        const newConfidence = fact.confidence - challengeImpact;
        return this.updateFactConfidence(factId, newConfidence, `Challenge: ${reason}`);
    }
    /**
     * Cite a fact (increases confidence)
     */
    static async citeFact(factId, contextPostId) {
        await prisma_1.prisma.factClaim.update({
            where: { id: factId },
            data: { citationCount: { increment: 1 } }
        });
        const fact = await prisma_1.prisma.factClaim.findUnique({
            where: { id: factId },
            select: { confidence: true, citationCount: true }
        });
        if (!fact) {
            throw new Error(`Fact ${factId} not found`);
        }
        // Increase confidence with citations (diminishing returns)
        const citationBoost = 0.02 / Math.sqrt(fact.citationCount);
        const newConfidence = Math.min(1, fact.confidence + citationBoost);
        return this.updateFactConfidence(factId, newConfidence, `Cited${contextPostId ? ` in post ${contextPostId}` : ''}`);
    }
    /**
     * Get fact with linked arguments
     */
    static async getFact(factId) {
        return prisma_1.prisma.factClaim.findUnique({
            where: { id: factId },
            include: {
                dependentArguments: {
                    include: {
                        argument: {
                            select: {
                                id: true,
                                content: true,
                                summary: true,
                                confidence: true,
                                effectiveConfidence: true
                            }
                        }
                    }
                },
                communityNotes: {
                    where: { isDisplayed: true },
                    orderBy: { helpfulScore: 'desc' },
                    take: 5
                }
            }
        });
    }
    /**
     * Get facts below a confidence threshold (potentially debunked)
     */
    static async getLowConfidenceFacts(threshold = 0.3, limit = 20) {
        return prisma_1.prisma.factClaim.findMany({
            where: { confidence: { lt: threshold } },
            orderBy: { confidence: 'asc' },
            take: limit,
            include: {
                dependentArguments: {
                    select: { argumentId: true }
                }
            }
        });
    }
    /**
     * Get high confidence facts (well-established)
     */
    static async getEstablishedFacts(threshold = 0.8, limit = 20) {
        return prisma_1.prisma.factClaim.findMany({
            where: { confidence: { gte: threshold } },
            orderBy: { confidence: 'desc' },
            take: limit
        });
    }
    /**
     * Search facts by claim text
     */
    static async searchFacts(query, limit = 10) {
        return prisma_1.prisma.factClaim.findMany({
            where: {
                claim: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            orderBy: { confidence: 'desc' },
            take: limit
        });
    }
}
exports.FactClaimService = FactClaimService;
//# sourceMappingURL=factClaimService.js.map