import { Post } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { EmbeddingService } from './embeddingService';

// Using singleton prisma from lib/prisma.ts

interface StanceVector {
  vector: number[];
  posts: Array<Post & { similarity: number }>;
  summary: string;
  percentage: number;
}

interface AggregatedTopic {
  id: string;
  title: string;
  supportVector: StanceVector;
  opposeVector: StanceVector;
  neutralPosts?: Array<Post & { similarity: number }>;
  totalPosts: number;
  score: number; // Relevance score for ranking
  geographicScope: 'national' | 'state' | 'local';
  state?: string;
  city?: string;
  createdAt: Date;
  expiresAt: Date;
}

interface TopicAggregationOptions {
  timeframeHours?: number;
  minPostsPerTopic?: number;
  maxTopics?: number;
  geographicScope?: 'national' | 'state' | 'local';
  userState?: string;
  userCity?: string;
  similarityThreshold?: number;
}

export class TopicAggregationService {
  private static readonly DEFAULT_TIMEFRAME_HOURS = 168; // 7 days
  private static readonly MIN_POSTS_PER_TOPIC = 5;
  private static readonly SIMILARITY_THRESHOLD = 0.70;
  private static readonly STANCE_SIMILARITY_THRESHOLD = 0.65;
  private static readonly MAX_TOPICS = 15;
  private static readonly CACHE_DURATION_MINUTES = 15;
  
  private static topicCache: Map<string, AggregatedTopic[]> = new Map();
  private static cacheTimestamps: Map<string, Date> = new Map();

  /**
   * Generate aggregated topics with dual-vector stance detection
   */
  static async aggregateTopics(options: TopicAggregationOptions = {}): Promise<AggregatedTopic[]> {
    const {
      timeframeHours = this.DEFAULT_TIMEFRAME_HOURS,
      minPostsPerTopic = this.MIN_POSTS_PER_TOPIC,
      maxTopics = this.MAX_TOPICS,
      geographicScope = 'national',
      userState,
      userCity,
      similarityThreshold = this.SIMILARITY_THRESHOLD
    } = options;

    // Check cache first
    const cacheKey = `${geographicScope}_${userState}_${userCity}`;
    const cached = this.getCachedTopics(cacheKey);
    if (cached) {
      console.log('Returning cached topics for:', cacheKey);
      return cached;
    }

    console.log(`Aggregating topics - Scope: ${geographicScope}, State: ${userState}, City: ${userCity}`);

    try {
      // Step 1: Fetch relevant posts with embeddings
      const posts = await this.fetchRelevantPosts(timeframeHours, geographicScope, userState, userCity);
      
      if (posts.length < minPostsPerTopic) {
        console.log('Not enough posts for topic aggregation');
        return [];
      }

      // Step 2: Initial clustering to identify topic groups
      const topicClusters = await this.clusterPosts(posts, similarityThreshold);

      // Step 3: For each cluster, perform stance analysis and create dual vectors
      const aggregatedTopics: AggregatedTopic[] = [];

      for (const cluster of topicClusters) {
        if (cluster.posts.length < minPostsPerTopic) continue;

        // Analyze stances within the cluster
        const stanceAnalysis = await this.analyzeStances(cluster.posts);
        
        if (!stanceAnalysis) continue;

        // Generate topic title and summaries using AI
        const topicMetadata = await this.generateTopicMetadata(
          stanceAnalysis.supportPosts,
          stanceAnalysis.opposePosts,
          stanceAnalysis.neutralPosts
        );

        // Calculate relevance score
        const score = this.calculateTopicScore(
          cluster.posts,
          geographicScope,
          userState,
          userCity
        );

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

    } catch (error) {
      console.error('Error aggregating topics:', error);
      return [];
    }
  }

  /**
   * Fetch posts relevant to the geographic scope
   */
  private static async fetchRelevantPosts(
    timeframeHours: number,
    scope: 'national' | 'state' | 'local',
    userState?: string,
    userCity?: string
  ): Promise<Post[]> {
    const cutoffDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    
    let whereClause: any = {
      createdAt: { gte: cutoffDate },
      embedding: { isEmpty: false },
      isPolitical: true // Focus on political posts for civic engagement
    };

    // Add geographic filtering based on scope
    if (scope === 'state' && userState) {
      whereClause.author = {
        state: userState
      };
    } else if (scope === 'local' && userCity && userState) {
      whereClause.author = {
        city: userCity,
        state: userState
      };
    }

    const posts = await prisma.post.findMany({
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
  private static async clusterPosts(posts: Post[], threshold: number) {
    const clusters: Array<{ posts: Post[], centroid: number[] }> = [];
    const assigned = new Set<string>();

    for (const post of posts) {
      if (assigned.has(post.id)) continue;

      const cluster = {
        posts: [post],
        centroid: post.embedding as number[]
      };

      // Find similar posts for this cluster
      for (const otherPost of posts) {
        if (assigned.has(otherPost.id) || otherPost.id === post.id) continue;

        const similarity = EmbeddingService.calculateSimilarity(
          post.embedding as number[],
          otherPost.embedding as number[]
        );

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
  private static async analyzeStances(posts: Post[]) {
    // Use Azure OpenAI to analyze sentiment/stance for each post
    const stancePromises = posts.map(post => this.determineStance(post));
    const stances = await Promise.all(stancePromises);

    const supportPosts: Array<Post & { similarity: number }> = [];
    const opposePosts: Array<Post & { similarity: number }> = [];
    const neutralPosts: Array<Post & { similarity: number }> = [];

    posts.forEach((post, index) => {
      const stance = stances[index];
      const postWithSim = { ...post, similarity: 1.0 };

      if (stance === 'support') {
        supportPosts.push(postWithSim);
      } else if (stance === 'oppose') {
        opposePosts.push(postWithSim);
      } else {
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
  private static async determineStance(post: Post): Promise<'support' | 'oppose' | 'neutral'> {
    try {
      // Use Azure OpenAI for stance detection
      const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT + '/openai/deployments/' + process.env.AZURE_OPENAI_CHAT_DEPLOYMENT + '/chat/completions?api-version=2024-02-15-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY!
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Analyze the stance of this post. Respond with ONLY one word: "support", "oppose", or "neutral"'
            },
            {
              role: 'user',
              content: post.content
            }
          ],
          max_tokens: 10,
          temperature: 0.3
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const stance = data.choices?.[0]?.message?.content?.toLowerCase().trim();
        
        if (['support', 'oppose', 'neutral'].includes(stance)) {
          return stance as 'support' | 'oppose' | 'neutral';
        }
      }
    } catch (error) {
      console.error('Error determining stance:', error);
    }

    // Default to neutral if analysis fails
    return 'neutral';
  }

  /**
   * Generate topic title and summaries using AI
   */
  private static async generateTopicMetadata(
    supportPosts: Post[],
    opposePosts: Post[],
    neutralPosts: Post[]
  ) {
    try {
      // Sample posts for AI analysis
      const supportSample = supportPosts.slice(0, 3).map(p => p.content).join('\n');
      const opposeSample = opposePosts.slice(0, 3).map(p => p.content).join('\n');

      const response = await fetch(process.env.AZURE_OPENAI_ENDPOINT + '/openai/deployments/' + process.env.AZURE_OPENAI_CHAT_DEPLOYMENT + '/chat/completions?api-version=2024-02-15-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY!
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Generate a concise topic title and summaries for both viewpoints. Format: TITLE: [title]\nSUPPORT: [summary]\nOPPOSE: [summary]'
            },
            {
              role: 'user',
              content: `Supporting posts:\n${supportSample}\n\nOpposing posts:\n${opposeSample}`
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content;
        
        // Parse the response
        const lines = content.split('\n');
        const title = lines.find(l => l.startsWith('TITLE:'))?.replace('TITLE:', '').trim() || 'Trending Topic';
        const supportSummary = lines.find(l => l.startsWith('SUPPORT:'))?.replace('SUPPORT:', '').trim() || 'Supporting viewpoint';
        const opposeSummary = lines.find(l => l.startsWith('OPPOSE:'))?.replace('OPPOSE:', '').trim() || 'Opposing viewpoint';

        return {
          title,
          supportSummary,
          opposeSummary
        };
      }
    } catch (error) {
      console.error('Error generating topic metadata:', error);
    }

    return {
      title: 'Trending Discussion',
      supportSummary: 'Supporting this position',
      opposeSummary: 'Opposing this position'
    };
  }

  /**
   * Calculate topic relevance score
   */
  private static calculateTopicScore(
    posts: Post[],
    scope: 'national' | 'state' | 'local',
    userState?: string,
    userCity?: string
  ): number {
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
      const likes = (post as any).likes?.length || 0;
      const comments = (post as any).comments?.length || 0;
      score += (likes * 2 + comments * 3);
    });

    // Velocity score (how many posts in last 6 hours)
    const recentPosts = posts.filter(p => 
      (now - p.createdAt.getTime()) < 6 * 60 * 60 * 1000
    );
    score += recentPosts.length * 5;

    // Geographic relevance boost
    if (scope === 'local') {
      const localPosts = posts.filter(p => 
        (p as any).author?.city === userCity && (p as any).author?.state === userState
      );
      score += localPosts.length * 10;
    } else if (scope === 'state') {
      const statePosts = posts.filter(p => 
        (p as any).author?.state === userState
      );
      score += statePosts.length * 7;
    }

    return score;
  }

  /**
   * Determine the geographic scope of a topic
   */
  private static determineTopicScope(posts: Post[], userState?: string, userCity?: string) {
    const states = new Set<string>();
    const cities = new Set<string>();

    posts.forEach(post => {
      const author = (post as any).author;
      if (author?.state) states.add(author.state);
      if (author?.city) cities.add(author.city);
    });

    // If posts are from single city, it's local
    if (cities.size === 1 && userCity && cities.has(userCity)) {
      return {
        scope: 'local' as const,
        city: userCity,
        state: userState
      };
    }

    // If posts are from single state, it's state-level
    if (states.size === 1 && userState && states.has(userState)) {
      return {
        scope: 'state' as const,
        state: userState,
        city: undefined
      };
    }

    // Otherwise it's national
    return {
      scope: 'national' as const,
      state: undefined,
      city: undefined
    };
  }

  /**
   * Calculate centroid of posts
   */
  private static calculateCentroid(posts: Post[]): number[] {
    if (posts.length === 0) return [];

    const embeddings = posts.map(p => p.embedding as number[]);
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
  private static getCachedTopics(cacheKey: string): AggregatedTopic[] | null {
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
  private static cacheTopics(cacheKey: string, topics: AggregatedTopic[]) {
    this.topicCache.set(cacheKey, topics);
    this.cacheTimestamps.set(cacheKey, new Date());
  }

  /**
   * Get topics for map display (rotating subset)
   */
  static async getMapTopics(
    userState?: string,
    userCity?: string,
    count: number = 3
  ): Promise<AggregatedTopic[]> {
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