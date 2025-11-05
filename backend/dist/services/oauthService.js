"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthService = void 0;
const prisma_1 = require("../lib/prisma");
;
const auth_1 = require("../utils/auth");
const emailNormalization_1 = require("../utils/emailNormalization");
const sessionManager_1 = require("./sessionManager");
const crypto_1 = __importDefault(require("crypto"));
class OAuthService {
    /**
     * Handle OAuth login/registration flow
     */
    static async handleOAuthLogin(profile) {
        try {
            const normalizedEmail = (0, emailNormalization_1.normalizeEmail)(profile.email);
            // First, check if user already has this OAuth provider linked
            const existingOAuthProvider = await prisma_1.prisma.userOAuthProvider.findUnique({
                where: {
                    provider_providerId: {
                        provider: profile.provider,
                        providerId: profile.id
                    }
                },
                include: { user: true }
            });
            if (existingOAuthProvider) {
                // Update OAuth tokens
                await prisma_1.prisma.userOAuthProvider.update({
                    where: { id: existingOAuthProvider.id },
                    data: {
                        accessToken: profile.accessToken ? this.encryptToken(profile.accessToken) : undefined,
                        refreshToken: profile.refreshToken ? this.encryptToken(profile.refreshToken) : undefined,
                        expiresAt: profile.expiresAt,
                        email: profile.email,
                        name: profile.name,
                        picture: profile.picture
                    }
                });
                const token = (0, auth_1.generateToken)(existingOAuthProvider.user.id);
                // Generate and store refresh token (30 days for OAuth logins)
                const refreshToken = (0, auth_1.generateRefreshToken)();
                await sessionManager_1.sessionManager.storeRefreshToken(existingOAuthProvider.user.id, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                undefined, // deviceInfo not available in OAuth flow
                false // rememberMe defaults to false
                );
                return {
                    user: {
                        id: existingOAuthProvider.user.id,
                        email: existingOAuthProvider.user.email,
                        username: existingOAuthProvider.user.username,
                        firstName: existingOAuthProvider.user.firstName || undefined,
                        lastName: existingOAuthProvider.user.lastName || undefined,
                        avatar: existingOAuthProvider.user.avatar || profile.picture || undefined,
                        isNewUser: false
                    },
                    token,
                    refreshToken
                };
            }
            // Check if user exists with this email (using normalized email for Gmail)
            // First try exact match, then try finding by normalized Gmail
            let existingUser = await prisma_1.prisma.user.findUnique({
                where: { email: profile.email }
            });
            if (!existingUser && (profile.email.includes('@gmail.com') || profile.email.includes('@googlemail.com'))) {
                // For Gmail, also check for accounts with the normalized version
                const allUsers = await prisma_1.prisma.user.findMany({
                    where: {
                        email: { contains: '@gmail.com' }
                    }
                });
                existingUser = allUsers.find(user => (0, emailNormalization_1.normalizeEmail)(user.email) === normalizedEmail) || null;
            }
            if (existingUser) {
                // Link OAuth provider to existing user account
                await prisma_1.prisma.userOAuthProvider.create({
                    data: {
                        userId: existingUser.id,
                        provider: profile.provider,
                        providerId: profile.id,
                        email: profile.email,
                        name: profile.name,
                        picture: profile.picture,
                        accessToken: profile.accessToken ? this.encryptToken(profile.accessToken) : undefined,
                        refreshToken: profile.refreshToken ? this.encryptToken(profile.refreshToken) : undefined,
                        expiresAt: profile.expiresAt
                    }
                });
                // Update user profile with OAuth data if missing
                const updateData = {};
                if (!existingUser.firstName && profile.firstName)
                    updateData.firstName = profile.firstName;
                if (!existingUser.lastName && profile.lastName)
                    updateData.lastName = profile.lastName;
                if (!existingUser.avatar && profile.picture)
                    updateData.avatar = profile.picture;
                if (!existingUser.emailVerified)
                    updateData.emailVerified = true; // OAuth emails are pre-verified
                if (Object.keys(updateData).length > 0) {
                    await prisma_1.prisma.user.update({
                        where: { id: existingUser.id },
                        data: updateData
                    });
                }
                const token = (0, auth_1.generateToken)(existingUser.id);
                // Generate and store refresh token (30 days for OAuth logins)
                const refreshToken = (0, auth_1.generateRefreshToken)();
                await sessionManager_1.sessionManager.storeRefreshToken(existingUser.id, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                undefined, // deviceInfo not available in OAuth flow
                false // rememberMe defaults to false
                );
                return {
                    user: {
                        id: existingUser.id,
                        email: existingUser.email,
                        username: existingUser.username,
                        firstName: existingUser.firstName || profile.firstName || undefined,
                        lastName: existingUser.lastName || profile.lastName || undefined,
                        avatar: existingUser.avatar || profile.picture || undefined,
                        isNewUser: false
                    },
                    token,
                    refreshToken
                };
            }
            // Create new user account
            const username = await this.generateUniqueUsername(profile.email, profile.name);
            const newUser = await prisma_1.prisma.user.create({
                data: {
                    email: profile.email,
                    username,
                    password: null, // No password for OAuth-only accounts
                    firstName: profile.firstName || null,
                    lastName: profile.lastName || null,
                    avatar: profile.picture || null,
                    emailVerified: true, // OAuth emails are pre-verified
                    verificationStatus: 'NOT_REQUIRED',
                    onboardingCompleted: false
                }
            });
            // Create OAuth provider record
            await prisma_1.prisma.userOAuthProvider.create({
                data: {
                    userId: newUser.id,
                    provider: profile.provider,
                    providerId: profile.id,
                    email: profile.email,
                    name: profile.name,
                    picture: profile.picture,
                    accessToken: profile.accessToken ? this.encryptToken(profile.accessToken) : undefined,
                    refreshToken: profile.refreshToken ? this.encryptToken(profile.refreshToken) : undefined,
                    expiresAt: profile.expiresAt
                }
            });
            const token = (0, auth_1.generateToken)(newUser.id);
            // Generate and store refresh token (30 days for OAuth logins)
            const refreshToken = (0, auth_1.generateRefreshToken)();
            await sessionManager_1.sessionManager.storeRefreshToken(newUser.id, refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            undefined, // deviceInfo not available in OAuth flow
            false // rememberMe defaults to false
            );
            return {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    username: newUser.username,
                    firstName: newUser.firstName || undefined,
                    lastName: newUser.lastName || undefined,
                    avatar: newUser.avatar || undefined,
                    isNewUser: true
                },
                token,
                refreshToken
            };
        }
        catch (error) {
            console.error('OAuth login error:', error);
            throw new Error('OAuth authentication failed');
        }
    }
    /**
     * Link OAuth provider to existing user account
     */
    static async linkOAuthProvider(userId, profile) {
        try {
            // Check if this OAuth provider is already linked to another account
            const existingProvider = await prisma_1.prisma.userOAuthProvider.findUnique({
                where: {
                    provider_providerId: {
                        provider: profile.provider,
                        providerId: profile.id
                    }
                }
            });
            if (existingProvider && existingProvider.userId !== userId) {
                throw new Error('This OAuth account is already linked to another user');
            }
            // Check if user already has this provider linked
            const userProvider = await prisma_1.prisma.userOAuthProvider.findUnique({
                where: {
                    userId_provider: {
                        userId,
                        provider: profile.provider
                    }
                }
            });
            if (userProvider) {
                // Update existing provider
                await prisma_1.prisma.userOAuthProvider.update({
                    where: { id: userProvider.id },
                    data: {
                        providerId: profile.id,
                        email: profile.email,
                        name: profile.name,
                        picture: profile.picture,
                        accessToken: profile.accessToken ? this.encryptToken(profile.accessToken) : undefined,
                        refreshToken: profile.refreshToken ? this.encryptToken(profile.refreshToken) : undefined,
                        expiresAt: profile.expiresAt
                    }
                });
            }
            else {
                // Create new provider link
                await prisma_1.prisma.userOAuthProvider.create({
                    data: {
                        userId,
                        provider: profile.provider,
                        providerId: profile.id,
                        email: profile.email,
                        name: profile.name,
                        picture: profile.picture,
                        accessToken: profile.accessToken ? this.encryptToken(profile.accessToken) : undefined,
                        refreshToken: profile.refreshToken ? this.encryptToken(profile.refreshToken) : undefined,
                        expiresAt: profile.expiresAt
                    }
                });
            }
        }
        catch (error) {
            console.error('Link OAuth provider error:', error);
            throw error;
        }
    }
    /**
     * Unlink OAuth provider from user account
     */
    static async unlinkOAuthProvider(userId, provider) {
        try {
            // Check if user has a password or other OAuth providers
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                include: { oauthProviders: true }
            });
            if (!user) {
                throw new Error('User not found');
            }
            const otherProviders = user.oauthProviders.filter(p => p.provider !== provider);
            if (!user.password && otherProviders.length === 1) {
                throw new Error('Cannot unlink the last authentication method. Please set a password first.');
            }
            await prisma_1.prisma.userOAuthProvider.deleteMany({
                where: {
                    userId,
                    provider
                }
            });
        }
        catch (error) {
            console.error('Unlink OAuth provider error:', error);
            throw error;
        }
    }
    /**
     * Get user's linked OAuth providers
     */
    static async getUserOAuthProviders(userId) {
        try {
            const providers = await prisma_1.prisma.userOAuthProvider.findMany({
                where: { userId },
                select: {
                    provider: true,
                    email: true,
                    name: true,
                    picture: true,
                    createdAt: true
                }
            });
            return providers;
        }
        catch (error) {
            console.error('Get OAuth providers error:', error);
            throw error;
        }
    }
    /**
     * Generate unique username from email and name
     */
    static async generateUniqueUsername(email, name) {
        let baseUsername;
        if (name) {
            // Use name if available, remove spaces and special characters
            baseUsername = name.toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20);
        }
        else {
            // Use email prefix
            baseUsername = email.split('@')[0]
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, 20);
        }
        // Ensure minimum length
        if (baseUsername.length < 3) {
            baseUsername = 'user' + baseUsername;
        }
        // Check if username is available
        let username = baseUsername;
        let counter = 1;
        while (true) {
            const existing = await prisma_1.prisma.user.findUnique({
                where: { username }
            });
            if (!existing) {
                return username;
            }
            username = `${baseUsername}${counter}`;
            counter++;
            // Prevent infinite loop
            if (counter > 1000) {
                username = `${baseUsername}${Date.now()}`;
                break;
            }
        }
        return username;
    }
    /**
     * Encrypt OAuth tokens for secure storage
     */
    static encryptToken(token) {
        const algorithm = 'aes-256-cbc';
        const key = process.env.OAUTH_ENCRYPTION_KEY || crypto_1.default.randomBytes(32);
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `${iv.toString('hex')}:${encrypted}`;
    }
    /**
     * Decrypt OAuth tokens for use
     */
    static decryptToken(encryptedToken) {
        const algorithm = 'aes-256-cbc';
        const key = process.env.OAUTH_ENCRYPTION_KEY || crypto_1.default.randomBytes(32);
        const [ivHex, encrypted] = encryptedToken.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.OAuthService = OAuthService;
//# sourceMappingURL=oauthService.js.map