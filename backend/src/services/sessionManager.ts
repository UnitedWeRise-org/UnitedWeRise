import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma';
import { hashRefreshToken } from '../utils/auth';
import { logger } from './logger';

// In-memory fallback if Redis isn't available
class MemoryStore {
  private store = new Map<string, any>();
  private expiry = new Map<string, number>();

  set(key: string, value: any, ttlSeconds: number): void {
    this.store.set(key, value);
    this.expiry.set(key, Date.now() + (ttlSeconds * 1000));
  }

  get(key: string): any {
    const expiryTime = this.expiry.get(key);
    if (expiryTime && Date.now() > expiryTime) {
      this.delete(key);
      return null;
    }
    return this.store.get(key);
  }

  delete(key: string): void {
    this.store.delete(key);
    this.expiry.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.expiry.clear();
  }
}

class SessionManager {
  private store: Redis | MemoryStore;
  private isRedis: boolean;

  constructor() {
    try {
      // Try to connect to Redis if available
      if (process.env.REDIS_URL) {
        this.store = new Redis(process.env.REDIS_URL);
        this.isRedis = true;
        logger.info('SessionManager: Using Redis for session storage');
      } else {
        this.store = new MemoryStore();
        this.isRedis = false;
        logger.warn('SessionManager: Using memory storage (not recommended for production)');
      }
    } catch (error) {
      this.store = new MemoryStore();
      this.isRedis = false;
      logger.warn({ error }, 'SessionManager: Redis unavailable, falling back to memory storage');
    }
  }

  // Blacklist a JWT token (for logout/security)
  async blacklistToken(tokenId: string, expirationTime: number): Promise<void> {
    const ttl = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
    
    if (this.isRedis) {
      await (this.store as Redis).setex(`blacklist:${tokenId}`, ttl, 'true');
    } else {
      (this.store as MemoryStore).set(`blacklist:${tokenId}`, true, ttl);
    }
  }

  // Check if a token is blacklisted
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    if (this.isRedis) {
      const result = await (this.store as Redis).get(`blacklist:${tokenId}`);
      return result === 'true';
    } else {
      return (this.store as MemoryStore).get(`blacklist:${tokenId}`) === true;
    }
  }

  // Track user session
  async createUserSession(userId: string, sessionData: any, ttlSeconds: number = 3600): Promise<string> {
    const sessionId = `session:${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const data = {
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...sessionData
    };

    if (this.isRedis) {
      await (this.store as Redis).setex(sessionId, ttlSeconds, JSON.stringify(data));
    } else {
      (this.store as MemoryStore).set(sessionId, data, ttlSeconds);
    }

    return sessionId;
  }

  // Get user session
  async getUserSession(sessionId: string): Promise<any> {
    if (this.isRedis) {
      const data = await (this.store as Redis).get(sessionId);
      return data ? JSON.parse(data) : null;
    } else {
      return (this.store as MemoryStore).get(sessionId);
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId: string, ttlSeconds: number = 3600): Promise<void> {
    const session = await this.getUserSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      
      if (this.isRedis) {
        await (this.store as Redis).setex(sessionId, ttlSeconds, JSON.stringify(session));
      } else {
        (this.store as MemoryStore).set(sessionId, session, ttlSeconds);
      }
    }
  }

  // Revoke user session
  async revokeUserSession(sessionId: string): Promise<void> {
    if (this.isRedis) {
      await (this.store as Redis).del(sessionId);
    } else {
      (this.store as MemoryStore).delete(sessionId);
    }
  }

  // Revoke all user sessions
  async revokeAllUserSessions(userId: string): Promise<void> {
    if (this.isRedis) {
      const pattern = `session:${userId}:*`;
      const keys = await (this.store as Redis).keys(pattern);
      if (keys.length > 0) {
        await (this.store as Redis).del(...keys);
      }
    } else {
      // For memory store, we'd need to track sessions differently
      // This is a limitation of the fallback implementation
      logger.warn({ userId }, 'Memory store: Cannot revoke all user sessions efficiently');
    }
  }

  // Rate limiting
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
    const rateLimitKey = `rate_limit:${key}:${windowStart}`;
    
    if (this.isRedis) {
      const current = await (this.store as Redis).incr(rateLimitKey);
      if (current === 1) {
        await (this.store as Redis).expire(rateLimitKey, windowSeconds);
      }
      
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = windowStart + (windowSeconds * 1000);
      
      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime
      };
    } else {
      const data = (this.store as MemoryStore).get(rateLimitKey) || { count: 0 };
      data.count++;
      
      (this.store as MemoryStore).set(rateLimitKey, data, windowSeconds);
      
      const remaining = Math.max(0, maxRequests - data.count);
      const resetTime = windowStart + (windowSeconds * 1000);
      
      return {
        allowed: data.count <= maxRequests,
        remaining,
        resetTime
      };
    }
  }

  // Clean up expired sessions and blacklisted tokens
  async cleanup(): Promise<void> {
    if (this.isRedis) {
      // Redis handles TTL automatically
      logger.info('SessionManager: Redis handles cleanup automatically');
    } else {
      // Manual cleanup for memory store
      const memStore = this.store as MemoryStore;
      memStore.clear(); // Simple cleanup - remove all expired items
      logger.info('SessionManager: Memory store cleaned up');
    }
  }

  // ========================================
  // REFRESH TOKEN MANAGEMENT (DATABASE-BACKED)
  // ========================================

  /**
   * Store a new refresh token in the database
   * @param userId - User ID this token belongs to
   * @param token - Plaintext refresh token (will be hashed before storage)
   * @param expiresAt - Expiration date (30 days or 90 days with "Remember Me")
   * @param deviceInfo - Device/browser information for security tracking
   * @param rememberMe - Whether this is a "Remember Me" session
   * @returns Created refresh token record
   */
  async storeRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    deviceInfo?: { userAgent?: string; ipAddress?: string },
    rememberMe: boolean = false
  ) {
    const tokenHash = hashRefreshToken(token);

    // Enforce device limit: Maximum 10 active refresh tokens per user
    const activeTokens = await prisma.refreshToken.count({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (activeTokens >= 10) {
      // Revoke oldest token to make room
      const oldestToken = await prisma.refreshToken.findFirst({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (oldestToken) {
        await prisma.refreshToken.update({
          where: { id: oldestToken.id },
          data: { revokedAt: new Date() }
        });
      }
    }

    return await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        deviceInfo: deviceInfo || {},
        rememberMe
      }
    });
  }

  /**
   * Validate refresh token and return user data
   *
   * SECURITY: Implements proper grace period handling for token rotation.
   * During rotation, the old token has revokedAt set to a future timestamp.
   * The token remains valid until that timestamp passes.
   *
   * @param token - Plaintext refresh token from cookie
   * @returns User data and token record, or null if invalid
   */
  async validateRefreshToken(token: string) {
    // SECURITY: Validate token format before hashing (64-char hex from crypto.randomBytes(32))
    // Defense-in-depth against cookie tampering or injection
    if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
      logger.warn({
        tokenLength: token?.length,
        expectedLength: 64,
        isHex: token ? /^[a-f0-9]+$/i.test(token) : false,
        isEmpty: !token
      }, 'DIAGNOSTIC: Refresh token format validation failed');
      return null;
    }

    const tokenHash = hashRefreshToken(token);

    const refreshToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    // Token doesn't exist
    if (!refreshToken) {
      logger.warn({
        tokenHashPrefix: tokenHash.substring(0, 8) + '...'
      }, 'DIAGNOSTIC: Refresh token hash not found in database');
      return null;
    }

    const now = new Date();

    // Token has expired (past its expiresAt timestamp)
    if (refreshToken.expiresAt < now) {
      logger.warn({
        tokenId: refreshToken.id,
        userId: refreshToken.userId,
        username: refreshToken.user?.username,
        expiresAt: refreshToken.expiresAt.toISOString(),
        expiredAgo: Math.round((now.getTime() - refreshToken.expiresAt.getTime()) / 1000 / 60) + ' minutes',
        createdAt: refreshToken.createdAt?.toISOString(),
        lastUsedAt: refreshToken.lastUsedAt?.toISOString(),
        rememberMe: refreshToken.rememberMe
      }, 'DIAGNOSTIC: Refresh token TTL expired');
      return null;
    }

    // Token has been revoked - check if grace period has passed
    // During rotation, revokedAt is set to a future timestamp (grace period)
    // Token remains valid until that grace period timestamp passes
    if (refreshToken.revokedAt) {
      if (refreshToken.revokedAt <= now) {
        // Grace period has passed - token is now fully invalid
        // Log this as it could indicate a replay attack (someone using old rotated token)
        logger.warn({
          tokenId: refreshToken.id,
          userId: refreshToken.userId,
          username: refreshToken.user?.username,
          revokedAt: refreshToken.revokedAt.toISOString(),
          revokedAgo: Math.round((now.getTime() - refreshToken.revokedAt.getTime()) / 1000) + ' seconds',
          createdAt: refreshToken.createdAt?.toISOString(),
          lastUsedAt: refreshToken.lastUsedAt?.toISOString(),
          rememberMe: refreshToken.rememberMe,
          attemptTime: now.toISOString()
        }, 'DIAGNOSTIC: Refresh token revoked - possible logout, password change, or rotation');
        return null;
      }
      // Token is within grace period - still valid but log for monitoring
      logger.debug({
        tokenId: refreshToken.id,
        userId: refreshToken.userId,
        revokedAt: refreshToken.revokedAt,
        gracePeriodRemaining: Math.round((refreshToken.revokedAt.getTime() - now.getTime()) / 1000)
      }, 'Refresh token used within grace period');
    }

    // Update lastUsedAt timestamp
    await prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { lastUsedAt: now }
    });

    return refreshToken;
  }

  /**
   * Rotate refresh token (invalidate old, create new) - SECURITY BEST PRACTICE
   *
   * SECURITY: Implements token rotation with grace period to prevent token theft attacks.
   * - Old token is marked as "rotating" with a future revocation timestamp
   * - Old token remains valid during grace period (handles concurrent requests)
   * - After grace period expires, old token is fully rejected
   * - All rotation events are logged for security monitoring
   *
   * @param oldToken - Current refresh token to invalidate
   * @param newToken - New refresh token to store
   * @param gracePeriodSeconds - Keep old token valid for N seconds (default: 30s, handles concurrent refresh)
   * @returns New token record
   */
  async rotateRefreshToken(
    oldToken: string,
    newToken: string,
    gracePeriodSeconds: number = 30
  ) {
    const oldTokenHash = hashRefreshToken(oldToken);
    const newTokenHash = hashRefreshToken(newToken);

    const oldRefreshToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: oldTokenHash },
      include: { user: true }
    });

    if (!oldRefreshToken) {
      // SECURITY: Log attempted rotation with invalid token
      logger.warn({
        oldTokenHashPrefix: oldTokenHash.substring(0, 8) + '...'
      }, 'SECURITY: Token rotation attempted with non-existent token');
      throw new Error('Refresh token not found');
    }

    // Check if this token was already rotated
    // IDEMPOTENCY: If already rotated, return the new token instead of throwing
    // This handles concurrent refresh requests during session resume
    if (oldRefreshToken.revokedAt) {
      // Find the token that was created during the rotation
      const existingNewToken = await prisma.refreshToken.findFirst({
        where: {
          userId: oldRefreshToken.userId,
          createdAt: { gt: oldRefreshToken.createdAt },
          revokedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (existingNewToken) {
        logger.info({
          tokenId: oldRefreshToken.id,
          userId: oldRefreshToken.userId,
          existingNewTokenId: existingNewToken.id,
          revokedAt: oldRefreshToken.revokedAt
        }, 'Token already rotated - returning existing new token (idempotent refresh)');

        // Return the existing new token - concurrent refresh is idempotent
        return existingNewToken;
      }

      // No valid new token found - this could be a replay attack or expired session
      logger.warn({
        tokenId: oldRefreshToken.id,
        userId: oldRefreshToken.userId,
        revokedAt: oldRefreshToken.revokedAt
      }, 'SECURITY: Token rotation attempted on revoked token without valid successor - possible token theft');
      throw new Error('Refresh token already revoked');
    }

    const now = new Date();
    // Revoke old token (with grace period for concurrent requests)
    const revokeAt = new Date(now.getTime() + gracePeriodSeconds * 1000);

    await prisma.refreshToken.update({
      where: { id: oldRefreshToken.id },
      data: { revokedAt: revokeAt }
    });

    // SECURITY: Log successful token rotation
    logger.info({
      tokenId: oldRefreshToken.id,
      userId: oldRefreshToken.userId,
      gracePeriodSeconds,
      gracePeriodEndsAt: revokeAt.toISOString(),
      rememberMe: oldRefreshToken.rememberMe
    }, 'Refresh token rotated successfully');

    // Create new token with same settings
    return await this.storeRefreshToken(
      oldRefreshToken.userId,
      newToken,
      oldRefreshToken.rememberMe
        ? new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      oldRefreshToken.deviceInfo as any,
      oldRefreshToken.rememberMe
    );
  }

  /**
   * Revoke a specific refresh token (logout single device)
   * @param token - Plaintext refresh token to revoke
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = hashRefreshToken(token);

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   * @param userId - User ID to revoke tokens for
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  /**
   * Clean up expired refresh tokens from database
   * Run this periodically (e.g., daily cron job)
   */
  async cleanupExpiredRefreshTokens(): Promise<number> {
    // Delete tokens that expired more than 7 days ago
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: sevenDaysAgo } },
          { revokedAt: { lt: sevenDaysAgo } }
        ]
      }
    });

    logger.info({ count: result.count }, 'SessionManager: Cleaned up expired refresh tokens');
    return result.count;
  }
}

export const sessionManager = new SessionManager();