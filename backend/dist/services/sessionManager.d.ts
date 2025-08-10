declare class SessionManager {
    private store;
    private isRedis;
    constructor();
    blacklistToken(tokenId: string, expirationTime: number): Promise<void>;
    isTokenBlacklisted(tokenId: string): Promise<boolean>;
    createUserSession(userId: string, sessionData: any, ttlSeconds?: number): Promise<string>;
    getUserSession(sessionId: string): Promise<any>;
    updateSessionActivity(sessionId: string, ttlSeconds?: number): Promise<void>;
    revokeUserSession(sessionId: string): Promise<void>;
    revokeAllUserSessions(userId: string): Promise<void>;
    checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    cleanup(): Promise<void>;
}
export declare const sessionManager: SessionManager;
export {};
//# sourceMappingURL=sessionManager.d.ts.map