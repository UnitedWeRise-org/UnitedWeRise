import { prisma } from '../lib/prisma';
import axios from 'axios';
;
import { SentenceTransformersService } from './sentenceTransformersService';
import { azureOpenAI } from './azureOpenAIService';
import { getSemanticConfig, isProduction } from '../config/azureConfig';
// import { QdrantService } from './qdrantService';  // Enable when Qdrant is available

// Using singleton prisma from lib/prisma.ts

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface TextAnalysisResult {
  embedding: number[];
  sentiment?: number; // -1 to 1
  topics?: string[];
  category?: string;
  hostilityScore?: number; // 0 to 1
  argumentStrength?: number; // 0 to 1 - logical coherence
  evidenceLevel?: number; // 0 to 1 - quality of supporting evidence
  topicRelevance?: number; // 0 to 1 - relevance to discussion
  argumentType?: string; // type of argument being made
}

export class EmbeddingService {
  private static readonly EMBEDDING_DIMENSION = 384; // Sentence Transformers dimension
  private static readonly QWEN3_API_URL = process.env.QWEN3_API_URL || 'http://localhost:8000';
  private static readonly MODEL_NAME = 'Qwen/Qwen2.5-3B';
  private static readonly API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.QWEN3_API_KEY;
  private static readonly USE_QDRANT = process.env.QDRANT_URL !== undefined;

  /**
   * Generate embedding using best available service (Azure OpenAI > Local)
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        return new Array(this.EMBEDDING_DIMENSION).fill(0);
      }

      const config = getSemanticConfig();
      
      // Use Azure OpenAI in production or if explicitly configured
      if (config.provider === 'azure' || (isProduction() && process.env.AZURE_OPENAI_ENDPOINT)) {
        try {
          const result = await azureOpenAI.generateEmbedding(text);
          console.log(`✓ Generated Azure OpenAI embedding (${result.processingTime}ms)`);
          return result.embedding;
        } catch (azureError) {
          console.warn('Azure OpenAI failed, falling back to local:', azureError);
        }
      }

      // Fallback to local Sentence Transformers
      const result = await SentenceTransformersService.generateEmbedding(text);
      return result.embedding;
      
    } catch (error) {
      console.error('All embedding methods failed:', error);
      
      // Return zero vector as fallback to prevent system failure
      return new Array(this.EMBEDDING_DIMENSION).fill(0);
    }
  }

  /**
   * Generate comprehensive text analysis including embedding, sentiment, and topic classification
   */
  static async analyzeText(text: string): Promise<TextAnalysisResult> {
    try {
      const cleanText = this.cleanText(text);
      const embedding = await this.generateEmbedding(cleanText);
      
      // Use hybrid approach: Sentence Transformers for basic analysis + custom logic
      const basicAnalysis = SentenceTransformersService.analyzeContent(cleanText);
      
      const result: TextAnalysisResult = {
        embedding,
        sentiment: basicAnalysis.sentiment,
        topics: this.extractTopics(cleanText),
        category: basicAnalysis.category,
        hostilityScore: this.assessHostility(cleanText),
        argumentStrength: this.assessArgumentStrength(cleanText),
        evidenceLevel: this.assessEvidenceLevel(cleanText),
        topicRelevance: 1.0, // Will be calculated relative to specific topics
        argumentType: basicAnalysis.argumentType
      };

      return result;
    } catch (error) {
      console.error('Text analysis failed:', error);
      
      // Return minimal result with zero embedding
      return {
        embedding: new Array(this.EMBEDDING_DIMENSION).fill(0),
        sentiment: 0,
        hostilityScore: 0
      };
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    return SentenceTransformersService.calculateSimilarity(embedding1, embedding2);
  }

  /**
   * Find posts similar to a given embedding using PostgreSQL vector operations
   */
  static async findSimilarPosts(
    targetEmbedding: number[], 
    limit: number = 10, 
    minSimilarity: number = 0.6,
    categoryFilter?: string
  ) {
    try {
      const config = getSemanticConfig();
      
      // Use PostgreSQL vector operations if available (production)
      if (isProduction() && process.env.ENABLE_VECTOR_SEARCH === 'true') {
        try {
          // Use raw SQL for vector similarity search
          const embeddingString = `[${targetEmbedding.join(',')}]`;
          
          const similarPosts: any[] = await prisma.$queryRaw`
            SELECT 
              p.id,
              p.content,
              p."createdAt",
              p."authorId",
              p."isPolitical",
              p."likesCount",
              p."commentsCount",
              u.username,
              u."firstName", 
              u."lastName",
              u.avatar,
              1 - (p.embedding <=> ${embeddingString}::vector) as similarity
            FROM "Post" p
            JOIN "User" u ON p."authorId" = u.id
            WHERE p.embedding IS NOT NULL 
              AND array_length(p.embedding, 1) > 0
              AND 1 - (p.embedding <=> ${embeddingString}::vector) >= ${minSimilarity}
            ORDER BY p.embedding <=> ${embeddingString}::vector
            LIMIT ${limit};
          `;
          
          console.log(`✓ Found ${similarPosts.length} similar posts using PostgreSQL vector search`);
          return similarPosts;
          
        } catch (vectorError) {
          console.warn('PostgreSQL vector search failed, falling back to in-memory:', vectorError);
        }
      }

      // Fallback to in-memory similarity calculation
      const posts = await prisma.post.findMany({
        where: {
          embedding: {
            isEmpty: false // Only posts with embeddings
          }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000 // Limit for performance
      });

      const similarPosts = posts
        .map(post => ({
          ...post,
          similarity: this.calculateSimilarity(targetEmbedding, post.embedding)
        }))
        .filter(post => post.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`✓ Found ${similarPosts.length} similar posts using in-memory search`);
      return similarPosts;
      
    } catch (error) {
      console.error('Similar post search failed:', error);
      return [];
    }
  }

  /**
   * Update post embedding in both PostgreSQL and Qdrant
   */
  static async updatePostEmbedding(postId: string, content: string) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      const analysis = await this.analyzeText(content);
      
      // Update PostgreSQL
      await prisma.post.update({
        where: { id: postId },
        data: {
          embedding: analysis.embedding
        }
      });

      // Update Qdrant if available (temporarily disabled)
      if (this.USE_QDRANT && false) {
        // QdrantService temporarily unavailable
        console.log('Qdrant update skipped - service not available yet');
      }

      console.log(`✓ Updated embeddings for post ${postId}`);
      return analysis;
    } catch (error) {
      console.error(`Failed to update post embedding for ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Batch process embeddings for existing posts
   */
  static async batchProcessEmbeddings(batchSize: number = 50) {
    try {
      console.log('Starting batch embedding processing...');
      
      const postsWithoutEmbeddings = await prisma.post.findMany({
        where: {
          embedding: {
            isEmpty: true
          }
        },
        select: {
          id: true,
          content: true
        },
        take: batchSize
      });

      console.log(`Processing ${postsWithoutEmbeddings.length} posts...`);

      for (const post of postsWithoutEmbeddings) {
        try {
          await this.updatePostEmbedding(post.id, post.content);
          console.log(`✓ Processed post ${post.id}`);
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`✗ Failed to process post ${post.id}:`, error);
        }
      }

      console.log('Batch processing completed');
      return postsWithoutEmbeddings.length;
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  // Private helper methods for basic analysis
  // These will be enhanced with actual Qwen3 API calls

  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .trim()
      .slice(0, 2000); // Limit length for API
  }

  // Sentiment analysis moved to SentenceTransformersService

  private static extractTopics(text: string): string[] {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    const topicKeywords = {
      'healthcare': ['health', 'medical', 'insurance', 'medicare', 'medicaid', 'doctor'],
      'economy': ['economy', 'jobs', 'unemployment', 'inflation', 'tax', 'budget'],
      'environment': ['climate', 'environment', 'green', 'pollution', 'renewable'],
      'education': ['education', 'school', 'teacher', 'student', 'university'],
      'immigration': ['immigration', 'border', 'immigrant', 'visa', 'citizenship']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private static assessArgumentStrength(text: string): number {
    const lowerText = text.toLowerCase();
    let score = 0.5; // Start neutral
    
    // Positive indicators of strong reasoning
    const strongIndicators = [
      'because', 'therefore', 'evidence shows', 'research indicates', 'data suggests',
      'for example', 'specifically', 'in contrast', 'however', 'on the other hand',
      'studies show', 'according to', 'as demonstrated by'
    ];
    
    // Negative indicators (weak reasoning)
    const weakIndicators = [
      'obviously', 'clearly', 'everyone knows', 'it\'s common sense',
      'just because', 'always', 'never', 'all', 'none'
    ];
    
    strongIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) score += 0.1;
    });
    
    weakIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) score -= 0.1;
    });
    
    // Check for question marks (shows consideration of complexity)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 0) score += 0.05;
    
    return Math.max(0, Math.min(1, score));
  }
  
  private static assessEvidenceLevel(text: string): number {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Evidence indicators
    const evidenceKeywords = [
      'study', 'research', 'data', 'statistics', 'survey', 'poll',
      'report', 'analysis', 'findings', 'results', 'peer-reviewed',
      'university', 'institute', 'organization', 'source:', 'according to',
      'published', 'journal', 'expert', 'professor'
    ];
    
    evidenceKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score += 0.15;
    });
    
    // URL/link presence (suggests external sources)
    if (text.includes('http') || text.includes('www.')) score += 0.2;
    
    // Specific numbers or percentages
    if (text.match(/\d+%/) || text.match(/\$[\d,]+/) || text.match(/\d+,\d+/)) {
      score += 0.15;
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  private static estimateSentiment(text: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'positive', 'support', 'agree', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'negative', 'hate', 'disagree', 'wrong', 'fail'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.1;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private static detectCategory(text: string): string {
    const topics = this.extractTopics(text);
    return topics[0] || 'general';
  }

  private static classifyArgumentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('cost') || lowerText.includes('budget') || 
        lowerText.includes('tax') || lowerText.includes('economic')) {
      return 'economic_concern';
    }
    
    if (lowerText.includes('how') || lowerText.includes('implement') || 
        lowerText.includes('practical') || lowerText.includes('logistics')) {
      return 'implementation_focus';
    }
    
    if (lowerText.includes('right') || lowerText.includes('wrong') || 
        lowerText.includes('moral') || lowerText.includes('ethical')) {
      return 'ethical_position';
    }
    
    if (lowerText.includes('experience') || lowerText.includes('happened to me') || 
        lowerText.includes('i\'ve seen') || lowerText.includes('in my')) {
      return 'personal_experience';
    }
    
    if (lowerText.includes('research') || lowerText.includes('study') || 
        lowerText.includes('data') || lowerText.includes('evidence')) {
      return 'evidence_based';
    }
    
    return 'general_opinion';
  }

  private static generateFallbackEmbedding(text: string): number[] {
    // Create a deterministic embedding based on text content
    const hash = this.simpleHash(text);
    const embedding = new Array(this.EMBEDDING_DIMENSION);
    
    for (let i = 0; i < this.EMBEDDING_DIMENSION; i++) {
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

  private static assessHostility(text: string): number {
    const hostileWords = ['stupid', 'idiot', 'hate', 'kill', 'destroy', 'moron', 'scum'];
    const lowerText = text.toLowerCase();
    let score = 0;
    
    hostileWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    // Check for ALL CAPS (often indicates shouting/hostility)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) score += 0.1;
    
    // Check for excessive punctuation
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 2) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
}