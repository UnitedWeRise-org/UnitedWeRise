import { Topic, Post, TopicPost } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EmbeddingService } from './embeddingService';
import { logger } from './logger';

// Using singleton prisma from lib/prisma.ts

interface TopicCluster {
  centroid: number[];
  posts: Array<Post & { similarity: number }>;
  title: string;
  description?: string;
  category?: string;
  argumentsFor: string[];
  argumentsAgainst: string[];
}

interface TopicAnalysis {
  topics: TopicCluster[];
  uncategorizedPosts: Post[];
}

export class TopicService {
  private static readonly MIN_POSTS_PER_TOPIC = 3;
  private static readonly SIMILARITY_THRESHOLD = 0.7;
  private static readonly MAX_TOPICS_PER_ANALYSIS = 20;

  /**
   * Analyze recent posts and generate topic clusters
   */
  static async generateTopicClusters(
    timeframe: number = 24, // hours
    maxPosts: number = 500
  ): Promise<TopicAnalysis> {
    try {
      logger.info({ timeframe, maxPosts }, 'Analyzing posts from last N hours');

      // Get recent posts with embeddings
      const cutoffDate = new Date(Date.now() - timeframe * 60 * 60 * 1000);

      const posts = await prisma.post.findMany({
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

      logger.info({ postCount: posts.length }, 'Found posts with embeddings');

      if (posts.length < this.MIN_POSTS_PER_TOPIC) {
        return { topics: [], uncategorizedPosts: posts };
      }

      // Perform clustering
      const clusters = await this.performClustering(posts);
      
      // Generate topic summaries
      const topics = await Promise.all(
        clusters.map(cluster => this.generateTopicSummary(cluster))
      );

      // Find uncategorized posts
      const clusteredPostIds = new Set(
        clusters.flatMap(cluster => cluster.posts.map(p => p.id))
      );
      const uncategorizedPosts = posts.filter(p => !clusteredPostIds.has(p.id));

      logger.info({ topicCount: topics.length, uncategorizedCount: uncategorizedPosts.length }, 'Generated topics');

      return { topics, uncategorizedPosts };
    } catch (error) {
      logger.error({ error }, 'Topic clustering failed');
      throw error;
    }
  }

  /**
   * Save topic analysis results to database
   */
  static async saveTopicsToDB(analysis: TopicAnalysis) {
    try {
      logger.info({ topicCount: analysis.topics.length }, 'Saving topics to database');

      for (const cluster of analysis.topics) {
        // Create or update topic
        const topic = await prisma.topic.create({
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
          await prisma.topicPost.create({
            data: {
              topicId: topic.id,
              postId: post.id,
              relevanceScore: post.similarity
            }
          });
        }

        logger.info({ topicId: topic.id, title: topic.title, postCount: cluster.posts.length }, 'Saved topic');
      }

      return analysis.topics.length;
    } catch (error) {
      logger.error({ error }, 'Failed to save topics to database');
      throw error;
    }
  }

  /**
   * Get trending topics
   */
  static async getTrendingTopics(limit: number = 10) {
    return await prisma.topic.findMany({
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
  static async getTopicDetails(topicId: string) {
    return await prisma.topic.findUnique({
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
  static async addTopicComment(
    userId: string,
    content: string,
    topicId?: string,
    subTopicId?: string,
    parentId?: string
  ) {
    if (!topicId && !subTopicId) {
      throw new Error('Either topicId or subTopicId must be provided');
    }

    const analysis = await EmbeddingService.analyzeText(content);

    const comment = await prisma.topicComment.create({
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
      await prisma.subTopic.update({
        where: { id: subTopicId },
        data: {
          commentCount: { increment: 1 }
        }
      });
    }

    // Update topic activity
    if (topicId || subTopicId) {
      const targetTopicId = topicId || (await prisma.subTopic.findUnique({
        where: { id: subTopicId },
        select: { parentTopicId: true }
      }))?.parentTopicId;

      if (targetTopicId) {
        await prisma.topic.update({
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
      logger.info('Updating trending scores');

      const topics = await prisma.topic.findMany({
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
        const score = this.calculateTrendingScore(topic as any);

        await prisma.topic.update({
          where: { id: topic.id },
          data: { trendingScore: score }
        });
      }

      logger.info({ topicCount: topics.length }, 'Updated trending scores');
    } catch (error) {
      logger.error({ error }, 'Failed to update trending scores');
      throw error;
    }
  }

  // Private helper methods

  private static async performClustering(posts: Post[]): Promise<TopicCluster[]> {
    const clusters: TopicCluster[] = [];
    const processed = new Set<string>();

    for (const post of posts) {
      if (processed.has(post.id)) continue;

      // Find similar posts
      const similar = await EmbeddingService.findSimilarPosts(
        post.embedding,
        50,
        this.SIMILARITY_THRESHOLD
      );

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
      if (clusters.length >= this.MAX_TOPICS_PER_ANALYSIS) break;
    }

    return clusters;
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

  private static async generateTopicSummary(cluster: TopicCluster): Promise<TopicCluster> {
    try {
      // Extract key phrases and generate title
      const allText = cluster.posts.map(p => p.content).join(' ');
      const words = allText.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const wordFreq = new Map<string, number>();
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
      
      const topWords = Array.from(wordFreq.entries())
        .sort(([,a], [,b]) => b - a)
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
      const topics = cluster.posts.flatMap(p => 
        (EmbeddingService as any).extractTopics?.(p.content) || []
      );
      if (topics.length > 0) {
        cluster.category = topics[0];
      }

      return cluster;
    } catch (error) {
      logger.error({ error }, 'Failed to generate topic summary');
      cluster.title = 'Discussion Topic';
      return cluster;
    }
  }

  private static calculateTrendingScore(topic: any): number {
    const now = Date.now();
    const hoursSinceCreated = (now - topic.createdAt.getTime()) / (1000 * 60 * 60);
    const hoursSinceActivity = (now - topic.lastActivityAt.getTime()) / (1000 * 60 * 60);
    
    // Base score from engagement
    let score = topic.postCount * 0.1 + topic.participantCount * 0.2;
    
    // Boost for recent activity
    if (hoursSinceActivity < 1) score *= 2;
    else if (hoursSinceActivity < 6) score *= 1.5;
    else if (hoursSinceActivity < 24) score *= 1.2;
    
    // Decay over time
    score *= Math.exp(-hoursSinceCreated / 48); // Decay over 48 hours
    
    // Boost for controversy (more engagement)
    score *= (1 + (topic.controversyScore || 0) * 0.5);
    
    return Math.max(0, score);
  }

  private static calculateComplexityScore(cluster: any): number {
    // Analyze how nuanced and multi-faceted the discussion is
    const uniqueArgumentTypes = new Set();
    let totalWords = 0;
    let questionsCount = 0;
    
    cluster.posts.forEach((post: any) => {
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
  
  private static calculateEvidenceQuality(cluster: any): number {
    let evidenceScore = 0;
    let totalPosts = cluster.posts.length;
    
    cluster.posts.forEach((post: any) => {
      const content = post.content.toLowerCase();
      let postEvidence = 0;
      
      // Evidence indicators
      const evidenceKeywords = [
        'study', 'research', 'data', 'statistics', 'survey',
        'report', 'analysis', 'university', 'published',
        'source', 'according to', 'expert'
      ];
      
      evidenceKeywords.forEach(keyword => {
        if (content.includes(keyword)) postEvidence += 0.2;
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
  
  private static isPositiveArgument(content: string): boolean {
    const lowerContent = content.toLowerCase();
    const positiveIndicators = [
      'supports', 'benefits', 'advantages', 'helps', 'improves',
      'good for', 'positive', 'works', 'successful', 'effective',
      'should', 'will help', 'can improve', 'enables', 'strengthens'
    ];
    
    return positiveIndicators.some(indicator => lowerContent.includes(indicator));
  }
  
  private static isNegativeArgument(content: string): boolean {
    const lowerContent = content.toLowerCase();
    const negativeIndicators = [
      'problems', 'issues', 'concerns', 'harmful', 'dangerous',
      'won\'t work', 'fails', 'ineffective', 'waste', 'costly',
      'shouldn\'t', 'will hurt', 'damages', 'weakens', 'threatens'
    ];
    
    return negativeIndicators.some(indicator => lowerContent.includes(indicator));
  }
  
  private static extractKeyPoint(content: string): string {
    // Extract the most important sentence or phrase
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Find sentence with most substantive content
    let bestSentence = sentences[0] || content;
    let maxScore = 0;
    
    sentences.forEach(sentence => {
      let score = 0;
      const lowerSentence = sentence.toLowerCase();
      
      // Score based on key argument indicators
      if (lowerSentence.includes('because')) score += 2;
      if (lowerSentence.includes('evidence') || lowerSentence.includes('data')) score += 2;
      if (lowerSentence.includes('will') || lowerSentence.includes('would')) score += 1;
      if (sentence.length > 20 && sentence.length < 200) score += 1;
      
      if (score > maxScore) {
        maxScore = score;
        bestSentence = sentence;
      }
    });
    
    return bestSentence.trim().slice(0, 200);
  }
}