import { prisma } from '../lib/prisma';
;

// Using singleton prisma from lib/prisma.ts

export interface SecurityEventData {
  userId?: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  riskScore?: number;
}

export class SecurityService {
  // Event type constants
  static readonly EVENT_TYPES = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
    SUSPICIOUS_LOGIN_LOCATION: 'SUSPICIOUS_LOGIN_LOCATION',
    RAPID_REQUESTS: 'RAPID_REQUESTS',
    EMAIL_VERIFICATION_FAILED: 'EMAIL_VERIFICATION_FAILED',
    SESSION_HIJACK_ATTEMPT: 'SESSION_HIJACK_ATTEMPT',
    UNUSUAL_USER_AGENT: 'UNUSUAL_USER_AGENT',
    BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
    SPAM_DETECTED: 'SPAM_DETECTED',
    CONTENT_VIOLATION: 'CONTENT_VIOLATION',
    ADMIN_ACTION: 'ADMIN_ACTION',
    SECURITY_ALERT: 'SECURITY_ALERT'
  } as const;

  // Risk score thresholds
  static readonly RISK_THRESHOLDS = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90
  } as const;

  /**
   * Log a security event
   */
  static async logEvent(eventData: SecurityEventData): Promise<void> {
    try {
      const riskScore = eventData.riskScore || this.calculateRiskScore(eventData);
      
      await prisma.securityEvent.create({
        data: {
          userId: eventData.userId || null,
          eventType: eventData.eventType,
          ipAddress: eventData.ipAddress || null,
          userAgent: eventData.userAgent || null,
          details: eventData.details || null,
          riskScore
        }
      });

      // If this is a high-risk event, check for additional security measures
      if (riskScore >= this.RISK_THRESHOLDS.HIGH) {
        await this.handleHighRiskEvent(eventData, riskScore);
      }

      console.log(`Security event logged: ${eventData.eventType} (Risk: ${riskScore})`);
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - security logging failures shouldn't break the app
    }
  }

  /**
   * Handle failed login attempt
   */
  static async handleFailedLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Get current user data
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      const newAttempts = (user.loginAttempts || 0) + 1;
      const shouldLock = newAttempts >= 5; // Lock after 5 failed attempts
      
      const updateData: any = {
        loginAttempts: newAttempts,
        suspiciousActivityCount: user.suspiciousActivityCount + 1
      };

      if (shouldLock) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Log security event
      await this.logEvent({
        userId,
        eventType: shouldLock ? this.EVENT_TYPES.ACCOUNT_LOCKED : this.EVENT_TYPES.LOGIN_FAILED,
        ipAddress,
        userAgent,
        details: {
          attempts: newAttempts,
          locked: shouldLock,
          lockoutMinutes: shouldLock ? 15 : undefined
        },
        riskScore: shouldLock ? 80 : 20 + (newAttempts * 10)
      });

    } catch (error) {
      console.error('Failed to handle failed login:', error);
    }
  }

  /**
   * Handle successful login
   */
  static async handleSuccessfulLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const updateData: any = {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginAttempts: 0 // Reset failed attempts on successful login
      };

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Check for suspicious login patterns
      const riskScore = await this.assessLoginRisk(userId, ipAddress, userAgent);

      await this.logEvent({
        userId,
        eventType: this.EVENT_TYPES.LOGIN_SUCCESS,
        ipAddress,
        userAgent,
        details: {
          previousLoginIp: ipAddress,
          locationChanged: false // TODO: Implement geo-location checking
        },
        riskScore
      });

    } catch (error) {
      console.error('Failed to handle successful login:', error);
    }
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lockedUntil: true }
      });

      return user?.lockedUntil ? new Date() < user.lockedUntil : false;
    } catch (error) {
      console.error('Failed to check account lock status:', error);
      return false;
    }
  }

  /**
   * Get security events for admin dashboard
   */
  static async getSecurityEvents(options: {
    limit?: number;
    offset?: number;
    eventType?: string;
    minRiskScore?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any[]> {
    try {
      const {
        limit = 100,
        offset = 0,
        eventType,
        minRiskScore = 0,
        startDate,
        endDate
      } = options;

      const where: any = {
        riskScore: { gte: minRiskScore }
      };

      if (eventType) where.eventType = eventType;
      if (startDate && endDate) {
        where.createdAt = {
          gte: startDate,
          lte: endDate
        };
      }

      return await prisma.securityEvent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              isAdmin: true,
              isModerator: true
            }
          }
        },
        orderBy: [
          { riskScore: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  /**
   * Get security statistics for dashboard
   */
  static async getSecurityStats(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<any> {
    try {
      const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [
        totalEvents,
        failedLogins,
        highRiskEvents,
        uniqueIPs,
        lockedAccounts,
        avgRiskScore
      ] = await Promise.all([
        prisma.securityEvent.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.securityEvent.count({
          where: {
            eventType: this.EVENT_TYPES.LOGIN_FAILED,
            createdAt: { gte: startDate }
          }
        }),
        prisma.securityEvent.count({
          where: {
            riskScore: { gte: this.RISK_THRESHOLDS.HIGH },
            createdAt: { gte: startDate }
          }
        }),
        prisma.securityEvent.findMany({
          where: {
            createdAt: { gte: startDate },
            ipAddress: { not: null }
          },
          select: { ipAddress: true },
          distinct: ['ipAddress']
        }),
        prisma.user.count({
          where: {
            lockedUntil: { gt: new Date() }
          }
        }),
        prisma.securityEvent.aggregate({
          where: { createdAt: { gte: startDate } },
          _avg: { riskScore: true }
        })
      ]);

      return {
        totalEvents,
        failedLogins,
        highRiskEvents,
        uniqueIPs: uniqueIPs.length,
        lockedAccounts,
        avgRiskScore: Math.round(avgRiskScore._avg.riskScore || 0),
        timeframe,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get security stats:', error);
      return {
        totalEvents: 0,
        failedLogins: 0,
        highRiskEvents: 0,
        uniqueIPs: 0,
        lockedAccounts: 0,
        avgRiskScore: 0,
        error: 'Failed to load security statistics'
      };
    }
  }

  /**
   * Calculate risk score based on event data
   */
  private static calculateRiskScore(eventData: SecurityEventData): number {
    let score = 0;

    // Base scores by event type
    const eventScores: Record<string, number> = {
      [this.EVENT_TYPES.LOGIN_FAILED]: 20,
      [this.EVENT_TYPES.PASSWORD_RESET_REQUEST]: 10,
      [this.EVENT_TYPES.MULTIPLE_FAILED_LOGINS]: 40,
      [this.EVENT_TYPES.ACCOUNT_LOCKED]: 70,
      [this.EVENT_TYPES.SUSPICIOUS_LOGIN_LOCATION]: 60,
      [this.EVENT_TYPES.RAPID_REQUESTS]: 50,
      [this.EVENT_TYPES.SESSION_HIJACK_ATTEMPT]: 90,
      [this.EVENT_TYPES.BRUTE_FORCE_DETECTED]: 85,
      [this.EVENT_TYPES.SPAM_DETECTED]: 30,
      [this.EVENT_TYPES.LOGIN_SUCCESS]: 5,
      [this.EVENT_TYPES.PASSWORD_RESET_SUCCESS]: 15
    };

    score += eventScores[eventData.eventType] || 10;

    // Additional risk factors from details
    if (eventData.details) {
      const details = eventData.details;
      
      if (details.newLocation) score += 25;
      if (details.multipleFailures) score += 30;
      if (details.rateLimitHit) score += 20;
      if (details.unusualUserAgent) score += 15;
      if (details.rapidSuccession) score += 25;
      if (details.adminAction) score += 40;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Assess login risk based on patterns
   */
  private static async assessLoginRisk(userId: string, ipAddress?: string, userAgent?: string): Promise<number> {
    try {
      let riskScore = 5; // Base score for successful login

      // Check recent failed attempts from this IP
      if (ipAddress) {
        const recentFailures = await prisma.securityEvent.count({
          where: {
            ipAddress,
            eventType: this.EVENT_TYPES.LOGIN_FAILED,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
            }
          }
        });

        if (recentFailures > 0) {
          riskScore += recentFailures * 10;
        }
      }

      // Check for rapid login attempts
      const recentLogins = await prisma.securityEvent.count({
        where: {
          userId,
          eventType: this.EVENT_TYPES.LOGIN_SUCCESS,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        }
      });

      if (recentLogins > 3) {
        riskScore += 30;
      }

      return Math.min(riskScore, 100);
    } catch (error) {
      console.error('Failed to assess login risk:', error);
      return 5;
    }
  }

  /**
   * Handle high-risk security events
   */
  private static async handleHighRiskEvent(eventData: SecurityEventData, riskScore: number): Promise<void> {
    try {
      console.warn(`HIGH RISK SECURITY EVENT: ${eventData.eventType} (Score: ${riskScore})`);
      
      // Additional logging for critical events
      if (riskScore >= this.RISK_THRESHOLDS.CRITICAL) {
        console.error(`CRITICAL SECURITY EVENT: ${eventData.eventType}`, {
          userId: eventData.userId,
          ipAddress: eventData.ipAddress,
          details: eventData.details,
          timestamp: new Date().toISOString()
        });

        // TODO: Implement additional security measures:
        // - Send email alerts to admins
        // - Temporarily increase rate limiting for the IP
        // - Create security incident ticket
      }
    } catch (error) {
      console.error('Failed to handle high-risk event:', error);
    }
  }

  /**
   * Clean up old security events (for maintenance)
   */
  static async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await prisma.securityEvent.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          riskScore: { lt: this.RISK_THRESHOLDS.HIGH } // Keep high-risk events longer
        }
      });

      console.log(`Cleaned up ${result.count} old security events`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old security events:', error);
      return 0;
    }
  }
}