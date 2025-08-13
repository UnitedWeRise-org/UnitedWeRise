import { QdrantClient } from '@qdrant/js-client-rest';

interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    content: string;
    postId: string;
    authorId: string;
    category?: string;
    createdAt: string;
    argumentStrength?: number;
    evidenceLevel?: number;
    hostilityScore?: number;
  };
}

interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

export class QdrantService {
  private static client: QdrantClient;
  private static readonly COLLECTION_NAME = 'post_embeddings';
  private static readonly VECTOR_DIMENSION = 384; // all-MiniLM-L6-v2 dimension

  /**
   * Initialize Qdrant client
   */
  private static getClient(): QdrantClient {
    if (!this.client) {
      this.client = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || undefined,
      });
    }
    return this.client;
  }

  /**
   * Create collection if it doesn't exist
   */
  static async initializeCollection(): Promise<void> {
    try {
      const client = this.getClient();
      
      // Check if collection exists
      try {
        await client.getCollection(this.COLLECTION_NAME);
        console.log(`Collection ${this.COLLECTION_NAME} already exists`);
        return;
      } catch (error) {
        // Collection doesn't exist, create it
        console.log(`Creating collection ${this.COLLECTION_NAME}...`);
      }

      await client.createCollection(this.COLLECTION_NAME, {
        vectors: {
          size: this.VECTOR_DIMENSION,
          distance: 'Cosine', // Good for semantic similarity
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Create index for better performance
      await client.createPayloadIndex(this.COLLECTION_NAME, {
        field_name: 'category',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(this.COLLECTION_NAME, {
        field_name: 'createdAt',
        field_schema: 'datetime',
      });

      console.log(`✓ Collection ${this.COLLECTION_NAME} created successfully`);
    } catch (error) {
      console.error('Failed to initialize Qdrant collection:', error);
      throw error;
    }
  }

  /**
   * Add or update a vector point
   */
  static async upsertVector(point: VectorPoint): Promise<void> {
    try {
      const client = this.getClient();
      
      await client.upsert(this.COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: point.id,
            vector: point.vector,
            payload: point.payload,
          },
        ],
      });

      console.log(`✓ Upserted vector for post ${point.payload.postId}`);
    } catch (error) {
      console.error(`Failed to upsert vector ${point.id}:`, error);
      throw error;
    }
  }

  /**
   * Batch upsert multiple vectors
   */
  static async upsertVectors(points: VectorPoint[]): Promise<void> {
    try {
      const client = this.getClient();
      
      const batchSize = 100; // Process in batches to avoid memory issues
      
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        
        await client.upsert(this.COLLECTION_NAME, {
          wait: true,
          points: batch.map(point => ({
            id: point.id,
            vector: point.vector,
            payload: point.payload,
          })),
        });

        console.log(`✓ Upserted batch ${i + 1}-${Math.min(i + batchSize, points.length)} of ${points.length}`);
      }
    } catch (error) {
      console.error('Failed to batch upsert vectors:', error);
      throw error;
    }
  }

  /**
   * Store embedding for a post
   */
  static async storeEmbedding(
    postId: string,
    embedding: number[],
    metadata: {
      content: string;
      authorId: string;
      category?: string;
      createdAt?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    const point: VectorPoint = {
      id: postId,
      vector: embedding,
      payload: {
        content: metadata.content,
        postId: postId,
        authorId: metadata.authorId,
        category: metadata.category,
        createdAt: metadata.createdAt || new Date().toISOString(),
        argumentStrength: metadata.argumentStrength,
        evidenceLevel: metadata.evidenceLevel,
        hostilityScore: metadata.hostilityScore
      }
    };
    
    return this.upsertVector(point);
  }

  /**
   * Search for similar vectors
   */
  static async searchSimilar(
    queryVector: number[],
    options: {
      limit?: number;
      scoreThreshold?: number;
      categoryFilter?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 10, scoreThreshold = 0.7, categoryFilter } = options;
    try {
      const client = this.getClient();
      
      const filter: any = {};
      
      // Add category filter if specified
      if (categoryFilter) {
        filter.must = [
          {
            key: 'category',
            match: {
              value: categoryFilter,
            },
          },
        ];
      }

      const searchResult = await client.search(this.COLLECTION_NAME, {
        vector: queryVector,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });

      return searchResult.map(result => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as VectorPoint['payload'],
      }));
    } catch (error) {
      console.error('Failed to search similar vectors:', error);
      throw error;
    }
  }

  /**
   * Delete a vector by ID
   */
  static async deleteVector(id: string): Promise<void> {
    try {
      const client = this.getClient();
      
      await client.delete(this.COLLECTION_NAME, {
        wait: true,
        points: [id],
      });

      console.log(`✓ Deleted vector ${id}`);
    } catch (error) {
      console.error(`Failed to delete vector ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get collection info and statistics
   */
  static async getCollectionInfo(): Promise<any> {
    try {
      const client = this.getClient();
      return await client.getCollection(this.COLLECTION_NAME);
    } catch (error) {
      console.error('Failed to get collection info:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const client = this.getClient();
      
      // Try to get collections as health check
      const collections = await client.getCollections();
      
      return {
        status: 'healthy',
        details: collections,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Count vectors in collection
   */
  static async count(categoryFilter?: string): Promise<number> {
    try {
      const client = this.getClient();
      
      const filter: any = {};
      if (categoryFilter) {
        filter.must = [
          {
            key: 'category',
            match: { value: categoryFilter },
          },
        ];
      }

      const result = await client.count(this.COLLECTION_NAME, {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });

      return result.count;
    } catch (error) {
      console.error('Failed to count vectors:', error);
      throw error;
    }
  }

  /**
   * Clear all vectors (use with caution!)
   */
  static async clearCollection(): Promise<void> {
    try {
      const client = this.getClient();
      
      await client.delete(this.COLLECTION_NAME, {
        wait: true,
        filter: {}, // Delete all points
      });

      console.log('✓ Cleared all vectors from collection');
    } catch (error) {
      console.error('Failed to clear collection:', error);
      throw error;
    }
  }
}