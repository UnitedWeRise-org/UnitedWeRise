"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsAggregationService = void 0;
const prisma_1 = require("../lib/prisma");
;
const apiCache_1 = require("./apiCache");
const newsApiRateLimiter_1 = require("./newsApiRateLimiter");
const azureOpenAIService_1 = require("./azureOpenAIService");
const logger_1 = require("./logger");
// Using singleton prisma from lib/prisma.ts
// API Configuration
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const THE_NEWS_API_KEY = process.env.THE_NEWS_API_KEY;
class NewsAggregationService {
    /**
     * Search for news articles about a specific politician
     * Implements historical accountability tracking with permanent caching
     */
    static async searchPoliticianNews(officialName, officialId, limit = 20, daysBack = 30) {
        // First check historical database cache (permanent storage)
        const historicalArticles = await this.getHistoricalArticles(officialName, limit, daysBack);
        // If we have recent articles in historical cache, use them
        if (historicalArticles.length >= limit / 2) {
            logger_1.logger.info({ officialName, articleCount: historicalArticles.length }, 'Using historical articles');
            return this.formatOfficialNews(officialName, officialId, historicalArticles);
        }
        // Check short-term API cache (15 minutes for fresh data)
        const cacheKey = `fresh_news_${officialName.replace(/\s+/g, '_')}_${limit}_${daysBack}`;
        const cached = await apiCache_1.ApiCacheService.get('politician_news', cacheKey);
        if (cached) {
            logger_1.logger.info({ officialName }, 'Using cached API results');
            return cached;
        }
        const articles = [];
        // Search NewsAPI.org
        if (NEWS_API_KEY) {
            const newsApiArticles = await this.searchNewsAPI(officialName, daysBack, limit);
            articles.push(...newsApiArticles);
        }
        // Search The News API (with rate limiting - 100/day)
        if (THE_NEWS_API_KEY && await newsApiRateLimiter_1.NewsApiRateLimiter.canMakeRequest()) {
            const theNewsApiArticles = await this.searchTheNewsAPI(officialName, daysBack, limit);
            articles.push(...theNewsApiArticles);
        }
        else if (THE_NEWS_API_KEY) {
            const status = await newsApiRateLimiter_1.NewsApiRateLimiter.getStatus();
            logger_1.logger.warn({ status }, 'The News API daily limit reached');
        }
        // Remove duplicates based on URL
        const uniqueArticles = articles.filter((article, index, self) => index === self.findIndex(a => a.url === article.url));
        // Sort by relevance and date
        uniqueArticles.sort((a, b) => {
            const scoreA = this.calculateRelevanceScore(a, officialName);
            const scoreB = this.calculateRelevanceScore(b, officialName);
            if (scoreA !== scoreB)
                return scoreB - scoreA;
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
        // Take top results
        const topArticles = uniqueArticles.slice(0, limit);
        // Store articles in database
        for (const article of topArticles) {
            await this.storeArticle(article, officialName, officialId);
        }
        // Calculate metrics
        const averageSentiment = this.calculateAverageSentiment(topArticles);
        const topKeywords = this.extractTopKeywords(topArticles);
        const result = {
            officialName,
            officialId,
            articles: topArticles,
            totalCount: topArticles.length,
            averageSentiment,
            topKeywords
        };
        // Cache API results for short term (15 minutes - just to reduce immediate API calls)
        await apiCache_1.ApiCacheService.set('politician_news', cacheKey, result, 15);
        return result;
    }
    /**
     * Get articles from permanent historical cache
     */
    static async getHistoricalArticles(officialName, limit, daysBack) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - daysBack);
        return await prisma_1.prisma.newsArticle.findMany({
            where: {
                mentions: {
                    some: {
                        officialName: {
                            contains: officialName,
                            mode: 'insensitive'
                        }
                    }
                },
                publishedAt: {
                    gte: fromDate
                },
                isHistorical: true // Only get articles marked for historical tracking
            },
            include: {
                mentions: true
            },
            orderBy: [
                { relevanceScore: 'desc' },
                { publishedAt: 'desc' }
            ],
            take: limit
        });
    }
    /**
     * Format articles for OfficialNews response
     */
    static formatOfficialNews(officialName, officialId, articles) {
        const formattedArticles = articles.map(article => ({
            title: article.title,
            aiSummary: article.aiSummary,
            url: article.url,
            publishedAt: article.publishedAt.toISOString(),
            sourceName: article.sourceName,
            sourceType: article.sourceType,
            author: article.author,
            sentiment: article.sentiment,
            sentimentScore: article.sentimentScore,
            keywords: article.keywords,
            politicalTopics: article.politicalTopics,
            positionKeywords: article.positionKeywords,
            embedding: article.embedding
        }));
        const averageSentiment = formattedArticles.length > 0
            ? formattedArticles.reduce((sum, article) => sum + (article.sentimentScore || 0), 0) / formattedArticles.length
            : 0;
        const topKeywords = this.extractTopKeywords(formattedArticles);
        return {
            officialName,
            officialId,
            articles: formattedArticles,
            totalCount: formattedArticles.length,
            averageSentiment,
            topKeywords
        };
    }
    /**
     * Get trending political news stories
     */
    static async getTrendingPoliticalNews(limit = 50) {
        const cacheKey = `trending_political_news_${limit}`;
        // Check cache first
        const cached = await apiCache_1.ApiCacheService.get('trending_news', cacheKey);
        if (cached) {
            return cached;
        }
        const articles = [];
        // Get political news from NewsAPI
        if (NEWS_API_KEY) {
            const newsApiArticles = await this.searchNewsAPI('politics election congress senate house', 1, limit);
            articles.push(...newsApiArticles);
        }
        // Get political news from The News API (with rate limiting - 100/day)
        if (THE_NEWS_API_KEY && await newsApiRateLimiter_1.NewsApiRateLimiter.canMakeRequest()) {
            const theNewsApiArticles = await this.searchTheNewsAPI('politics election congress', 1, limit);
            articles.push(...theNewsApiArticles);
        }
        // Remove duplicates and sort by engagement potential
        const uniqueArticles = articles.filter((article, index, self) => index === self.findIndex(a => a.url === article.url));
        uniqueArticles.sort((a, b) => {
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
        const topArticles = uniqueArticles.slice(0, limit);
        // Store in database
        for (const article of topArticles) {
            await this.storeArticle(article);
        }
        // Cache for 30 minutes
        await apiCache_1.ApiCacheService.set('trending_news', cacheKey, topArticles, 30);
        return topArticles;
    }
    /**
     * Get news coverage for multiple officials
     */
    static async getMultipleOfficialsNews(officials, daysBack = 7) {
        const results = new Map();
        // Process officials in parallel (with rate limiting)
        const chunks = this.chunkArray(officials, 5); // Process 5 at a time
        for (const chunk of chunks) {
            const promises = chunk.map(official => this.searchPoliticianNews(official.name, official.id, 10, daysBack));
            const chunkResults = await Promise.all(promises);
            chunk.forEach((official, index) => {
                results.set(official.name, chunkResults[index]);
            });
            // Wait 1 second between chunks to respect rate limits
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return results;
    }
    /**
     * Generate AI summary for historical accountability tracking
     */
    static async generateAISummary(title, description, content) {
        try {
            // Use Azure OpenAI if available, fallback to local summarization
            const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
            const AZURE_OPENAI_CHAT_DEPLOYMENT = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;
            if (AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_CHAT_DEPLOYMENT) {
                return await this.generateAzureAISummary(title, description, content);
            }
            // Fallback to extractive summary
            return this.generateExtractiveSummary(title, description, content);
        }
        catch (error) {
            console.error('AI summary generation failed:', error);
            // Fallback to truncated description
            return this.generateExtractiveSummary(title, description, content);
        }
    }
    static async generateAzureAISummary(title, description, content) {
        const textToSummarize = [title, description, content?.substring(0, 1000)].filter(Boolean).join(' ');
        const prompt = `Summarize this news article about a political figure in 200-400 characters. Focus on:
1. Key political positions or actions
2. Policy implications
3. Quotes or statements that could be referenced later for accountability

Article: "${textToSummarize}"

Summary:`;
        try {
            // Use Tier 1 (gpt-4o) for mission-critical news summaries
            const summary = await azureOpenAIService_1.azureOpenAI.generateTier1Completion(prompt, {
                maxTokens: 150,
                temperature: 0.5
            });
            logger_1.logger.debug({ titlePreview: title.substring(0, 50) }, 'AI summary generated successfully');
            return summary.trim();
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Azure OpenAI summary generation failed');
            // Fallback to extractive summary
            return this.generateExtractiveSummary(title, description, content);
        }
    }
    static generateExtractiveSummary(title, description, content) {
        // Create a meaningful summary from available text
        let summary = title;
        if (description) {
            // Extract key sentences from description
            const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 10);
            if (sentences.length > 0) {
                summary += ': ' + sentences[0].trim();
            }
        }
        // Ensure summary is within 200-400 character range
        if (summary.length > 400) {
            summary = summary.substring(0, 397) + '...';
        }
        else if (summary.length < 200 && description) {
            // Try to add more context
            const remainingSpace = 397 - summary.length;
            const additionalText = description.substring(summary.length - title.length - 2, summary.length - title.length - 2 + remainingSpace);
            if (additionalText.trim()) {
                summary += ' ' + additionalText.trim();
                if (summary.length > 397) {
                    summary = summary.substring(0, 397) + '...';
                }
            }
        }
        return summary;
    }
    /**
     * Extract political topics and position keywords for accountability tracking
     */
    static extractPoliticalContent(text) {
        const textLower = text.toLowerCase();
        // Political topics
        const topicKeywords = {
            'healthcare': ['healthcare', 'health care', 'medicare', 'medicaid', 'obamacare', 'aca', 'insurance'],
            'immigration': ['immigration', 'border', 'deportation', 'asylum', 'refugee', 'visa', 'citizenship'],
            'economy': ['economy', 'economic', 'jobs', 'employment', 'wages', 'inflation', 'recession'],
            'climate': ['climate', 'environment', 'renewable', 'fossil fuel', 'carbon', 'emissions', 'green new deal'],
            'education': ['education', 'school', 'university', 'student loans', 'teachers', 'curriculum'],
            'defense': ['defense', 'military', 'pentagon', 'veterans', 'war', 'nato', 'foreign policy'],
            'taxes': ['tax', 'taxation', 'irs', 'revenue', 'fiscal', 'budget', 'deficit'],
            'justice': ['justice', 'court', 'legal', 'constitution', 'rights', 'law enforcement', 'police']
        };
        const detectedTopics = [];
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => textLower.includes(keyword))) {
                detectedTopics.push(topic);
            }
        }
        // Position keywords (words that indicate stances)
        const positionIndicators = [
            'supports', 'opposes', 'votes for', 'votes against', 'endorses', 'rejects',
            'advocates', 'condemns', 'proposes', 'introduces', 'co-sponsors',
            'backs', 'defends', 'attacks', 'criticizes', 'praises'
        ];
        const positionKeywords = positionIndicators.filter(indicator => textLower.includes(indicator));
        return { politicalTopics: detectedTopics, positionKeywords };
    }
    /**
     * Analyze sentiment with both categorical and numerical scores
     */
    static async analyzeSentiment(text) {
        const sentimentData = this.calculateSentimentScore(text);
        return sentimentData.category;
    }
    /**
     * Calculate numerical sentiment score (-1.0 to 1.0) for fine-grained analysis
     */
    static calculateSentimentScore(text) {
        const positiveWords = ['praise', 'success', 'achievement', 'victory', 'approve', 'support', 'endorse', 'commend', 'excellent', 'outstanding', 'effective', 'beneficial', 'progress'];
        const negativeWords = ['criticize', 'scandal', 'controversy', 'failure', 'oppose', 'condemn', 'investigate', 'allegations', 'crisis', 'resign', 'corrupt', 'ineffective', 'harmful'];
        const textLower = text.toLowerCase();
        const words = textLower.split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;
        positiveWords.forEach(word => {
            const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
            positiveScore += matches;
        });
        negativeWords.forEach(word => {
            const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
            negativeScore += matches;
        });
        // Calculate normalized score (-1.0 to 1.0)
        const totalSentimentWords = positiveScore + negativeScore;
        const totalWords = words.length;
        let score = 0;
        if (totalSentimentWords > 0) {
            score = (positiveScore - negativeScore) / Math.max(totalSentimentWords, totalWords / 10);
            score = Math.max(-1.0, Math.min(1.0, score)); // Clamp to -1.0 to 1.0
        }
        // Determine category
        let category;
        if (score > 0.3)
            category = 'POSITIVE';
        else if (score < -0.3)
            category = 'NEGATIVE';
        else if (positiveScore > 0 && negativeScore > 0)
            category = 'MIXED';
        else
            category = 'NEUTRAL';
        return { score, category };
    }
    /**
     * Get news articles from database with filtering
     */
    static async getStoredArticles(officialId, sentiment, limit = 20, offset = 0) {
        const where = {};
        if (officialId) {
            where.mentions = {
                some: {
                    officialId: officialId
                }
            };
        }
        if (sentiment) {
            where.sentiment = sentiment;
        }
        const [articles, total] = await Promise.all([
            prisma_1.prisma.newsArticle.findMany({
                where,
                include: {
                    mentions: {
                        include: {
                            article: false
                        }
                    }
                },
                orderBy: [
                    { relevanceScore: 'desc' },
                    { publishedAt: 'desc' }
                ],
                skip: offset,
                take: limit
            }),
            prisma_1.prisma.newsArticle.count({ where })
        ]);
        return { articles, total };
    }
    // Private helper methods
    static async searchNewsAPI(query, daysBack, limit) {
        if (!NEWS_API_KEY) {
            return [];
        }
        try {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - daysBack);
            const url = new URL('https://newsapi.org/v2/everything');
            url.searchParams.set('q', query);
            url.searchParams.set('from', fromDate.toISOString().split('T')[0]);
            url.searchParams.set('sortBy', 'relevancy');
            url.searchParams.set('pageSize', Math.min(limit, 100).toString());
            url.searchParams.set('language', 'en');
            const response = await fetch(url.toString(), {
                headers: {
                    'X-API-Key': NEWS_API_KEY
                }
            });
            if (!response.ok) {
                logger_1.logger.error({ status: response.status }, 'NewsAPI error');
                return [];
            }
            const data = await response.json();
            const newsApiData = data;
            return (newsApiData.articles || []).map((article) => ({
                title: article.title,
                description: article.description, // Used for AI summary generation, not stored
                url: article.url,
                publishedAt: article.publishedAt,
                sourceName: article.source.name,
                sourceType: this.inferSourceType(article.source.name),
                author: article.author,
                keywords: this.extractKeywords(article.title + ' ' + (article.description || ''))
            }));
        }
        catch (error) {
            logger_1.logger.error({ error }, 'NewsAPI search failed');
            return [];
        }
    }
    static async searchTheNewsAPI(query, daysBack, limit) {
        if (!THE_NEWS_API_KEY) {
            return [];
        }
        try {
            // Increment rate limiter counter before making request
            await newsApiRateLimiter_1.NewsApiRateLimiter.incrementCounter();
            const url = new URL('https://api.thenewsapi.com/v1/news/all');
            url.searchParams.set('api_token', THE_NEWS_API_KEY);
            url.searchParams.set('search', query);
            url.searchParams.set('language', 'en');
            url.searchParams.set('limit', Math.min(limit, 100).toString());
            const response = await fetch(url.toString());
            if (!response.ok) {
                logger_1.logger.error({ status: response.status }, 'The News API error');
                return [];
            }
            const data = await response.json();
            const theNewsApiData = data;
            return (theNewsApiData.data || []).map((article) => ({
                title: article.title,
                description: article.description, // Used for AI summary generation, not stored
                url: article.url,
                publishedAt: article.published_at,
                sourceName: article.source,
                sourceType: this.inferSourceType(article.source),
                author: article.author,
                keywords: this.extractKeywords(article.title + ' ' + (article.description || ''))
            }));
        }
        catch (error) {
            logger_1.logger.error({ error }, 'The News API search failed');
            return [];
        }
    }
    static async storeArticle(article, officialName, officialId) {
        try {
            // Check if article already exists (permanent cache - never expires)
            const existing = await prisma_1.prisma.newsArticle.findUnique({
                where: { url: article.url }
            });
            if (existing) {
                logger_1.logger.info({ title: article.title }, 'Article already cached');
                return; // Article already in permanent historical cache
            }
            // Generate AI summary (200-400 chars for historical accountability)
            const aiSummary = await this.generateAISummary(article.title, article.description, article.content);
            // Calculate sentiment with numerical score
            const sentimentData = this.calculateSentimentScore(article.title + ' ' + (article.aiSummary || article.description || ''));
            // Extract political content for accountability tracking
            const politicalContent = this.extractPoliticalContent(article.title + ' ' + (article.aiSummary || article.description || ''));
            // Calculate relevance score
            const relevanceScore = officialName ?
                this.calculateRelevanceScore(article, officialName) : 0.5;
            // Store optimized article data (permanent historical cache)
            const storedArticle = await prisma_1.prisma.newsArticle.create({
                data: {
                    title: article.title,
                    aiSummary, // AI-generated summary instead of full content
                    url: article.url,
                    publishedAt: new Date(article.publishedAt),
                    sourceName: article.sourceName,
                    sourceType: article.sourceType,
                    author: article.author,
                    // Enhanced sentiment analysis
                    sentiment: sentimentData.category,
                    sentimentScore: sentimentData.score,
                    // Historical accountability features
                    keywords: article.keywords,
                    politicalTopics: politicalContent.politicalTopics,
                    positionKeywords: politicalContent.positionKeywords,
                    // Scoring and metadata
                    relevanceScore,
                    dataSource: 'newsapi',
                    // Permanent caching (no expiry for historical accountability)
                    cacheExpiry: null, // NULL = permanent cache
                    isHistorical: true,
                    // Vector embedding (placeholder - would use actual embedding service)
                    embedding: article.embedding || []
                }
            });
            logger_1.logger.info({ articleId: storedArticle.id, title: article.title.substring(0, 50) }, 'Cached article for historical tracking');
            // Create official mention if applicable
            if (officialName && storedArticle) {
                const mentionContext = this.extractMentionContext(article.title + ' ' + (article.description || ''), officialName);
                await prisma_1.prisma.officialMention.create({
                    data: {
                        articleId: storedArticle.id,
                        officialName,
                        officialId,
                        mentionContext,
                        sentimentScore: this.sentimentToScore(sentimentData.category),
                        prominenceScore: this.calculateProminenceScore(article.title, article.description, officialName),
                        firstMention: this.findFirstMention(article.title + ' ' + (article.description || ''), officialName),
                        mentionCount: this.countMentions(article.title + ' ' + (article.description || ''), officialName)
                    }
                });
            }
        }
        catch (error) {
            // Likely a duplicate URL - that's OK
            if (!error.message?.includes('Unique constraint')) {
                logger_1.logger.error({ error }, 'Failed to store article');
            }
        }
    }
    static calculateRelevanceScore(article, officialName) {
        let score = 0.5; // Base score
        const title = article.title.toLowerCase();
        const description = (article.description || '').toLowerCase();
        const name = officialName.toLowerCase();
        // Higher score if mentioned in title
        if (title.includes(name)) {
            score += 0.3;
        }
        // Higher score if mentioned in description
        if (description.includes(name)) {
            score += 0.2;
        }
        // Political keywords boost
        const politicalKeywords = ['congress', 'senate', 'house', 'representative', 'senator', 'vote', 'bill', 'legislation'];
        const keywordMatches = politicalKeywords.filter(keyword => title.includes(keyword) || description.includes(keyword)).length;
        score += keywordMatches * 0.05;
        return Math.min(score, 1.0);
    }
    static calculateAverageSentiment(articles) {
        if (articles.length === 0)
            return 0;
        const sentimentValues = articles.map(article => {
            switch (article.sentiment) {
                case 'POSITIVE': return 1;
                case 'NEGATIVE': return -1;
                case 'MIXED': return 0;
                case 'NEUTRAL':
                default: return 0;
            }
        });
        return sentimentValues.reduce((sum, val) => sum + val, 0) / sentimentValues.length;
    }
    static extractTopKeywords(articles) {
        const keywordCounts = new Map();
        articles.forEach(article => {
            article.keywords.forEach(keyword => {
                keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
            });
        });
        return Array.from(keywordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword]) => keyword);
    }
    static extractKeywords(text) {
        // Simple keyword extraction - in production, use proper NLP
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);
        const politicalTerms = ['congress', 'senate', 'house', 'representative', 'senator', 'vote', 'bill', 'legislation', 'committee', 'republican', 'democrat', 'election', 'campaign'];
        return words.filter(word => politicalTerms.includes(word));
    }
    static inferSourceType(sourceName) {
        const name = sourceName.toLowerCase();
        if (name.includes('times') || name.includes('post') || name.includes('herald') || name.includes('tribune')) {
            return 'NEWSPAPER';
        }
        if (name.includes('reuters') || name.includes('associated press') || name.includes('bloomberg')) {
            return 'WIRE_SERVICE';
        }
        if (name.includes('cnn') || name.includes('fox') || name.includes('msnbc') || name.includes('nbc') || name.includes('cbs')) {
            return 'BROADCAST';
        }
        if (name.includes('gov') || name.includes('house.gov') || name.includes('senate.gov')) {
            return 'GOVERNMENT';
        }
        if (name.includes('blog') || name.includes('medium') || name.includes('substack')) {
            return 'BLOG';
        }
        return 'NEWSPAPER'; // Default
    }
    static extractMentionContext(text, officialName) {
        const index = text.toLowerCase().indexOf(officialName.toLowerCase());
        if (index === -1)
            return '';
        const start = Math.max(0, index - 100);
        const end = Math.min(text.length, index + officialName.length + 100);
        return text.substring(start, end);
    }
    static sentimentToScore(sentiment) {
        switch (sentiment) {
            case 'POSITIVE': return 1.0;
            case 'NEGATIVE': return -1.0;
            case 'MIXED': return 0.0;
            case 'NEUTRAL':
            default: return 0.0;
        }
    }
    static calculateProminenceScore(title, description, officialName) {
        let score = 0;
        if (title.toLowerCase().includes(officialName.toLowerCase())) {
            score += 0.7;
        }
        if (description && description.toLowerCase().includes(officialName.toLowerCase())) {
            score += 0.3;
        }
        return score;
    }
    static findFirstMention(text, officialName) {
        return text.toLowerCase().indexOf(officialName.toLowerCase());
    }
    static countMentions(text, officialName) {
        const matches = text.toLowerCase().match(new RegExp(officialName.toLowerCase(), 'g'));
        return matches ? matches.length : 0;
    }
    static chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
exports.NewsAggregationService = NewsAggregationService;
//# sourceMappingURL=newsAggregationService.js.map