/**
 * Feedback Analysis Service
 * 
 * Uses existing Qwen3 and Sentence Transformers infrastructure to detect
 * and categorize user feedback about the UnitedWeRise platform itself.
 * 
 * Integrates with existing AI pipeline for efficient processing.
 */

import { QwenService } from './qwenService';
import { EmbeddingService } from './embeddingService';
import { QdrantService } from './qdrantService';
import SemanticSearchService from './semanticSearchService';
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
            'would be great', 'maybe you could', 'it would help', 'consider adding'
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
            'hard to find', 'confusing layout', 'user experience', 'mobile'
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
            "The layout and buttons need repositioning"
        ],
        performance: [
            "The website loads too slowly",
            "Performance optimization is needed urgently", 
            "Loading times are unacceptably long",
            "The site speed needs improvement"
        ]
    };

    /**
     * Initialize embeddings for reference phrases
     */
    private async initializeEmbeddings() {
        if (this.isEmbeddingsInitialized) return;
        
        try {
            for (const [category, phrases] of Object.entries(this.feedbackReferencePhrases)) {
                for (const phrase of phrases) {
                    const analysis = await EmbeddingService.analyzeText(phrase);
                    this.feedbackEmbeddings.set(`${category}:${phrase}`, analysis.embedding);
                }
            }
            this.isEmbeddingsInitialized = true;
            logger.info('Feedback reference embeddings initialized');
        } catch (error) {
            logger.warn('Failed to initialize feedback embeddings:', error);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
        if (vectorA.length !== vectorB.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Universal semantic search approach - your brilliant idea!
     * Query Qdrant for content similar to "website feedback and suggestions"
     * Then use Qwen3 to determine relevance and classification
     */
    private async performSemanticFeedbackSearch(content: string): Promise<Partial<FeedbackAnalysis>> {
        try {
            // Get embedding for the input content
            const contentAnalysis = await EmbeddingService.analyzeText(content);
            const contentEmbedding = contentAnalysis.embedding;
            
            // Search for ANY semantically similar posts (no pre-filtering)
            // This catches feedback that may have been missed initially
            const similarPosts = await QdrantService.searchSimilar(contentEmbedding, {
                limit: 10, // Get more results for Qwen3 to analyze
                scoreThreshold: 0.7 // Only get reasonably similar posts
            });
            
            if (similarPosts.length === 0) {
                return { isFeedback: false, confidence: 0 };
            }
            
            // Use Qwen3 to analyze which similar posts are actually feedback-related
            const feedbackContext = similarPosts.map((post, idx) => 
                `${idx + 1}. "${post.payload.content}" (similarity: ${Math.round(post.score * 100)}%)`
            ).join('\n');
            
            const analysisPrompt = `Analyze this post for website/platform feedback by comparing it to similar posts:

TARGET POST: "${content}"

SIMILAR POSTS FROM DATABASE:
${feedbackContext}

TASK: Determine if the target post contains feedback about the UnitedWeRise website/platform itself.

Consider:
- Is it about the site's functionality, design, performance, or features?
- Does it suggest improvements, report bugs, or express concerns about the platform?
- Or is it general political discussion unrelated to the website?

Respond with JSON only:
{
    "isFeedback": boolean,
    "confidence": 0.0-1.0,
    "type": "suggestion|bug_report|concern|feature_request|null",
    "category": "ui_ux|performance|functionality|accessibility|moderation|general|null",
    "reasoning": "brief explanation of decision",
    "similarityInsight": "what the similar posts reveal about this content"
}`;

            const response = await QwenService.generateResponse(analysisPrompt, 300);
            
            // Parse AI response
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            if (!analysisMatch) {
                throw new Error('No JSON found in Qwen3 response');
            }

            const analysis = JSON.parse(analysisMatch[0]);
            
            return {
                isFeedback: analysis.isFeedback,
                confidence: analysis.confidence,
                type: analysis.type,
                category: analysis.category,
                summary: `Semantic search + AI analysis: ${analysis.reasoning} | ${analysis.similarityInsight}`
            };
            
        } catch (error) {
            logger.warn('Semantic feedback search failed:', error);
            return { isFeedback: false, confidence: 0 };
        }
    }

    /**
     * Legacy: Qdrant search against pre-flagged feedback only
     */
    private async performQdrantSimilarityAnalysis(content: string): Promise<Partial<FeedbackAnalysis>> {
        try {
            // Get embedding for the input content
            const contentAnalysis = await EmbeddingService.analyzeText(content);
            const contentEmbedding = contentAnalysis.embedding;
            
            // Search for similar posts in Qdrant that are marked as feedback
            const similarPosts = await QdrantService.searchSimilar(contentEmbedding, {
                limit: 5,
                scoreThreshold: 0.7
                // Note: We'll filter for feedback in the client results since the simple categoryFilter doesn't support complex filters
            });
            
            if (similarPosts.length === 0) {
                return { isFeedback: false, confidence: 0 };
            }
            
            // Calculate weighted confidence based on similarity scores
            const maxScore = similarPosts[0].score;
            
            // Extract feedback type from most similar post
            const bestMatch = similarPosts[0];
            const feedbackType = (bestMatch.payload as any).feedbackType;
            const feedbackCategory = (bestMatch.payload as any).feedbackCategory;
            
            return {
                isFeedback: maxScore > 0.8, // High similarity threshold for Qdrant
                confidence: maxScore,
                type: feedbackType as any,
                category: feedbackCategory as any,
                summary: `Legacy similarity: ${Math.round(maxScore * 100)}% match to existing feedback (${similarPosts.length} similar posts found)`
            };
            
        } catch (error) {
            logger.warn('Qdrant similarity analysis failed:', error);
            return { isFeedback: false, confidence: 0 };
        }
    }

    /**
     * Perform vector similarity analysis (legacy in-memory approach)
     */
    private async performVectorAnalysis(content: string): Promise<Partial<FeedbackAnalysis>> {
        try {
            await this.initializeEmbeddings();
            
            // Get embedding for the input content
            const contentAnalysis = await EmbeddingService.analyzeText(content);
            const contentEmbedding = contentAnalysis.embedding;
            
            let maxSimilarity = 0;
            let bestMatch = { category: '', type: '', phrase: '' };
            
            // Compare against all reference embeddings
            for (const [key, referenceEmbedding] of this.feedbackEmbeddings.entries()) {
                const similarity = this.cosineSimilarity(contentEmbedding, referenceEmbedding);
                
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    const [category, phrase] = key.split(':', 2);
                    bestMatch = { category, type: category, phrase };
                }
            }
            
            // Determine if it's feedback based on similarity threshold
            const isFeedback = maxSimilarity > 0.7; // Threshold for vector similarity
            
            return {
                isFeedback,
                confidence: maxSimilarity,
                type: ['ui_ux', 'performance'].includes(bestMatch.category) ? 'suggestion' : bestMatch.type as any,
                category: bestMatch.category as any,
                summary: `Vector similarity match: "${bestMatch.phrase}" (${Math.round(maxSimilarity * 100)}%)`
            };
            
        } catch (error) {
            logger.warn('Vector analysis failed, falling back to keywords:', error);
            return { isFeedback: false, confidence: 0 };
        }
    }

    /**
     * Analyze a post to determine if it contains feedback about the site
     */
    async analyzePost(content: string, userId?: string): Promise<FeedbackAnalysis> {
        try {
            // 1. Quick keyword screening first (fastest)
            const keywordAnalysis = this.performKeywordAnalysis(content);
            
            // 2. Universal semantic search approach (your brilliant idea!)
            const semanticResult = await SemanticSearchService.searchFeedback(content);
            const semanticAnalysis: Partial<FeedbackAnalysis> = {
                isFeedback: semanticResult.isRelevant,
                confidence: semanticResult.confidence,
                type: semanticResult.classification as any,
                category: semanticResult.category as any,
                summary: semanticResult.summary
            };
            
            // 3. Fallback approaches if semantic search fails
            let fallbackAnalysis: Partial<FeedbackAnalysis> = { isFeedback: false, confidence: 0 };
            if (semanticAnalysis.confidence === 0) {
                // Try legacy Qdrant filtered search
                const qdrantAnalysis = await this.performQdrantSimilarityAnalysis(content);
                if (qdrantAnalysis.confidence === 0) {
                    // Final fallback to in-memory vectors
                    fallbackAnalysis = await this.performVectorAnalysis(content);
                } else {
                    fallbackAnalysis = qdrantAnalysis;
                }
            }
            
            // 4. Use additional AI analysis only if needed for edge cases
            let aiAnalysis: Partial<FeedbackAnalysis> = {};
            if (keywordAnalysis.confidence > 0.3 && 
                semanticAnalysis.confidence === 0 && 
                fallbackAnalysis.confidence === 0) {
                // Only run expensive AI analysis if other methods disagree or are uncertain
                aiAnalysis = await this.performAIAnalysis(content);
            }
            
            // Combine analyses (prioritize semantic search results)
            const primaryAnalysis = semanticAnalysis.confidence > 0 ? semanticAnalysis : fallbackAnalysis;
            return this.combineMultipleAnalyses(keywordAnalysis, primaryAnalysis, aiAnalysis);
            
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
     * Use Qwen3 for sophisticated feedback analysis
     */
    private async performAIAnalysis(content: string): Promise<Partial<FeedbackAnalysis>> {
        const prompt = `Analyze this user post to determine if it contains feedback, suggestions, concerns, or bug reports about the UnitedWeRise website/platform itself.

Post content: "${content}"

Consider:
- Is this specifically about the website/platform functionality, not general political discussion?
- What type of feedback is it?
- How actionable is it?
- What priority should it have?

Respond with JSON only:
{
    "isFeedback": boolean,
    "type": "suggestion|bug_report|concern|feature_request|null",
    "category": "ui_ux|performance|functionality|accessibility|moderation|content|general|null", 
    "priority": "low|medium|high|critical|null",
    "summary": "brief actionable summary or null",
    "confidence": 0.0-1.0,
    "actionable": boolean
}`;

        try {
            const response = await QwenService.generateResponse(prompt);
            
            // Parse JSON response
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            if (!analysisMatch) {
                throw new Error('No JSON found in Qwen3 response');
            }

            const analysis = JSON.parse(analysisMatch[0]);
            
            // Validate response structure
            if (typeof analysis.isFeedback !== 'boolean' || 
                typeof analysis.confidence !== 'number') {
                throw new Error('Invalid analysis structure from Qwen3');
            }

            return analysis;
            
        } catch (error) {
            logger.warn('Failed to get AI analysis, using fallback:', error);
            throw error;
        }
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