import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  politicalLean?: number; // -1 to 1
  hostilityScore?: number; // 0 to 1
}

export class EmbeddingService {
  private static readonly EMBEDDING_DIMENSION = 1536; // Standard for most models
  private static readonly QWEN3_API_URL = process.env.QWEN3_API_URL || 'http://localhost:8000'; // HuggingFace local deployment
  private static readonly MODEL_NAME = 'Qwen/Qwen2.5-3B'; // Or your preferred Qwen3 model
  private static readonly API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.QWEN3_API_KEY;

  /**
   * Generate embedding for text using Qwen3
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        return new Array(this.EMBEDDING_DIMENSION).fill(0);
      }

      // Clean and prepare text
      const cleanText = this.cleanText(text);
      
      // Try HuggingFace API first
      if (this.API_KEY) {
        try {
          const response = await axios.post(
            `https://api-inference.huggingface.co/models/${this.MODEL_NAME}`,
            { inputs: cleanText },
            {
              headers: {
                'Authorization': `Bearer ${this.API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          if (response.data && Array.isArray(response.data)) {
            return response.data;
          }
        } catch (hfError) {
          console.warn('HuggingFace API failed, falling back to local deployment:', hfError);
        }
      }

      // Fallback to local deployment
      const response = await axios.post(
        `${this.QWEN3_API_URL}/embed`,
        {
          text: cleanText,
          model: this.MODEL_NAME
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.embedding) {
        return response.data.embedding;
      }

      throw new Error('Invalid embedding response format');
    } catch (error) {
      console.error('Embedding generation failed:', error);
      
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
      
      // For now, we'll implement basic analysis
      // Later this can be enhanced with more sophisticated Qwen3 analysis
      const result: TextAnalysisResult = {
        embedding,
        sentiment: this.estimateSentiment(cleanText),
        topics: this.extractTopics(cleanText),
        category: this.classifyCategory(cleanText),
        politicalLean: this.estimatePoliticalLean(cleanText),
        hostilityScore: this.assessHostility(cleanText)
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

  /**
   * Find posts similar to a given embedding
   */
  static async findSimilarPosts(
    targetEmbedding: number[], 
    limit: number = 10, 
    minSimilarity: number = 0.7
  ) {
    try {
      // For now, we'll fetch posts and calculate similarity in memory
      // Later this should be moved to Qdrant for performance
      const posts = await prisma.post.findMany({
        where: {
          embedding: {
            not: { equals: [] } // Only posts with embeddings
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

      return similarPosts;
    } catch (error) {
      console.error('Similar post search failed:', error);
      return [];
    }
  }

  /**
   * Update post embedding
   */
  static async updatePostEmbedding(postId: string, content: string) {
    try {
      const analysis = await this.analyzeText(content);
      
      await prisma.post.update({
        where: { id: postId },
        data: {
          embedding: analysis.embedding
          // Add other analysis fields to Post model if needed
        }
      });

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
          OR: [
            { embedding: { equals: [] } },
            { embedding: { equals: null as any } }
          ]
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

  private static classifyCategory(text: string): string | undefined {
    const topics = this.extractTopics(text);
    return topics[0]; // Return primary topic
  }

  private static estimatePoliticalLean(text: string): number {
    const liberalKeywords = ['progressive', 'liberal', 'democratic', 'social justice', 'equality'];
    const conservativeKeywords = ['conservative', 'traditional', 'republican', 'free market', 'liberty'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    liberalKeywords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });
    
    conservativeKeywords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });
    
    return Math.max(-1, Math.min(1, score));
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