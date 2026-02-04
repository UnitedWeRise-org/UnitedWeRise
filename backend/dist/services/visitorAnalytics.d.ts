/**
 * Visitor Analytics Service
 *
 * Provides privacy-conscious visitor tracking with the following features:
 * - IP hashing with daily rotating salts (no raw IP storage)
 * - Bot detection via User-Agent parsing
 * - Rate limiting and abuse prevention
 * - Suspicious activity flagging
 * - Daily data aggregation
 * - Automatic data cleanup (30-day retention)
 *
 * Privacy compliance:
 * - GDPR: Data minimization, auto-deletion, no cross-day tracking
 * - No PII stored (IP hashes rotate daily, preventing correlation)
 */
declare class VisitorAnalyticsService {
    /**
     * Hash an IP address with the current daily salt
     * @param ip - IP address to hash
     * @returns SHA256 hash of IP + daily salt
     */
    hashIP(ip: string): Promise<string>;
    /**
     * Detect if a User-Agent string appears to be a bot
     * @param userAgent - Browser User-Agent string
     * @returns true if bot detected, false otherwise
     */
    detectBot(userAgent: string): boolean;
    /**
     * Check if an IP is rate limited or blocked
     * @param ipHash - Hashed IP address
     * @returns { allowed: boolean, reason?: string }
     */
    checkRateLimit(ipHash: string): Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    /**
     * Track a page view
     * @param params - PageView tracking parameters
     * @returns Created PageView record or null if blocked
     */
    trackPageView(params: {
        path: string;
        ip: string;
        userAgent: string;
        referrer?: string;
        userId?: string;
    }): Promise<{
        success: boolean;
        reason?: string;
    }>;
    /**
     * Check if an IP shows suspicious activity patterns
     * @param ipHash - Hashed IP address
     * @returns true if suspicious, false otherwise
     */
    checkSuspiciousActivity(ipHash: string): Promise<boolean>;
    /**
     * Get visitor statistics for a date range
     * @param startDate - Start date (inclusive)
     * @param endDate - End date (inclusive)
     * @returns Aggregated statistics
     */
    getStats(startDate: Date, endDate: Date): Promise<{
        daily: {
            id: string;
            updatedAt: Date;
            suspiciousActivityCount: number;
            date: Date;
            uniqueVisitors: number;
            totalPageviews: number;
            authenticatedVisits: number;
            anonymousVisits: number;
            botVisits: number;
            signupsCount: number;
            popularPages: import("@prisma/client/runtime/client").JsonValue | null;
            avgSessionDuration: number | null;
        }[];
        totals: {
            uniqueVisitors: number;
            totalPageviews: number;
            authenticatedVisits: number;
            anonymousVisits: number;
            botVisits: number;
            signupsCount: number;
            suspiciousActivityCount: number;
        };
        conversionRate: number;
    }>;
    /**
     * Get hourly visitor statistics from PageView records
     * Limited to 30-day retention window (PageView records auto-delete after 30 days)
     * @param startDate - Start date (inclusive)
     * @param endDate - End date (inclusive)
     * @returns Array of hourly stat buckets
     */
    getHourlyStats(startDate: Date, endDate: Date): Promise<Array<{
        timestamp: string;
        uniqueVisitors: number;
        totalPageviews: number;
        authenticatedVisits: number;
        anonymousVisits: number;
        botVisits: number;
    }>>;
    /**
     * Get monthly visitor statistics aggregated from DailyVisitStats
     * No retention limit — DailyVisitStats is permanent
     * @param startDate - Start date (inclusive)
     * @param endDate - End date (inclusive)
     * @returns Array of monthly stat buckets
     */
    getMonthlyStats(startDate: Date, endDate: Date): Promise<Array<{
        timestamp: string;
        uniqueVisitors: number;
        totalPageviews: number;
        authenticatedVisits: number;
        anonymousVisits: number;
        botVisits: number;
        signupsCount: number;
    }>>;
    /**
     * Get current analytics configuration
     * @returns AnalyticsConfig record
     */
    getConfig(): Promise<{
        id: string;
        updatedAt: Date;
        rateLimitPerHour: number;
        dataRetentionDays: number;
        suspiciousThreshold: number;
        blockDurationHours: number;
        currentDailySalt: string;
        lastSaltRotation: Date;
        trackingEnabled: boolean;
    }>;
    /**
     * Rotate the daily IP salt (should run at midnight UTC)
     * @returns Updated config with new salt
     */
    rotateDailySalt(): Promise<{
        id: string;
        updatedAt: Date;
        rateLimitPerHour: number;
        dataRetentionDays: number;
        suspiciousThreshold: number;
        blockDurationHours: number;
        currentDailySalt: string;
        lastSaltRotation: Date;
        trackingEnabled: boolean;
    }>;
    /**
     * Aggregate today's PageView records into DailyVisitStats
     * @param date - Date to aggregate (defaults to yesterday)
     * @returns Created DailyVisitStats record
     */
    aggregateDailyStats(date?: Date): Promise<{
        id: string;
        updatedAt: Date;
        suspiciousActivityCount: number;
        date: Date;
        uniqueVisitors: number;
        totalPageviews: number;
        authenticatedVisits: number;
        anonymousVisits: number;
        botVisits: number;
        signupsCount: number;
        popularPages: import("@prisma/client/runtime/client").JsonValue | null;
        avgSessionDuration: number | null;
    }>;
    /**
     * Delete PageView records older than retention period
     * @returns Number of deleted records
     */
    cleanupOldData(): Promise<{
        pageViewsDeleted: number;
        rateLimitsDeleted: number;
    }>;
    /**
     * Get suspicious IPs with recent activity
     * @param days - Number of days to look back (default 7)
     * @returns List of suspicious IPs with activity counts
     */
    getSuspiciousIPs(days?: number): Promise<{
        ipHash: string;
        count: number;
    }[]>;
    /**
     * Get real-time overview stats for admin dashboard
     * @returns Current day stats and recent trends
     */
    getOverview(): Promise<{
        today: {
            uniqueVisitors: number;
            pageViews: number;
            signups: number;
        };
        week: {
            uniqueVisitors: number;
            totalPageviews: number;
            authenticatedVisits: number;
            anonymousVisits: number;
            botVisits: number;
            signupsCount: number;
            suspiciousActivityCount: number;
        };
        month: {
            uniqueVisitors: number;
            totalPageviews: number;
            authenticatedVisits: number;
            anonymousVisits: number;
            botVisits: number;
            signupsCount: number;
            suspiciousActivityCount: number;
        };
        conversionRates: {
            today: number;
            week: number;
            month: number;
        };
    }>;
}
declare const _default: VisitorAnalyticsService;
export default _default;
//# sourceMappingURL=visitorAnalytics.d.ts.map