import { prisma } from '../lib/prisma';
import type { PrismaClient } from '@prisma/client';
/**
 * Reputation Service for UnitedWeRise
 * 
 * Simple 0-100 scoring system focused on behavior, not content
 * - Starts at 70 for new users
 * - No automatic decay (scores only change through actions)
 * - Per-post penalty cap (prevents pile-ons)
 * - Mild algorithmic effects (±10-20% visibility)
 */

import { azureOpenAI } from './azureOpenAIService';
import logger from '../utils/logger';

// Score thresholds and effects
const SCORE_CONFIG = {
  starting: 70,
  min: 0,
  max: 100,
  thresholds: {
    boost: 95,        // +10% visibility
    normal: 50,       // 1.0x visibility  
    suppress1: 30,    // -10% visibility (0.9x)
    suppress2: 0      // -20% visibility (0.8x)
  }
};

// Penalty values (per post)
const PENALTIES = {
  hate_speech: -10,
  harassment: -8,
  spam: -2,
  excessive_profanity: -3,
  personal_attack: -1
};

// Reward values (daily max +2)
const REWARDS = {
  quality_post: 0.5,      // 5+ diverse likes
  constructive: 0.25,     // Constructive dialogue
  helpful: 0.25,          // Helpful content
  positive_feedback: 0.25 // Community feedback
};

const DAILY_MAX_GAIN = 2;

interface ReputationEvent {
  userId: string;
  eventType: string; // PENALTY_HATE_SPEECH, REWARD_QUALITY_POST, etc.
  reason: string;
  impact: number;
  postId?: string;
  validated: boolean;
  details?: any;
}

interface ReputationScore {
  current: number;
  tier: 'boosted' | 'normal' | 'suppressed' | 'heavily_suppressed';
  visibilityMultiplier: number;
  lastUpdated: Date;
}

/**
 * User reputation scoring service
 *
 * Simple 0-100 scoring system focused on behavior, not content:
 * - New users start at 70
 * - No automatic decay (scores only change through actions)
 * - Per-post penalty cap (prevents pile-ons from mass reports)
 * - Daily reward cap of +2 points (prevents gaming)
 * - Mild algorithmic effects: ±10-20% visibility multiplier
 * - AI validation for penalties and appeals
 *
 * Score tiers:
 * - 95-100: Boosted visibility (+10%)
 * - 50-94: Normal visibility
 * - 30-49: Suppressed visibility (-10%)
 * - 0-29: Heavily suppressed (-20%)
 */
export class ReputationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Get user's current reputation score with tier and visibility info
   *
   * Initializes reputation to 70 for new users if not set.
   * Returns score, tier classification, and visibility multiplier.
   *
   * @param userId - User ID to fetch reputation for
   * @returns Promise<ReputationScore> Current score, tier, multiplier, and last update date
   * @throws {Error} When user not found
   *
   * @example
   * const rep = await reputationService.getUserReputation('user_123');
   * console.log(rep.current); // 73
   * console.log(rep.tier); // "normal"
   * console.log(rep.visibilityMultiplier); // 1.0
   */
  async getUserReputation(userId: string): Promise<ReputationScore> {
    try {
      let user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          reputationScore: true, 
          reputationUpdatedAt: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Initialize reputation if not set
      if (user.reputationScore === null || user.reputationScore === undefined) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { 
            reputationScore: SCORE_CONFIG.starting,
            reputationUpdatedAt: new Date()
          }
        });
        user.reputationScore = SCORE_CONFIG.starting;
        user.reputationUpdatedAt = new Date();
      }

      const score = user.reputationScore;
      const tier = this.getTier(score);
      const visibilityMultiplier = this.getVisibilityMultiplier(score);

      return {
        current: score,
        tier,
        visibilityMultiplier,
        lastUpdated: user.reputationUpdatedAt || user.createdAt
      };
    } catch (error) {
      logger.error('Failed to get user reputation:', error);
      throw error;
    }
  }

  /**
   * Apply reputation change with validation and safety checks
   *
   * Validation checks:
   * - Penalties require validated flag to be true
   * - Rewards respect daily gain limit (+2 max per day)
   * - Prevents duplicate penalties on same post
   * - Clamps final score to 0-100 range
   *
   * Logs all changes to ReputationEvent table for audit trail.
   *
   * @param event - Reputation event data with type, impact, and validation status
   * @returns Promise<ReputationScore> Updated reputation score and tier
   * @throws {Error} When database operations fail
   *
   * @example
   * const newRep = await reputationService.applyReputationChange({
   *   userId: 'user_123',
   *   eventType: 'PENALTY_HATE_SPEECH',
   *   reason: 'Targeted harassment',
   *   impact: -10,
   *   postId: 'post_456',
   *   validated: true,
   *   details: { analysis: {...} }
   * });
   * console.log(newRep.current); // 63 (was 73, -10 penalty)
   */
  async applyReputationChange(event: ReputationEvent): Promise<ReputationScore> {
    try {
      // Get current reputation
      const current = await this.getUserReputation(event.userId);
      
      // Check if this is a penalty that needs validation
      if (event.eventType.startsWith('PENALTY_') && !event.validated) {
        logger.warn('Penalty event requires validation', event);
        return current;
      }

      // Check daily gain limit for rewards
      if (event.eventType.startsWith('REWARD_')) {
        const todayGain = await this.getTodayGain(event.userId);
        if (todayGain >= DAILY_MAX_GAIN) {
          logger.info('User hit daily gain limit', { userId: event.userId, todayGain });
          return current;
        }
        // Reduce points if would exceed daily limit
        if (todayGain + event.impact > DAILY_MAX_GAIN) {
          event.impact = DAILY_MAX_GAIN - todayGain;
        }
      }

      // Check for duplicate post penalties
      if (event.eventType.startsWith('PENALTY_') && event.postId) {
        const existingPenalty = await this.prisma.reputationEvent.findFirst({
          where: {
            userId: event.userId,
            postId: event.postId,
            eventType: { startsWith: 'PENALTY_' }
          }
        });
        
        if (existingPenalty) {
          logger.info('Post already has penalty applied', { postId: event.postId });
          return current;
        }
      }

      // Calculate new score
      const newScore = Math.max(
        SCORE_CONFIG.min, 
        Math.min(SCORE_CONFIG.max, current.current + event.impact)
      );

      // Update user score
      await this.prisma.user.update({
        where: { id: event.userId },
        data: { 
          reputationScore: newScore,
          reputationUpdatedAt: new Date()
        }
      });

      // Log the event
      await this.logReputationEvent(event, current.current, newScore);

      return {
        current: newScore,
        tier: this.getTier(newScore),
        visibilityMultiplier: this.getVisibilityMultiplier(newScore),
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error('Failed to apply reputation change:', error);
      throw error;
    }
  }

  /**
   * Analyze content and apply appropriate penalties automatically
   *
   * Uses Azure OpenAI to detect:
   * - Hate speech (-10 points)
   * - Harassment (-8 points)
   * - Spam (-2 points)
   * - Excessive profanity (-3 points)
   * - Personal attacks (-1 point)
   *
   * AI analysis counts as validation (validated: true).
   * All penalties for single post are combined into one event.
   *
   * @param content - Content text to analyze
   * @param userId - User ID who created the content
   * @param postId - Post ID being analyzed
   * @returns Promise<Object> Array of penalty types and total penalty amount
   * @throws {Error} When database operations fail (AI failures fall back to no penalties)
   *
   * @example
   * const result = await reputationService.analyzeAndApplyPenalties(
   *   'This is spam with hate speech',
   *   'user_123',
   *   'post_456'
   * );
   * console.log(result.penalties); // ['spam', 'hate_speech']
   * console.log(result.totalPenalty); // -12
   */
  async analyzeAndApplyPenalties(
    content: string,
    userId: string,
    postId: string
  ): Promise<{ penalties: string[], totalPenalty: number }> {
    try {
      const penalties: string[] = [];
      let totalPenalty = 0;

      // AI content analysis
      const analysis = await this.analyzeContent(content);
      
      if (analysis.hate_speech) {
        penalties.push('hate_speech');
        totalPenalty += PENALTIES.hate_speech;
      }
      
      if (analysis.harassment) {
        penalties.push('harassment');
        totalPenalty += PENALTIES.harassment;
      }
      
      if (analysis.spam) {
        penalties.push('spam');
        totalPenalty += PENALTIES.spam;
      }
      
      if (analysis.excessive_profanity) {
        penalties.push('excessive_profanity');
        totalPenalty += PENALTIES.excessive_profanity;
      }
      
      if (analysis.personal_attack) {
        penalties.push('personal_attack');
        totalPenalty += PENALTIES.personal_attack;
      }

      // Apply penalty if any issues found
      if (totalPenalty < 0) {
        await this.applyReputationChange({
          userId,
          eventType: 'PENALTY_AI_ANALYSIS',
          reason: penalties.join(', '),
          impact: totalPenalty,
          postId,
          validated: true, // AI analysis counts as validation
          details: { analysis }
        });
      }

      return { penalties, totalPenalty };

    } catch (error) {
      logger.error('Failed to analyze content for penalties:', error);
      return { penalties: [], totalPenalty: 0 };
    }
  }

  /**
   * Generate pre-post content warning for user
   *
   * Analyzes content before posting and warns user if issues detected.
   * Does NOT apply penalties - only preview of potential impact.
   * Allows user to revise or proceed with posting anyway.
   *
   * Philosophy: "We don't aim to prevent anyone from sharing their ideas,
   * but please keep things civil."
   *
   * @param content - Content user wants to post
   * @param userId - User ID (unused currently, for future personalization)
   * @returns Promise<Object> Warning data with issues, penalty, and message
   * @throws {Error} When AI analysis fails (returns no warning on error)
   *
   * @example
   * const warning = await reputationService.generateContentWarning(
   *   'This contains some harsh language',
   *   'user_123'
   * );
   * if (warning.showWarning) {
   *   console.log(warning.message); // Shows friendly warning
   *   console.log(warning.potentialPenalty); // -3
   * }
   */
  async generateContentWarning(
    content: string,
    userId: string
  ): Promise<{
    showWarning: boolean;
    issues: string[];
    potentialPenalty: number;
    message: string;
  }> {
    try {
      const analysis = await this.analyzeContent(content);
      const issues: string[] = [];
      let potentialPenalty = 0;

      if (analysis.hate_speech) {
        issues.push('hate speech');
        potentialPenalty += PENALTIES.hate_speech;
      }
      if (analysis.harassment) {
        issues.push('harassment');
        potentialPenalty += PENALTIES.harassment;
      }
      if (analysis.spam) {
        issues.push('spam/duplicate content');
        potentialPenalty += PENALTIES.spam;
      }
      if (analysis.excessive_profanity) {
        issues.push('excessive profanity');
        potentialPenalty += PENALTIES.excessive_profanity;
      }
      if (analysis.personal_attack) {
        issues.push('personal attack');
        potentialPenalty += PENALTIES.personal_attack;
      }

      if (issues.length === 0) {
        return {
          showWarning: false,
          issues: [],
          potentialPenalty: 0,
          message: ''
        };
      }

      const message = `We don't aim to prevent anyone from sharing their ideas, but please keep things civil.

Your post contains: ${issues.join(', ')}

To maintain a positive community environment, we kindly ask you to reconsider how you might convey your ideas in a more constructive manner.

You may still post, but this content will be flagged and may affect your Community Reputation Score (potential impact: ${potentialPenalty} points).`;

      return {
        showWarning: true,
        issues,
        potentialPenalty,
        message
      };

    } catch (error) {
      logger.error('Failed to generate content warning:', error);
      return {
        showWarning: false,
        issues: [],
        potentialPenalty: 0,
        message: ''
      };
    }
  }

  /**
   * Award reputation for positive community contributions
   *
   * Reward amounts (all subject to +2 daily max):
   * - quality_post: +0.5 (post with 5+ diverse likes)
   * - constructive: +0.25 (constructive dialogue)
   * - helpful: +0.25 (helpful content)
   * - positive_feedback: +0.25 (community appreciation)
   *
   * Daily cap prevents gaming through mass posting.
   *
   * @param userId - User ID to reward
   * @param reason - Reason for reward
   * @param postId - Optional post ID that triggered reward
   * @returns Promise<ReputationScore> Updated reputation
   * @throws {Error} When database operations fail
   *
   * @example
   * const newRep = await reputationService.awardReputation(
   *   'user_123',
   *   'quality_post',
   *   'post_456'
   * );
   * console.log(newRep.current); // 73.5 (was 73, +0.5 reward)
   */
  async awardReputation(
    userId: string,
    reason: 'quality_post' | 'constructive' | 'helpful' | 'positive_feedback',
    postId?: string
  ): Promise<ReputationScore> {
    const points = REWARDS[reason];
    
    return this.applyReputationChange({
      userId,
      eventType: 'REWARD_QUALITY_POST',
      reason,
      impact: points,
      postId,
      validated: true
    });
  }

  /**
   * Process community report with AI validation
   *
   * Validates report using AI to prevent weaponized reporting.
   * Only applies penalty if AI confirms violation (confidence > 0.7).
   *
   * Anti-abuse measures:
   * - AI validates report content matches reason
   * - Filters out reports against unpopular political opinions
   * - Focus on behavior/tone, not political positions
   *
   * @param reporterId - User ID submitting report
   * @param targetUserId - User ID being reported
   * @param postId - Post ID being reported
   * @param reason - Reason category (hate_speech, harassment, spam, etc.)
   * @param content - Actual post content to validate
   * @returns Promise<Object> Whether report accepted and penalty applied
   * @throws {Error} When database operations fail
   *
   * @example
   * const result = await reputationService.processReport(
   *   'reporter_123',
   *   'target_456',
   *   'post_789',
   *   'harassment',
   *   'Actual post content here...'
   * );
   * console.log(result.accepted); // true
   * console.log(result.penalty); // -8
   */
  async processReport(
    reporterId: string,
    targetUserId: string,
    postId: string,
    reason: string,
    content: string
  ): Promise<{ accepted: boolean; penalty?: number }> {
    try {
      // AI validation of the report
      const isValid = await this.validateReport(content, reason);
      
      if (!isValid) {
        logger.info('Report not validated by AI', { reporterId, reason });
        return { accepted: false };
      }

      // Apply penalty based on reason
      let penalty = 0;
      switch (reason.toLowerCase()) {
        case 'hate_speech':
          penalty = PENALTIES.hate_speech;
          break;
        case 'harassment':
          penalty = PENALTIES.harassment;
          break;
        case 'spam':
          penalty = PENALTIES.spam;
          break;
        case 'personal_attack':
          penalty = PENALTIES.personal_attack;
          break;
        default:
          penalty = -1; // Generic penalty for other validated reports
      }

      await this.applyReputationChange({
        userId: targetUserId,
        eventType: 'PENALTY_COMMUNITY_REPORT',
        reason: `community_report_${reason}`,
        impact: penalty,
        postId,
        validated: true,
        details: { reporterId }
      });

      return { accepted: true, penalty };

    } catch (error) {
      logger.error('Failed to process report:', error);
      return { accepted: false };
    }
  }

  /**
   * Process user appeal of reputation penalty
   *
   * AI reviews original penalty against user's appeal explanation.
   * Low confidence (< 0.7) appeals flagged for human admin review.
   *
   * If overturned:
   * - Points restored via REWARD_APPEAL_OVERTURNED event
   * - Original event marked with overturned flag
   *
   * Philosophy: "Err on the side of free speech - overturn if reasonable doubt."
   *
   * @param userId - User ID appealing (must match event userId)
   * @param eventId - ReputationEvent ID being appealed
   * @param reason - User's appeal explanation
   * @returns Promise<Object> Decision (overturned/upheld/under_review) and explanation
   * @throws {Error} When event not found, unauthorized, or database fails
   *
   * @example
   * const result = await reputationService.processAppeal(
   *   'user_123',
   *   'event_456',
   *   'This was taken out of context. I was quoting someone else.'
   * );
   * if (result.decision === 'overturned') {
   *   console.log('Points restored!');
   * }
   * console.log(result.explanation); // AI reasoning
   */
  async processAppeal(
    userId: string,
    eventId: string,
    reason: string
  ): Promise<{ decision: 'overturned' | 'upheld' | 'under_review'; explanation: string }> {
    try {
      // Get the original event
      const event = await this.prisma.reputationEvent.findUnique({
        where: { id: eventId }
      });

      if (!event || event.userId !== userId) {
        throw new Error('Event not found or unauthorized');
      }

      // AI review of the appeal
      const review = await this.reviewAppeal(event, reason);
      
      if (review.confidence < 0.7) {
        // Flag for admin review
        await this.flagForAdminReview(eventId, reason, review);
        return {
          decision: 'under_review',
          explanation: 'Your appeal has been flagged for admin review due to complexity. You will receive a response within 48 hours.'
        };
      }

      if (review.overturn) {
        // Restore the points
        await this.applyReputationChange({
          userId,
          eventType: 'REWARD_APPEAL_OVERTURNED',
          reason: 'appeal_overturned',
          impact: Math.abs(event.impact),
          validated: true,
          details: { originalEventId: eventId }
        });

        // Mark original event as overturned
        await this.prisma.reputationEvent.update({
          where: { id: eventId },
          data: { 
            details: { 
              ...event.details as any, 
              overturned: true, 
              appealReason: reason 
            }
          }
        });

        return {
          decision: 'overturned',
          explanation: review.explanation
        };
      } else {
        return {
          decision: 'upheld',
          explanation: review.explanation
        };
      }

    } catch (error) {
      logger.error('Failed to process appeal:', error);
      throw error;
    }
  }

  // Private helper methods

  private getTier(score: number): 'boosted' | 'normal' | 'suppressed' | 'heavily_suppressed' {
    if (score >= SCORE_CONFIG.thresholds.boost) return 'boosted';
    if (score >= SCORE_CONFIG.thresholds.normal) return 'normal';
    if (score >= SCORE_CONFIG.thresholds.suppress1) return 'suppressed';
    return 'heavily_suppressed';
  }

  private getVisibilityMultiplier(score: number): number {
    if (score >= SCORE_CONFIG.thresholds.boost) return 1.1;   // +10%
    if (score >= SCORE_CONFIG.thresholds.normal) return 1.0;  // Normal
    if (score >= SCORE_CONFIG.thresholds.suppress1) return 0.9; // -10%
    return 0.8; // -20%
  }

  private async getTodayGain(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await this.prisma.reputationEvent.findMany({
      where: {
        userId,
        eventType: 'REWARD_QUALITY_POST',
        createdAt: { gte: today }
      }
    });

    return events.reduce((sum, event) => sum + event.impact, 0);
  }

  private async analyzeContent(content: string): Promise<{
    hate_speech: boolean;
    harassment: boolean;
    spam: boolean;
    excessive_profanity: boolean;
    personal_attack: boolean;
  }> {
    try {
      const analysisPrompt = `Analyze this content for community standards violations:

"${content.slice(0, 1000)}"

Check for:
1. Hate speech targeting identity groups
2. Harassment of specific individuals  
3. Spam or duplicate-like content
4. Excessive profanity (7+ instances, but consider context - is it offensive or just expressive?)
5. Direct personal attacks on users

Respond with JSON only:
{
  "hate_speech": boolean,
  "harassment": boolean, 
  "spam": boolean,
  "excessive_profanity": boolean,
  "personal_attack": boolean
}`;

      // Use General tier (gpt-4o-mini) for content moderation pattern matching
      const response = await azureOpenAI.generateGeneralCompletion(analysisPrompt, {
        maxTokens: 150,
        temperature: 0.1,
        systemMessage: "You are a content moderation system. Be conservative - only flag clear violations. Political opinions and passionate expression are allowed. Focus on behavior, not content."
      });

      const analysis = JSON.parse(response);
      return analysis;

    } catch (error) {
      logger.warn('Content analysis failed, defaulting to no violations:', error);
      return {
        hate_speech: false,
        harassment: false,
        spam: false,
        excessive_profanity: false,
        personal_attack: false
      };
    }
  }

  private async validateReport(content: string, reason: string): Promise<boolean> {
    try {
      const prompt = `A user reported this content for "${reason}":

"${content}"

Is this report valid? Consider:
- Is the content actually violating the stated reason?
- Are users potentially weaponizing reports against opinions they disagree with?
- Focus on behavior/tone, not political positions

Respond with JSON: {"valid": boolean, "confidence": 0.0-1.0}`;

      // Use General tier (gpt-4o-mini) for report validation pattern matching
      const response = await azureOpenAI.generateGeneralCompletion(prompt, {
        maxTokens: 100,
        temperature: 0.1,
        systemMessage: "You validate user reports. Be skeptical of reports against unpopular political opinions. Only validate clear behavioral violations."
      });

      const result = JSON.parse(response);
      return result.valid && result.confidence > 0.7;

    } catch (error) {
      logger.warn('Report validation failed:', error);
      return false;
    }
  }

  private async reviewAppeal(event: any, appealReason: string): Promise<{
    overturn: boolean;
    confidence: number;
    explanation: string;
  }> {
    try {
      const prompt = `Review this reputation penalty appeal:

Original penalty: ${event.impact} points for "${event.reason}"
User's appeal: "${appealReason}"

Was the original penalty justified? Consider:
- Could this have been an error in AI judgment?
- Is this a case of legitimate political speech being penalized?
- Does the user provide compelling context?

Respond with JSON:
{
  "overturn": boolean,
  "confidence": 0.0-1.0,
  "explanation": "brief reasoning"
}`;

      // Use General tier (gpt-4o-mini) for appeal review pattern matching
      const response = await azureOpenAI.generateGeneralCompletion(prompt, {
        maxTokens: 200,
        temperature: 0.2,
        systemMessage: "You review appeals of reputation penalties. Err on the side of free speech - overturn penalties if there's reasonable doubt."
      });

      return JSON.parse(response);

    } catch (error) {
      logger.warn('Appeal review failed:', error);
      return {
        overturn: false,
        confidence: 0.5,
        explanation: 'Unable to process appeal automatically. Flagged for admin review.'
      };
    }
  }

  private async flagForAdminReview(eventId: string, appealReason: string, review: any): Promise<void> {
    // In a real implementation, this would notify admins
    logger.info('Appeal flagged for admin review', {
      eventId,
      appealReason,
      aiReview: review
    });
  }

  private async logReputationEvent(
    event: ReputationEvent,
    oldScore: number,
    newScore: number
  ): Promise<void> {
    await this.prisma.reputationEvent.create({
      data: {
        userId: event.userId,
        eventType: event.eventType,
        reason: event.reason,
        impact: event.impact,
        postId: event.postId,
        details: event.details || {}
      }
    });
  }
}

export const reputationService = new ReputationService();