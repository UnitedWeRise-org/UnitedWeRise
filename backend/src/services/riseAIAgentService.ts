/**
 * RiseAI Agent Service
 *
 * Core AI agent that performs logical analysis using the Entropy/Homeostasis Framework.
 * Uses Azure OpenAI for reasoning and the Argument Ledger for context.
 */

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { azureOpenAI } from './azureOpenAIService';
import { EmbeddingService } from './embeddingService';
import { ArgumentLedgerService } from './argumentLedgerService';
import { FactClaimService } from './factClaimService';
import { RiseAIMentionService } from './riseAIMentionService';
import { logger } from './logger';

// Constants for analysis
const RISEAI_SYSTEM_USER_ID = 'riseai-system'; // Will be created on first run
const MAX_CONTEXT_ARGUMENTS = 10;
const SIMILARITY_THRESHOLD = 0.75;

// Fallacy patterns for detection
const COMMON_FALLACIES = [
  { name: 'Ad Hominem', pattern: /attack.*person|insult.*character|personal attack/i },
  { name: 'Straw Man', pattern: /misrepresent|distort.*argument|what they really mean/i },
  { name: 'Appeal to Authority', pattern: /expert.*said|authority.*says|because.*famous/i },
  { name: 'False Dichotomy', pattern: /either.*or|only two options|must choose between/i },
  { name: 'Slippery Slope', pattern: /will lead to|if.*then.*then.*then|inevitable/i },
  { name: 'Appeal to Emotion', pattern: /think of the children|fear|outrage|won't somebody/i },
  { name: 'Hasty Generalization', pattern: /all.*are|everyone.*does|nobody.*can/i },
  { name: 'Circular Reasoning', pattern: /because it is|it's true because|self-evident/i }
];

// IHL and ethical framework keywords
const ETHICAL_FRAMEWORK_KEYWORDS = {
  proportionality: ['proportionate', 'excessive', 'balanced', 'measured', 'appropriate response'],
  discrimination: ['discriminate', 'target', 'civilian', 'combatant', 'innocent'],
  necessity: ['necessary', 'required', 'unavoidable', 'essential', 'last resort'],
  humanity: ['humane', 'dignity', 'suffering', 'cruel', 'torture', 'human rights']
};

interface AnalysisResult {
  entropyScore: number; // 0-10: 10 = promotes stability, 0 = increases chaos
  logicalValidity: number; // 0-1
  evidenceQuality: number; // 0-1
  fallaciesFound: string[];
  ethicalConcerns: string[];
  confidence: number;
  summary: string;
  relatedArguments: {
    id: string;
    content: string;
    similarity: number;
    supportOrRefute: 'support' | 'refute' | 'neutral';
  }[];
  recommendation: string;
}

export class RiseAIAgentService {
  /**
   * Ensure RiseAI system user exists
   * Uses upsert to handle race conditions and existing users with matching email/username
   */
  static async ensureSystemUser() {
    const RISEAI_EMAIL = 'riseai@unitedwerise.org';
    const RISEAI_USERNAME = 'RiseAI';

    try {
      // First try to find by ID (fastest path)
      let systemUser = await prisma.user.findUnique({
        where: { id: RISEAI_SYSTEM_USER_ID }
      });

      if (systemUser) {
        return systemUser;
      }

      // Check if user exists with this email or username (different ID)
      const existingByEmail = await prisma.user.findUnique({
        where: { email: RISEAI_EMAIL }
      });

      if (existingByEmail) {
        logger.info({ userId: existingByEmail.id }, 'Found existing user with RiseAI email, using as system user');
        return existingByEmail;
      }

      const existingByUsername = await prisma.user.findUnique({
        where: { username: RISEAI_USERNAME }
      });

      if (existingByUsername) {
        logger.info({ userId: existingByUsername.id }, 'Found existing user with RiseAI username, using as system user');
        return existingByUsername;
      }

      // No existing user found, create new one
      systemUser = await prisma.user.create({
        data: {
          id: RISEAI_SYSTEM_USER_ID,
          email: RISEAI_EMAIL,
          username: RISEAI_USERNAME,
          password: '', // System user, no login
          displayName: 'RiseAI',
          bio: 'Agentic Logic & Stability Analysis System',
          verified: true,
          isAdmin: false,
          isModerator: false
        }
      });
      logger.info('Created RiseAI system user');
      return systemUser;

    } catch (error) {
      // Handle race condition where user was created between checks
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        logger.warn('RiseAI user creation race condition, retrying lookup');
        // Retry finding the user
        const retryUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: RISEAI_SYSTEM_USER_ID },
              { email: RISEAI_EMAIL },
              { username: RISEAI_USERNAME }
            ]
          }
        });
        if (retryUser) {
          return retryUser;
        }
      }
      logger.error({ error }, 'Failed to ensure RiseAI system user');
      throw error;
    }
  }

  /**
   * Analyze content using the Entropy/Homeostasis Framework
   */
  static async analyzeContent(
    content: string,
    interactionId: string
  ): Promise<AnalysisResult> {
    try {
      // Generate embedding for semantic search
      const embedding = await EmbeddingService.generateEmbedding(content);

      // Find related arguments from the ledger
      const relatedArguments = await ArgumentLedgerService.findSimilarArguments(
        embedding,
        MAX_CONTEXT_ARGUMENTS
      );

      // Detect fallacies
      const fallaciesFound = this.detectFallacies(content);

      // Assess ethical framework alignment
      const ethicalConcerns = this.assessEthicalFramework(content);

      // Calculate initial scores using heuristics
      const analysis = await EmbeddingService.analyzeText(content);

      // Calculate entropy score (stability assessment)
      const entropyScore = this.calculateEntropyScore(content, analysis, ethicalConcerns);

      // Build context from related arguments
      const argumentContext = relatedArguments.slice(0, 5).map(arg => ({
        id: arg.id,
        content: arg.content.substring(0, 200),
        confidence: arg.confidence,
        similarity: arg.similarity
      }));

      // Use Azure OpenAI for deeper analysis if available
      let aiAnalysis;
      try {
        aiAnalysis = await this.performAIAnalysis(content, argumentContext, fallaciesFound);
      } catch (error) {
        logger.warn({ error }, 'AI analysis failed, using heuristic analysis');
        aiAnalysis = null;
      }

      // Combine heuristic and AI analysis
      const logicalValidity = aiAnalysis?.logicalValidity ?? analysis.argumentStrength ?? 0.5;
      const evidenceQuality = aiAnalysis?.evidenceQuality ?? analysis.evidenceLevel ?? 0.3;
      const confidence = (logicalValidity + evidenceQuality) / 2;

      // Determine support/refute relationship for related arguments
      const relatedWithStance = relatedArguments.map(arg => ({
        id: arg.id,
        content: arg.content.substring(0, 100),
        similarity: arg.similarity,
        supportOrRefute: this.determineStance(content, arg.content) as 'support' | 'refute' | 'neutral'
      }));

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        entropyScore,
        logicalValidity,
        evidenceQuality,
        fallaciesFound,
        ethicalConcerns
      );

      // Generate summary
      const summary = aiAnalysis?.summary ?? this.generateHeuristicSummary(
        content,
        entropyScore,
        fallaciesFound,
        ethicalConcerns
      );

      return {
        entropyScore,
        logicalValidity,
        evidenceQuality,
        fallaciesFound,
        ethicalConcerns,
        confidence,
        summary,
        relatedArguments: relatedWithStance,
        recommendation
      };
    } catch (error) {
      logger.error({ error, interactionId }, 'Analysis failed');
      throw error;
    }
  }

  /**
   * Process a complete RiseAI interaction
   */
  static async processInteraction(interactionId: string): Promise<{
    success: boolean;
    responseContent?: string;
    responseCommentId?: string;
    error?: string;
  }> {
    try {
      const interaction = await RiseAIMentionService.getInteraction(interactionId);

      if (!interaction) {
        return { success: false, error: 'Interaction not found' };
      }

      // Update status to processing
      await RiseAIMentionService.updateInteraction(interactionId, {
        status: 'processing'
      });

      // Use fullContent if available, fallback to targetContent for backwards compatibility
      const contentToAnalyze = (interaction as { fullContent?: string }).fullContent || interaction.targetContent;

      // Perform heuristic analysis for internal metrics (still useful for argument storage)
      const analysis = await this.analyzeContent(interaction.targetContent, interactionId);

      // Search for related facts to include in context
      let relatedFacts: Array<{ id: string; claim: string; confidence: number }> = [];
      try {
        const facts = await FactClaimService.searchFacts(interaction.targetContent.substring(0, 200), 5);
        relatedFacts = facts.map(f => ({
          id: f.id,
          claim: f.claim,
          confidence: f.confidence
        }));
      } catch (error) {
        logger.warn({ error }, 'Failed to search related facts, continuing without');
      }

      // Generate conversational response using the full content
      const responseContent = await this.generateConversationalResponse(contentToAnalyze, {
        relatedArguments: analysis.relatedArguments.map(a => ({
          id: a.id,
          content: a.content,
          similarity: a.similarity
        })),
        relatedFacts
      });

      // Create the reply comment from RiseAI system user
      const systemUser = await this.ensureSystemUser();
      const replyComment = await this.createReplyComment({
        postId: interaction.triggerPostId,
        parentCommentId: interaction.triggerCommentId || undefined,
        systemUserId: systemUser.id,
        content: responseContent
      });

      // Store result with response comment ID (keep analysis for internal metrics)
      await RiseAIMentionService.updateInteraction(interactionId, {
        analysisResult: analysis as unknown as Prisma.InputJsonValue,
        entropyScore: analysis.entropyScore,
        fallaciesFound: analysis.fallaciesFound,
        argumentsReferenced: analysis.relatedArguments.map(a => a.id),
        responseContent,
        responseCommentId: replyComment.id,
        status: 'completed'
      });

      // Extract and store any new arguments from the analyzed content
      await this.extractAndStoreArguments(
        interaction.targetContent,
        interaction.triggerPostId,
        interaction.triggerUserId,
        analysis
      );

      logger.info({ interactionId, responseCommentId: replyComment.id }, 'Completed RiseAI interaction with reply');

      return {
        success: true,
        responseContent,
        responseCommentId: replyComment.id
      };
    } catch (error) {
      logger.error({ error, interactionId }, 'Failed to process interaction');

      await RiseAIMentionService.updateInteraction(interactionId, {
        status: 'failed'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a reply comment from RiseAI system user
   */
  private static async createReplyComment(params: {
    postId: string;
    parentCommentId?: string;
    systemUserId: string;
    content: string;
  }) {
    // Calculate depth based on parent
    let depth = 0;
    if (params.parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: params.parentCommentId },
        select: { depth: true }
      });
      if (parentComment) {
        depth = Math.min(parentComment.depth + 1, 3); // Max depth of 3
      }
    }

    // Create comment and update post comment count in transaction
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          content: params.content,
          userId: params.systemUserId,
          postId: params.postId,
          parentId: params.parentCommentId || null,
          depth
        }
      });

      await tx.post.update({
        where: { id: params.postId },
        data: { commentsCount: { increment: 1 } }
      });

      return newComment;
    });

    logger.info({ commentId: comment.id, postId: params.postId }, 'Created RiseAI reply comment');
    return comment;
  }

  /**
   * Detect logical fallacies in content
   */
  private static detectFallacies(content: string): string[] {
    const detected: string[] = [];

    for (const fallacy of COMMON_FALLACIES) {
      if (fallacy.pattern.test(content)) {
        detected.push(fallacy.name);
      }
    }

    return detected;
  }

  /**
   * Assess content against ethical/IHL framework
   */
  private static assessEthicalFramework(content: string): string[] {
    const concerns: string[] = [];
    const lowerContent = content.toLowerCase();

    // Check for proportionality concerns
    if (ETHICAL_FRAMEWORK_KEYWORDS.proportionality.some(k => lowerContent.includes(k))) {
      if (lowerContent.includes('excessive') || lowerContent.includes('disproportionate')) {
        concerns.push('Proportionality concern raised');
      }
    }

    // Check for discrimination/targeting concerns
    if (ETHICAL_FRAMEWORK_KEYWORDS.discrimination.some(k => lowerContent.includes(k))) {
      if (lowerContent.includes('civilian') || lowerContent.includes('innocent')) {
        concerns.push('Discrimination principle relevant');
      }
    }

    // Check for necessity arguments
    if (ETHICAL_FRAMEWORK_KEYWORDS.necessity.some(k => lowerContent.includes(k))) {
      concerns.push('Necessity argument present');
    }

    // Check for humanity/dignity concerns
    if (ETHICAL_FRAMEWORK_KEYWORDS.humanity.some(k => lowerContent.includes(k))) {
      if (lowerContent.includes('cruel') || lowerContent.includes('torture') || lowerContent.includes('suffering')) {
        concerns.push('Humanity/dignity concern raised');
      }
    }

    return concerns;
  }

  /**
   * Calculate entropy score (stability assessment)
   * 10 = promotes stability/peace
   * 0 = promotes chaos/conflict
   */
  private static calculateEntropyScore(
    content: string,
    analysis: { sentiment?: number; hostilityScore?: number },
    ethicalConcerns: string[]
  ): number {
    let score = 5; // Start neutral

    // Hostility decreases score
    const hostility = analysis.hostilityScore ?? 0;
    score -= hostility * 3;

    // Negative sentiment slightly decreases score
    const sentiment = analysis.sentiment ?? 0;
    if (sentiment < -0.3) score -= 1;
    if (sentiment > 0.3) score += 0.5;

    // Ethical concerns are signals, not necessarily negative
    // More concerns = more nuanced discussion
    if (ethicalConcerns.length > 0) {
      score += 0.5; // Shows consideration of ethics
    }

    // Check for constructive language
    const lowerContent = content.toLowerCase();
    const constructivePatterns = [
      'solution', 'propose', 'suggest', 'compromise', 'agree', 'understand',
      'perspective', 'consider', 'alternative', 'dialogue', 'cooperation'
    ];
    const constructiveCount = constructivePatterns.filter(p => lowerContent.includes(p)).length;
    score += constructiveCount * 0.3;

    // Check for divisive language
    const divisivePatterns = [
      'enemy', 'destroy', 'hate', 'never', 'always wrong', 'stupid',
      'idiot', 'evil', 'must be stopped', 'threat'
    ];
    const divisiveCount = divisivePatterns.filter(p => lowerContent.includes(p)).length;
    score -= divisiveCount * 0.5;

    // Clamp to 0-10 range
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Determine if related argument supports or refutes the content
   */
  private static determineStance(content: string, relatedContent: string): string {
    // Simple heuristic - could be enhanced with AI
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const relatedWords = new Set(relatedContent.toLowerCase().split(/\s+/));

    // Check for negation patterns
    const negationPatterns = ['not', 'never', 'disagree', 'wrong', 'incorrect', 'false', 'but'];
    const hasNegation = negationPatterns.some(p =>
      relatedContent.toLowerCase().includes(p + ' ' + content.toLowerCase().split(' ')[0])
    );

    if (hasNegation) return 'refute';

    // Check overlap
    let overlap = 0;
    for (const word of contentWords) {
      if (relatedWords.has(word) && word.length > 3) overlap++;
    }

    const overlapRatio = overlap / Math.max(contentWords.size, relatedWords.size);

    if (overlapRatio > 0.4) return 'support';
    return 'neutral';
  }

  /**
   * Generate recommendation based on analysis
   */
  private static generateRecommendation(
    entropyScore: number,
    logicalValidity: number,
    evidenceQuality: number,
    fallacies: string[],
    ethicalConcerns: string[]
  ): string {
    const recommendations: string[] = [];

    if (entropyScore < 3) {
      recommendations.push('This argument may escalate conflict. Consider reframing constructively.');
    }

    if (logicalValidity < 0.4) {
      recommendations.push('The logical structure could be strengthened.');
    }

    if (evidenceQuality < 0.3) {
      recommendations.push('Consider adding supporting evidence or sources.');
    }

    if (fallacies.length > 0) {
      recommendations.push(`Potential logical fallacies detected: ${fallacies.join(', ')}.`);
    }

    if (ethicalConcerns.length > 0) {
      recommendations.push(`Ethical considerations: ${ethicalConcerns.join(', ')}.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('This argument appears well-reasoned and constructive.');
    }

    return recommendations.join(' ');
  }

  /**
   * Format analysis into a public response
   */
  private static formatResponse(analysis: AnalysisResult): string {
    const lines: string[] = [];

    // Entropy assessment
    const stabilityRating = analysis.entropyScore >= 7 ? 'Constructive' :
      analysis.entropyScore >= 4 ? 'Neutral' : 'Potentially divisive';
    lines.push(`**Stability Assessment:** ${stabilityRating} (${analysis.entropyScore.toFixed(1)}/10)`);

    // Logical quality
    const qualityRating = analysis.logicalValidity >= 0.7 ? 'Strong' :
      analysis.logicalValidity >= 0.4 ? 'Moderate' : 'Weak';
    lines.push(`**Logical Quality:** ${qualityRating}`);

    // Evidence
    const evidenceRating = analysis.evidenceQuality >= 0.6 ? 'Well-supported' :
      analysis.evidenceQuality >= 0.3 ? 'Partially supported' : 'Needs more evidence';
    lines.push(`**Evidence:** ${evidenceRating}`);

    // Fallacies
    if (analysis.fallaciesFound.length > 0) {
      lines.push(`**Potential Fallacies:** ${analysis.fallaciesFound.join(', ')}`);
    }

    // Related arguments
    if (analysis.relatedArguments.length > 0) {
      const supporting = analysis.relatedArguments.filter(a => a.supportOrRefute === 'support').length;
      const refuting = analysis.relatedArguments.filter(a => a.supportOrRefute === 'refute').length;
      lines.push(`**Related Arguments:** ${supporting} supporting, ${refuting} challenging`);
    }

    // Recommendation
    lines.push('');
    lines.push(`**Analysis:** ${analysis.recommendation}`);

    return lines.join('\n');
  }

  /**
   * Generate heuristic summary when AI is unavailable
   */
  private static generateHeuristicSummary(
    content: string,
    entropyScore: number,
    fallacies: string[],
    ethicalConcerns: string[]
  ): string {
    const parts: string[] = [];

    if (entropyScore >= 7) {
      parts.push('This argument promotes constructive dialogue.');
    } else if (entropyScore <= 3) {
      parts.push('This argument may increase polarization.');
    }

    if (fallacies.length > 0) {
      parts.push(`Contains potential ${fallacies[0]} reasoning.`);
    }

    if (ethicalConcerns.length > 0) {
      parts.push(`Raises ${ethicalConcerns[0].toLowerCase()}.`);
    }

    return parts.join(' ') || 'Analysis complete.';
  }

  /**
   * Use Azure OpenAI for deeper analysis
   */
  private static async performAIAnalysis(
    content: string,
    argumentContext: Array<{ id: string; content: string; confidence: number }>,
    detectedFallacies: string[]
  ) {
    const contextStr = argumentContext.length > 0
      ? `\n\nRelated arguments from the discourse:\n${argumentContext.map(a =>
        `- (confidence: ${a.confidence.toFixed(2)}) ${a.content}`
      ).join('\n')}`
      : '';

    const fallacyStr = detectedFallacies.length > 0
      ? `\n\nPotentially detected fallacies: ${detectedFallacies.join(', ')}`
      : '';

    const prompt = `Analyze this political argument for logical validity and evidence quality.

Content to analyze:
"${content.substring(0, 1500)}"
${contextStr}
${fallacyStr}

Respond in JSON format:
{
  "logicalValidity": 0.0-1.0,
  "evidenceQuality": 0.0-1.0,
  "summary": "Brief 1-2 sentence summary of the argument's strengths and weaknesses"
}`;

    try {
      const systemPrompt = 'You are an objective logic analyst. Assess arguments fairly regardless of political stance. Focus on reasoning quality, not agreement.';
      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      const response = await azureOpenAI.generateCompletion(fullPrompt, {
        maxTokens: 300,
        temperature: 0.3
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn({ error }, 'AI analysis parsing failed');
    }

    return null;
  }

  /**
   * Generate a conversational response using Azure OpenAI
   * This replaces the scorecard-based formatResponse for user-facing output
   */
  static async generateConversationalResponse(
    fullContent: string,
    context: {
      relatedArguments: Array<{ id: string; content: string; similarity: number }>;
      relatedFacts: Array<{ id: string; claim: string; confidence: number }>;
    }
  ): Promise<string> {
    const systemPrompt = `You are RiseAI, the logical analysis assistant for UnitedWeRise, a civic engagement platform.

CORE FRAMEWORK:
- Entropy/Homeostasis: Favor arguments that promote stability and constructive dialogue over chaos and division
- IHL Principles: Proportionality, Necessity, Distinction, Humanity - assess whether arguments respect these principles
- Political Neutrality: Assess reasoning quality and evidence, not political stance. Present multiple perspectives fairly.
- Evidence-Based: Prioritize claims backed by verifiable facts and credible sources

RESPONSE GUIDELINES:
- Provide thoughtful, balanced analysis that directly addresses the user's question or statement
- Present multiple perspectives fairly when discussing controversial topics
- Cite facts or evidence when available from the provided context
- Be intellectually rigorous but accessible - avoid jargon
- Length: 2-3 paragraphs typically, but adapt as needed to fully address the inquiry
- Do NOT output scores, metrics, or templated assessments
- Respond conversationally as if having a thoughtful discussion`;

    // Build context from related arguments and facts
    let contextStr = '';

    if (context.relatedArguments.length > 0) {
      contextStr += '\n\nRELATED ARGUMENTS FROM THE PLATFORM:\n';
      contextStr += context.relatedArguments.slice(0, 5).map(arg =>
        `- ${arg.content.substring(0, 200)}${arg.content.length > 200 ? '...' : ''}`
      ).join('\n');
    }

    if (context.relatedFacts.length > 0) {
      contextStr += '\n\nRELEVANT FACTS/EVIDENCE:\n';
      contextStr += context.relatedFacts.slice(0, 5).map(fact =>
        `- ${fact.claim} (confidence: ${(fact.confidence * 100).toFixed(0)}%)`
      ).join('\n');
    }

    // Strip @RiseAI mention from the user's message for cleaner prompt
    const userMessage = fullContent.replace(/@rise[-_]?ai\b/gi, '').trim();

    const userPrompt = `USER'S MESSAGE:
${userMessage}
${contextStr}

Please provide a thoughtful, balanced response to the user's message. If they asked a question, answer it directly. If they made an argument, analyze its strengths and weaknesses constructively.`;

    try {
      // Use Tier 1 (gpt-4o) for political analysis quality
      const response = await azureOpenAI.generateTier1Completion(userPrompt, {
        systemMessage: systemPrompt,
        maxTokens: 1000,
        temperature: 0.7
      });

      return response.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, errorMessage, contentLength: fullContent.length }, 'Conversational response generation failed');

      // Provide more specific error feedback
      if (errorMessage.includes('not configured')) {
        return 'RiseAI is temporarily unavailable due to a configuration issue. Please try again later.';
      }
      if (errorMessage.includes('content filter') || errorMessage.includes('content_filter')) {
        return 'I was unable to analyze this content. Please try rephrasing your message.';
      }
      // Generic fallback
      return 'I encountered an issue analyzing your message. This has been logged and will be investigated. Please try again.';
    }
  }

  /**
   * Extract arguments from analyzed content and store in ledger
   */
  private static async extractAndStoreArguments(
    content: string,
    postId: string,
    userId: string,
    analysis: AnalysisResult
  ) {
    try {
      // Check if similar argument already exists
      const embedding = await EmbeddingService.generateEmbedding(content);
      const similar = await ArgumentLedgerService.findSimilarArguments(embedding, 1);

      if (similar.length > 0 && similar[0].similarity > 0.9) {
        // Very similar argument exists, update citation count instead
        await prisma.argumentEntry.update({
          where: { id: similar[0].id },
          data: { citationCount: { increment: 1 } }
        });
        return;
      }

      // Create new argument entry
      await ArgumentLedgerService.createArgument({
        content: content.substring(0, 2000),
        summary: analysis.summary.substring(0, 500),
        sourcePostId: postId,
        sourceUserId: userId,
        logicalValidity: analysis.logicalValidity,
        evidenceQuality: analysis.evidenceQuality,
        entropyScore: analysis.entropyScore
      });
    } catch (error) {
      logger.warn({ error }, 'Failed to extract and store argument');
    }
  }
}
