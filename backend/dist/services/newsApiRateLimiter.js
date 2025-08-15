"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsApiRateLimiter = void 0;
const apiCache_1 = require("./apiCache");
/**
 * Rate limiter specifically for The News API (100 requests/day limit)
 */
class NewsApiRateLimiter {
    /**
     * Check if we can make a request to The News API today
     */
    static async canMakeRequest() {
        const currentCount = await this.getCurrentDailyCount();
        return currentCount < this.THE_NEWS_API_DAILY_LIMIT;
    }
    /**
     * Get remaining requests for today
     */
    static async getRemainingRequests() {
        const currentCount = await this.getCurrentDailyCount();
        return Math.max(0, this.THE_NEWS_API_DAILY_LIMIT - currentCount);
    }
    /**
     * Increment the daily counter (call this BEFORE making a request)
     */
    static async incrementCounter() {
        const currentCount = await this.getCurrentDailyCount();
        const newCount = currentCount + 1;
        // Cache until end of day (UTC)
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const minutesUntilMidnight = Math.ceil((endOfDay.getTime() - now.getTime()) / (1000 * 60));
        await apiCache_1.ApiCacheService.set('rate_limiting', this.CACHE_KEY, newCount, minutesUntilMidnight);
        console.log(`📊 The News API requests today: ${newCount}/${this.THE_NEWS_API_DAILY_LIMIT}`);
        return newCount;
    }
    /**
     * Get current daily count
     */
    static async getCurrentDailyCount() {
        const cached = await apiCache_1.ApiCacheService.get('rate_limiting', this.CACHE_KEY);
        return cached ? cached : 0;
    }
    /**
     * Get status information for monitoring
     */
    static async getStatus() {
        const current = await this.getCurrentDailyCount();
        const remaining = Math.max(0, this.THE_NEWS_API_DAILY_LIMIT - current);
        // Calculate reset time (midnight UTC)
        const now = new Date();
        const resetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        return {
            current,
            limit: this.THE_NEWS_API_DAILY_LIMIT,
            remaining,
            canMakeRequest: remaining > 0,
            resetTime: resetTime.toISOString()
        };
    }
    /**
     * Reset counter (for testing or manual reset)
     */
    static async resetCounter() {
        await apiCache_1.ApiCacheService.delete('rate_limiting', this.CACHE_KEY);
        console.log('🔄 The News API daily counter reset');
    }
}
exports.NewsApiRateLimiter = NewsApiRateLimiter;
NewsApiRateLimiter.THE_NEWS_API_DAILY_LIMIT = 100;
NewsApiRateLimiter.CACHE_KEY = 'the_news_api_daily_count';
//# sourceMappingURL=newsApiRateLimiter.js.map