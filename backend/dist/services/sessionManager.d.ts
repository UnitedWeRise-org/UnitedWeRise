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
    /**
     * Store a new refresh token in the database
     * @param userId - User ID this token belongs to
     * @param token - Plaintext refresh token (will be hashed before storage)
     * @param expiresAt - Expiration date (30 days or 90 days with "Remember Me")
     * @param deviceInfo - Device/browser information for security tracking
     * @param rememberMe - Whether this is a "Remember Me" session
     * @returns Created refresh token record
     */
    storeRefreshToken(userId: string, token: string, expiresAt: Date, deviceInfo?: {
        userAgent?: string;
        ipAddress?: string;
    }, rememberMe?: boolean): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        lastUsedAt: Date;
        tokenHash: string;
        revokedAt: Date | null;
        deviceInfo: import("@prisma/client/runtime/library").JsonValue | null;
        rememberMe: boolean;
    }>;
    /**
     * Validate refresh token and return user data
     * @param token - Plaintext refresh token from cookie
     * @returns User data and token record, or null if invalid
     */
    validateRefreshToken(token: string): Promise<{
        user: {
            id: string;
            email: string;
            username: string;
            password: string | null;
            firstName: string | null;
            lastName: string | null;
            avatar: string | null;
            bio: string | null;
            website: string | null;
            location: string | null;
            verified: boolean;
            embedding: number[];
            createdAt: Date;
            updatedAt: Date;
            streetAddress: string | null;
            streetAddress2: string | null;
            city: string | null;
            state: string | null;
            zipCode: string | null;
            h3Index: string | null;
            politicalProfileType: import(".prisma/client").$Enums.PoliticalProfileType;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            verificationDocuments: string[];
            office: string | null;
            campaignWebsite: string | null;
            officialTitle: string | null;
            termStart: Date | null;
            termEnd: Date | null;
            emailVerified: boolean;
            emailVerifyToken: string | null;
            emailVerifyExpiry: Date | null;
            phoneNumber: string | null;
            phoneVerified: boolean;
            phoneVerifyCode: string | null;
            phoneVerifyExpiry: Date | null;
            maritalStatus: string | null;
            profilePrivacySettings: import("@prisma/client/runtime/library").JsonValue | null;
            resetToken: string | null;
            resetExpiry: Date | null;
            isOnline: boolean;
            lastSeenAt: Date;
            isModerator: boolean;
            isAdmin: boolean;
            isSuperAdmin: boolean;
            isSuspended: boolean;
            onboardingData: import("@prisma/client/runtime/library").JsonValue | null;
            onboardingCompleted: boolean;
            interests: string[];
            notificationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
            displayName: string | null;
            followingCount: number;
            followersCount: number;
            deviceFingerprint: import("@prisma/client/runtime/library").JsonValue | null;
            lastLoginAt: Date | null;
            lastLoginIp: string | null;
            lockedUntil: Date | null;
            loginAttempts: number;
            passwordChangedAt: Date | null;
            riskScore: number;
            suspiciousActivityCount: number;
            reputationScore: number | null;
            reputationUpdatedAt: Date | null;
            allowTagsByFriendsOnly: boolean;
            photoTaggingEnabled: boolean;
            requireTagApproval: boolean;
            backgroundImage: string | null;
            totpBackupCodes: string[];
            totpEnabled: boolean;
            totpLastUsedAt: Date | null;
            totpSecret: string | null;
            totpSetupAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        lastUsedAt: Date;
        tokenHash: string;
        revokedAt: Date | null;
        deviceInfo: import("@prisma/client/runtime/library").JsonValue | null;
        rememberMe: boolean;
    }>;
    /**
     * Rotate refresh token (invalidate old, create new) - SECURITY BEST PRACTICE
     * @param oldToken - Current refresh token to invalidate
     * @param newToken - New refresh token to store
     * @param gracePeriodSeconds - Keep old token valid for N seconds (handles concurrent refresh)
     * @returns New token record
     */
    rotateRefreshToken(oldToken: string, newToken: string, gracePeriodSeconds?: number): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
        lastUsedAt: Date;
        tokenHash: string;
        revokedAt: Date | null;
        deviceInfo: import("@prisma/client/runtime/library").JsonValue | null;
        rememberMe: boolean;
    }>;
    /**
     * Revoke a specific refresh token (logout single device)
     * @param token - Plaintext refresh token to revoke
     */
    revokeRefreshToken(token: string): Promise<void>;
    /**
     * Revoke all refresh tokens for a user (logout all devices)
     * @param userId - User ID to revoke tokens for
     */
    revokeAllUserRefreshTokens(userId: string): Promise<void>;
    /**
     * Clean up expired refresh tokens from database
     * Run this periodically (e.g., daily cron job)
     */
    cleanupExpiredRefreshTokens(): Promise<number>;
}
export declare const sessionManager: SessionManager;
export {};
//# sourceMappingURL=sessionManager.d.ts.map