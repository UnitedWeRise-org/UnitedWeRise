/**
 * Feedback Analysis Service
 * 
 * Uses Azure OpenAI to detect and categorize user feedback about 
 * the UnitedWeRise platform itself.
 * 
 * Migrated from Qwen/Qdrant to Azure OpenAI for production deployment.
 */

import { azureOpenAI, AzureOpenAIService } from './azureOpenAIService';
import { prisma } from '../lib/prisma';
import logger from '../utils/logger';

export interface FeedbackAnalysis {
    isFeedback: boolean;
    type?: 'suggestion' | 'bug_report' | 'concern' | 'feature_request';
    category?: 'ui_ux' | 'performance' | 'functionality' | 'accessibility' | 'moderation' | 'content' | 'general';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    summary?: string;
    confidence: number;
    actionable?: boolean;
    keywords?: string[];
}

export class FeedbackAnalysisService {
    // Pre-computed embeddings for feedback reference phrases
    private feedbackEmbeddings: Map<string, number[]> = new Map();
    private isEmbeddingsInitialized = false;
    
    private feedbackKeywords = {
        suggestion: [
            'suggest', 'recommend', 'should add', 'would be nice', 'feature request',
            'could improve', 'better if', 'enhance', 'upgrade', 'add feature',
            'would be great', 'maybe you could', 'it would help', 'consider adding',
            'should be able', 'shouldn\'t be able', 'should just', 'should have',
            'needs to', 'would prefer', 'instead of', 'rather than'
        ],
        bug_report: [
            'bug', 'error', 'broken', 'not working', 'glitch', 'issue', 'problem',
            'crash', 'freeze', 'loading', 'fail', 'incorrect', 'wrong'
        ],
        concern: [
            'concern', 'worried about', 'problem with', 'disappointed',
            'frustrated', 'confusing', 'unclear', 'difficult', 'hard to'
        ],
        ui_ux: [
            'interface', 'design', 'layout', 'button', 'menu', 'navigation',
            'hard to find', 'confusing layout', 'user experience', 'mobile',
            'scroll', 'feed', 'timeline', 'infinite', 'pagination', 'load more',
            'end of', 'populate', 'refresh', 'update', 'social media'
        ],
        performance: [
            'slow', 'fast', 'loading', 'lag', 'speed', 'performance',
            'timeout', 'response time', 'optimization'
        ],
        accessibility: [
            'accessibility', 'screen reader', 'keyboard', 'contrast',
            'font size', 'color blind', 'disability', 'inclusive'
        ]
    };

    // Reference feedback phrases for vector similarity
    private feedbackReferencePhrases = {
        bug_report: [
            "The website is broken and not working properly",
            "This site has bugs and errors that need fixing", 
            "The platform is slow and crashes frequently",
            "There are performance issues with loading"
        ],
        suggestion: [
            "It would be great if this website had new features",
            "I suggest improving the user interface design",
            "The platform could be enhanced with better functionality",
            "Maybe you could add more useful tools"
        ],
        concern: [
            "I'm worried about the usability of this site",
            "The website design is confusing and unclear",
            "It's difficult to navigate this platform effectively",
            "This interface is frustrating to use"
        ],
        ui_ux: [
            "The navigation menu needs better design",
            "The user interface could be more intuitive",
            "Dark mode would improve the visual experience",
            "The layout and buttons need repositioning",
            "The feed should have infinite scrolling like other social media",
            "You shouldn't be able to reach the end of the feed",
            "Posts should load automatically as you scroll down"
        ],
        performance: [
            "The website loads too slowly",
            "Performance optimization is needed urgently", 
            "Loading times are unacceptably long",
            "The site speed needs improvement"
        ]
    };

    /**
     * Initialize embeddings for reference phrases using Azure OpenAI
     */
    private async initializeEmbeddings() {
        if (this.isEmbeddingsInitialized) return;
        
        try {
            for (const [category, phrases] of Object.entries(this.feedbackReferencePhrases)) {
                for (const phrase of phrases) {
                    const embeddingResult = await azureOpenAI.generateEmbedding(phrase);
                    this.feedbackEmbeddings.set(`${category}:${phrase}`, embeddingResult.embedding);
                }
            }
            this.isEmbeddingsInitialized = true;
            logger.info('Feedback reference embeddings initialized with Azure OpenAI');
        } catch (error) {
            logger.warn('Failed to initialize feedback embeddings:', error);
        }
    }

    /**
     * Calculate cosine similarity between two vectors (delegated to Azure OpenAI service)
     */
    private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
        return AzureOpenAIService.calculateSimilarity(vectorA, vectorB);
    }

    /**
     * Azure OpenAI-powered feedback analysis
     * Direct analysis without requiring pre-existing similar posts
     */
    private async performAzureOpenAIFeedbackAnalysis(content: string): Promise<Partial<FeedbackAnalysis>> {
        try {
            const analysisPrompt = `Analyze this post to determine if it contains feedback about the UnitedWeRise website/platform itself.

POST: "${content}"

TASK: Determine if this post is feedback about the website/platform (not general political discussion).

Consider:
- Is it about site functionality, design, performance, or features?
- Does it suggest improvements, report bugs, or express concerns about the platform?
- Is it about user experience, navigation, or interface issues?
- Or is it general political discussion unrelated to the website?

Respond with JSON only:
{
    "isFeedback": boolean,
    "confidence": 0.0-1.0,
    "type": "suggestion|bug_report|concern|feature_request|null",
    "category": "ui_ux|performance|functionality|accessibility|moderation|general|null",
    "reasoning": "brief explanation of decision",
    "priority": "low|medium|high|critical",
    "actionable": boolean
}`;

            // Use General tier (gpt-4o-mini) for feedback pattern matching
            const response = await azureOpenAI.generateGeneralCompletion(analysisPrompt, {
                maxTokens: 300,
                temperature: 0.2,
                systemMessage: "You are a feedback analysis system for the UnitedWeRise platform. Focus on identifying genuine platform feedback vs general political discussion."
            });

            // Parse AI response
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            if (!analysisMatch) {
                throw new Error('No JSON found in Azure OpenAI response');
            }

            const analysis = JSON.parse(analysisMatch[0]);
            
            return {
                isFeedback: analysis.isFeedback,
                confidence: analysis.confidence,
                type: analysis.type,
                category: analysis.category,
                priority: analysis.priority,
                actionable: analysis.actionable,
                summary: `Azure OpenAI analysis: ${analysis.reasoning}`
            };
            
        } catch (error) {
            logger.warn('Azure OpenAI feedback analysis failed:', error);
            return { isFeedback: false, confidence: 0 };
        }
    }

    /**
     * Vector similarity analysis using Azure OpenAI embeddings
     * Compare against reference feedback phrases
     */
    private async performVectorSimilarityAnalysis(content: string): Promise<Partial<FeedbackAnalysis>> {
        try {
            await this.initializeEmbeddings();
            
            // Get embedding for the input content using Azure OpenAI
            const contentEmbedding = await azureOpenAI.generateEmbedding(content);
            
            let maxSimilarity = 0;
            let bestMatch = { category: '', type: '', phrase: '' };
            
            // Compare against all reference embeddings
            for (const [key, referenceEmbedding] of this.feedbackEmbeddings.entries()) {
                const similarity = this.cosineSimilarity(contentEmbedding.embedding, referenceEmbedding);
                
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    const [category, phrase] = key.split(':', 2);
                    bestMatch = { category, type: category, phrase };
                }
            }
            
            // Determine if it's feedback based on similarity threshold
            const isFeedback = maxSimilarity > 0.7;
            
            return {
                isFeedback,
                confidence: maxSimilarity,
                type: ['ui_ux', 'performance'].includes(bestMatch.category) ? 'suggestion' : bestMatch.type as any,
                category: bestMatch.category as any,
                summary: `Vector similarity: "${bestMatch.phrase}" (${Math.round(maxSimilarity * 100)}%)`
            };
            
        } catch (error) {
            logger.warn('Vector similarity analysis failed:', error);
            return { isFeedback: false, confidence: 0 };
        }
    }


    /**
     * Async post-creation feedback analysis
     * Updates the post with feedback data after creation
     */
    async analyzePostAsync(postId: string, content: string, userId?: string): Promise<void> {
        try {
            const analysis = await this.analyzePost(content, userId);
            
            if (analysis.isFeedback && analysis.confidence > 0.6) {
                // Update the post with feedback data
                
                await prisma.post.update({
                    where: { id: postId },
                    data: {
                        containsFeedback: true,
                        feedbackType: analysis.type,
                        feedbackCategory: analysis.category,
                        feedbackPriority: analysis.priority,
                        feedbackConfidence: analysis.confidence,
                        feedbackSummary: analysis.summary,
                        feedbackStatus: 'new'
                    }
                });
                
                logger.info(`Post ${postId} updated with ${analysis.type} feedback (${Math.round(analysis.confidence * 100)}% confidence)`);
                await prisma.$disconnect();
            } else {
                // Mark as analyzed but not feedback
                
                await prisma.post.update({
                    where: { id: postId },
                    data: { containsFeedback: false }
                });
                
                await prisma.$disconnect();
            }
        } catch (error) {
            logger.error(`Failed to analyze post ${postId} for feedback:`, error);
            // Don't throw - this is async and shouldn't affect post creation
        }
    }

    /**
     * Analyze a post to determine if it contains feedback about the site
     */
    async analyzePost(content: string, userId?: string): Promise<FeedbackAnalysis> {
        try {
            // 1. Quick keyword screening first (fastest)
            const keywordAnalysis = this.performKeywordAnalysis(content);
            
            // 2. Azure OpenAI analysis (primary method)
            const azureAnalysis = await this.performAzureOpenAIFeedbackAnalysis(content);
            
            // 3. Vector similarity fallback if Azure analysis fails
            let vectorAnalysis: Partial<FeedbackAnalysis> = { isFeedback: false, confidence: 0 };
            if (azureAnalysis.confidence === 0) {
                vectorAnalysis = await this.performVectorSimilarityAnalysis(content);
            }
            
            // Combine analyses (prioritize Azure OpenAI results)
            const primaryAnalysis = azureAnalysis.confidence > 0 ? azureAnalysis : vectorAnalysis;
            return this.combineMultipleAnalyses(keywordAnalysis, primaryAnalysis, {});
            
        } catch (error) {
            logger.error('Error in feedback analysis:', error);
            
            // Fallback to keyword analysis only
            const fallbackAnalysis = this.performKeywordAnalysis(content);
            return {
                isFeedback: fallbackAnalysis.isFeedback || false,
                confidence: fallbackAnalysis.confidence || 0,
                type: fallbackAnalysis.type,
                category: fallbackAnalysis.category,
                keywords: fallbackAnalysis.keywords
            };
        }
    }

    /**
     * Ultra-fast keyword check for async determination
     * Public method for posts.ts to use synchronously
     */
    performQuickKeywordCheck(content: string): { isPotentialFeedback: boolean } {
        const lowercaseContent = content.toLowerCase();
        
        // Quick check for strong feedback indicators
        const strongIndicators = [
            'should be able', 'shouldn\'t be able', 'should just', 
            'bug', 'error', 'broken', 'not working',
            'suggest', 'recommend', 'would be nice',
            'infinite scroll', 'feed should', 'needs to'
        ];
        
        // Platform context check
        const platformContext = [
            'this site', 'this website', 'this platform', 'this app',
            'the feed', 'your feed', 'my feed', 'unitedwerise'
        ];
        
        const hasIndicator = strongIndicators.some(indicator => 
            lowercaseContent.includes(indicator)
        );
        
        const hasPlatformContext = platformContext.some(context => 
            lowercaseContent.includes(context)
        );
        
        return { 
            isPotentialFeedback: hasIndicator && (hasPlatformContext || lowercaseContent.length > 50)
        };
    }

    /**
     * Quick keyword-based analysis for initial screening
     */
    private performKeywordAnalysis(content: string): Partial<FeedbackAnalysis> {
        const lowercaseContent = content.toLowerCase();
        let confidence = 0;
        let detectedType: string | null = null;
        let detectedCategory: string | null = null;
        const foundKeywords: string[] = [];

        // Check for platform-specific context
        const platformKeywords = [
            'unitedwerise', 'this site', 'this website', 'this platform', 'this app',
            'the site', 'the website', 'the platform', 'navigation menu', 'dark mode',
            'notification system', 'website is', 'platform to', 'using this'
        ];
        const hasPlatformContext = platformKeywords.some(keyword => 
            lowercaseContent.includes(keyword)
        );

        // Analyze each feedback type
        for (const [type, keywords] of Object.entries(this.feedbackKeywords)) {
            const matchCount = keywords.filter(keyword => {
                if (lowercaseContent.includes(keyword)) {
                    foundKeywords.push(keyword);
                    return true;
                }
                return false;
            }).length;

            if (matchCount > 0) {
                const typeConfidence = matchCount / keywords.length;
                if (typeConfidence > confidence) {
                    confidence = typeConfidence;
                    
                    if (['ui_ux', 'performance', 'accessibility'].includes(type)) {
                        detectedCategory = type;
                        detectedType = 'suggestion'; // Default for category-specific feedback
                    } else {
                        detectedType = type;
                    }
                }
            }
        }

        // Boost confidence if platform context is present
        if (hasPlatformContext && confidence > 0) {
            confidence = Math.min(confidence * 1.5, 1.0);
        }

        return {
            isFeedback: confidence > 0.4,
            type: detectedType as any,
            category: detectedCategory as any,
            confidence: confidence,
            keywords: foundKeywords
        } as FeedbackAnalysis;
    }


    /**
     * Combine keyword, vector, and AI analysis results  
     */
    private combineMultipleAnalyses(
        keywordAnalysis: Partial<FeedbackAnalysis>,
        vectorAnalysis: Partial<FeedbackAnalysis>, 
        aiAnalysis: Partial<FeedbackAnalysis>
    ): FeedbackAnalysis {
        // Weighted confidence scoring
        const keywordWeight = 0.2;
        const vectorWeight = 0.5;   // Vector similarity gets highest weight
        const aiWeight = 0.3;
        
        const combinedConfidence = 
            (keywordAnalysis.confidence || 0) * keywordWeight +
            (vectorAnalysis.confidence || 0) * vectorWeight +
            (aiAnalysis.confidence || 0) * aiWeight;
        
        // Take best analysis for classification (prefer AI > Vector > Keywords)
        const finalType = aiAnalysis.type || vectorAnalysis.type || keywordAnalysis.type;
        const finalCategory = aiAnalysis.category || vectorAnalysis.category || keywordAnalysis.category;
        
        // Determine if it's feedback (any method with high confidence)
        const isFeedback = 
            (aiAnalysis.isFeedback && (aiAnalysis.confidence || 0) > 0.7) ||
            (vectorAnalysis.isFeedback && (vectorAnalysis.confidence || 0) > 0.75) ||
            combinedConfidence > 0.6;
        
        // Create summary combining insights
        const summaryParts = [
            aiAnalysis.summary,
            vectorAnalysis.summary,
            keywordAnalysis.keywords?.length ? `Keywords: ${keywordAnalysis.keywords.join(', ')}` : null
        ].filter(Boolean);
        
        return {
            isFeedback,
            type: finalType,
            category: finalCategory,
            priority: aiAnalysis.priority || this.determinePriority(finalType, keywordAnalysis.keywords),
            summary: summaryParts.join(' | '),
            confidence: combinedConfidence,
            actionable: aiAnalysis.actionable,
            keywords: keywordAnalysis.keywords
        };
    }

    /**
     * Combine keyword and AI analysis results (legacy method)
     */
    private combineAnalysis(
        keywordAnalysis: Partial<FeedbackAnalysis>, 
        aiAnalysis: Partial<FeedbackAnalysis>
    ): FeedbackAnalysis {
        // AI analysis takes precedence for classification
        const finalType = aiAnalysis.type || keywordAnalysis.type;
        const finalCategory = aiAnalysis.category || keywordAnalysis.category;
        
        // Average confidence scores but weight AI higher
        const combinedConfidence = aiAnalysis.confidence !== undefined 
            ? (aiAnalysis.confidence * 0.7 + (keywordAnalysis.confidence || 0) * 0.3)
            : (keywordAnalysis.confidence || 0);

        // Determine if it's feedback based on combined confidence
        const isFeedback = (aiAnalysis.isFeedback !== undefined ? aiAnalysis.isFeedback : false) || 
                          combinedConfidence > 0.5;

        return {
            isFeedback,
            type: finalType,
            category: finalCategory,
            priority: aiAnalysis.priority || this.determinePriority(finalType, keywordAnalysis.keywords),
            summary: aiAnalysis.summary,
            confidence: combinedConfidence,
            actionable: aiAnalysis.actionable,
            keywords: keywordAnalysis.keywords
        };
    }

    /**
     * Determine priority based on feedback type and keywords
     */
    private determinePriority(
        type?: string, 
        keywords: string[] = []
    ): 'low' | 'medium' | 'high' | 'critical' {
        // Critical keywords
        const criticalKeywords = ['crash', 'broken', 'not working', 'error', 'bug'];
        if (keywords.some(k => criticalKeywords.includes(k))) {
            return 'critical';
        }

        // High priority types
        if (type === 'bug_report') {
            return 'high';
        }

        // Medium priority types  
        if (type === 'concern' || type === 'feature_request') {
            return 'medium';
        }

        // Default to low priority
        return 'low';
    }

    /**
     * Batch analyze multiple posts for feedback
     */
    async analyzeBatch(posts: Array<{id: string, content: string}>): Promise<Map<string, FeedbackAnalysis>> {
        const results = new Map<string, FeedbackAnalysis>();
        
        // Process in chunks to avoid overwhelming the AI service
        const chunkSize = 5;
        for (let i = 0; i < posts.length; i += chunkSize) {
            const chunk = posts.slice(i, i + chunkSize);
            
            const chunkPromises = chunk.map(async post => {
                const analysis = await this.analyzePost(post.content);
                return { id: post.id, analysis };
            });
            
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            chunkResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.set(result.value.id, result.value.analysis);
                }
            });
            
            // Small delay between chunks
            if (i + chunkSize < posts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    /**
     * Get feedback statistics for admin dashboard
     */
    async getFeedbackStats(timeframe: 'day' | 'week' | 'month' = 'week') {
        // This would integrate with your existing database service
        // Return stats like feedback count by type, priority distribution, etc.
        return {
            totalFeedback: 0,
            byType: {},
            byPriority: {},
            byCategory: {},
            avgConfidence: 0
        };
    }
}

export const feedbackAnalysisService = new FeedbackAnalysisService();