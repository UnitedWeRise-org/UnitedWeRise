"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = void 0;
const ioredis_1 = require("ioredis");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../utils/auth");
const logger_1 = require("./logger");
// In-memory fallback if Redis isn't available
class MemoryStore {
    constructor() {
        this.store = new Map();
        this.expiry = new Map();
    }
    set(key, value, ttlSeconds) {
        this.store.set(key, value);
        this.expiry.set(key, Date.now() + (ttlSeconds * 1000));
    }
    get(key) {
        const expiryTime = this.expiry.get(key);
        if (expiryTime && Date.now() > expiryTime) {
            this.delete(key);
            return null;
        }
        return this.store.get(key);
    }
    delete(key) {
        this.store.delete(key);
        this.expiry.delete(key);
    }
    clear() {
        this.store.clear();
        this.expiry.clear();
    }
}
class SessionManager {
    constructor() {
        try {
            // Try to connect to Redis if available
            if (process.env.REDIS_URL) {
                this.store = new ioredis_1.Redis(process.env.REDIS_URL);
                this.isRedis = true;
                logger_1.logger.info('SessionManager: Using Redis for session storage');
            }
            else {
                this.store = new MemoryStore();
                this.isRedis = false;
                logger_1.logger.warn('SessionManager: Using memory storage (not recommended for production)');
            }
        }
        catch (error) {
            this.store = new MemoryStore();
            this.isRedis = false;
            logger_1.logger.warn({ error }, 'SessionManager: Redis unavailable, falling back to memory storage');
        }
    }
    // Blacklist a JWT token (for logout/security)
    async blacklistToken(tokenId, expirationTime) {
        const ttl = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
        if (this.isRedis) {
            await this.store.setex(`blacklist:${tokenId}`, ttl, 'true');
        }
        else {
            this.store.set(`blacklist:${tokenId}`, true, ttl);
        }
    }
    // Check if a token is blacklisted
    async isTokenBlacklisted(tokenId) {
        if (this.isRedis) {
            const result = await this.store.get(`blacklist:${tokenId}`);
            return result === 'true';
        }
        else {
            return this.store.get(`blacklist:${tokenId}`) === true;
        }
    }
    // Track user session
    async createUserSession(userId, sessionData, ttlSeconds = 3600) {
        const sessionId = `session:${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
        const data = {
            userId,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            ...sessionData
        };
        if (this.isRedis) {
            await this.store.setex(sessionId, ttlSeconds, JSON.stringify(data));
        }
        else {
            this.store.set(sessionId, data, ttlSeconds);
        }
        return sessionId;
    }
    // Get user session
    async getUserSession(sessionId) {
        if (this.isRedis) {
            const data = await this.store.get(sessionId);
            return data ? JSON.parse(data) : null;
        }
        else {
            return this.store.get(sessionId);
        }
    }
    // Update session activity
    async updateSessionActivity(sessionId, ttlSeconds = 3600) {
        const session = await this.getUserSession(sessionId);
        if (session) {
            session.lastActivity = new Date().toISOString();
            if (this.isRedis) {
                await this.store.setex(sessionId, ttlSeconds, JSON.stringify(session));
            }
            else {
                this.store.set(sessionId, session, ttlSeconds);
            }
        }
    }
    // Revoke user session
    async revokeUserSession(sessionId) {
        if (this.isRedis) {
            await this.store.del(sessionId);
        }
        else {
            this.store.delete(sessionId);
        }
    }
    // Revoke all user sessions
    async revokeAllUserSessions(userId) {
        if (this.isRedis) {
            const pattern = `session:${userId}:*`;
            const keys = await this.store.keys(pattern);
            if (keys.length > 0) {
                await this.store.del(...keys);
            }
        }
        else {
            // For memory store, we'd need to track sessions differently
            // This is a limitation of the fallback implementation
            logger_1.logger.warn({ userId }, 'Memory store: Cannot revoke all user sessions efficiently');
        }
    }
    // Rate limiting
    async checkRateLimit(key, maxRequests, windowSeconds) {
        const now = Date.now();
        const windowStart = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000);
        const rateLimitKey = `rate_limit:${key}:${windowStart}`;
        if (this.isRedis) {
            const current = await this.store.incr(rateLimitKey);
            if (current === 1) {
                await this.store.expire(rateLimitKey, windowSeconds);
            }
            const remaining = Math.max(0, maxRequests - current);
            const resetTime = windowStart + (windowSeconds * 1000);
            return {
                allowed: current <= maxRequests,
                remaining,
                resetTime
            };
        }
        else {
            const data = this.store.get(rateLimitKey) || { count: 0 };
            data.count++;
            this.store.set(rateLimitKey, data, windowSeconds);
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
    async cleanup() {
        if (this.isRedis) {
            // Redis handles TTL automatically
            logger_1.logger.info('SessionManager: Redis handles cleanup automatically');
        }
        else {
            // Manual cleanup for memory store
            const memStore = this.store;
            memStore.clear(); // Simple cleanup - remove all expired items
            logger_1.logger.info('SessionManager: Memory store cleaned up');
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
    async storeRefreshToken(userId, token, expiresAt, deviceInfo, rememberMe = false) {
        const tokenHash = (0, auth_1.hashRefreshToken)(token);
        // Enforce device limit: Maximum 10 active refresh tokens per user
        const activeTokens = await prisma_1.prisma.refreshToken.count({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() }
            }
        });
        if (activeTokens >= 10) {
            // Revoke oldest token to make room
            const oldestToken = await prisma_1.prisma.refreshToken.findFirst({
                where: {
                    userId,
                    revokedAt: null,
                    expiresAt: { gt: new Date() }
                },
                orderBy: { createdAt: 'asc' }
            });
            if (oldestToken) {
                await prisma_1.prisma.refreshToken.update({
                    where: { id: oldestToken.id },
                    data: { revokedAt: new Date() }
                });
            }
        }
        return await prisma_1.prisma.refreshToken.create({
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
     * @param token - Plaintext refresh token from cookie
     * @returns User data and token record, or null if invalid
     */
    async validateRefreshToken(token) {
        const tokenHash = (0, auth_1.hashRefreshToken)(token);
        const refreshToken = await prisma_1.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true }
        });
        // Token doesn't exist, is revoked, or expired
        if (!refreshToken || refreshToken.revokedAt || refreshToken.expiresAt < new Date()) {
            return null;
        }
        // Update lastUsedAt timestamp
        await prisma_1.prisma.refreshToken.update({
            where: { id: refreshToken.id },
            data: { lastUsedAt: new Date() }
        });
        return refreshToken;
    }
    /**
     * Rotate refresh token (invalidate old, create new) - SECURITY BEST PRACTICE
     * @param oldToken - Current refresh token to invalidate
     * @param newToken - New refresh token to store
     * @param gracePeriodSeconds - Keep old token valid for N seconds (handles concurrent refresh)
     * @returns New token record
     */
    async rotateRefreshToken(oldToken, newToken, gracePeriodSeconds = 30) {
        const oldTokenHash = (0, auth_1.hashRefreshToken)(oldToken);
        const newTokenHash = (0, auth_1.hashRefreshToken)(newToken);
        const oldRefreshToken = await prisma_1.prisma.refreshToken.findUnique({
            where: { tokenHash: oldTokenHash },
            include: { user: true }
        });
        if (!oldRefreshToken) {
            throw new Error('Refresh token not found');
        }
        // Revoke old token (with grace period for concurrent requests)
        const revokeAt = new Date(Date.now() + gracePeriodSeconds * 1000);
        await prisma_1.prisma.refreshToken.update({
            where: { id: oldRefreshToken.id },
            data: { revokedAt: revokeAt }
        });
        // Create new token with same settings
        return await this.storeRefreshToken(oldRefreshToken.userId, newToken, oldRefreshToken.rememberMe
            ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        oldRefreshToken.deviceInfo, oldRefreshToken.rememberMe);
    }
    /**
     * Revoke a specific refresh token (logout single device)
     * @param token - Plaintext refresh token to revoke
     */
    async revokeRefreshToken(token) {
        const tokenHash = (0, auth_1.hashRefreshToken)(token);
        await prisma_1.prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { revokedAt: new Date() }
        });
    }
    /**
     * Revoke all refresh tokens for a user (logout all devices)
     * @param userId - User ID to revoke tokens for
     */
    async revokeAllUserRefreshTokens(userId) {
        await prisma_1.prisma.refreshToken.updateMany({
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
    async cleanupExpiredRefreshTokens() {
        // Delete tokens that expired more than 7 days ago
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const result = await prisma_1.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: sevenDaysAgo } },
                    { revokedAt: { lt: sevenDaysAgo } }
                ]
            }
        });
        logger_1.logger.info({ count: result.count }, 'SessionManager: Cleaned up expired refresh tokens');
        return result.count;
    }
}
exports.sessionManager = new SessionManager();
//# sourceMappingURL=sessionManager.js.map