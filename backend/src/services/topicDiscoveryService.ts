/**
 * Universal Semantic Topic Discovery and Navigation System
 * 
 * Implements the complete workflow you described:
 * 1. Group similar vectors into trending topics
 * 2. Generate AI summaries with prevailing positions and critiques  
 * 3. Enable topic-filtered navigation and content creation
 * 4. Seamless return to algorithm-based feed when exiting topics
 * 
 * Designed to be reusable across different content types and domains.
 */

import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from './embeddingService';
import { QdrantService } from './qdrantService';
import { QwenService } from './qwenService';
import { azureOpenAI } from './azureOpenAIService';
import { ProbabilityFeedService } from './probabilityFeedService';
import { getSemanticConfig, isProduction } from '../config/azureConfig';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface TopicCluster {
    id: string;
    title: string;
    summary: string;
    prevailingPosition?: string;
    leadingCritique?: string;
    participantCount: number;
    postCount: number;
    engagementScore: number;
    centroidEmbedding: number[];
    keyWords: string[];
    createdAt: Date;
    lastActivity: Date;
    category?: string;
    relatedPosts: Array<{
        id: string;
        content: string;
        author: string;
        similarity: number;
        engagement: { likes: number; comments: number; };
    }>;
}

export interface TopicNavigationState {
    activeTopic?: TopicCluster;
    filteredPostIds: string[];
    algorithmFallback: any; // Stores previous feed algorithm state
}

export class TopicDiscoveryService {
    
    /**
     * Main entry point: Discover trending topics from recent activity
     */
    static async discoverTrendingTopics(
        timeframeHours: number = 24,
        minPostsPerTopic: number = 5,
        maxTopics: number = 15
    ): Promise<TopicCluster[]> {
        try {
            logger.info(`Discovering trending topics from last ${timeframeHours} hours...`);
            
            // 1. Get recent posts with high engagement
            const recentPosts = await this.getRecentEngagedPosts(timeframeHours);
            
            if (recentPosts.length < minPostsPerTopic) {
                logger.warn('Insufficient posts for topic discovery');
                return [];
            }
            
            // 2. Cluster posts by semantic similarity
            const clusters = await this.clusterPostsBySimilarity(recentPosts, minPostsPerTopic);
            
            // 3. Generate AI summaries for each cluster
            const topicsWithSummaries = await Promise.all(
                clusters.slice(0, maxTopics).map(cluster => this.generateTopicSummary(cluster))
            );
            
            // 4. Sort by engagement and relevance
            const rankedTopics = topicsWithSummaries
                .filter(topic => topic.postCount >= minPostsPerTopic)
                .sort((a, b) => b.engagementScore - a.engagementScore);
            
            logger.info(`Discovered ${rankedTopics.length} trending topics`);
            return rankedTopics;
            
        } catch (error) {
            logger.error('Topic discovery failed:', error);
            return [];
        }
    }
    
    /**
     * Get posts that are suitable for topic clustering
     */
    private static async getRecentEngagedPosts(timeframeHours: number) {
        const cutoffDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
        
        return await prisma.post.findMany({
            where: {
                createdAt: { gte: cutoffDate },
                embedding: { isEmpty: false }, // Must have embeddings
                OR: [
                    { likesCount: { gte: 1 } },    // Has engagement
                    { commentsCount: { gte: 1 } },
                    { createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } } // Or very recent
                ]
            },
            include: {
                author: {
                    select: { username: true, firstName: true, lastName: true }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            },
            orderBy: [
                { likesCount: 'desc' },
                { commentsCount: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 500 // Limit scope for performance
        });
    }
    
    /**
     * Cluster posts using semantic similarity
     */
    private static async clusterPostsBySimilarity(
        posts: any[], 
        minClusterSize: number
    ): Promise<Array<{
        centroid: number[];
        posts: any[];
        engagementScore: number;
    }>> {
        if (posts.length === 0) return [];
        
        const clusters: Array<{
            centroid: number[];
            posts: any[];
            engagementScore: number;
        }> = [];
        
        const unclusteredPosts = [...posts];
        const similarityThreshold = 0.60; // Broader threshold to capture opposing viewpoints (60-90%)
        
        while (unclusteredPosts.length >= minClusterSize) {
            // Take the most engaged unclustered post as a seed
            const seedPost = unclusteredPosts.shift()!;
            const seedEmbedding = seedPost.embedding;
            
            // Find all posts similar to the seed
            const similarPosts = [seedPost];
            
            for (let i = unclusteredPosts.length - 1; i >= 0; i--) {
                const post = unclusteredPosts[i];
                const similarity = this.cosineSimilarity(seedEmbedding, post.embedding);
                
                if (similarity >= similarityThreshold) {
                    similarPosts.push(post);
                    unclusteredPosts.splice(i, 1); // Remove from unclustered
                }
            }
            
            // Only create cluster if it has enough posts
            if (similarPosts.length >= minClusterSize) {
                const centroid = this.calculateCentroid(similarPosts.map(p => p.embedding));
                const engagementScore = this.calculateEngagementScore(similarPosts);
                
                clusters.push({
                    centroid,
                    posts: similarPosts,
                    engagementScore
                });
            }
        }
        
        return clusters.sort((a, b) => b.engagementScore - a.engagementScore);
    }
    
    /**
     * Generate comprehensive AI summary for a topic cluster
     */
    private static async generateTopicSummary(cluster: {
        centroid: number[];
        posts: any[];
        engagementScore: number;
    }): Promise<TopicCluster> {
        
        const postContents = cluster.posts.map((post, idx) => 
            `${idx + 1}. "${post.content}" (👍${post._count.likes} 💬${post._count.comments})`
        ).join('\n');
        
        const prompt = `Analyze this cluster of similar social media posts to create a trending topic summary:

POSTS IN CLUSTER:
${postContents}

TASK: Generate a comprehensive topic analysis for a social media trending topics system.

Respond with JSON only:
{
    "title": "clear, engaging topic title (max 60 chars)",
    "summary": "2-3 sentence overview of what this topic is about",
    "prevailingPosition": "the main viewpoint or consensus emerging from these posts",
    "leadingCritique": "the main counterargument or concern being raised",
    "category": "politics|social|local|news|general",
    "keyWords": ["word1", "word2", "word3"],
    "engagementInsight": "why this topic is generating discussion"
}`;

        try {
            // Use Azure OpenAI in production, fallback to Qwen locally
            let response: string;
            const config = getSemanticConfig();
            
            if (config.provider === 'azure' || (isProduction() && process.env.AZURE_OPENAI_ENDPOINT)) {
                const azureSummary = await azureOpenAI.generateTopicSummary(cluster.posts);
                response = JSON.stringify({
                    title: azureSummary.title,
                    summary: `Topic analysis of ${cluster.posts.length} posts`,
                    prevailingPosition: azureSummary.prevailingPosition,
                    leadingCritique: azureSummary.leadingCritique,
                    category: 'politics',
                    keyWords: this.extractKeyWords(cluster.posts.map(p => p.content)),
                    engagementInsight: `Discussion involving ${cluster.posts.length} posts`
                });
            } else {
                response = await QwenService.generateResponse(prompt, 400);
            }
            
            const analysisMatch = response.match(/\{[\s\S]*\}/);
            
            if (!analysisMatch) {
                throw new Error('No JSON found in AI response');
            }
            
            const analysis = JSON.parse(analysisMatch[0]);
            
            // Create topic cluster object
            const topicId = this.generateTopicId(analysis.title);
            
            return {
                id: topicId,
                title: analysis.title,
                summary: analysis.summary,
                prevailingPosition: analysis.prevailingPosition,
                leadingCritique: analysis.leadingCritique,
                participantCount: new Set(cluster.posts.map(p => p.authorId)).size,
                postCount: cluster.posts.length,
                engagementScore: cluster.engagementScore,
                centroidEmbedding: cluster.centroid,
                keyWords: analysis.keyWords || [],
                createdAt: new Date(),
                lastActivity: new Date(Math.max(...cluster.posts.map(p => new Date(p.createdAt).getTime()))),
                category: analysis.category,
                relatedPosts: cluster.posts.map(post => ({
                    id: post.id,
                    content: post.content,
                    author: post.author.username || `${post.author.firstName} ${post.author.lastName}`.trim(),
                    similarity: this.cosineSimilarity(cluster.centroid, post.embedding),
                    engagement: {
                        likes: post._count.likes,
                        comments: post._count.comments
                    }
                }))
            };
            
        } catch (error) {
            logger.warn('Topic summary generation failed:', error);
            
            // Fallback to basic summary
            return this.generateFallbackSummary(cluster);
        }
    }
    
    /**
     * Enter topic navigation mode - filter content by topic
     */
    static async enterTopicMode(
        topicId: string, 
        userId: string,
        limit: number = 30
    ): Promise<{
        topicCluster: TopicCluster;
        filteredPosts: any[];
        navigationState: TopicNavigationState;
    }> {
        try {
            // Get the topic cluster (in a real implementation, you'd cache these)
            const topics = await this.discoverTrendingTopics();
            const topic = topics.find(t => t.id === topicId);
            
            if (!topic) {
                throw new Error(`Topic ${topicId} not found`);
            }
            
            // Store current algorithm state for return navigation
            const algorithmFeedResult = await ProbabilityFeedService.generateFeed(userId, limit);
            const algorithmFallback = algorithmFeedResult.posts;
            
            // Get posts similar to this topic's centroid
            const filteredPosts = await QdrantService.searchSimilar(topic.centroidEmbedding, {
                limit: limit * 2, // Get more for better selection
                scoreThreshold: 0.7
            });
            
            // Format posts with engagement data
            const enrichedPosts = await this.enrichPostsWithMetadata(
                filteredPosts.map(p => p.payload.postId)
            );
            
            const navigationState: TopicNavigationState = {
                activeTopic: topic,
                filteredPostIds: enrichedPosts.map(p => p.id),
                algorithmFallback
            };
            
            logger.info(`User ${userId} entered topic mode: ${topic.title}`);
            
            return {
                topicCluster: topic,
                filteredPosts: enrichedPosts.slice(0, limit),
                navigationState
            };
            
        } catch (error) {
            logger.error('Failed to enter topic mode:', error);
            throw error;
        }
    }
    
    /**
     * Exit topic mode and return to algorithm-based feed
     */
    static async exitTopicMode(
        userId: string,
        navigationState: TopicNavigationState
    ): Promise<any[]> {
        try {
            logger.info(`User ${userId} exiting topic mode`);
            
            // Return to the stored algorithm state, or generate fresh feed
            if (navigationState.algorithmFallback) {
                return navigationState.algorithmFallback;
            } else {
                const feedResult = await ProbabilityFeedService.generateFeed(userId);
                return feedResult.posts;
            }
            
        } catch (error) {
            logger.error('Failed to exit topic mode:', error);
            // Fallback to fresh feed generation
            const feedResult = await ProbabilityFeedService.generateFeed(userId);
            return feedResult.posts;
        }
    }
    
    /**
     * Get posts for topic-filtered content creation
     */
    static async getTopicPosts(
        topicId: string,
        offset: number = 0,
        limit: number = 20
    ): Promise<any[]> {
        const topics = await this.discoverTrendingTopics();
        const topic = topics.find(t => t.id === topicId);
        
        if (!topic) {
            return [];
        }
        
        // Get more posts similar to this topic
        const similarPosts = await QdrantService.searchSimilar(topic.centroidEmbedding, {
            limit: limit + offset,
            scoreThreshold: 0.65 // Slightly lower threshold for content discovery
        });
        
        const postIds = similarPosts
            .slice(offset, offset + limit)
            .map(p => p.payload.postId);
            
        return await this.enrichPostsWithMetadata(postIds);
    }
    
    // Helper methods
    private static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
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
    
    private static calculateCentroid(embeddings: number[][]): number[] {
        if (embeddings.length === 0) return [];
        
        const dimension = embeddings[0].length;
        const centroid = new Array(dimension).fill(0);
        
        for (const embedding of embeddings) {
            for (let i = 0; i < dimension; i++) {
                centroid[i] += embedding[i];
            }
        }
        
        for (let i = 0; i < dimension; i++) {
            centroid[i] /= embeddings.length;
        }
        
        return centroid;
    }
    
    private static calculateEngagementScore(posts: any[]): number {
        let totalScore = 0;
        
        for (const post of posts) {
            const likes = post._count?.likes || post.likesCount || 0;
            const comments = post._count?.comments || post.commentsCount || 0;
            const recency = Math.max(0, 1 - (Date.now() - new Date(post.createdAt).getTime()) / (24 * 60 * 60 * 1000));
            
            totalScore += (likes * 1 + comments * 2) * (1 + recency);
        }
        
        return totalScore / posts.length;
    }
    
    private static generateTopicId(title: string): string {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50) + '-' + Date.now().toString(36);
    }
    
    private static generateFallbackSummary(cluster: { posts: any[]; engagementScore: number; centroid: number[]; }): TopicCluster {
        const topWords = this.extractKeyWords(cluster.posts.map(p => p.content));
        const title = topWords.slice(0, 3).join(' ').substring(0, 60);
        
        return {
            id: this.generateTopicId(title),
            title: title || 'Trending Discussion',
            summary: `A discussion involving ${cluster.posts.length} posts with active engagement`,
            participantCount: new Set(cluster.posts.map(p => p.authorId)).size,
            postCount: cluster.posts.length,
            engagementScore: cluster.engagementScore,
            centroidEmbedding: cluster.centroid,
            keyWords: topWords,
            createdAt: new Date(),
            lastActivity: new Date(),
            relatedPosts: cluster.posts.map(post => ({
                id: post.id,
                content: post.content,
                author: post.author?.username || 'User',
                similarity: 0.8,
                engagement: { likes: post._count?.likes || 0, comments: post._count?.comments || 0 }
            }))
        };
    }
    
    private static extractKeyWords(contents: string[]): string[] {
        const words = contents.join(' ')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were'].includes(word));
            
        const wordCount = words.reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }
    
    private static async enrichPostsWithMetadata(postIds: string[]): Promise<any[]> {
        return await prisma.post.findMany({
            where: { id: { in: postIds } },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true
                    }
                },
                _count: {
                    select: { likes: true, comments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}

export default TopicDiscoveryService;