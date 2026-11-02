import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { ApiCacheService } from './apiCache';
import { azureOpenAI } from './azureOpenAIService';
import { EngagementScoringService } from './engagementScoringService';
import { logger } from './logger';

/**
 * Trending snapshot service.
 *
 * Builds a central, activity-gated snapshot of trending topics for a
 * (window, geography) pair. Snapshots are stored in ApiCacheService; clustering
 * uses existing Post.embedding vectors. AI calls are limited to the top topics
 * and cached by cluster signature for 12 hours.
 *
 * @module services/trendingService
 */

export type TrendingScopeType = 'national' | 'state' | 'local';

export interface TrendingScope {
  type: TrendingScopeType;
  id?: string | null;
  label?: string | null;
}

export interface FeelingBreakdown {
  veryPositive: number;
  positive: number;
  neutral: number;
  negative: number;
  veryNegative: number;
  total: number;
  support: number;
  oppose: number;
  supportPct: number;
  opposePct: number;
  neutralPct: number;
}

export interface TrendingPostPreview {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
  createdAt: string;
  engagement: number;
  activeScore: number;
  topScore: number;
  relevanceScore: number;
}

export interface TrendingTopic {
  id: string;
  title: string;
  summary: string;
  prevailingPosition: string;
  leadingCritique: string;
  category: string;
  postCount: number;
  participantCount: number;
  engagementScore: number;
  qualityScore: number;
  controversyScore: number;
  feeling: FeelingBreakdown;
  quotes: Array<{ postId: string; content: string; author: string }>;
  posts: TrendingPostPreview[];
  lastActivity: string;
  summaryCached: boolean;
}

export interface TrendingSnapshot {
  generatedAt: string;
  windowHours: number;
  scope: TrendingScope;
  categories: Array<{ name: string; topicCount: number; score: number }>;
  topics: TrendingTopic[];
  topPosts: TrendingPostPreview[];
  dailyOverview: string;
}

const SNAPSHOT_PROVIDER = 'trendingSnapshot';
const SUMMARY_PROVIDER = 'trendingSummary';
const OVERVIEW_PROVIDER = 'trendingOverview';
const SNAPSHOT_TTL_MINUTES = 12 * 60;
const SUMMARY_TTL_MINUTES = 12 * 60;
const OVERVIEW_TTL_MINUTES = 12 * 60;
const MIN_POSTS_PER_TOPIC = 3;
const MAX_TOPICS = 20;
const MAX_AI_SUMMARIES = 10;
const MAX_CANDIDATES = 500;
const SIMILARITY_THRESHOLD = 0.62;
const SNAPSHOT_MIN_AGE_MS = 10 * 60 * 1000;

function hash(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dimension = embeddings[0].length;
  const centroid = new Array(dimension).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) centroid[i] += embedding[i] || 0;
  }
  for (let i = 0; i < dimension; i++) centroid[i] /= embeddings.length;
  return centroid;
}

function scopeWhere(scope: TrendingScope): any {
  if (scope.type === 'state' && scope.id) {
    return { author: { is: { state: scope.id } } };
  }
  if (scope.type === 'local' && scope.id) {
    return {
      OR: [
        { areaId: scope.id },
        { author: { is: { zipCode: scope.id } } }
      ]
    };
  }
  return {};
}

function normalizeCategory(raw: unknown): string {
  const value = String(raw || '').trim().replace(/[^\w\s/&-]/g, '').slice(0, 32);
  if (!value) return 'General';
  const lower = value.toLowerCase();
  const synonyms: Record<string, string> = {
    political: 'Politics',
    politics: 'Politics',
    government: 'Politics',
    election: 'Politics',
    elections: 'Politics',
    sport: 'Sports',
    sports: 'Sports',
    athletic: 'Sports',
    local: 'Local',
    community: 'Local',
    econom: 'Economy',
    economic: 'Economy',
    business: 'Economy',
    health: 'Health',
    healthcare: 'Health',
    education: 'Education',
    school: 'Education',
    culture: 'Culture',
    entertainment: 'Culture',
    technology: 'Technology',
    tech: 'Technology',
    environment: 'Environment',
    climate: 'Environment',
    general: 'General',
    news: 'News',
    social: 'Social'
  };
  for (const [key, canonical] of Object.entries(synonyms)) {
    if (lower.includes(key)) return canonical;
  }
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function fallbackKeywords(posts: any[]): string[] {
  const stop = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'have', 'from', 'they', 'will',
    'would', 'there', 'their', 'about', 'what', 'when', 'where', 'which', 'just',
    'like', 'into', 'over', 'more', 'than', 'been', 'were', 'are', 'you', 'your',
    'our', 'not', 'but', 'all', 'can', 'has', 'had', 'was', 'its', 'it\'s'
  ]);
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const word of String(post.content || '').toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []) {
      if (stop.has(word)) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function fallbackCategory(posts: any[]): string {
  const text = posts.map((post) => post.content).join(' ').toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ['Politics', /election|congress|senate|president|vote|democrat|republican|policy|government/],
    ['Sports', /sport|team|game|coach|player|league|football|basketball|baseball|soccer/],
    ['Economy', /econom|inflation|job|market|price|tax|budget|business/],
    ['Health', /health|medical|hospital|vaccine|drug|insurance|disease/],
    ['Education', /school|student|teacher|education|college|university/],
    ['Environment', /climate|environment|pollution|energy|wildfire|weather/],
    ['Technology', /tech|ai|software|internet|data|cyber/],
    ['Local', /city|council|mayor|neighborhood|local|county/]
  ];
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return category;
  }
  return 'General';
}

function emptyFeeling(): FeelingBreakdown {
  return {
    veryPositive: 0, positive: 0, neutral: 0, negative: 0, veryNegative: 0,
    total: 0, support: 0, oppose: 0, supportPct: 0, opposePct: 0, neutralPct: 0
  };
}

function aggregateFeeling(posts: any[]): FeelingBreakdown {
  const feeling = emptyFeeling();
  for (const post of posts) {
    feeling.veryPositive += post.veryPositiveCount || 0;
    feeling.positive += post.positiveCount || 0;
    feeling.neutral += post.neutralFeelingCount || 0;
    feeling.negative += post.negativeCount || 0;
    feeling.veryNegative += post.veryNegativeCount || 0;
  }
  feeling.total = feeling.veryPositive + feeling.positive + feeling.neutral + feeling.negative + feeling.veryNegative;
  feeling.support = feeling.veryPositive + feeling.positive;
  feeling.oppose = feeling.negative + feeling.veryNegative;
  if (feeling.total > 0) {
    feeling.supportPct = Math.round((feeling.support / feeling.total) * 100);
    feeling.opposePct = Math.round((feeling.oppose / feeling.total) * 100);
    feeling.neutralPct = Math.max(0, 100 - feeling.supportPct - feeling.opposePct);
  }
  return feeling;
}

function qualityScoreOf(post: any): number {
  return (post.loveCount || 0) * 2 +
    (post.likeCount || 0) * 1 +
    (post.mehCount || 0) * -0.25 +
    (post.dislikeCount || 0) * -1;
}

function engagementOf(post: any): number {
  if (typeof post._engagementScore === 'number') return post._engagementScore;
  const metrics = {
    likesCount: post.likesCount || 0,
    dislikesCount: post.dislikesCount || 0,
    agreesCount: post.agreesCount || 0,
    disagreesCount: post.disagreesCount || 0,
    loveCount: post.loveCount || 0,
    likeCount: post.likeCount || 0,
    mehCount: post.mehCount || 0,
    dislikeCount: post.dislikeCount || 0,
    veryPositiveCount: post.veryPositiveCount || 0,
    positiveCount: post.positiveCount || 0,
    neutralFeelingCount: post.neutralFeelingCount || 0,
    negativeCount: post.negativeCount || 0,
    veryNegativeCount: post.veryNegativeCount || 0,
    commentsCount: post._count?.comments || 0,
    sharesCount: post._count?.shares || 0,
    viewsCount: 0,
    communityNotesCount: 0,
    reportsCount: 0,
    commentEngagement: EngagementScoringService.calculateCommentEngagement(post.comments || [])
  };
  const score = EngagementScoringService.calculateScore(
    metrics as any,
    new Date(post.createdAt),
    post.authorReputation || 70
  ).score;
  post._engagementScore = score;
  return score;
}

function postPreview(post: any, centroid: number[]): TrendingPostPreview {
  const activeScore = engagementOf(post);
  const topScore = qualityScoreOf(post);
  const relevanceScore = Math.round(cosineSimilarity(centroid, post.embedding || []) * 100);
  return {
    id: post.id,
    content: String(post.content || '').slice(0, 500),
    author: {
      id: post.author?.id || '',
      username: post.author?.username || '',
      firstName: post.author?.firstName || null,
      lastName: post.author?.lastName || null,
      avatar: post.author?.avatar || null
    },
    createdAt: post.createdAt,
    engagement: activeScore,
    activeScore,
    topScore,
    relevanceScore
  };
}

function sortPosts(posts: TrendingPostPreview[], sort: 'active' | 'top' | 'relevant') {
  const key = sort === 'top' ? 'topScore' : sort === 'relevant' ? 'relevanceScore' : 'activeScore';
  return [...posts].sort((a, b) => (b[key] as number) - (a[key] as number));
}

export class TrendingService {
  private static inFlight = new Map<string, Promise<TrendingSnapshot>>();

  /**
   * Retrieve or build the snapshot for a window/geography.
   * Activity-gated: unchanged data reuses the cache; new activity refreshes
   * after a 10-minute throttle (stale-while-revalidate).
   */
  static async getSnapshot(scope: TrendingScope, windowHours = 24, force = false): Promise<TrendingSnapshot> {
    const key = `${windowHours}:${scope.type}:${scope.id || 'all'}`;
    const cached = force ? null : await ApiCacheService.get(SNAPSHOT_PROVIDER, key);

    if (cached) {
      try {
        const generatedAt = new Date(cached.generatedAt).getTime();
        const activity = await this.getLatestActivity(scope, windowHours);
        if (!activity || activity.getTime() <= generatedAt) {
          return cached as TrendingSnapshot;
        }
        if (Date.now() - generatedAt < SNAPSHOT_MIN_AGE_MS) {
          // Serve stale immediately; refresh in the background.
          void this.generateAndStore(scope, windowHours).catch((error) =>
            logger.warn({ error, scope, windowHours }, 'Trending background refresh failed')
          );
          return cached as TrendingSnapshot;
        }
      } catch (error) {
        logger.warn({ error, scope, windowHours }, 'Trending cache validation failed; regenerating');
      }
    }

    return this.generateAndStore(scope, windowHours);
  }

  private static async generateAndStore(scope: TrendingScope, windowHours: number): Promise<TrendingSnapshot> {
    const key = `${windowHours}:${scope.type}:${scope.id || 'all'}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const task = this.generateSnapshot(scope, windowHours)
      .then(async (snapshot) => {
        await ApiCacheService.set(SNAPSHOT_PROVIDER, key, snapshot, SNAPSHOT_TTL_MINUTES);
        return snapshot;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, task);
    return task;
  }

  private static async getLatestActivity(scope: TrendingScope, windowHours: number): Promise<Date | null> {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const where = { ...scopeWhere(scope), createdAt: { gte: cutoff } };

    const [postActivity, reactionActivity, commentActivity] = await Promise.all([
      prisma.post.aggregate({
        where,
        _max: { createdAt: true, updatedAt: true }
      }),
      prisma.reaction.aggregate({ _max: { updatedAt: true } }),
      prisma.comment.aggregate({ _max: { createdAt: true } })
    ]);

    const dates = [
      postActivity._max.createdAt,
      postActivity._max.updatedAt,
      reactionActivity._max.updatedAt,
      commentActivity._max.createdAt
    ].filter((date): date is Date => !!date);

    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((date) => date.getTime())));
  }

  private static async getCandidatePosts(scope: TrendingScope, windowHours: number) {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const posts = await prisma.post.findMany({
      where: {
        ...scopeWhere(scope),
        createdAt: { gte: cutoff },
        isDeleted: false,
        feedVisible: true,
        threadHeadId: null,
        embedding: { isEmpty: false }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            state: true,
            zipCode: true
          }
        },
        comments: {
          select: {
            likesCount: true,
            dislikesCount: true,
            agreesCount: true,
            disagreesCount: true
          }
        },
        _count: {
          select: { comments: true, shares: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_CANDIDATES
    });

    // Precompute engagement once per post (sorting/clustering reuse it).
    for (const post of posts) engagementOf(post);
    return posts;
  }

  private static clusterPosts(posts: any[]): Array<{ centroid: number[]; posts: any[]; engagementScore: number }> {
    const clusters: Array<{ centroid: number[]; posts: any[]; engagementScore: number }> = [];
    const unclustered = [...posts];

    while (unclustered.length >= MIN_POSTS_PER_TOPIC && clusters.length < MAX_TOPICS) {
      const seed = unclustered.shift()!;
      const similar = [seed];

      for (let i = unclustered.length - 1; i >= 0; i--) {
        const candidate = unclustered[i];
        if (cosineSimilarity(seed.embedding, candidate.embedding) >= SIMILARITY_THRESHOLD) {
          similar.push(candidate);
          unclustered.splice(i, 1);
        }
      }

      if (similar.length >= MIN_POSTS_PER_TOPIC) {
        const centroid = calculateCentroid(similar.map((post) => post.embedding));
        const engagementScore = similar.reduce((sum, post) => sum + engagementOf(post), 0);
        clusters.push({ centroid, posts: similar, engagementScore });
      }
    }

    return clusters.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  private static async generateSnapshot(scope: TrendingScope, windowHours: number): Promise<TrendingSnapshot> {
    const posts = await this.getCandidatePosts(scope, windowHours);
    const clusters = this.clusterPosts(posts);

    const topics: TrendingTopic[] = [];
    for (let index = 0; index < clusters.length; index++) {
      const cluster = clusters[index];
      const topIds = cluster.posts
        .slice()
        .sort((a, b) => engagementOf(b) - engagementOf(a))
        .slice(0, 5)
        .map((post) => post.id)
        .sort();
      const signature = hash(topIds.join(','));
      const useAI = index < MAX_AI_SUMMARIES;

      let cachedSummary: any = null;
      if (useAI) {
        try {
          cachedSummary = await ApiCacheService.get(SUMMARY_PROVIDER, signature);
        } catch {
          cachedSummary = null;
        }
      }

      let aiSummary: any = null;
      if (useAI && !cachedSummary) {
        try {
          const result = await azureOpenAI.generateTopicSummary(
            cluster.posts.slice(0, 10).map((post) => ({
              id: post.id,
              content: String(post.content || '').slice(0, 600),
              author: post.author,
              createdAt: new Date(post.createdAt)
            }))
          );
          const usable = result && result.summary && !String(result.summary).includes('Azure OpenAI not configured');
          aiSummary = usable ? result : null;
          if (aiSummary) {
            await ApiCacheService.set(SUMMARY_PROVIDER, signature, aiSummary, SUMMARY_TTL_MINUTES);
          }
        } catch (error) {
          logger.warn({ error, scope, windowHours, signature }, 'Trending AI summary failed');
        }
      }

      const summary = cachedSummary || aiSummary;
      const keywords = summary?.keyWords?.length ? summary.keyWords : fallbackKeywords(cluster.posts);
      const fallbackTitle = keywords.slice(0, 3).join(' ') || 'Trending Discussion';
      const topPreview = cluster.posts
        .slice()
        .sort((a, b) => engagementOf(b) - engagementOf(a))
        .slice(0, 3);

      const previews = cluster.posts.map((post) => postPreview(post, cluster.centroid));
      const feeling = aggregateFeeling(cluster.posts);
      const qualityScore = cluster.posts.reduce((sum, post) => sum + qualityScoreOf(post), 0);
      const controversyScore = feeling.total > 0
        ? Math.min(feeling.support, feeling.oppose) / feeling.total
        : 0;

      topics.push({
        id: signature,
        title: summary?.title || fallbackTitle,
        summary: summary?.summary || `A discussion involving ${cluster.posts.length} posts.`,
        prevailingPosition: summary?.prevailingPosition || `Most posts focus on ${keywords.slice(0, 4).join(', ') || 'this topic'}.`,
        leadingCritique: summary?.leadingCritique || 'Some participants raise alternative concerns.',
        category: normalizeCategory(summary?.category || fallbackCategory(cluster.posts)),
        postCount: cluster.posts.length,
        participantCount: new Set(cluster.posts.map((post) => post.authorId)).size,
        engagementScore: Math.round(cluster.engagementScore * 100) / 100,
        qualityScore: Math.round(qualityScore * 100) / 100,
        controversyScore: Math.round(controversyScore * 100) / 100,
        feeling,
        quotes: topPreview.map((post) => ({
          postId: post.id,
          content: String(post.content || '').slice(0, 240),
          author: post.author?.username || [post.author?.firstName, post.author?.lastName].filter(Boolean).join(' ') || 'Someone'
        })),
        posts: sortPosts(previews, 'active').slice(0, 30),
        lastActivity: new Date(Math.max(...cluster.posts.map((post) => new Date(post.createdAt).getTime()))).toISOString(),
        summaryCached: !!cachedSummary
      });
    }

    topics.sort((a, b) => b.engagementScore - a.engagementScore);

    const categoryMap = new Map<string, { name: string; topicCount: number; score: number }>();
    for (const topic of topics) {
      const entry = categoryMap.get(topic.category) || { name: topic.category, topicCount: 0, score: 0 };
      entry.topicCount += 1;
      entry.score += topic.engagementScore;
      categoryMap.set(topic.category, entry);
    }
    const categories = [...categoryMap.values()].sort((a, b) => b.score - a.score);

    const allPreviews = posts.map((post) => postPreview(post, [])).sort((a, b) => b.activeScore - a.activeScore);
    const topPosts = allPreviews.slice(0, 10);

    const dailyOverview = await this.getDailyOverview(scope, windowHours, topics, categories);

    return {
      generatedAt: new Date().toISOString(),
      windowHours,
      scope,
      categories,
      topics,
      topPosts,
      dailyOverview
    };
  }

  private static async getDailyOverview(
    scope: TrendingScope,
    windowHours: number,
    topics: TrendingTopic[],
    categories: Array<{ name: string; topicCount: number; score: number }>
  ): Promise<string> {
    const bucket = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
    const key = `${bucket}:${windowHours}:${scope.type}:${scope.id || 'all'}`;

    try {
      const cached = await ApiCacheService.get(OVERVIEW_PROVIDER, key);
      if (cached?.summary) return cached.summary;
    } catch {
      // Continue without cache.
    }

    const fallback = topics.length > 0
      ? `Today's discussion spans ${categories.slice(0, 4).map((category) => category.name).join(', ') || 'several areas'}, led by "${topics[0].title}". ${topics[0].summary}`
      : 'No public discussions have enough activity for a trending digest yet.';

    if (topics.length === 0) return fallback;

    try {
      const prompt = `Write a neutral 3-4 sentence overview of today's public discussions for a civic social platform. Do not take a side. Mention the leading topics and the range of viewpoints.

Topics:
${topics.slice(0, 8).map((topic, index) =>
        `${index + 1}. ${topic.title} (${topic.category}, ${topic.postCount} posts): ${topic.summary} Prevailing: ${topic.prevailingPosition}. Critique: ${topic.leadingCritique}.`
      ).join('\n')}

Return plain text only.`;

      const summary = await azureOpenAI.generateCompletion(prompt, {
        maxTokens: 300,
        temperature: 0.3,
        systemMessage: 'You are a neutral civic-discussion editor summarizing public debates without taking sides.'
      });

      const cleaned = String(summary || '').trim();
      if (cleaned) {
        await ApiCacheService.set(OVERVIEW_PROVIDER, key, { summary: cleaned }, OVERVIEW_TTL_MINUTES);
        return cleaned;
      }
    } catch (error) {
      logger.warn({ error, scope, windowHours }, 'Trending daily overview AI failed');
    }

    return fallback;
  }

  static getTopicPosts(snapshot: TrendingSnapshot, topicId: string, sort: 'active' | 'top' | 'relevant' = 'active') {
    const topic = snapshot.topics.find((entry) => entry.id === topicId);
    if (!topic) return null;
    return { ...topic, posts: sortPosts(topic.posts, sort) };
  }
}

export default TrendingService;
