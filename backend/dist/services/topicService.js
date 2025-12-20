"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicService = void 0;
const prisma_1 = require("../lib/prisma");
const embeddingService_1 = require("./embeddingService");
const logger_1 = require("./logger");
class TopicService {
    static MIN_POSTS_PER_TOPIC = 3;
    static SIMILARITY_THRESHOLD = 0.7;
    static MAX_TOPICS_PER_ANALYSIS = 20;
    /**
     * Analyze recent posts and generate topic clusters
     */
    static async generateTopicClusters(timeframe = 24, // hours
    maxPosts = 500) {
        try {
            logger_1.logger.info({ timeframe, maxPosts }, 'Analyzing posts from last N hours');
            // Get recent posts with embeddings
            const cutoffDate = new Date(Date.now() - timeframe * 60 * 60 * 1000);
            const posts = await prisma_1.prisma.post.findMany({
                where: {
                    createdAt: { gte: cutoffDate },
                    embedding: {
                        isEmpty: false
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
                take: maxPosts
            });
            logger_1.logger.info({ postCount: posts.length }, 'Found posts with embeddings');
            if (posts.length < this.MIN_POSTS_PER_TOPIC) {
                return { topics: [], uncategorizedPosts: posts };
            }
            // Perform clustering
            const clusters = await this.performClustering(posts);
            // Generate topic summaries
            const topics = await Promise.all(clusters.map(cluster => this.generateTopicSummary(cluster)));
            // Find uncategorized posts
            const clusteredPostIds = new Set(clusters.flatMap(cluster => cluster.posts.map(p => p.id)));
            const uncategorizedPosts = posts.filter(p => !clusteredPostIds.has(p.id));
            logger_1.logger.info({ topicCount: topics.length, uncategorizedCount: uncategorizedPosts.length }, 'Generated topics');
            return { topics, uncategorizedPosts };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Topic clustering failed');
            throw error;
        }
    }
    /**
     * Save topic analysis results to database
     */
    static async saveTopicsToDB(analysis) {
        try {
            logger_1.logger.info({ topicCount: analysis.topics.length }, 'Saving topics to database');
            for (const cluster of analysis.topics) {
                // Create or update topic
                const topic = await prisma_1.prisma.topic.create({
                    data: {
                        title: cluster.title,
                        description: cluster.description,
                        embedding: cluster.centroid,
                        argumentsFor: cluster.argumentsFor,
                        argumentsAgainst: cluster.argumentsAgainst,
                        category: cluster.category,
                        complexityScore: this.calculateComplexityScore(cluster),
                        evidenceQuality: this.calculateEvidenceQuality(cluster),
                        postCount: cluster.posts.length,
                        participantCount: new Set(cluster.posts.map(p => p.authorId)).size,
                        trendingScore: this.calculateTrendingScore(cluster),
                        lastActivityAt: new Date(Math.max(...cluster.posts.map(p => p.createdAt.getTime())))
                    }
                });
                // Link posts to topic
                for (const post of cluster.posts) {
                    await prisma_1.prisma.topicPost.create({
                        data: {
                            topicId: topic.id,
                            postId: post.id,
                            relevanceScore: post.similarity
                        }
                    });
                }
                logger_1.logger.info({ topicId: topic.id, title: topic.title, postCount: cluster.posts.length }, 'Saved topic');
            }
            return analysis.topics.length;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to save topics to database');
            throw error;
        }
    }
    /**
     * Get trending topics
     */
    static async getTrendingTopics(limit = 10) {
        return await prisma_1.prisma.topic.findMany({
            where: {
                isActive: true,
                postCount: { gte: this.MIN_POSTS_PER_TOPIC }
            },
            include: {
                posts: {
                    take: 3,
                    include: {
                        post: {
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
                            }
                        }
                    },
                    orderBy: {
                        relevanceScore: 'desc'
                    }
                },
                subTopics: {
                    take: 5,
                    orderBy: {
                        commentCount: 'desc'
                    }
                }
            },
            orderBy: [
                { trendingScore: 'desc' },
                { lastActivityAt: 'desc' }
            ],
            take: limit
        });
    }
    /**
     * Get topic details with posts and comments
     */
    static async getTopicDetails(topicId) {
        return await prisma_1.prisma.topic.findUnique({
            where: { id: topicId },
            include: {
                posts: {
                    include: {
                        post: {
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        username: true,
                                        firstName: true,
                                        lastName: true,
                                        avatar: true,
                                        verified: true
                                    }
                                },
                                likes: true,
                                comments: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                username: true,
                                                firstName: true,
                                                lastName: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        relevanceScore: 'desc'
                    }
                },
                subTopics: {
                    include: {
                        comments: {
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
                                replies: {
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
                                }
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        commentCount: 'desc'
                    }
                },
                topicComments: {
                    where: {
                        parentId: null // Only top-level comments
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
                        },
                        replies: {
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        username: true,
                                        firstName: true,
                                        lastName: true
                                    }
                                }
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
    }
    /**
     * Add comment to topic or sub-topic
     */
    static async addTopicComment(userId, content, topicId, subTopicId, parentId) {
        if (!topicId && !subTopicId) {
            throw new Error('Either topicId or subTopicId must be provided');
        }
        const analysis = await embeddingService_1.EmbeddingService.analyzeText(content);
        const comment = await prisma_1.prisma.topicComment.create({
            data: {
                content,
                authorId: userId,
                topicId,
                subTopicId,
                parentId,
                embedding: analysis.embedding,
                sentiment: analysis.sentiment,
                hostilityScore: analysis.hostilityScore,
                argumentStrength: analysis.argumentStrength || 0,
                evidenceLevel: analysis.evidenceLevel || 0,
                topicRelevance: analysis.topicRelevance || 1.0
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
            }
        });
        // Update comment counts
        if (subTopicId) {
            await prisma_1.prisma.subTopic.update({
                where: { id: subTopicId },
                data: {
                    commentCount: { increment: 1 }
                }
            });
        }
        // Update topic activity
        if (topicId || subTopicId) {
            const targetTopicId = topicId || (await prisma_1.prisma.subTopic.findUnique({
                where: { id: subTopicId },
                select: { parentTopicId: true }
            }))?.parentTopicId;
            if (targetTopicId) {
                await prisma_1.prisma.topic.update({
                    where: { id: targetTopicId },
                    data: {
                        lastActivityAt: new Date(),
                        trendingScore: { increment: 0.1 } // Small boost for new activity
                    }
                });
            }
        }
        return comment;
    }
    /**
     * Update topic trending scores based on recent activity
     */
    static async updateTrendingScores() {
        try {
            logger_1.logger.info('Updating trending scores');
            const topics = await prisma_1.prisma.topic.findMany({
                where: { isActive: true },
                include: {
                    posts: {
                        include: {
                            post: {
                                select: {
                                    createdAt: true,
                                    likesCount: true,
                                    commentsCount: true
                                }
                            }
                        }
                    },
                    topicComments: {
                        select: {
                            createdAt: true
                        }
                    }
                }
            });
            for (const topic of topics) {
                const score = this.calculateTrendingScore(topic);
                await prisma_1.prisma.topic.update({
                    where: { id: topic.id },
                    data: { trendingScore: score }
                });
            }
            logger_1.logger.info({ topicCount: topics.length }, 'Updated trending scores');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to update trending scores');
            throw error;
        }
    }
    // Private helper methods
    static async performClustering(posts) {
        const clusters = [];
        const processed = new Set();
        for (const post of posts) {
            if (processed.has(post.id))
                continue;
            // Find similar posts
            const similar = await embeddingService_1.EmbeddingService.findSimilarPosts(post.embedding, 50, this.SIMILARITY_THRESHOLD);
            if (similar.length >= this.MIN_POSTS_PER_TOPIC) {
                const clusterPosts = similar.filter(p => !processed.has(p.id));
                if (clusterPosts.length >= this.MIN_POSTS_PER_TOPIC) {
                    // Calculate centroid
                    const centroid = this.calculateCentroid(clusterPosts.map(p => p.embedding));
                    clusters.push({
                        centroid,
                        posts: clusterPosts,
                        title: '', // Will be generated
                        argumentsFor: [],
                        argumentsAgainst: []
                    });
                    // Mark posts as processed
                    clusterPosts.forEach(p => processed.add(p.id));
                }
            }
            // Limit number of topics
            if (clusters.length >= this.MAX_TOPICS_PER_ANALYSIS)
                break;
        }
        return clusters;
    }
    static calculateCentroid(embeddings) {
        if (embeddings.length === 0)
            return [];
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
    static async generateTopicSummary(cluster) {
        try {
            // Extract key phrases and generate title
            const allText = cluster.posts.map(p => p.content).join(' ');
            const words = allText.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);
            const wordFreq = new Map();
            words.forEach(word => {
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            });
            const topWords = Array.from(wordFreq.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([word]) => word);
            // Generate title from top words
            cluster.title = topWords
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' & ');
            if (!cluster.title) {
                cluster.title = 'Discussion Topic';
            }
            // Extract arguments based on content analysis rather than sentiment
            cluster.argumentsFor = cluster.posts
                .filter(p => this.isPositiveArgument(p.content))
                .sort((a, b) => b.content.length - a.content.length) // Sort by content length as simple quality proxy
                .slice(0, 3)
                .map(p => this.extractKeyPoint(p.content));
            cluster.argumentsAgainst = cluster.posts
                .filter(p => this.isNegativeArgument(p.content))
                .sort((a, b) => b.content.length - a.content.length) // Sort by content length as simple quality proxy
                .slice(0, 3)
                .map(p => this.extractKeyPoint(p.content));
            // Set category based on content analysis
            const topics = cluster.posts.flatMap(p => embeddingService_1.EmbeddingService.extractTopics?.(p.content) || []);
            if (topics.length > 0) {
                cluster.category = topics[0];
            }
            return cluster;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to generate topic summary');
            cluster.title = 'Discussion Topic';
            return cluster;
        }
    }
    static calculateTrendingScore(topic) {
        const now = Date.now();
        const hoursSinceCreated = (now - topic.createdAt.getTime()) / (1000 * 60 * 60);
        const hoursSinceActivity = (now - topic.lastActivityAt.getTime()) / (1000 * 60 * 60);
        // Base score from engagement
        let score = topic.postCount * 0.1 + topic.participantCount * 0.2;
        // Boost for recent activity
        if (hoursSinceActivity < 1)
            score *= 2;
        else if (hoursSinceActivity < 6)
            score *= 1.5;
        else if (hoursSinceActivity < 24)
            score *= 1.2;
        // Decay over time
        score *= Math.exp(-hoursSinceCreated / 48); // Decay over 48 hours
        // Boost for controversy (more engagement)
        score *= (1 + (topic.controversyScore || 0) * 0.5);
        return Math.max(0, score);
    }
    static calculateComplexityScore(cluster) {
        // Analyze how nuanced and multi-faceted the discussion is
        const uniqueArgumentTypes = new Set();
        let totalWords = 0;
        let questionsCount = 0;
        cluster.posts.forEach((post) => {
            const content = post.content.toLowerCase();
            totalWords += content.split(/\s+/).length;
            // Count questions (indicates consideration of complexity)
            questionsCount += (content.match(/\?/g) || []).length;
            // Identify different argument types
            if (content.includes('however') || content.includes('but') || content.includes('although')) {
                uniqueArgumentTypes.add('counterargument');
            }
            if (content.includes('evidence') || content.includes('study') || content.includes('research')) {
                uniqueArgumentTypes.add('evidence_based');
            }
            if (content.includes('experience') || content.includes('personally')) {
                uniqueArgumentTypes.add('experiential');
            }
            if (content.includes('cost') || content.includes('budget') || content.includes('economic')) {
                uniqueArgumentTypes.add('economic');
            }
        });
        const avgWordsPerPost = totalWords / cluster.posts.length;
        const questionRatio = questionsCount / cluster.posts.length;
        const argumentDiversity = uniqueArgumentTypes.size;
        // Score based on multiple factors
        let score = 0;
        score += Math.min(0.3, avgWordsPerPost / 100); // Longer posts suggest more thought
        score += Math.min(0.3, questionRatio * 2); // Questions suggest complexity consideration
        score += Math.min(0.4, argumentDiversity / 5); // Diverse argument types
        return Math.max(0, Math.min(1, score));
    }
    static calculateEvidenceQuality(cluster) {
        let evidenceScore = 0;
        let totalPosts = cluster.posts.length;
        cluster.posts.forEach((post) => {
            const content = post.content.toLowerCase();
            let postEvidence = 0;
            // Evidence indicators
            const evidenceKeywords = [
                'study', 'research', 'data', 'statistics', 'survey',
                'report', 'analysis', 'university', 'published',
                'source', 'according to', 'expert'
            ];
            evidenceKeywords.forEach(keyword => {
                if (content.includes(keyword))
                    postEvidence += 0.2;
            });
            // Links/URLs suggest external sources
            if (post.content.includes('http') || post.content.includes('www.')) {
                postEvidence += 0.3;
            }
            // Specific numbers/data
            if (post.content.match(/\d+%/) || post.content.match(/\$[\d,]+/)) {
                postEvidence += 0.2;
            }
            evidenceScore += Math.min(1, postEvidence);
        });
        return evidenceScore / totalPosts; // Average evidence quality
    }
    static isPositiveArgument(content) {
        const lowerContent = content.toLowerCase();
        const positiveIndicators = [
            'supports', 'benefits', 'advantages', 'helps', 'improves',
            'good for', 'positive', 'works', 'successful', 'effective',
            'should', 'will help', 'can improve', 'enables', 'strengthens'
        ];
        return positiveIndicators.some(indicator => lowerContent.includes(indicator));
    }
    static isNegativeArgument(content) {
        const lowerContent = content.toLowerCase();
        const negativeIndicators = [
            'problems', 'issues', 'concerns', 'harmful', 'dangerous',
            'won\'t work', 'fails', 'ineffective', 'waste', 'costly',
            'shouldn\'t', 'will hurt', 'damages', 'weakens', 'threatens'
        ];
        return negativeIndicators.some(indicator => lowerContent.includes(indicator));
    }
    static extractKeyPoint(content) {
        // Extract the most important sentence or phrase
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        // Find sentence with most substantive content
        let bestSentence = sentences[0] || content;
        let maxScore = 0;
        sentences.forEach(sentence => {
            let score = 0;
            const lowerSentence = sentence.toLowerCase();
            // Score based on key argument indicators
            if (lowerSentence.includes('because'))
                score += 2;
            if (lowerSentence.includes('evidence') || lowerSentence.includes('data'))
                score += 2;
            if (lowerSentence.includes('will') || lowerSentence.includes('would'))
                score += 1;
            if (sentence.length > 20 && sentence.length < 200)
                score += 1;
            if (score > maxScore) {
                maxScore = score;
                bestSentence = sentence;
            }
        });
        return bestSentence.trim().slice(0, 200);
    }
}
exports.TopicService = TopicService;
//# sourceMappingURL=topicService.js.map