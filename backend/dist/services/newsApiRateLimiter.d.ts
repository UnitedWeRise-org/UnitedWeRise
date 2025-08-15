/**
 * Rate limiter specifically for The News API (100 requests/day limit)
 */
export declare class NewsApiRateLimiter {
    private static readonly THE_NEWS_API_DAILY_LIMIT;
    private static readonly CACHE_KEY;
    /**
     * Check if we can make a request to The News API today
     */
    static canMakeRequest(): Promise<boolean>;
    /**
     * Get remaining requests for today
     */
    static getRemainingRequests(): Promise<number>;
    /**
     * Increment the daily counter (call this BEFORE making a request)
     */
    static incrementCounter(): Promise<number>;
    /**
     * Get current daily count
     */
    static getCurrentDailyCount(): Promise<number>;
    /**
     * Get status information for monitoring
     */
    static getStatus(): Promise<{
        current: number;
        limit: number;
        remaining: number;
        canMakeRequest: boolean;
        resetTime: string;
    }>;
    /**
     * Reset counter (for testing or manual reset)
     */
    static resetCounter(): Promise<void>;
}
//# sourceMappingURL=newsApiRateLimiter.d.ts.map