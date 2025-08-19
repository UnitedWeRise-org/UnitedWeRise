"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = void 0;
const ioredis_1 = require("ioredis");
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
                console.log('SessionManager: Using Redis for session storage');
            }
            else {
                this.store = new MemoryStore();
                this.isRedis = false;
                console.warn('SessionManager: Using memory storage (not recommended for production)');
            }
        }
        catch (error) {
            this.store = new MemoryStore();
            this.isRedis = false;
            console.warn('SessionManager: Redis unavailable, falling back to memory storage');
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
        const data = Object.assign({ userId, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString() }, sessionData);
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
            console.warn('Memory store: Cannot revoke all user sessions efficiently');
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
            console.log('SessionManager: Redis handles cleanup automatically');
        }
        else {
            // Manual cleanup for memory store
            const memStore = this.store;
            memStore.clear(); // Simple cleanup - remove all expired items
            console.log('SessionManager: Memory store cleaned up');
        }
    }
}
exports.sessionManager = new SessionManager();
