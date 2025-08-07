import { PrismaClient, Topic, Post, TopicPost } from '@prisma/client';
import { EmbeddingService } from './embeddingService';

const prisma = new PrismaClient();

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
      console.log(`Analyzing posts from last ${timeframe} hours...`);

      // Get recent posts with embeddings
      const cutoffDate = new Date(Date.now() - timeframe * 60 * 60 * 1000);
      
      const posts = await prisma.post.findMany({
        where: {
          createdAt: { gte: cutoffDate },
          embedding: {
            not: { equals: [] }
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

      console.log(`Found ${posts.length} posts with embeddings`);

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

      console.log(`Generated ${topics.length} topics, ${uncategorizedPosts.length} uncategorized posts`);

      return { topics, uncategorizedPosts };
    } catch (error) {
      console.error('Topic clustering failed:', error);
      throw error;
    }
  }

  /**
   * Save topic analysis results to database
   */
  static async saveTopicsToDB(analysis: TopicAnalysis) {
    try {
      console.log('Saving topics to database...');

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

        console.log(`✓ Saved topic: ${topic.title} with ${cluster.posts.length} posts`);
      }

      return analysis.topics.length;
    } catch (error) {
      console.error('Failed to save topics to database:', error);
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
        hostilityScore: analysis.hostilityScore
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
      console.log('Updating trending scores...');

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

      console.log(`Updated trending scores for ${topics.length} topics`);
    } catch (error) {
      console.error('Failed to update trending scores:', error);
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

      // Basic argument extraction (can be enhanced with AI)
      cluster.argumentsFor = cluster.posts
        .filter(p => (EmbeddingService as any).estimateSentiment?.(p.content) > 0)
        .slice(0, 3)
        .map(p => p.content.slice(0, 200));
      
      cluster.argumentsAgainst = cluster.posts
        .filter(p => (EmbeddingService as any).estimateSentiment?.(p.content) < 0)
        .slice(0, 3)
        .map(p => p.content.slice(0, 200));

      // Set category based on content analysis
      const topics = cluster.posts.flatMap(p => 
        (EmbeddingService as any).extractTopics?.(p.content) || []
      );
      if (topics.length > 0) {
        cluster.category = topics[0];
      }

      return cluster;
    } catch (error) {
      console.error('Failed to generate topic summary:', error);
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
}