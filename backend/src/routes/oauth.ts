import express from 'express';
import crypto from 'crypto';
import { OAuthService, OAuthProfile } from '../services/oauthService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiting';
import { metricsService } from '../services/metricsService';
import { requireSecureCookies } from '../utils/environment';
import { COOKIE_NAMES } from '../utils/cookies';
import { logger } from '../services/logger';
import { ErrorLoggingService } from '../services/errorLoggingService';

// OAuth error codes for client-side handling
export const OAUTH_ERROR_CODES = {
  NO_TOKEN: 'OAUTH_NO_TOKEN',
  TOKEN_INVALID: 'OAUTH_TOKEN_INVALID',
  GOOGLE_API_ERROR: 'OAUTH_GOOGLE_API_ERROR',
  GOOGLE_TIMEOUT: 'OAUTH_GOOGLE_TIMEOUT',
  AUDIENCE_MISMATCH: 'OAUTH_AUDIENCE_MISMATCH',
  USER_CREATION_FAILED: 'OAUTH_USER_CREATION_FAILED',
  PROVIDER_ALREADY_LINKED: 'OAUTH_PROVIDER_ALREADY_LINKED',
  INVALID_PROVIDER: 'OAUTH_INVALID_PROVIDER',
} as const;

const router = express.Router();

// OAuth Configuration endpoint
router.get('/config', async (req, res) => {
  try {
    res.json({
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        enabled: !!process.env.GOOGLE_CLIENT_ID
      }
    });
  } catch (error) {
    logger.error({ error }, 'OAuth config error');
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
router.post('/report-error', authLimiter, async (req, res) => {
  try {
    const { provider, stage, message, userAgent, timestamp } = req.body;

    // Log to ErrorLoggingService for admin visibility
    await ErrorLoggingService.logError({
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
    metricsService.incrementCounter('oauth_client_errors_total', {
      provider: provider || 'unknown',
      stage: stage || 'unknown'
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to log OAuth client error');
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
router.post('/google', authLimiter, async (req, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = (req as any).id || crypto.randomUUID();

  try {
    const { idToken, accessToken } = req.body;

    if (!idToken) {
      await ErrorLoggingService.logError({
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
        code: OAUTH_ERROR_CODES.NO_TOKEN
      });
    }

    // Verify Google ID token
    const verificationResult = await verifyGoogleToken(idToken);

    if (verificationResult.error) {
      await ErrorLoggingService.logError({
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
      metricsService.incrementCounter('oauth_errors_total', {
        provider: 'google',
        error_code: verificationResult.code || 'unknown'
      });
      return res.status(400).json({
        error: verificationResult.error,
        code: verificationResult.code
      });
    }

    const profile = verificationResult.profile!;

    // Add access token if provided
    if (accessToken) {
      profile.accessToken = accessToken;
    }

    const result = await OAuthService.handleOAuthLogin(profile);

    // Track metrics
    metricsService.incrementCounter('oauth_logins_total', {
      provider: 'google',
      is_new_user: result.user.isNewUser ? 'true' : 'false'
    });

    // Set authToken cookie (30 minutes)
    res.cookie(COOKIE_NAMES.AUTH_TOKEN, result.token, {
      httpOnly: true,
      secure: requireSecureCookies(),
      sameSite: 'none',
      maxAge: 30 * 60 * 1000, // 30 minutes
      path: '/',
      domain: '.unitedwerise.org'
    });

    // Set refreshToken cookie (30 days for OAuth logins)
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, {
      httpOnly: true,
      secure: requireSecureCookies(),
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
      domain: '.unitedwerise.org'
    });

    // Generate and set CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
      httpOnly: false,
      secure: requireSecureCookies(),
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
      domain: '.unitedwerise.org'
    });

    logger.info({
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

  } catch (error) {
    const errorId = await ErrorLoggingService.logError({
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

    logger.error({ error, errorId }, 'Google OAuth error');
    metricsService.incrementCounter('oauth_errors_total', {
      provider: 'google',
      error_code: 'user_creation_failed'
    });
    res.status(500).json({
      error: 'Google authentication failed',
      code: OAUTH_ERROR_CODES.USER_CREATION_FAILED,
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
router.post('/link/:provider', requireAuth, authLimiter, async (req: AuthRequest, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = (req as any).id || crypto.randomUUID();

  try {
    const { provider } = req.params;
    const { idToken, accessToken } = req.body;

    if (!['google'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid OAuth provider',
        code: OAUTH_ERROR_CODES.INVALID_PROVIDER
      });
    }

    if (!idToken && !accessToken) {
      return res.status(400).json({
        error: 'Token is required',
        code: OAUTH_ERROR_CODES.NO_TOKEN
      });
    }

    let verificationResult: TokenVerificationResult | null = null;

    // Verify token based on provider
    switch (provider) {
      case 'google':
        verificationResult = await verifyGoogleToken(idToken);
        break;
    }

    if (!verificationResult || verificationResult.error) {
      await ErrorLoggingService.logError({
        service: 'oauth',
        operation: 'link_provider',
        error: new Error(verificationResult?.error || 'Token verification failed'),
        userId: req.user!.id,
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
        code: verificationResult?.code || OAUTH_ERROR_CODES.TOKEN_INVALID
      });
    }

    await OAuthService.linkOAuthProvider(req.user!.id, verificationResult.profile!);

    logger.info({ userId: req.user!.id, provider }, 'OAuth provider linked successfully');
    res.json({ message: `${provider} account linked successfully` });

  } catch (error: any) {
    const errorId = await ErrorLoggingService.logError({
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

    logger.error({ error, errorId, userId: req.user?.id, provider: req.params.provider }, 'Link OAuth provider error');

    if (error.message?.includes('already linked')) {
      return res.status(400).json({
        error: error.message,
        code: OAUTH_ERROR_CODES.PROVIDER_ALREADY_LINKED
      });
    }
    res.status(500).json({
      error: 'Failed to link OAuth provider',
      code: OAUTH_ERROR_CODES.USER_CREATION_FAILED,
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
router.delete('/unlink/:provider', requireAuth, authLimiter, async (req: AuthRequest, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const requestId = (req as any).id || crypto.randomUUID();

  try {
    const { provider } = req.params;

    if (!['google'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid OAuth provider',
        code: OAUTH_ERROR_CODES.INVALID_PROVIDER
      });
    }

    await OAuthService.unlinkOAuthProvider(req.user!.id, provider.toUpperCase() as any);

    logger.info({ userId: req.user!.id, provider }, 'OAuth provider unlinked successfully');
    res.json({ message: `${provider} account unlinked successfully` });

  } catch (error: any) {
    const errorId = await ErrorLoggingService.logError({
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

    logger.error({ error, errorId, userId: req.user?.id, provider: req.params.provider }, 'Unlink OAuth provider error');

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
router.get('/linked', requireAuth, async (req: AuthRequest, res) => {
  try {
    const providers = await OAuthService.getUserOAuthProviders(req.user!.id);

    res.json({ providers });

  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Get linked providers error');
    res.status(500).json({ error: 'Failed to get linked providers' });
  }
});

// OAuth token verification functions

interface TokenVerificationResult {
  profile?: OAuthProfile;
  error?: string;
  code?: string;
}

const GOOGLE_TOKEN_VERIFICATION_TIMEOUT_MS = 10000; // 10 seconds

async function verifyGoogleToken(idToken: string): Promise<TokenVerificationResult> {
  // Validate GOOGLE_CLIENT_ID is configured
  if (!process.env.GOOGLE_CLIENT_ID) {
    logger.error('GOOGLE_CLIENT_ID environment variable is not set');
    return {
      error: 'OAuth configuration error',
      code: OAUTH_ERROR_CODES.GOOGLE_API_ERROR
    };
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GOOGLE_TOKEN_VERIFICATION_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
        signal: controller.signal
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        logger.warn('Google token verification timed out');
        return {
          error: 'Google verification timed out. Please try again.',
          code: OAUTH_ERROR_CODES.GOOGLE_TIMEOUT
        };
      }
      throw fetchError;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      logger.warn({ status: response.status, errorBody }, 'Google tokeninfo API returned error');
      return {
        error: 'Invalid Google ID token',
        code: OAUTH_ERROR_CODES.TOKEN_INVALID
      };
    }

    const payload = await response.json() as any;

    // Verify the token is for our app
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      logger.warn({
        receivedAudPrefix: typeof payload.aud === 'string' ? payload.aud.substring(0, 8) + '...' : '[invalid]',
        expectedAudPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 8) + '...'
      }, 'Google token audience mismatch');
      return {
        error: 'Invalid Google ID token',
        code: OAUTH_ERROR_CODES.AUDIENCE_MISMATCH
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
  } catch (error) {
    logger.error({ error }, 'Google token verification error');
    return {
      error: 'Failed to verify Google token',
      code: OAUTH_ERROR_CODES.GOOGLE_API_ERROR
    };
  }
}

export default router;