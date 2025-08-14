import { PrismaClient } from '@prisma/client';
import { emailService } from './emailService';
import { azureOpenAI, AzureOpenAIService } from './azureOpenAIService';
import logger from '../utils/logger';

class ModerationService {
  private prisma: PrismaClient;
  private toxicityThreshold: number;
  private spamKeywords: string[];

  constructor() {
    this.prisma = new PrismaClient();
    this.toxicityThreshold = 0.8; // Confidence threshold for flagging content
    this.spamKeywords = [
      'click here', 'buy now', 'free money', 'guaranteed', 'make money fast',
      'lose weight fast', 'get rich quick', 'no risk', 'limited time',
      'act now', 'urgent', 'congratulations you won', 'claim your prize'
    ];
  }

  // Automated content analysis
  async analyzeContent(content: string, contentType: 'POST' | 'COMMENT' | 'MESSAGE', contentId: string): Promise<void> {
    const flags = [];

    // Spam detection
    const spamScore = this.detectSpam(content);
    if (spamScore > 0.7) {
      flags.push({
        contentType,
        contentId,
        flagType: 'SPAM',
        confidence: spamScore,
        source: 'AUTOMATED',
        details: { spamIndicators: this.getSpamIndicators(content) }
      });
    }

    // Toxicity detection (placeholder - would integrate with real AI service)
    const toxicityScore = await this.detectToxicity(content);
    if (toxicityScore > this.toxicityThreshold) {
      flags.push({
        contentType,
        contentId,
        flagType: 'TOXICITY',
        confidence: toxicityScore,
        source: 'AUTOMATED',
        details: { toxicityScore }
      });
    }

    // Hate speech detection
    const hateSpeechScore = await this.detectHateSpeech(content);
    if (hateSpeechScore > 0.7) {
      flags.push({
        contentType,
        contentId,
        flagType: 'HATE_SPEECH',
        confidence: hateSpeechScore,
        source: 'AUTOMATED',
        details: { flaggedTerms: this.getHateSpeechTerms(content) }
      });
    }

    // Duplicate content detection
    const isDuplicate = await this.detectDuplicateContent(content, contentType);
    if (isDuplicate) {
      flags.push({
        contentType,
        contentId,
        flagType: 'DUPLICATE_CONTENT',
        confidence: 0.9,
        source: 'AUTOMATED',
        details: { duplicateDetection: true }
      });
    }

    // Create flags in database
    for (const flag of flags) {
      await this.prisma.contentFlag.create({
        data: flag
      });
    }

    // Auto-moderate high-confidence violations
    await this.autoModerate(flags, contentId, contentType);
  }

  // Spam detection using keyword matching and patterns
  private detectSpam(content: string): number {
    const lowerContent = content.toLowerCase();
    let spamScore = 0;

    // Check for spam keywords
    const keywordMatches = this.spamKeywords.filter(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    ).length;
    spamScore += (keywordMatches / this.spamKeywords.length) * 0.5;

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) spamScore += 0.3;

    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 2) spamScore += 0.2;

    // Check for excessive links
    const linkCount = (content.match(/https?:\/\/\S+/gi) || []).length;
    if (linkCount > 3) spamScore += 0.4;

    // Check for repetitive patterns
    const words = content.split(' ');
    const uniqueWords = new Set(words);
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    if (repetitionRatio > 0.7) spamScore += 0.3;

    return Math.min(spamScore, 1.0);
  }

  // Azure OpenAI-powered toxicity detection
  private async detectToxicity(content: string): Promise<number> {
    try {
      const moderationPrompt = `Analyze this content for toxicity, harassment, or harmful language. Focus on:
- Personal attacks or threats
- Hate speech targeting individuals or groups
- Severely inappropriate language
- Content that could cause harm

Content: "${content.slice(0, 1000)}"

Respond with JSON only:
{
  "toxicityScore": 0.0-1.0,
  "reasoning": "brief explanation",
  "categories": ["category1", "category2"]
}`;

      const response = await azureOpenAI['client']?.chat.completions.create({
        model: azureOpenAI['chatDeployment'] || 'gpt-35-turbo',
        messages: [
          {
            role: "system",
            content: "You are a content moderation assistant. Analyze content objectively and provide toxicity scores. Be conservative - only flag genuinely harmful content, not political opinions."
          },
          {
            role: "user", 
            content: moderationPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });
      
      if (!response?.choices[0]?.message?.content) {
        throw new Error('No response from Azure OpenAI');
      }
      
      const analysisMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!analysisMatch) {
        throw new Error('No JSON found in response');
      }
      
      const analysis = JSON.parse(analysisMatch[0]);
      logger.debug('Toxicity analysis completed', { 
        score: analysis.toxicityScore, 
        categories: analysis.categories 
      });
      
      return Math.min(Math.max(analysis.toxicityScore || 0, 0), 1.0);
      
    } catch (error) {
      logger.warn('Azure OpenAI toxicity detection failed, using fallback:', error);
      
      // Fallback to simple keyword matching
      const toxicWords = [
        'hate', 'kill', 'die', 'stupid', 'idiot', 'moron', 'retard',
        'nazi', 'terrorist', 'scum', 'trash', 'worthless'
      ];
      
      const lowerContent = content.toLowerCase();
      const toxicMatches = toxicWords.filter(word => 
        lowerContent.includes(word)
      ).length;
      
      return Math.min(toxicMatches / 5, 1.0);
    }
  }

  // Azure OpenAI-powered hate speech detection
  private async detectHateSpeech(content: string): Promise<number> {
    try {
      const hateSpeechPrompt = `Analyze this content for hate speech targeting individuals or groups based on:
- Race, ethnicity, or nationality
- Religion or beliefs
- Gender identity or sexual orientation
- Disability or other protected characteristics

Content: "${content.slice(0, 1000)}"

Respond with JSON only:
{
  "hateSpeechScore": 0.0-1.0,
  "reasoning": "brief explanation",
  "targetedGroups": ["group1", "group2"]
}`;

      const response = await azureOpenAI['client']?.chat.completions.create({
        model: azureOpenAI['chatDeployment'] || 'gpt-35-turbo',
        messages: [
          {
            role: "system",
            content: "You are a hate speech detection system. Focus on content that targets or dehumanizes specific groups. Political criticism or disagreement is not hate speech unless it targets identity groups."
          },
          {
            role: "user", 
            content: hateSpeechPrompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      });
      
      if (!response?.choices[0]?.message?.content) {
        throw new Error('No response from Azure OpenAI');
      }
      
      const analysisMatch = response.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (!analysisMatch) {
        throw new Error('No JSON found in response');
      }
      
      const analysis = JSON.parse(analysisMatch[0]);
      logger.debug('Hate speech analysis completed', { 
        score: analysis.hateSpeechScore, 
        targetedGroups: analysis.targetedGroups 
      });
      
      return Math.min(Math.max(analysis.hateSpeechScore || 0, 0), 1.0);
      
    } catch (error) {
      logger.warn('Azure OpenAI hate speech detection failed, using fallback:', error);
      
      // Fallback to pattern detection
      const lowerContent = content.toLowerCase();
      let score = 0;
      
      // Check for targeted harassment patterns
      if (lowerContent.includes('you people') || lowerContent.includes('your kind')) {
        score += 0.3;
      }
      
      // Check for dehumanizing language
      if (lowerContent.includes('animals') || lowerContent.includes('vermin')) {
        score += 0.4;
      }
      
      return Math.min(score, 1.0);
    }
  }

  // Semantic duplicate content detection using Azure OpenAI embeddings
  private async detectDuplicateContent(content: string, contentType: 'POST' | 'COMMENT' | 'MESSAGE'): Promise<boolean> {
    try {
      // Generate embedding for the new content
      const contentEmbedding = await azureOpenAI.generateEmbedding(content);
      
      // Get recent posts with embeddings from the database
      const recentPosts = await this.prisma.post.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          embedding: {
            isEmpty: false
          }
        },
        select: {
          id: true,
          content: true,
          embedding: true
        },
        take: 100 // Limit for performance
      });
      
      // Check for high similarity (potential duplicates)
      for (const post of recentPosts) {
        if (post.embedding && Array.isArray(post.embedding)) {
          const similarity = AzureOpenAIService.calculateSimilarity(
            contentEmbedding.embedding, 
            post.embedding as number[]
          );
          
          // High similarity threshold for duplicate detection
          if (similarity > 0.95) {
            logger.info('Potential duplicate content detected', {
              similarity,
              originalPostId: post.id,
              originalContent: post.content.slice(0, 100)
            });
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      logger.warn('Semantic duplicate detection failed, using exact match fallback:', error);
      
      // Fallback to exact content matching
      const recentContent = await this.prisma.post.findMany({
        where: {
          content,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        take: 1
      });

      return recentContent.length > 0;
    }
  }

  // Get spam indicators for reporting
  private getSpamIndicators(content: string): string[] {
    const indicators = [];
    const lowerContent = content.toLowerCase();

    this.spamKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        indicators.push(`Contains spam keyword: "${keyword}"`);
      }
    });

    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) indicators.push('Excessive capitalization');

    const linkCount = (content.match(/https?:\/\/\S+/gi) || []).length;
    if (linkCount > 3) indicators.push('Excessive links');

    return indicators;
  }

  // Get hate speech terms found (sanitized for logging)
  private getHateSpeechTerms(content: string): string[] {
    // Return generic indicators rather than actual terms
    return ['Potentially offensive language detected'];
  }

  // Auto-moderation for high-confidence violations
  private async autoModerate(flags: any[], contentId: string, contentType: string): Promise<void> {
    const highConfidenceFlags = flags.filter(flag => flag.confidence > 0.9);
    
    if (highConfidenceFlags.length > 0) {
      // Auto-hide content with high confidence spam/toxicity
      const severeFlags = highConfidenceFlags.filter(flag => 
        ['TOXICITY', 'HATE_SPEECH', 'SPAM'].includes(flag.flagType)
      );

      if (severeFlags.length > 0) {
        // Mark content as hidden/deleted based on severity
        if (contentType === 'POST') {
          // Would implement content hiding logic
          console.log(`Auto-moderating post ${contentId} due to high-confidence violations`);
        }
      }
    }
  }

  // Create user report
  async createReport(
    reporterId: string,
    targetType: 'POST' | 'COMMENT' | 'USER' | 'MESSAGE',
    targetId: string,
    reason: string,
    description?: string
  ): Promise<string> {
    const priority = this.determinePriority(reason);
    
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason: reason as any,
        description,
        priority
      }
    });

    // Auto-escalate urgent reports
    if (priority === 'URGENT') {
      await this.escalateReport(report.id);
    }

    return report.id;
  }

  // Determine report priority based on reason
  private determinePriority(reason: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    const urgentReasons = ['VIOLENCE_THREATS', 'SELF_HARM', 'ILLEGAL_CONTENT'];
    const highPriorityReasons = ['HATE_SPEECH', 'HARASSMENT', 'FAKE_ACCOUNT'];
    const mediumPriorityReasons = ['MISINFORMATION', 'IMPERSONATION'];

    if (urgentReasons.includes(reason)) return 'URGENT';
    if (highPriorityReasons.includes(reason)) return 'HIGH';
    if (mediumPriorityReasons.includes(reason)) return 'MEDIUM';
    return 'LOW';
  }

  // Escalate urgent reports
  private async escalateReport(reportId: string): Promise<void> {
    console.log(`URGENT: Report ${reportId} requires immediate attention`);
    // In production: send notifications to moderators, create alerts, etc.
  }

  // Get user suspension status
  async getUserSuspensionStatus(userId: string): Promise<{
    isSuspended: boolean;
    suspension?: any;
    canPost: boolean;
    canComment: boolean;
  }> {
    const activeSuspension = await this.prisma.userSuspension.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [
          { endsAt: null }, // Permanent
          { endsAt: { gte: new Date() } } // Not expired
        ]
      }
    });

    if (!activeSuspension) {
      return {
        isSuspended: false,
        canPost: true,
        canComment: true
      };
    }

    const canPost = !['PERMANENT', 'TEMPORARY', 'POSTING_RESTRICTED'].includes(activeSuspension.type);
    const canComment = !['PERMANENT', 'TEMPORARY', 'COMMENTING_RESTRICTED'].includes(activeSuspension.type);

    return {
      isSuspended: true,
      suspension: activeSuspension,
      canPost,
      canComment
    };
  }

  // Issue user warning
  async issueWarning(
    userId: string,
    moderatorId: string,
    reason: string,
    severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'FINAL',
    notes?: string
  ): Promise<void> {
    await this.prisma.userWarning.create({
      data: {
        userId,
        moderatorId,
        reason,
        severity,
        notes
      }
    });

    // Send warning email
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true }
      });

      if (user) {
        const emailTemplate = emailService.generateWarningTemplate(
          user.email,
          reason,
          severity,
          user.firstName || undefined
        );
        await emailService.sendEmail(emailTemplate);
      }
    } catch (error) {
      console.error('Failed to send warning email:', error);
    }

    // Auto-suspend on final warning
    if (severity === 'FINAL') {
      await this.suspendUser(userId, moderatorId, 'Final warning issued', 'TEMPORARY', 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      );
    }
  }

  // Suspend user
  async suspendUser(
    userId: string,
    moderatorId: string,
    reason: string,
    type: 'TEMPORARY' | 'PERMANENT' | 'POSTING_RESTRICTED' | 'COMMENTING_RESTRICTED',
    endsAt?: Date
  ): Promise<void> {
    // Deactivate existing suspensions
    await this.prisma.userSuspension.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    });

    // Create new suspension
    await this.prisma.userSuspension.create({
      data: {
        userId,
        moderatorId,
        reason,
        type,
        endsAt
      }
    });

    // Update user suspension status
    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: true }
    });

    // Send suspension email
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true }
      });

      if (user) {
        const emailTemplate = emailService.generateSuspensionTemplate(
          user.email,
          reason,
          type,
          endsAt,
          user.firstName || undefined
        );
        await emailService.sendEmail(emailTemplate);
      }
    } catch (error) {
      console.error('Failed to send suspension email:', error);
    }
  }

  // Cleanup expired suspensions
  async cleanupExpiredSuspensions(): Promise<void> {
    const expired = await this.prisma.userSuspension.findMany({
      where: {
        isActive: true,
        endsAt: { lte: new Date() }
      }
    });

    for (const suspension of expired) {
      await this.prisma.userSuspension.update({
        where: { id: suspension.id },
        data: { isActive: false }
      });

      // Check if user has other active suspensions
      const otherActive = await this.prisma.userSuspension.findFirst({
        where: {
          userId: suspension.userId,
          isActive: true,
          id: { not: suspension.id }
        }
      });

      if (!otherActive) {
        await this.prisma.user.update({
          where: { id: suspension.userId },
          data: { isSuspended: false }
        });
      }
    }
  }
}

export const moderationService = new ModerationService();