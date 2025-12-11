/**
 * Argument Ledger Service
 *
 * Manages the dynamic repository of arguments extracted from user discourse.
 * Handles semantic similarity matching, confidence propagation, and clustering.
 */

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { EmbeddingService } from './embeddingService';
import { logger } from './logger';

// Confidence thresholds
const SIMILARITY_THRESHOLD = 0.85; // Cosine similarity threshold for related arguments
const CONFIDENCE_PROPAGATION_DECAY = 0.9; // How much confidence changes propagate
const MIN_CONFIDENCE = 0.0;
const MAX_CONFIDENCE = 1.0;

interface ArgumentCreateParams {
  content: string;
  summary?: string;
  sourcePostId: string;
  sourceUserId: string;
  logicalValidity?: number;
  evidenceQuality?: number;
  coherence?: number;
  entropyScore?: number;
}

interface ArgumentUpdateResult {
  argumentId: string;
  oldConfidence: number;
  newConfidence: number;
  propagatedTo: string[];
}

interface SimilarArgument {
  id: string;
  content: string;
  summary: string | null;
  confidence: number;
  effectiveConfidence: number | null;
  similarity: number;
}

export class ArgumentLedgerService {
  /**
   * Create a new argument entry with embedding
   */
  static async createArgument(params: ArgumentCreateParams) {
    try {
      // Generate embedding for semantic search
      const embedding = await EmbeddingService.generateEmbedding(params.content);

      const argument = await prisma.argumentEntry.create({
        data: {
          content: params.content,
          summary: params.summary,
          sourcePostId: params.sourcePostId,
          sourceUserId: params.sourceUserId,
          embedding,
          confidence: 0.5, // Start neutral
          confidenceHistory: [{ confidence: 0.5, timestamp: new Date().toISOString(), reason: 'initial' }],
          logicalValidity: params.logicalValidity,
          evidenceQuality: params.evidenceQuality,
          coherence: params.coherence,
          entropyScore: params.entropyScore,
          effectiveConfidence: 0.5
        }
      });

      logger.info({ argumentId: argument.id }, 'Created new argument entry');

      // Find and potentially cluster with similar arguments
      await this.checkForClustering(argument.id, embedding);

      return argument;
    } catch (error) {
      logger.error({ error, params }, 'Failed to create argument');
      throw error;
    }
  }

  /**
   * Find semantically similar arguments
   */
  static async findSimilarArguments(
    embedding: number[],
    limit: number = 10,
    excludeId?: string
  ): Promise<SimilarArgument[]> {
    try {
      // Get all arguments with embeddings
      const arguments_ = await prisma.argumentEntry.findMany({
        where: excludeId ? { id: { not: excludeId } } : undefined,
        select: {
          id: true,
          content: true,
          summary: true,
          confidence: true,
          effectiveConfidence: true,
          embedding: true
        }
      });

      // Calculate similarities
      const similarities = arguments_
        .filter(arg => arg.embedding && arg.embedding.length > 0)
        .map(arg => ({
          id: arg.id,
          content: arg.content,
          summary: arg.summary,
          confidence: arg.confidence,
          effectiveConfidence: arg.effectiveConfidence,
          similarity: EmbeddingService.calculateSimilarity(embedding, arg.embedding)
        }))
        .filter(arg => arg.similarity >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return similarities;
    } catch (error) {
      logger.error({ error }, 'Failed to find similar arguments');
      return [];
    }
  }

  /**
   * Update argument confidence with propagation to similar arguments
   */
  static async updateConfidence(
    argumentId: string,
    newConfidence: number,
    reason: string,
    interactionId?: string
  ): Promise<ArgumentUpdateResult> {
    try {
      // Clamp confidence to valid range
      newConfidence = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, newConfidence));

      const argument = await prisma.argumentEntry.findUnique({
        where: { id: argumentId },
        select: {
          id: true,
          confidence: true,
          embedding: true,
          confidenceHistory: true
        }
      });

      if (!argument) {
        throw new Error(`Argument ${argumentId} not found`);
      }

      const oldConfidence = argument.confidence;
      const confidenceChange = newConfidence - oldConfidence;

      // Update confidence history
      const history = (argument.confidenceHistory as Prisma.JsonArray) || [];
      history.push({
        confidence: newConfidence,
        previousConfidence: oldConfidence,
        timestamp: new Date().toISOString(),
        reason
      });

      // Update the argument
      await prisma.argumentEntry.update({
        where: { id: argumentId },
        data: {
          confidence: newConfidence,
          confidenceHistory: history as Prisma.InputJsonValue
        }
      });

      // Record confidence update
      await prisma.confidenceUpdate.create({
        data: {
          argumentId,
          interactionId,
          oldConfidence,
          newConfidence,
          reason
        }
      });

      // Propagate to similar arguments
      const propagatedTo: string[] = [];

      if (Math.abs(confidenceChange) > 0.05 && argument.embedding && argument.embedding.length > 0) {
        const similarArguments = await this.findSimilarArguments(
          argument.embedding,
          20,
          argumentId
        );

        for (const similar of similarArguments) {
          const propagatedChange = confidenceChange * CONFIDENCE_PROPAGATION_DECAY * similar.similarity;
          const newSimilarConfidence = Math.max(
            MIN_CONFIDENCE,
            Math.min(MAX_CONFIDENCE, similar.confidence + propagatedChange)
          );

          if (Math.abs(newSimilarConfidence - similar.confidence) > 0.01) {
            await prisma.argumentEntry.update({
              where: { id: similar.id },
              data: { confidence: newSimilarConfidence }
            });

            await prisma.confidenceUpdate.create({
              data: {
                argumentId: similar.id,
                interactionId,
                oldConfidence: similar.confidence,
                newConfidence: newSimilarConfidence,
                reason: `Propagated from ${argumentId}`,
                propagatedFrom: argumentId,
                cosineSimilarity: similar.similarity
              }
            });

            propagatedTo.push(similar.id);
          }
        }
      }

      logger.info({
        argumentId,
        oldConfidence,
        newConfidence,
        propagatedCount: propagatedTo.length
      }, 'Updated argument confidence');

      return {
        argumentId,
        oldConfidence,
        newConfidence,
        propagatedTo
      };
    } catch (error) {
      logger.error({ error, argumentId }, 'Failed to update confidence');
      throw error;
    }
  }

  /**
   * Recalculate effective confidence based on linked facts
   */
  static async recalculateEffectiveConfidence(argumentId: string): Promise<number> {
    try {
      const argument = await prisma.argumentEntry.findUnique({
        where: { id: argumentId },
        include: {
          factDependencies: {
            include: {
              factClaim: true
            }
          }
        }
      });

      if (!argument) {
        throw new Error(`Argument ${argumentId} not found`);
      }

      let effectiveConfidence = argument.confidence;

      // If linked to facts, effective = own_confidence * product(fact_confidences * weights)
      if (argument.factDependencies.length > 0) {
        let factMultiplier = 1.0;

        for (const link of argument.factDependencies) {
          const factConfidence = link.factClaim.confidence;
          const weight = link.dependencyStrength;
          // Weighted average approach: higher weight = more impact
          factMultiplier *= (1 - weight) + (weight * factConfidence);
        }

        effectiveConfidence = argument.confidence * factMultiplier;
      }

      // Update effective confidence
      await prisma.argumentEntry.update({
        where: { id: argumentId },
        data: { effectiveConfidence }
      });

      return effectiveConfidence;
    } catch (error) {
      logger.error({ error, argumentId }, 'Failed to recalculate effective confidence');
      throw error;
    }
  }

  /**
   * Check if argument should be clustered with similar ones
   */
  private static async checkForClustering(argumentId: string, embedding: number[]) {
    try {
      const similar = await this.findSimilarArguments(embedding, 5, argumentId);

      // If found very similar argument (>0.95), consider it part of same cluster
      const clustered = similar.find(s => s.similarity > 0.95);

      if (clustered) {
        // Find if there's an existing cluster
        const existingCluster = await prisma.argumentEntry.findUnique({
          where: { id: clustered.id },
          select: { clusterId: true, isClusterHead: true }
        });

        if (existingCluster?.clusterId) {
          // Add to existing cluster
          await prisma.argumentEntry.update({
            where: { id: argumentId },
            data: { clusterId: existingCluster.clusterId }
          });
        } else {
          // Create new cluster with the most confident argument as head
          const clusterId = argumentId;
          await prisma.argumentEntry.updateMany({
            where: { id: { in: [argumentId, clustered.id] } },
            data: { clusterId }
          });
          await prisma.argumentEntry.update({
            where: { id: argumentId },
            data: { isClusterHead: true }
          });
        }

        logger.info({ argumentId, clusteredWith: clustered.id }, 'Clustered argument');
      }
    } catch (error) {
      logger.warn({ error, argumentId }, 'Clustering check failed');
    }
  }

  /**
   * Get arguments by cluster
   */
  static async getClusterArguments(clusterId: string) {
    return prisma.argumentEntry.findMany({
      where: { clusterId },
      orderBy: { confidence: 'desc' },
      include: {
        sourcePost: {
          select: {
            id: true,
            content: true
          }
        },
        sourceUser: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      }
    });
  }

  /**
   * Get top arguments by confidence
   */
  static async getTopArguments(limit: number = 20) {
    return prisma.argumentEntry.findMany({
      orderBy: { confidence: 'desc' },
      take: limit,
      include: {
        sourceUser: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      }
    });
  }

  /**
   * Get arguments related to a post
   */
  static async getPostArguments(postId: string) {
    return prisma.argumentEntry.findMany({
      where: { sourcePostId: postId },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceUser: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        factDependencies: {
          include: {
            factClaim: true
          }
        }
      }
    });
  }

  /**
   * Get argument by ID with full details
   */
  static async getArgument(argumentId: string) {
    const argument = await prisma.argumentEntry.findUnique({
      where: { id: argumentId },
      include: {
        sourcePost: {
          select: {
            id: true,
            content: true
          }
        },
        sourceUser: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        factDependencies: {
          include: {
            factClaim: true
          }
        }
      }
    });

    if (!argument) return null;

    // Query confidence updates separately (no back-relation in schema)
    const confidenceUpdates = await prisma.confidenceUpdate.findMany({
      where: { argumentId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return {
      ...argument,
      confidenceUpdates
    };
  }

  /**
   * Support an argument (increase confidence)
   */
  static async supportArgument(argumentId: string, userId: string, interactionId?: string) {
    await prisma.argumentEntry.update({
      where: { id: argumentId },
      data: { supportCount: { increment: 1 } }
    });

    return this.updateConfidence(
      argumentId,
      0.02, // Small boost
      `Supported by user ${userId}`,
      interactionId
    );
  }

  /**
   * Refute an argument (decrease confidence)
   */
  static async refuteArgument(argumentId: string, userId: string, interactionId?: string) {
    await prisma.argumentEntry.update({
      where: { id: argumentId },
      data: { refuteCount: { increment: 1 } }
    });

    return this.updateConfidence(
      argumentId,
      -0.02, // Small decrease
      `Refuted by user ${userId}`,
      interactionId
    );
  }

  /**
   * Link argument to a fact claim
   */
  static async linkToFact(
    argumentId: string,
    factClaimId: string,
    dependencyStrength: number = 1.0
  ) {
    const link = await prisma.argumentFactLink.upsert({
      where: {
        argumentId_factClaimId: { argumentId, factClaimId }
      },
      update: { dependencyStrength },
      create: {
        argumentId,
        factClaimId,
        dependencyStrength
      }
    });

    // Recalculate effective confidence
    await this.recalculateEffectiveConfidence(argumentId);

    return link;
  }
}
