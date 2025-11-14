"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const oauthService_1 = require("../services/oauthService");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const metricsService_1 = require("../services/metricsService");
const environment_1 = require("../utils/environment");
const cookies_1 = require("../utils/cookies");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
// OAuth Configuration endpoint
router.get('/config', async (req, res) => {
    try {
        res.json({
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
                enabled: !!process.env.GOOGLE_CLIENT_ID
            }
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'OAuth config error');
        res.status(500).json({ error: 'Failed to get OAuth configuration' });
    }
});
/**
 * @swagger
 * /api/oauth/google:
 *   post:
 *     tags: [OAuth]
 *     summary: Authenticate with Google OAuth
 *     description: |
 *       Sign in or register using Google OAuth credentials. Issues both access token (30min)
 *       and refresh token (30 days) as httpOnly cookies. Returns CSRF token for subsequent requests.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID token from client-side OAuth flow
 *               accessToken:
 *                 type: string
 *                 description: Google access token (optional)
 *     responses:
 *       200:
 *         description: Authentication successful - tokens sent as httpOnly cookies
 *         headers:
 *           Set-Cookie:
 *             description: |
 *               Sets three cookies:
 *               - authToken (httpOnly, 30min, access token)
 *               - refreshToken (httpOnly, 30 days)
 *               - csrf-token (readable by JS, 30 days)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 csrfToken:
 *                   type: string
 *                   description: CSRF token for subsequent authenticated requests
 *                 isNewUser:
 *                   type: boolean
 *                   description: True if account was just created, false if existing user
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/google', rateLimiting_1.authLimiter, async (req, res) => {
    try {
        const { idToken, accessToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: 'Google ID token is required' });
        }
        // Verify Google ID token
        const profile = await verifyGoogleToken(idToken);
        if (!profile) {
            return res.status(400).json({ error: 'Invalid Google ID token' });
        }
        // Add access token if provided
        if (accessToken) {
            profile.accessToken = accessToken;
        }
        const result = await oauthService_1.OAuthService.handleOAuthLogin(profile);
        // Track metrics
        metricsService_1.metricsService.incrementCounter('oauth_logins_total', {
            provider: 'google',
            is_new_user: result.user.isNewUser ? 'true' : 'false'
        });
        // Set authToken cookie (30 minutes)
        res.cookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, result.token, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 60 * 1000, // 30 minutes
            path: '/',
            domain: '.unitedwerise.org'
        });
        // Set refreshToken cookie (30 days for OAuth logins)
        res.cookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org'
        });
        // Generate and set CSRF token
        const crypto = require('crypto');
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
            httpOnly: false,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org'
        });
        res.json({
            message: result.user.isNewUser ? 'Account created successfully' : 'Login successful',
            user: result.user,
            csrfToken,
            isNewUser: result.user.isNewUser
            // Token is in httpOnly cookie only (not exposed to JavaScript)
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Google OAuth error');
        metricsService_1.metricsService.incrementCounter('oauth_errors_total', { provider: 'google' });
        res.status(500).json({ error: 'Google authentication failed' });
    }
});
/**
 * @swagger
 * /api/oauth/link/{provider}:
 *   post:
 *     tags: [OAuth]
 *     summary: Link OAuth provider to existing account
 *     description: Link a social login provider to the current user's account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Provider ID token or access token
 *     responses:
 *       200:
 *         description: Provider linked successfully
 *       400:
 *         description: Validation error or provider already linked
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/link/:provider', auth_1.requireAuth, rateLimiting_1.authLimiter, async (req, res) => {
    try {
        const { provider } = req.params;
        const { idToken, accessToken } = req.body;
        if (!['google'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid OAuth provider' });
        }
        if (!idToken && !accessToken) {
            return res.status(400).json({ error: 'Token is required' });
        }
        let profile = null;
        // Verify token based on provider
        switch (provider) {
            case 'google':
                profile = await verifyGoogleToken(idToken);
                break;
        }
        if (!profile) {
            return res.status(400).json({ error: 'Invalid token' });
        }
        await oauthService_1.OAuthService.linkOAuthProvider(req.user.id, profile);
        res.json({ message: `${provider} account linked successfully` });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, provider: req.params.provider }, 'Link OAuth provider error');
        if (error.message.includes('already linked')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to link OAuth provider' });
    }
});
/**
 * @swagger
 * /api/oauth/unlink/{provider}:
 *   delete:
 *     tags: [OAuth]
 *     summary: Unlink OAuth provider from account
 *     description: Remove a linked social login provider from the current user's account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google]
 *     responses:
 *       200:
 *         description: Provider unlinked successfully
 *       400:
 *         description: Cannot unlink last authentication method
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete('/unlink/:provider', auth_1.requireAuth, rateLimiting_1.authLimiter, async (req, res) => {
    try {
        const { provider } = req.params;
        if (!['google'].includes(provider)) {
            return res.status(400).json({ error: 'Invalid OAuth provider' });
        }
        await oauthService_1.OAuthService.unlinkOAuthProvider(req.user.id, provider.toUpperCase());
        res.json({ message: `${provider} account unlinked successfully` });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id, provider: req.params.provider }, 'Unlink OAuth provider error');
        if (error.message.includes('last authentication method')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to unlink OAuth provider' });
    }
});
/**
 * @swagger
 * /api/oauth/linked:
 *   get:
 *     tags: [OAuth]
 *     summary: Get linked OAuth providers
 *     description: Get list of OAuth providers linked to the current user's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of linked providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       provider:
 *                         type: string
 *                       email:
 *                         type: string
 *                       name:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/linked', auth_1.requireAuth, async (req, res) => {
    try {
        const providers = await oauthService_1.OAuthService.getUserOAuthProviders(req.user.id);
        res.json({ providers });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Get linked providers error');
        res.status(500).json({ error: 'Failed to get linked providers' });
    }
});
// OAuth token verification functions
async function verifyGoogleToken(idToken) {
    try {
        // In production, you would verify the Google ID token with Google's API
        // For now, we'll implement a basic JWT decode for development
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!response.ok) {
            return null;
        }
        const payload = await response.json();
        // Verify the token is for our app
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            return null;
        }
        const nameParts = (payload.name || '').split(' ');
        return {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            firstName: nameParts[0] || undefined,
            lastName: nameParts.slice(1).join(' ') || undefined,
            picture: payload.picture,
            provider: 'GOOGLE'
        };
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Google token verification error');
        return null;
    }
}
exports.default = router;
//# sourceMappingURL=oauth.js.map