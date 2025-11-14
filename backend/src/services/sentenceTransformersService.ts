import { logger } from './logger';

// Dynamic import to handle ESM compatibility
let transformersModule: any = null;

async function getTransformersModule() {
  if (!transformersModule) {
    try {
      transformersModule = await import('@xenova/transformers');
      // Configure to run locally without external downloads during runtime
      transformersModule.env.allowLocalModels = false;
      transformersModule.env.allowRemoteModels = true;
    } catch (error) {
      logger.warn({ error }, 'Failed to load transformers module');
      transformersModule = null;
    }
  }
  return transformersModule;
}

interface EmbeddingResult {
  embedding: number[];
  processingTime: number;
}

interface BasicAnalysis {
  category?: string;
  sentiment: number; // -1 to 1
  argumentType: string;
  evidenceKeywords: string[];
}

export class SentenceTransformersService {
  private static embeddingPipeline: any = null;
  private static readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
  private static readonly FALLBACK_DIMENSION = 384; // Dimension for all-MiniLM-L6-v2

  /**
   * Initialize local embedding pipeline
   */
  private static async getEmbeddingPipeline() {
    if (!this.embeddingPipeline) {
      try {
        const transformers = await getTransformersModule();
        if (transformers?.pipeline) {
          this.embeddingPipeline = await transformers.pipeline('feature-extraction', this.MODEL_NAME);
          logger.info({ model: this.MODEL_NAME }, 'Local embedding pipeline initialized');
        } else {
          logger.warn('Transformers module not available');
          this.embeddingPipeline = null;
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to initialize local pipeline, will use fallback');
        this.embeddingPipeline = null;
      }
    }
    return this.embeddingPipeline;
  }

  /**
   * Generate embedding using local Sentence Transformers
   * Tries local @xenova/transformers first, falls back to semantic analysis
   */
  static async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    try {
      if (!text || text.trim().length === 0) {
        return {
          embedding: new Array(this.FALLBACK_DIMENSION).fill(0),
          processingTime: 0,
        };
      }

      const cleanText = this.cleanText(text);
      
      // Try local @xenova/transformers pipeline first
      try {
        const pipeline = await this.getEmbeddingPipeline();
        if (pipeline) {
          const output = await pipeline(cleanText, { pooling: 'mean', normalize: true });
          
          // Convert tensor to array if needed
          let embedding: number[];
          if (output.data) {
            embedding = Array.from(output.data);
          } else if (Array.isArray(output)) {
            embedding = output;
          } else {
            throw new Error('Unexpected pipeline output format');
          }

          const processingTime = Date.now() - startTime;
          logger.info({ processingTime }, 'Generated local embedding');
          return { embedding, processingTime };
        }
      } catch (pipelineError) {
        logger.warn({ error: pipelineError }, 'Local pipeline failed, using semantic fallback');
      }

      // Fallback to semantic embedding analysis
      logger.info('Using semantic embedding generation (analyzing political content)');
      const fallbackEmbedding = this.generateSemanticEmbedding(cleanText);
      
      return {
        embedding: fallbackEmbedding,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      logger.warn({ error }, 'All embedding methods failed, using basic fallback');

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
  static async batchGenerateEmbeddings(
    texts: string[],
    batchSize: number = 10
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      logger.info({ batchStart: i + 1, batchEnd: Math.min(i + batchSize, texts.length), total: texts.length }, 'Processing embedding batch');

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
  static analyzeContent(text: string): BasicAnalysis {
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
  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
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

  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim()
      .slice(0, 512); // Sentence Transformers work well with shorter texts
  }

  /**
   * Generate semantic embedding locally without API calls
   * Creates embeddings based on word frequency, sentiment, and topic features
   */
  private static generateSemanticEmbedding(text: string): number[] {
    const embedding = new Array(this.FALLBACK_DIMENSION).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    // Political topic features (first 50 dimensions)
    const politicalTopics = {
      healthcare: ['health', 'medical', 'insurance', 'medicare', 'hospital', 'doctor'],
      economy: ['economy', 'job', 'tax', 'budget', 'inflation', 'financial'],
      environment: ['climate', 'environment', 'green', 'pollution', 'renewable'],
      education: ['education', 'school', 'teacher', 'student', 'university'],
      infrastructure: ['infrastructure', 'road', 'bridge', 'transportation', 'public'],
    };
    
    let idx = 0;
    for (const [topic, keywords] of Object.entries(politicalTopics)) {
      const score = keywords.reduce((sum, keyword) => 
        sum + (words.filter(w => w.includes(keyword)).length), 0) / words.length;
      
      for (let i = 0; i < 10; i++) {
        embedding[idx++] = score * (1 + Math.sin(i * 0.5));
      }
    }
    
    // Sentiment features (next 50 dimensions)
    const positiveWords = ['good', 'great', 'support', 'agree', 'positive', 'beneficial'];
    const negativeWords = ['bad', 'terrible', 'oppose', 'disagree', 'negative', 'harmful'];
    
    const positiveScore = positiveWords.reduce((sum, word) => 
      sum + words.filter(w => w.includes(word)).length, 0) / words.length;
    const negativeScore = negativeWords.reduce((sum, word) => 
      sum + words.filter(w => w.includes(word)).length, 0) / words.length;
    
    for (let i = 0; i < 25; i++) {
      embedding[idx++] = positiveScore * Math.cos(i * 0.3);
      embedding[idx++] = negativeScore * Math.sin(i * 0.3);
    }
    
    // Word frequency features (next 100 dimensions)
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    
    for (let i = 0; i < 100; i++) {
      if (i < sortedWords.length * 2) {
        const wordIdx = Math.floor(i / 2);
        const [word, freq] = sortedWords[wordIdx];
        const hash = this.simpleHash(word);
        embedding[idx++] = (freq / words.length) * Math.sin(hash + i);
      } else {
        embedding[idx++] = 0;
      }
    }
    
    // Text structure features (remaining dimensions)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const questionCount = (text.match(/\?/g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    
    for (let i = idx; i < this.FALLBACK_DIMENSION; i++) {
      const feature = (i - idx) % 4;
      switch (feature) {
        case 0: embedding[i] = avgWordLength / 10; break;
        case 1: embedding[i] = questionCount / 10; break;
        case 2: embedding[i] = exclamationCount / 10; break;
        case 3: embedding[i] = sentenceCount / 10; break;
      }
    }
    
    // Normalize the embedding vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }
    
    return embedding;
  }

  private static generateFallbackEmbedding(text: string): number[] {
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

  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private static detectCategory(text: string): string {
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

  private static estimateSentiment(text: string): number {
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
      if (text.includes(word)) score += 0.1;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private static classifyArgumentType(text: string): string {
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

  private static extractEvidenceKeywords(text: string): string[] {
    const evidenceTerms = [
      'study', 'research', 'data', 'statistics', 'survey', 'poll',
      'report', 'analysis', 'findings', 'results', 'evidence',
      'source', 'expert', 'professor', 'university', 'published'
    ];

    return evidenceTerms.filter(term => text.includes(term));
  }
}