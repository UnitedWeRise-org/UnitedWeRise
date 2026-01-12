export interface OAuthProfile {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    provider: 'GOOGLE';
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
}
export interface OAuthLoginResult {
    user: {
        id: string;
        email: string;
        username: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
        isNewUser?: boolean;
    };
    token: string;
    refreshToken: string;
}
export declare class OAuthService {
    /**
     * Handle OAuth login/registration flow
     */
    static handleOAuthLogin(profile: OAuthProfile): Promise<OAuthLoginResult>;
    /**
     * Link OAuth provider to existing user account
     */
    static linkOAuthProvider(userId: string, profile: OAuthProfile): Promise<void>;
    /**
     * Unlink OAuth provider from user account
     */
    static unlinkOAuthProvider(userId: string, provider: 'GOOGLE'): Promise<void>;
    /**
     * Get user's linked OAuth providers
     */
    static getUserOAuthProviders(userId: string): Promise<{
        name: string;
        email: string;
        createdAt: Date;
        provider: import(".prisma/client").$Enums.OAuthProvider;
        picture: string;
    }[]>;
    /**
     * Generate unique username from email and name
     */
    private static generateUniqueUsername;
    /**
     * Check if OAuth encryption key is configured
     * Logs warning if not set (tokens will be stored unencrypted)
     */
    private static hasEncryptionKey;
    /**
     * Encrypt OAuth tokens for secure storage
     * If OAUTH_ENCRYPTION_KEY is not set, returns token with 'unencrypted:' prefix
     */
    private static encryptToken;
    /**
     * Decrypt OAuth tokens for use
     * Handles both encrypted and unencrypted tokens (for backwards compatibility)
     */
    private static decryptToken;
}
//# sourceMappingURL=oauthService.d.ts.map