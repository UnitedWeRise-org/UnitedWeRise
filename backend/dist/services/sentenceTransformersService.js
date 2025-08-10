"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentenceTransformersService = void 0;
const inference_1 = require("@huggingface/inference");
class SentenceTransformersService {
    /**
     * Initialize Hugging Face client
     */
    static getClient() {
        if (!this.hf) {
            const apiKey = process.env.HUGGINGFACE_API_KEY;
            if (!apiKey) {
                throw new Error('HUGGINGFACE_API_KEY environment variable is required');
            }
            this.hf = new inference_1.HfInference(apiKey);
        }
        return this.hf;
    }
    /**
     * Generate embedding using Sentence Transformers
     * Fast, lightweight, runs on CPU
     */
    static async generateEmbedding(text) {
        const startTime = Date.now();
        try {
            if (!text || text.trim().length === 0) {
                return {
                    embedding: new Array(this.FALLBACK_DIMENSION).fill(0),
                    processingTime: 0,
                };
            }
            const cleanText = this.cleanText(text);
            const hf = this.getClient();
            // Use feature extraction API for embeddings
            const response = await hf.featureExtraction({
                model: this.MODEL_NAME,
                inputs: cleanText,
            });
            // Handle different response formats
            let embedding;
            if (Array.isArray(response)) {
                // If it's a 2D array, take the first row
                if (Array.isArray(response[0])) {
                    embedding = response[0];
                }
                else {
                    embedding = response;
                }
            }
            else {
                throw new Error('Unexpected response format from Hugging Face API');
            }
            const processingTime = Date.now() - startTime;
            return {
                embedding,
                processingTime,
            };
        }
        catch (error) {
            console.warn('Sentence Transformers embedding failed, using fallback:', error);
            // Return deterministic fallback based on text hash
            const fallbackEmbedding = this.generateFallbackEmbedding(text);
            return {
                embedding: fallbackEmbedding,
                processingTime: Date.now() - startTime,
            };
        }
    }
    /**
     * Batch generate embeddings for multiple texts
     */
    static async batchGenerateEmbeddings(texts, batchSize = 10) {
        const results = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`Processing embedding batch ${i + 1}-${Math.min(i + batchSize, texts.length)} of ${texts.length}`);
            // Process batch in parallel
            const batchPromises = batch.map(text => this.generateEmbedding(text));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            // Small delay to avoid overwhelming the API
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return results;
    }
    /**
     * Perform basic content analysis
     * Fast categorization and sentiment for real-time processing
     */
    static analyzeContent(text) {
        const lowerText = text.toLowerCase();
        return {
            category: this.detectCategory(lowerText),
            sentiment: this.estimateSentiment(lowerText),
            argumentType: this.classifyArgumentType(lowerText),
            evidenceKeywords: this.extractEvidenceKeywords(lowerText),
        };
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
    static calculateSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
            return 0;
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        if (norm1 === 0 || norm2 === 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }
    // Private helper methods
    static cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?-]/g, '')
            .trim()
            .slice(0, 512); // Sentence Transformers work well with shorter texts
    }
    static generateFallbackEmbedding(text) {
        // Create a deterministic embedding based on text content
        const hash = this.simpleHash(text);
        const embedding = new Array(this.FALLBACK_DIMENSION);
        for (let i = 0; i < this.FALLBACK_DIMENSION; i++) {
            // Use hash to create pseudo-random but deterministic values
            const seed = (hash + i) % 1000;
            embedding[i] = (Math.sin(seed) + Math.cos(seed * 2)) / 2;
        }
        return embedding;
    }
    static simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    static detectCategory(text) {
        const categories = {
            healthcare: ['health', 'medical', 'insurance', 'medicare', 'doctor', 'hospital', 'patient'],
            economy: ['economy', 'job', 'unemployment', 'inflation', 'tax', 'budget', 'financial'],
            environment: ['climate', 'environment', 'green', 'pollution', 'renewable', 'carbon', 'energy'],
            education: ['education', 'school', 'teacher', 'student', 'university', 'learning', 'academic'],
            immigration: ['immigration', 'border', 'immigrant', 'visa', 'citizenship', 'refugee'],
            infrastructure: ['infrastructure', 'road', 'bridge', 'transportation', 'public works'],
            technology: ['technology', 'digital', 'internet', 'data', 'privacy', 'cyber', 'ai'],
        };
        let bestCategory = 'general';
        let maxScore = 0;
        for (const [category, keywords] of Object.entries(categories)) {
            const score = keywords.reduce((sum, keyword) => {
                return sum + (text.includes(keyword) ? 1 : 0);
            }, 0);
            if (score > maxScore) {
                maxScore = score;
                bestCategory = category;
            }
        }
        return maxScore > 0 ? bestCategory : 'general';
    }
    static estimateSentiment(text) {
        const positiveWords = [
            'good', 'great', 'excellent', 'amazing', 'positive', 'support',
            'agree', 'love', 'wonderful', 'fantastic', 'beneficial', 'helpful',
            'successful', 'effective', 'improved', 'better'
        ];
        const negativeWords = [
            'bad', 'terrible', 'awful', 'negative', 'hate', 'disagree',
            'wrong', 'fail', 'horrible', 'disaster', 'dangerous', 'harmful',
            'ineffective', 'worse', 'problem', 'issue'
        ];
        let score = 0;
        positiveWords.forEach(word => {
            if (text.includes(word))
                score += 0.1;
        });
        negativeWords.forEach(word => {
            if (text.includes(word))
                score -= 0.1;
        });
        return Math.max(-1, Math.min(1, score));
    }
    static classifyArgumentType(text) {
        if (text.includes('data') || text.includes('study') || text.includes('research')) {
            return 'evidence_based';
        }
        if (text.includes('cost') || text.includes('budget') || text.includes('economic')) {
            return 'economic_concern';
        }
        if (text.includes('experience') || text.includes('personally')) {
            return 'personal_experience';
        }
        if (text.includes('moral') || text.includes('ethical') || text.includes('right')) {
            return 'ethical_position';
        }
        if (text.includes('practical') || text.includes('implementation')) {
            return 'practical_concern';
        }
        return 'general_opinion';
    }
    static extractEvidenceKeywords(text) {
        const evidenceTerms = [
            'study', 'research', 'data', 'statistics', 'survey', 'poll',
            'report', 'analysis', 'findings', 'results', 'evidence',
            'source', 'expert', 'professor', 'university', 'published'
        ];
        return evidenceTerms.filter(term => text.includes(term));
    }
}
exports.SentenceTransformersService = SentenceTransformersService;
SentenceTransformersService.MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2';
SentenceTransformersService.FALLBACK_DIMENSION = 384; // Dimension for all-MiniLM-L6-v2
//# sourceMappingURL=sentenceTransformersService.js.map