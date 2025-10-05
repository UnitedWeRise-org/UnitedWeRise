"use strict";
/**
 * Universal Semantic Search Service
 *
 * Implements the pattern you identified:
 * 1. Query Qdrant for semantically similar content
 * 2. Use AI to rank/filter/classify results
 * 3. Apply to any topic: feedback, election issues, policy discussions, etc.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSearchService = void 0;
const embeddingService_1 = require("./embeddingService");
const qdrantService_1 = require("./qdrantService");
const azureOpenAIService_1 = require("./azureOpenAIService");
const logger_1 = __importDefault(require("../utils/logger"));
class SemanticSearchService {
    /**
     * Universal semantic search and classification
     *
     * @param content - Content to analyze
     * @param config - Search configuration
     * @returns Analysis results with AI classification
     */
    static async searchAndClassify(content, config) {
        try {
            // 1. Get embedding for input content
            const contentAnalysis = await embeddingService_1.EmbeddingService.analyzeText(content);
            const contentEmbedding = contentAnalysis.embedding;
            // 2. Search Qdrant for semantically similar posts
            const similarPosts = await qdrantService_1.QdrantService.searchSimilar(contentEmbedding, {
                limit: config.limit || 10,
                scoreThreshold: config.scoreThreshold || 0.7
            });
            if (similarPosts.length === 0) {
                return {
                    isRelevant: false,
                    confidence: 0,
                    summary: `No similar posts found for topic: ${config.topic}`,
                    relatedPosts: []
                };
            }
            // 3. Use AI to analyze relevance and classify
            const analysis = await this.performAIClassification(content, similarPosts, config);
            return {
                isRelevant: analysis.isRelevant,
                confidence: analysis.confidence,
                classification: analysis.classification,
                category: analysis.category,
                summary: analysis.summary,
                relatedPosts: similarPosts.map(post => ({
                    content: post.payload.content,
                    similarity: post.score,
                    postId: post.payload.postId
                }))
            };
        }
        catch (error) {
            logger_1.default.error(`Semantic search failed for topic "${config.topic}":`, error);
            return {
                isRelevant: false,
                confidence: 0,
                summary: `Search failed: ${error.message}`,
                relatedPosts: []
            };
        }
    }
    /**
     * Use AI to classify content based on similar posts
     */
    static async performAIClassification(content, similarPosts, config) {
        const contextPosts = similarPosts.map((post, idx) => `${idx + 1}. "${post.payload.content}" (similarity: ${Math.round(post.score * 100)}%)`).join('\n');
        const classificationOptions = config.classificationOptions?.join('|') || 'relevant|irrelevant';
        const categoryOptions = config.categories?.join('|') || 'general';
        const prompt = `Analyze this content for topic: "${config.topic}"

TARGET CONTENT: "${content}"

SIMILAR POSTS FROM DATABASE:
${contextPosts}

${config.additionalContext || ''}

TASK: Determine if the target content is relevant to the topic "${config.topic}" by analyzing it in context of similar posts.

Respond with JSON only:
{
    "isRelevant": boolean,
    "confidence": 0.0-1.0,
    "classification": "${classificationOptions}",
    "category": "${categoryOptions}",
    "reasoning": "brief explanation of classification decision",
    "similarityInsight": "what the similar posts reveal about this content"
}`;
        try {
            // Use Tier 2 (gpt-4o) for complex semantic reasoning and classification
            const response = await azureOpenAIService_1.azureOpenAI.generateTier2Completion(prompt, { maxTokens: 400 });
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            if (!analysisMatch) {
                throw new Error('No JSON found in AI response');
            }
            const analysis = JSON.parse(analysisMatch[0]);
            return {
                isRelevant: analysis.isRelevant,
                confidence: analysis.confidence,
                classification: analysis.classification,
                category: analysis.category,
                summary: `${config.topic} analysis: ${analysis.reasoning} | Context: ${analysis.similarityInsight}`
            };
        }
        catch (error) {
            logger_1.default.warn('AI classification failed:', error);
            // Fallback to similarity-based classification
            const maxSimilarity = similarPosts[0]?.score || 0;
            return {
                isRelevant: maxSimilarity > 0.8,
                confidence: maxSimilarity,
                summary: `Fallback classification based on ${Math.round(maxSimilarity * 100)}% similarity`
            };
        }
    }
    /**
     * Pre-configured search for common topics
     */
    static async searchFeedback(content) {
        return this.searchAndClassify(content, {
            topic: "Website Feedback and Suggestions",
            classificationOptions: ["suggestion", "bug_report", "concern", "feature_request"],
            categories: ["ui_ux", "performance", "functionality", "accessibility", "moderation", "general"],
            additionalContext: `Consider:
- Is this about the website/platform functionality, design, performance, or features?
- Does it suggest improvements, report bugs, or express concerns about the platform?
- Or is it general discussion unrelated to the website infrastructure?`
        });
    }
    static async searchPolicyTopic(content, topic) {
        return this.searchAndClassify(content, {
            topic: `Political Discussion: ${topic}`,
            classificationOptions: ["strongly_related", "somewhat_related", "tangentially_related", "unrelated"],
            categories: ["policy", "personal_story", "opinion", "news", "question"],
            additionalContext: `Focus on political policy discussions, candidate positions, and civic engagement topics.`
        });
    }
    static async searchElectionContent(content) {
        return this.searchAndClassify(content, {
            topic: "Election Information and Candidate Discussion",
            classificationOptions: ["candidate_info", "voting_info", "election_process", "campaign_update"],
            categories: ["federal", "state", "local", "ballot_measures", "voting_process"],
            limit: 15 // Elections need broader context
        });
    }
}
exports.SemanticSearchService = SemanticSearchService;
exports.default = SemanticSearchService;
//# sourceMappingURL=semanticSearchService.js.map