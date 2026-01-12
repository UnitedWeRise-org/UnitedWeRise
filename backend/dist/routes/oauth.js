"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAUTH_ERROR_CODES = void 0;
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const oauthService_1 = require("../services/oauthService");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const metricsService_1 = require("../services/metricsService");
const environment_1 = require("../utils/environment");
const cookies_1 = require("../utils/cookies");
const logger_1 = require("../services/logger");
const errorLoggingService_1 = require("../services/errorLoggingService");
// OAuth error codes for client-side handling
exports.OAUTH_ERROR_CODES = {
    NO_TOKEN: 'OAUTH_NO_TOKEN',
    TOKEN_INVALID: 'OAUTH_TOKEN_INVALID',
    GOOGLE_API_ERROR: 'OAUTH_GOOGLE_API_ERROR',
    GOOGLE_TIMEOUT: 'OAUTH_GOOGLE_TIMEOUT',
    AUDIENCE_MISMATCH: 'OAUTH_AUDIENCE_MISMATCH',
    USER_CREATION_FAILED: 'OAUTH_USER_CREATION_FAILED',
    PROVIDER_ALREADY_LINKED: 'OAUTH_PROVIDER_ALREADY_LINKED',
    INVALID_PROVIDER: 'OAUTH_INVALID_PROVIDER',
};
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
 * /api/oauth/report-error:
 *   post:
 *     tags: [OAuth]
 *     summary: Report client-side OAuth error
 *     description: Endpoint for frontend to report OAuth errors for admin visibility
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 description: OAuth provider (e.g., google)
 *               stage:
 *                 type: string
 *                 description: Error stage (e.g., sdk_load_failed, cookies_blocked)
 *               message:
 *                 type: string
 *                 description: Error message
 *               userAgent:
 *                 type: string
 *                 description: Browser user agent
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Error reported successfully
 */
router.post('/report-error', rateLimiting_1.authLimiter, async (req, res) => {
    try {
        const { provider, stage, message, userAgent, timestamp } = req.body;
        // Log to ErrorLoggingService for admin visibility
        await errorLoggingService_1.ErrorLoggingService.logError({
            service: 'oauth',
            operation: `client_error_${stage}`,
            error: new Error(message || 'Client-side OAuth error'),
            additionalContext: {
                provider: provider || 'unknown',
                stage: stage || 'unknown',
                userAgent: userAgent || req.headers['user-agent'] || 'unknown',
                clientTimestamp: timestamp,
                source: 'client'
            }
        });
        // Track in metrics
        metricsService_1.metricsService.incrementCounter('oauth_client_errors_total', {
            provider: provider || 'unknown',
            stage: stage || 'unknown'
        });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to log OAuth client error');
        // Still return success - we don't want to fail client-side telemetry
        res.json({ success: true });
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
    const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = req.id || crypto_1.default.randomUUID();
    try {
        const { idToken, accessToken } = req.body;
        if (!idToken) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'oauth',
                operation: 'google_login',
                error: new Error('No ID token provided'),
                requestId,
                additionalContext: {
                    provider: 'google',
                    flowStage: 'token_validation',
                    userAgent
                }
            });
            return res.status(400).json({
                error: 'Google ID token is required',
                code: exports.OAUTH_ERROR_CODES.NO_TOKEN
            });
        }
        // Verify Google ID token
        const verificationResult = await verifyGoogleToken(idToken);
        if (verificationResult.error) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'oauth',
                operation: 'google_login',
                error: new Error(verificationResult.error),
                requestId,
                additionalContext: {
                    provider: 'google',
                    flowStage: 'token_verification',
                    errorCode: verificationResult.code,
                    userAgent
                }
            });
            metricsService_1.metricsService.incrementCounter('oauth_errors_total', {
                provider: 'google',
                error_code: verificationResult.code || 'unknown'
            });
            return res.status(400).json({
                error: verificationResult.error,
                code: verificationResult.code
            });
        }
        const profile = verificationResult.profile;
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
        const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
        res.cookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
            httpOnly: false,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org'
        });
        logger_1.logger.info({
            userId: result.user.id,
            isNewUser: result.user.isNewUser,
            provider: 'google'
        }, 'OAuth login successful');
        res.json({
            message: result.user.isNewUser ? 'Account created successfully' : 'Login successful',
            user: result.user,
            csrfToken,
            isNewUser: result.user.isNewUser
            // Token is in httpOnly cookie only (not exposed to JavaScript)
        });
    }
    catch (error) {
        const errorId = await errorLoggingService_1.ErrorLoggingService.logError({
            service: 'oauth',
            operation: 'google_login',
            error,
            requestId,
            additionalContext: {
                provider: 'google',
                flowStage: 'user_creation',
                userAgent
            }
        });
        logger_1.logger.error({ error, errorId }, 'Google OAuth error');
        metricsService_1.metricsService.incrementCounter('oauth_errors_total', {
            provider: 'google',
            error_code: 'user_creation_failed'
        });
        res.status(500).json({
            error: 'Google authentication failed',
            code: exports.OAUTH_ERROR_CODES.USER_CREATION_FAILED,
            errorId // Include for support reference
        });
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
    const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = req.id || crypto_1.default.randomUUID();
    try {
        const { provider } = req.params;
        const { idToken, accessToken } = req.body;
        if (!['google'].includes(provider)) {
            return res.status(400).json({
                error: 'Invalid OAuth provider',
                code: exports.OAUTH_ERROR_CODES.INVALID_PROVIDER
            });
        }
        if (!idToken && !accessToken) {
            return res.status(400).json({
                error: 'Token is required',
                code: exports.OAUTH_ERROR_CODES.NO_TOKEN
            });
        }
        let verificationResult = null;
        // Verify token based on provider
        switch (provider) {
            case 'google':
                verificationResult = await verifyGoogleToken(idToken);
                break;
        }
        if (!verificationResult || verificationResult.error) {
            await errorLoggingService_1.ErrorLoggingService.logError({
                service: 'oauth',
                operation: 'link_provider',
                error: new Error(verificationResult?.error || 'Token verification failed'),
                userId: req.user.id,
                requestId,
                additionalContext: {
                    provider,
                    flowStage: 'token_verification',
                    errorCode: verificationResult?.code,
                    userAgent
                }
            });
            return res.status(400).json({
                error: verificationResult?.error || 'Invalid token',
                code: verificationResult?.code || exports.OAUTH_ERROR_CODES.TOKEN_INVALID
            });
        }
        await oauthService_1.OAuthService.linkOAuthProvider(req.user.id, verificationResult.profile);
        logger_1.logger.info({ userId: req.user.id, provider }, 'OAuth provider linked successfully');
        res.json({ message: `${provider} account linked successfully` });
    }
    catch (error) {
        const errorId = await errorLoggingService_1.ErrorLoggingService.logError({
            service: 'oauth',
            operation: 'link_provider',
            error,
            userId: req.user?.id,
            requestId,
            additionalContext: {
                provider: req.params.provider,
                flowStage: 'provider_linking',
                userAgent
            }
        });
        logger_1.logger.error({ error, errorId, userId: req.user?.id, provider: req.params.provider }, 'Link OAuth provider error');
        if (error.message?.includes('already linked')) {
            return res.status(400).json({
                error: error.message,
                code: exports.OAUTH_ERROR_CODES.PROVIDER_ALREADY_LINKED
            });
        }
        res.status(500).json({
            error: 'Failed to link OAuth provider',
            code: exports.OAUTH_ERROR_CODES.USER_CREATION_FAILED,
            errorId
        });
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
    const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = req.id || crypto_1.default.randomUUID();
    try {
        const { provider } = req.params;
        if (!['google'].includes(provider)) {
            return res.status(400).json({
                error: 'Invalid OAuth provider',
                code: exports.OAUTH_ERROR_CODES.INVALID_PROVIDER
            });
        }
        await oauthService_1.OAuthService.unlinkOAuthProvider(req.user.id, provider.toUpperCase());
        logger_1.logger.info({ userId: req.user.id, provider }, 'OAuth provider unlinked successfully');
        res.json({ message: `${provider} account unlinked successfully` });
    }
    catch (error) {
        const errorId = await errorLoggingService_1.ErrorLoggingService.logError({
            service: 'oauth',
            operation: 'unlink_provider',
            error,
            userId: req.user?.id,
            requestId,
            additionalContext: {
                provider: req.params.provider,
                userAgent
            }
        });
        logger_1.logger.error({ error, errorId, userId: req.user?.id, provider: req.params.provider }, 'Unlink OAuth provider error');
        if (error.message?.includes('last authentication method')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({
            error: 'Failed to unlink OAuth provider',
            errorId
        });
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
const GOOGLE_TOKEN_VERIFICATION_TIMEOUT_MS = 10000; // 10 seconds
async function verifyGoogleToken(idToken) {
    // Validate GOOGLE_CLIENT_ID is configured
    if (!process.env.GOOGLE_CLIENT_ID) {
        logger_1.logger.error('GOOGLE_CLIENT_ID environment variable is not set');
        return {
            error: 'OAuth configuration error',
            code: exports.OAUTH_ERROR_CODES.GOOGLE_API_ERROR
        };
    }
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GOOGLE_TOKEN_VERIFICATION_TIMEOUT_MS);
        let response;
        try {
            response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
                signal: controller.signal
            });
        }
        catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                logger_1.logger.warn('Google token verification timed out');
                return {
                    error: 'Google verification timed out. Please try again.',
                    code: exports.OAUTH_ERROR_CODES.GOOGLE_TIMEOUT
                };
            }
            throw fetchError;
        }
        clearTimeout(timeoutId);
        if (!response.ok) {
            const errorBody = await response.text().catch(() => 'Unknown error');
            logger_1.logger.warn({ status: response.status, errorBody }, 'Google tokeninfo API returned error');
            return {
                error: 'Invalid Google ID token',
                code: exports.OAUTH_ERROR_CODES.TOKEN_INVALID
            };
        }
        const payload = await response.json();
        // Verify the token is for our app
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            logger_1.logger.warn({
                receivedAudPrefix: typeof payload.aud === 'string' ? payload.aud.substring(0, 8) + '...' : '[invalid]',
                expectedAudPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 8) + '...'
            }, 'Google token audience mismatch');
            return {
                error: 'Invalid Google ID token',
                code: exports.OAUTH_ERROR_CODES.AUDIENCE_MISMATCH
            };
        }
        const nameParts = (payload.name || '').split(' ');
        return {
            profile: {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                firstName: nameParts[0] || undefined,
                lastName: nameParts.slice(1).join(' ') || undefined,
                picture: payload.picture,
                provider: 'GOOGLE'
            }
        };
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Google token verification error');
        return {
            error: 'Failed to verify Google token',
            code: exports.OAUTH_ERROR_CODES.GOOGLE_API_ERROR
        };
    }
}
exports.default = router;
//# sourceMappingURL=oauth.js.map