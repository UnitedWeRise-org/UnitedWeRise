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

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from './logger';

const prisma = new PrismaClient();

class VisitorAnalyticsService {
  /**
   * Hash an IP address with the current daily salt
   * @param ip - IP address to hash
   * @returns SHA256 hash of IP + daily salt
   */
  async hashIP(ip: string): Promise<string> {
    const config = await this.getConfig();
    const hash = crypto
      .createHash('sha256')
      .update(ip + config.currentDailySalt)
      .digest('hex');
    return hash;
  }

  /**
   * Detect if a User-Agent string appears to be a bot
   * @param userAgent - Browser User-Agent string
   * @returns true if bot detected, false otherwise
   */
  detectBot(userAgent: string): boolean {
    if (!userAgent) return true; // No UA = likely bot

    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /okhttp/i,
      /axios/i,
      /node-fetch/i,
      /headless/i,
      /phantom/i,
      /selenium/i,
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check if an IP is rate limited or blocked
   * @param ipHash - Hashed IP address
   * @returns { allowed: boolean, reason?: string }
   */
  async checkRateLimit(ipHash: string): Promise<{ allowed: boolean; reason?: string }> {
    const config = await this.getConfig();

    // Check if IP is currently blocked
    const rateLimit = await prisma.iPRateLimit.findUnique({
      where: { ipHash },
    });

    if (rateLimit) {
      // Check if block is still active
      if (rateLimit.blockedUntil && rateLimit.blockedUntil > new Date()) {
        return {
          allowed: false,
          reason: `Blocked until ${rateLimit.blockedUntil.toISOString()} - ${rateLimit.blockReason}`,
        };
      }

      // Check rate limit
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (rateLimit.lastRequest < hourAgo) {
        // Reset counter if last request was >1 hour ago
        await prisma.iPRateLimit.update({
          where: { ipHash },
          data: {
            requestCount: 1,
            lastRequest: new Date(),
            blockedUntil: null,
            blockReason: null,
          },
        });
        return { allowed: true };
      }

      // Increment counter
      const newCount = rateLimit.requestCount + 1;

      if (newCount > config.rateLimitPerHour) {
        // Exceeded rate limit - block IP
        const blockedUntil = new Date(Date.now() + config.blockDurationHours * 60 * 60 * 1000);
        await prisma.iPRateLimit.update({
          where: { ipHash },
          data: {
            requestCount: newCount,
            lastRequest: new Date(),
            blockedUntil,
            blockReason: `Exceeded rate limit (${config.rateLimitPerHour} requests/hour)`,
          },
        });
        return {
          allowed: false,
          reason: `Rate limit exceeded - blocked for ${config.blockDurationHours} hours`,
        };
      }

      // Update counter
      await prisma.iPRateLimit.update({
        where: { ipHash },
        data: {
          requestCount: newCount,
          lastRequest: new Date(),
        },
      });
    } else {
      // Create new rate limit record
      await prisma.iPRateLimit.create({
        data: {
          ipHash,
          requestCount: 1,
          lastRequest: new Date(),
        },
      });
    }

    return { allowed: true };
  }

  /**
   * Track a page view
   * @param params - PageView tracking parameters
   * @returns Created PageView record or null if blocked
   */
  async trackPageView(params: {
    path: string;
    ip: string;
    userAgent: string;
    referrer?: string;
    userId?: string;
  }): Promise<{ success: boolean; reason?: string }> {
    const config = await this.getConfig();

    // Skip tracking if disabled
    if (!config.trackingEnabled) {
      return { success: false, reason: 'Tracking disabled' };
    }

    // Hash IP
    const ipHash = await this.hashIP(params.ip);

    // Check rate limit
    const rateLimitCheck = await this.checkRateLimit(ipHash);
    if (!rateLimitCheck.allowed) {
      return { success: false, reason: rateLimitCheck.reason };
    }

    // Detect bot
    const isBot = this.detectBot(params.userAgent);

    // Check for suspicious activity
    const isSuspicious = await this.checkSuspiciousActivity(ipHash);

    // Create PageView record
    await prisma.pageView.create({
      data: {
        path: params.path,
        ipHash,
        userAgent: params.userAgent,
        referrer: params.referrer || null,
        userId: params.userId || null,
        isBot,
        isSuspicious,
      },
    });

    return { success: true };
  }

  /**
   * Check if an IP shows suspicious activity patterns
   * @param ipHash - Hashed IP address
   * @returns true if suspicious, false otherwise
   */
  async checkSuspiciousActivity(ipHash: string): Promise<boolean> {
    const config = await this.getConfig();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count pageviews from this IP today
    const todayCount = await prisma.pageView.count({
      where: {
        ipHash,
        createdAt: { gte: today },
      },
    });

    return todayCount >= config.suspiciousThreshold;
  }

  /**
   * Get visitor statistics for a date range
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @returns Aggregated statistics
   */
  async getStats(startDate: Date, endDate: Date) {
    const stats = await prisma.dailyVisitStats.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = stats.reduce(
      (acc, day) => ({
        uniqueVisitors: acc.uniqueVisitors + day.uniqueVisitors,
        totalPageviews: acc.totalPageviews + day.totalPageviews,
        authenticatedVisits: acc.authenticatedVisits + day.authenticatedVisits,
        anonymousVisits: acc.anonymousVisits + day.anonymousVisits,
        botVisits: acc.botVisits + day.botVisits,
        signupsCount: acc.signupsCount + day.signupsCount,
        suspiciousActivityCount: acc.suspiciousActivityCount + day.suspiciousActivityCount,
      }),
      {
        uniqueVisitors: 0,
        totalPageviews: 0,
        authenticatedVisits: 0,
        anonymousVisits: 0,
        botVisits: 0,
        signupsCount: 0,
        suspiciousActivityCount: 0,
      }
    );

    return {
      daily: stats,
      totals,
      conversionRate:
        totals.uniqueVisitors > 0
          ? (totals.signupsCount / totals.uniqueVisitors) * 100
          : 0,
    };
  }

  /**
   * Get current analytics configuration
   * @returns AnalyticsConfig record
   */
  async getConfig() {
    let config = await prisma.analyticsConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      // Create default config
      config = await prisma.analyticsConfig.create({
        data: {
          id: 'default',
          rateLimitPerHour: 100,
          dataRetentionDays: 30,
          suspiciousThreshold: 500,
          blockDurationHours: 24,
          currentDailySalt: crypto.randomBytes(32).toString('hex'),
          lastSaltRotation: new Date(),
          trackingEnabled: true,
          updatedAt: new Date(),
        },
      });
    }

    return config;
  }

  /**
   * Rotate the daily IP salt (should run at midnight UTC)
   * @returns Updated config with new salt
   */
  async rotateDailySalt() {
    const newSalt = crypto.randomBytes(32).toString('hex');
    const config = await prisma.analyticsConfig.update({
      where: { id: 'default' },
      data: {
        currentDailySalt: newSalt,
        lastSaltRotation: new Date(),
      },
    });

    logger.info({ rotatedAt: new Date().toISOString() }, 'Daily salt rotated');
    return config;
  }

  /**
   * Aggregate today's PageView records into DailyVisitStats
   * @param date - Date to aggregate (defaults to yesterday)
   * @returns Created DailyVisitStats record
   */
  async aggregateDailyStats(date?: Date) {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all pageviews for the day
    const pageviews = await prisma.pageView.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate stats
    const uniqueVisitors = new Set(pageviews.map(pv => pv.ipHash)).size;
    const totalPageviews = pageviews.length;
    const authenticatedVisits = pageviews.filter(pv => pv.userId).length;
    const anonymousVisits = pageviews.filter(pv => !pv.userId).length;
    const botVisits = pageviews.filter(pv => pv.isBot).length;
    const suspiciousActivityCount = new Set(
      pageviews.filter(pv => pv.isSuspicious).map(pv => pv.ipHash)
    ).size;

    // Count signups for the day
    const signupsCount = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Popular pages
    const pageCounts: Record<string, number> = {};
    pageviews.forEach(pv => {
      pageCounts[pv.path] = (pageCounts[pv.path] || 0) + 1;
    });
    const popularPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [path, count]) => ({ ...obj, [path]: count }), {});

    // Average session duration
    const sessionsWithDuration = pageviews.filter(pv => pv.sessionDuration !== null);
    const avgSessionDuration =
      sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((sum, pv) => sum + (pv.sessionDuration || 0), 0) /
          sessionsWithDuration.length
        : null;

    // Create or update DailyVisitStats
    const stats = await prisma.dailyVisitStats.upsert({
      where: { date: startOfDay },
      update: {
        uniqueVisitors,
        totalPageviews,
        authenticatedVisits,
        anonymousVisits,
        botVisits,
        signupsCount,
        suspiciousActivityCount,
        popularPages,
        avgSessionDuration,
        updatedAt: new Date(),
      },
      create: {
        date: startOfDay,
        uniqueVisitors,
        totalPageviews,
        authenticatedVisits,
        anonymousVisits,
        botVisits,
        signupsCount,
        suspiciousActivityCount,
        popularPages,
        avgSessionDuration,
        updatedAt: new Date(),
      },
    });

    logger.info({
      date: startOfDay.toDateString(),
      uniqueVisitors,
      totalPageviews,
      signupsCount
    }, 'Daily stats aggregated');

    return stats;
  }

  /**
   * Delete PageView records older than retention period
   * @returns Number of deleted records
   */
  async cleanupOldData() {
    const config = await this.getConfig();
    const cutoffDate = new Date(Date.now() - config.dataRetentionDays * 24 * 60 * 60 * 1000);

    const deleted = await prisma.pageView.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    logger.info({
      deletedCount: deleted.count,
      cutoffDate: cutoffDate.toDateString()
    }, 'Deleted old PageView records');

    // Also clean up expired IPRateLimit blocks
    const expiredBlocks = await prisma.iPRateLimit.deleteMany({
      where: {
        blockedUntil: { lt: new Date() },
        lastRequest: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // >24 hours old
      },
    });

    logger.info({
      deletedCount: expiredBlocks.count
    }, 'Deleted expired IPRateLimit records');

    return {
      pageViewsDeleted: deleted.count,
      rateLimitsDeleted: expiredBlocks.count,
    };
  }

  /**
   * Get suspicious IPs with recent activity
   * @param days - Number of days to look back (default 7)
   * @returns List of suspicious IPs with activity counts
   */
  async getSuspiciousIPs(days: number = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const suspiciousPageViews = await prisma.pageView.groupBy({
      by: ['ipHash'],
      where: {
        isSuspicious: true,
        createdAt: { gte: startDate },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 50,
    });

    return suspiciousPageViews.map(pv => ({
      ipHash: pv.ipHash,
      count: pv._count.id,
    }));
  }

  /**
   * Get real-time overview stats for admin dashboard
   * @returns Current day stats and recent trends
   */
  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Get today's live data (not yet aggregated)
    const todayPageViews = await prisma.pageView.count({
      where: { createdAt: { gte: today } },
    });

    const todayUniqueVisitors = await prisma.pageView.findMany({
      where: { createdAt: { gte: today } },
      select: { ipHash: true },
      distinct: ['ipHash'],
    });

    const todaySignups = await prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    // Get aggregated historical data
    const weekStats = await this.getStats(weekAgo, today);
    const monthStats = await this.getStats(monthAgo, today);

    return {
      today: {
        uniqueVisitors: todayUniqueVisitors.length,
        pageViews: todayPageViews,
        signups: todaySignups,
      },
      week: weekStats.totals,
      month: monthStats.totals,
      conversionRates: {
        today:
          todayUniqueVisitors.length > 0
            ? (todaySignups / todayUniqueVisitors.length) * 100
            : 0,
        week: weekStats.conversionRate,
        month: monthStats.conversionRate,
      },
    };
  }
}

export default new VisitorAnalyticsService();
