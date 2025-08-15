import { ApiCacheService } from './apiCache';

/**
 * Rate limiter specifically for The News API (100 requests/day limit)
 */
export class NewsApiRateLimiter {
  private static readonly THE_NEWS_API_DAILY_LIMIT = 100;
  private static readonly CACHE_KEY = 'the_news_api_daily_count';

  /**
   * Check if we can make a request to The News API today
   */
  static async canMakeRequest(): Promise<boolean> {
    const currentCount = await this.getCurrentDailyCount();
    return currentCount < this.THE_NEWS_API_DAILY_LIMIT;
  }

  /**
   * Get remaining requests for today
   */
  static async getRemainingRequests(): Promise<number> {
    const currentCount = await this.getCurrentDailyCount();
    return Math.max(0, this.THE_NEWS_API_DAILY_LIMIT - currentCount);
  }

  /**
   * Increment the daily counter (call this BEFORE making a request)
   */
  static async incrementCounter(): Promise<number> {
    const currentCount = await this.getCurrentDailyCount();
    const newCount = currentCount + 1;
    
    // Cache until end of day (UTC)
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const minutesUntilMidnight = Math.ceil((endOfDay.getTime() - now.getTime()) / (1000 * 60));
    
    await ApiCacheService.set('rate_limiting', this.CACHE_KEY, newCount, minutesUntilMidnight);
    
    console.log(`📊 The News API requests today: ${newCount}/${this.THE_NEWS_API_DAILY_LIMIT}`);
    
    return newCount;
  }

  /**
   * Get current daily count
   */
  static async getCurrentDailyCount(): Promise<number> {
    const cached = await ApiCacheService.get('rate_limiting', this.CACHE_KEY);
    return cached ? (cached as number) : 0;
  }

  /**
   * Get status information for monitoring
   */
  static async getStatus(): Promise<{
    current: number;
    limit: number;
    remaining: number;
    canMakeRequest: boolean;
    resetTime: string;
  }> {
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
  static async resetCounter(): Promise<void> {
    await ApiCacheService.delete('rate_limiting', this.CACHE_KEY);
    console.log('🔄 The News API daily counter reset');
  }
}