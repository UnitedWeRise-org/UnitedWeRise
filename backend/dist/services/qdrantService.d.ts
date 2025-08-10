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
export declare class QdrantService {
    private static client;
    private static readonly COLLECTION_NAME;
    private static readonly VECTOR_DIMENSION;
    /**
     * Initialize Qdrant client
     */
    private static getClient;
    /**
     * Create collection if it doesn't exist
     */
    static initializeCollection(): Promise<void>;
    /**
     * Add or update a vector point
     */
    static upsertVector(point: VectorPoint): Promise<void>;
    /**
     * Batch upsert multiple vectors
     */
    static upsertVectors(points: VectorPoint[]): Promise<void>;
    /**
     * Search for similar vectors
     */
    static searchSimilar(queryVector: number[], limit?: number, minScore?: number, categoryFilter?: string): Promise<SearchResult[]>;
    /**
     * Delete a vector by ID
     */
    static deleteVector(id: string): Promise<void>;
    /**
     * Get collection info and statistics
     */
    static getCollectionInfo(): Promise<any>;
    /**
     * Health check
     */
    static healthCheck(): Promise<{
        status: string;
        details?: any;
    }>;
    /**
     * Count vectors in collection
     */
    static count(categoryFilter?: string): Promise<number>;
    /**
     * Clear all vectors (use with caution!)
     */
    static clearCollection(): Promise<void>;
}
export {};
//# sourceMappingURL=qdrantService.d.ts.map