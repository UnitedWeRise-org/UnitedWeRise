"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicAggregationService = void 0;
const prisma_1 = require("../lib/prisma");
const embeddingService_1 = require("./embeddingService");
const azureOpenAIService_1 = require("./azureOpenAIService");
const logger_1 = require("./logger");
class TopicAggregationService {
    /**
     * Generate aggregated topics with dual-vector stance detection
     */
    static async aggregateTopics(options = {}) {
        const { timeframeHours = this.DEFAULT_TIMEFRAME_HOURS, minPostsPerTopic = this.MIN_POSTS_PER_TOPIC, maxTopics = this.MAX_TOPICS, geographicScope = 'national', userState, userCity, similarityThreshold = this.SIMILARITY_THRESHOLD } = options;
        // Check cache first
        const cacheKey = `${geographicScope}_${userState}_${userCity}`;
        const cached = this.getCachedTopics(cacheKey);
        if (cached) {
            logger_1.logger.info({ cacheKey }, 'Returning cached topics');
            return cached;
        }
        logger_1.logger.info({ geographicScope, userState, userCity }, 'Aggregating topics');
        try {
            // Step 1: Fetch relevant posts with embeddings
            const posts = await this.fetchRelevantPosts(timeframeHours, geographicScope, userState, userCity);
            if (posts.length < minPostsPerTopic) {
                logger_1.logger.info({ postsCount: posts.length, minRequired: minPostsPerTopic }, 'Not enough posts for topic aggregation');
                return [];
            }
            // Step 2: Initial clustering to identify topic groups
            const topicClusters = await this.clusterPosts(posts, similarityThreshold);
            // Step 3: For each cluster, perform stance analysis and create dual vectors
            const aggregatedTopics = [];
            for (const cluster of topicClusters) {
                if (cluster.posts.length < minPostsPerTopic)
                    continue;
                // Analyze stances within the cluster
                const stanceAnalysis = await this.analyzeStances(cluster.posts);
                if (!stanceAnalysis)
                    continue;
                // Generate topic title and summaries using AI
                const topicMetadata = await this.generateTopicMetadata(stanceAnalysis.supportPosts, stanceAnalysis.opposePosts, stanceAnalysis.neutralPosts);
                // Calculate relevance score
                const score = this.calculateTopicScore(cluster.posts, geographicScope, userState, userCity);
                // Determine geographic scope of topic
                const topicScope = this.determineTopicScope(cluster.posts, userState, userCity);
                aggregatedTopics.push({
                    id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: topicMetadata.title,
                    supportVector: {
                        vector: stanceAnalysis.supportVector,
                        posts: stanceAnalysis.supportPosts,
                        summary: topicMetadata.supportSummary,
                        percentage: stanceAnalysis.supportPercentage
                    },
                    opposeVector: {
                        vector: stanceAnalysis.opposeVector,
                        posts: stanceAnalysis.opposePosts,
                        summary: topicMetadata.opposeSummary,
                        percentage: stanceAnalysis.opposePercentage
                    },
                    neutralPosts: stanceAnalysis.neutralPosts.length > 0 ? stanceAnalysis.neutralPosts : undefined,
                    totalPosts: cluster.posts.length,
                    score,
                    geographicScope: topicScope.scope,
                    state: topicScope.state,
                    city: topicScope.city,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + this.CACHE_DURATION_MINUTES * 60 * 1000)
                });
            }
            // Step 4: Sort by relevance score and limit to maxTopics
            aggregatedTopics.sort((a, b) => b.score - a.score);
            const finalTopics = aggregatedTopics.slice(0, maxTopics);
            // Step 5: Cache the results
            this.cacheTopics(cacheKey, finalTopics);
            return finalTopics;
        }
        catch (error) {
            logger_1.logger.error({ error, geographicScope, userState, userCity }, 'Error aggregating topics');
            return [];
        }
    }
    /**
     * Fetch posts relevant to the geographic scope
     */
    static async fetchRelevantPosts(timeframeHours, scope, userState, userCity) {
        const cutoffDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
        let whereClause = {
            createdAt: { gte: cutoffDate },
            embedding: { isEmpty: false },
            isPolitical: true // Focus on political posts for civic engagement
        };
        // Add geographic filtering based on scope
        if (scope === 'state' && userState) {
            whereClause.author = {
                state: userState
            };
        }
        else if (scope === 'local' && userCity && userState) {
            whereClause.author = {
                city: userCity,
                state: userState
            };
        }
        const posts = await prisma_1.prisma.post.findMany({
            where: whereClause,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        state: true,
                        city: true
                    }
                },
                likes: true,
                comments: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 1000 // Limit to prevent overwhelming the system
        });
        return posts;
    }
    /**
     * Cluster posts by similarity
     */
    static async clusterPosts(posts, threshold) {
        const clusters = [];
        const assigned = new Set();
        for (const post of posts) {
            if (assigned.has(post.id))
                continue;
            const cluster = {
                posts: [post],
                centroid: post.embedding
            };
            // Find similar posts for this cluster
            for (const otherPost of posts) {
                if (assigned.has(otherPost.id) || otherPost.id === post.id)
                    continue;
                const similarity = embeddingService_1.EmbeddingService.calculateSimilarity(post.embedding, otherPost.embedding);
                if (similarity >= threshold) {
                    cluster.posts.push(otherPost);
                    assigned.add(otherPost.id);
                }
            }
            if (cluster.posts.length >= this.MIN_POSTS_PER_TOPIC) {
                assigned.add(post.id);
                // Recalculate centroid as average of all posts in cluster
                cluster.centroid = this.calculateCentroid(cluster.posts);
                clusters.push(cluster);
            }
        }
        return clusters;
    }
    /**
     * Analyze stances within a topic cluster
     */
    static async analyzeStances(posts) {
        // Use Azure OpenAI to analyze sentiment/stance for each post
        const stancePromises = posts.map(post => this.determineStance(post));
        const stances = await Promise.all(stancePromises);
        const supportPosts = [];
        const opposePosts = [];
        const neutralPosts = [];
        posts.forEach((post, index) => {
            const stance = stances[index];
            const postWithSim = { ...post, similarity: 1.0 };
            if (stance === 'support') {
                supportPosts.push(postWithSim);
            }
            else if (stance === 'oppose') {
                opposePosts.push(postWithSim);
            }
            else {
                neutralPosts.push(postWithSim);
            }
        });
        // Need at least some posts on each side to create dual vectors
        if (supportPosts.length === 0 || opposePosts.length === 0) {
            return null;
        }
        // Calculate separate centroids for support and oppose vectors
        const supportVector = this.calculateCentroid(supportPosts);
        const opposeVector = this.calculateCentroid(opposePosts);
        const total = posts.length;
        return {
            supportPosts,
            opposePosts,
            neutralPosts,
            supportVector,
            opposeVector,
            supportPercentage: Math.round((supportPosts.length / total) * 100),
            opposePercentage: Math.round((opposePosts.length / total) * 100)
        };
    }
    /**
     * Determine stance of a post using AI
     */
    static async determineStance(post) {
        try {
            const prompt = `Analyze the stance of this post. Respond with ONLY one word: "support", "oppose", or "neutral"

Post: "${post.content}"`;
            // NEW: Use Tier 1 for mission-critical political reasoning
            const stance = await azureOpenAIService_1.azureOpenAI.generateTier1Completion(prompt, {
                maxTokens: 10,
                temperature: 0.3
            });
            const stanceLower = stance.toLowerCase().trim();
            if (['support', 'oppose', 'neutral'].includes(stanceLower)) {
                return stanceLower;
            }
        }
        catch (error) {
            logger_1.logger.error({ error, postId: post.id }, 'Error determining stance');
        }
        // Default to neutral if analysis fails
        return 'neutral';
    }
    /**
     * Generate topic title and summaries using AI
     */
    static async generateTopicMetadata(supportPosts, opposePosts, neutralPosts) {
        try {
            const supportSample = supportPosts.slice(0, 3).map(p => p.content).join('\n');
            const opposeSample = opposePosts.slice(0, 3).map(p => p.content).join('\n');
            const prompt = `Generate a concise topic title and summaries for both viewpoints. Format: TITLE: [title]
SUPPORT: [summary]
OPPOSE: [summary]

Supporting posts:
${supportSample}

Opposing posts:
${opposeSample}`;
            // NEW: Use Tier 1 for political discourse summarization
            const content = await azureOpenAIService_1.azureOpenAI.generateTier1Completion(prompt, {
                maxTokens: 150,
                temperature: 0.7
            });
            // Parse the response
            const lines = content.split('\n');
            const title = lines.find(l => l.startsWith('TITLE:'))?.replace('TITLE:', '').trim() || 'Trending Topic';
            const supportSummary = lines.find(l => l.startsWith('SUPPORT:'))?.replace('SUPPORT:', '').trim() || 'Supporting viewpoint';
            const opposeSummary = lines.find(l => l.startsWith('OPPOSE:'))?.replace('OPPOSE:', '').trim() || 'Opposing viewpoint';
            return { title, supportSummary, opposeSummary };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Error generating topic metadata');
            return {
                title: 'Trending Discussion',
                supportSummary: 'Supporting this position',
                opposeSummary: 'Opposing this position'
            };
        }
    }
    /**
     * Calculate topic relevance score
     */
    static calculateTopicScore(posts, scope, userState, userCity) {
        let score = 0;
        // Recency score (exponential decay)
        const now = Date.now();
        posts.forEach(post => {
            const ageHours = (now - post.createdAt.getTime()) / (1000 * 60 * 60);
            const recencyScore = Math.exp(-ageHours / 48); // Half-life of 48 hours
            score += recencyScore * 10;
        });
        // Engagement score
        posts.forEach(post => {
            const likes = post.likes?.length || 0;
            const comments = post.comments?.length || 0;
            score += (likes * 2 + comments * 3);
        });
        // Velocity score (how many posts in last 6 hours)
        const recentPosts = posts.filter(p => (now - p.createdAt.getTime()) < 6 * 60 * 60 * 1000);
        score += recentPosts.length * 5;
        // Geographic relevance boost
        if (scope === 'local') {
            const localPosts = posts.filter(p => p.author?.city === userCity && p.author?.state === userState);
            score += localPosts.length * 10;
        }
        else if (scope === 'state') {
            const statePosts = posts.filter(p => p.author?.state === userState);
            score += statePosts.length * 7;
        }
        return score;
    }
    /**
     * Determine the geographic scope of a topic
     */
    static determineTopicScope(posts, userState, userCity) {
        const states = new Set();
        const cities = new Set();
        posts.forEach(post => {
            const author = post.author;
            if (author?.state)
                states.add(author.state);
            if (author?.city)
                cities.add(author.city);
        });
        // If posts are from single city, it's local
        if (cities.size === 1 && userCity && cities.has(userCity)) {
            return {
                scope: 'local',
                city: userCity,
                state: userState
            };
        }
        // If posts are from single state, it's state-level
        if (states.size === 1 && userState && states.has(userState)) {
            return {
                scope: 'state',
                state: userState,
                city: undefined
            };
        }
        // Otherwise it's national
        return {
            scope: 'national',
            state: undefined,
            city: undefined
        };
    }
    /**
     * Calculate centroid of posts
     */
    static calculateCentroid(posts) {
        if (posts.length === 0)
            return [];
        const embeddings = posts.map(p => p.embedding);
        const dimensions = embeddings[0].length;
        const centroid = new Array(dimensions).fill(0);
        embeddings.forEach(embedding => {
            embedding.forEach((val, idx) => {
                centroid[idx] += val;
            });
        });
        return centroid.map(val => val / embeddings.length);
    }
    /**
     * Get cached topics if still valid
     */
    static getCachedTopics(cacheKey) {
        const cached = this.topicCache.get(cacheKey);
        const timestamp = this.cacheTimestamps.get(cacheKey);
        if (cached && timestamp) {
            const age = Date.now() - timestamp.getTime();
            if (age < this.CACHE_DURATION_MINUTES * 60 * 1000) {
                return cached;
            }
        }
        return null;
    }
    /**
     * Cache topics
     */
    static cacheTopics(cacheKey, topics) {
        this.topicCache.set(cacheKey, topics);
        this.cacheTimestamps.set(cacheKey, new Date());
    }
    /**
     * Get topics for map display (rotating subset)
     */
    static async getMapTopics(userState, userCity, count = 3) {
        // Get all topics
        const topics = await this.aggregateTopics({
            geographicScope: 'national',
            userState,
            userCity
        });
        // Return rotating subset for map display
        const startIndex = Math.floor(Date.now() / 15000) % Math.max(1, topics.length - count + 1);
        return topics.slice(startIndex, startIndex + count);
    }
}
exports.TopicAggregationService = TopicAggregationService;
TopicAggregationService.DEFAULT_TIMEFRAME_HOURS = 168; // 7 days
TopicAggregationService.MIN_POSTS_PER_TOPIC = 5;
TopicAggregationService.SIMILARITY_THRESHOLD = 0.70;
TopicAggregationService.STANCE_SIMILARITY_THRESHOLD = 0.65;
TopicAggregationService.MAX_TOPICS = 15;
TopicAggregationService.CACHE_DURATION_MINUTES = 15;
TopicAggregationService.topicCache = new Map();
TopicAggregationService.cacheTimestamps = new Map();
//# sourceMappingURL=topicAggregationService.js.map