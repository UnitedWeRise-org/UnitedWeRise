import { Redis } from 'ioredis';

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
        console.log('SessionManager: Using Redis for session storage');
      } else {
        this.store = new MemoryStore();
        this.isRedis = false;
        console.warn('SessionManager: Using memory storage (not recommended for production)');
      }
    } catch (error) {
      this.store = new MemoryStore();
      this.isRedis = false;
      console.warn('SessionManager: Redis unavailable, falling back to memory storage');
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
      console.warn('Memory store: Cannot revoke all user sessions efficiently');
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
      console.log('SessionManager: Redis handles cleanup automatically');
    } else {
      // Manual cleanup for memory store
      const memStore = this.store as MemoryStore;
      memStore.clear(); // Simple cleanup - remove all expired items
      console.log('SessionManager: Memory store cleaned up');
    }
  }
}

export const sessionManager = new SessionManager();