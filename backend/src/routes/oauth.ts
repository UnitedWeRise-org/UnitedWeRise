import express from 'express';
import { OAuthService, OAuthProfile } from '../services/oauthService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiting';
import { metricsService } from '../services/metricsService';

const router = express.Router();

/**
 * @swagger
 * /api/oauth/google:
 *   post:
 *     tags: [OAuth]
 *     summary: Authenticate with Google OAuth
 *     description: Sign in or register using Google OAuth credentials
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
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                 isNewUser:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/google', authLimiter, async (req, res) => {
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

    const result = await OAuthService.handleOAuthLogin(profile);

    // Track metrics
    metricsService.incrementCounter('oauth_logins_total', { 
      provider: 'google',
      is_new_user: result.user.isNewUser ? 'true' : 'false'
    });

    res.json({
      message: result.user.isNewUser ? 'Account created successfully' : 'Login successful',
      user: result.user,
      token: result.token,
      isNewUser: result.user.isNewUser
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    metricsService.incrementCounter('oauth_errors_total', { provider: 'google' });
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

/**
 * @swagger
 * /api/oauth/microsoft:
 *   post:
 *     tags: [OAuth]
 *     summary: Authenticate with Microsoft OAuth
 *     description: Sign in or register using Microsoft OAuth credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Microsoft access token from OAuth flow
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                 isNewUser:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/microsoft', authLimiter, async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Microsoft access token is required' });
    }

    // Verify Microsoft access token and get user profile
    const profile = await verifyMicrosoftToken(accessToken);
    if (!profile) {
      return res.status(400).json({ error: 'Invalid Microsoft access token' });
    }

    const result = await OAuthService.handleOAuthLogin(profile);

    // Track metrics
    metricsService.incrementCounter('oauth_logins_total', { 
      provider: 'microsoft',
      is_new_user: result.user.isNewUser ? 'true' : 'false'
    });

    res.json({
      message: result.user.isNewUser ? 'Account created successfully' : 'Login successful',
      user: result.user,
      token: result.token,
      isNewUser: result.user.isNewUser
    });

  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    metricsService.incrementCounter('oauth_errors_total', { provider: 'microsoft' });
    res.status(500).json({ error: 'Microsoft authentication failed' });
  }
});

/**
 * @swagger
 * /api/oauth/apple:
 *   post:
 *     tags: [OAuth]
 *     summary: Authenticate with Apple OAuth
 *     description: Sign in or register using Apple OAuth credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identityToken
 *             properties:
 *               identityToken:
 *                 type: string
 *                 description: Apple identity token from Sign in with Apple
 *               user:
 *                 type: object
 *                 description: User object from Apple (only provided on first sign in)
 *                 properties:
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                   email:
 *                     type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 */
router.post('/apple', authLimiter, async (req, res) => {
  try {
    const { identityToken, user: appleUser } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'Apple identity token is required' });
    }

    // Verify Apple identity token
    const profile = await verifyAppleToken(identityToken, appleUser);
    if (!profile) {
      return res.status(400).json({ error: 'Invalid Apple identity token' });
    }

    const result = await OAuthService.handleOAuthLogin(profile);

    // Track metrics
    metricsService.incrementCounter('oauth_logins_total', { 
      provider: 'apple',
      is_new_user: result.user.isNewUser ? 'true' : 'false'
    });

    res.json({
      message: result.user.isNewUser ? 'Account created successfully' : 'Login successful',
      user: result.user,
      token: result.token,
      isNewUser: result.user.isNewUser
    });

  } catch (error) {
    console.error('Apple OAuth error:', error);
    metricsService.incrementCounter('oauth_errors_total', { provider: 'apple' });
    res.status(500).json({ error: 'Apple authentication failed' });
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
 *           enum: [google, microsoft, apple]
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
  try {
    const { provider } = req.params;
    const { idToken, accessToken } = req.body;

    if (!['google', 'microsoft', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider' });
    }

    if (!idToken && !accessToken) {
      return res.status(400).json({ error: 'Token is required' });
    }

    let profile: OAuthProfile | null = null;

    // Verify token based on provider
    switch (provider) {
      case 'google':
        profile = await verifyGoogleToken(idToken);
        break;
      case 'microsoft':
        profile = await verifyMicrosoftToken(accessToken);
        break;
      case 'apple':
        profile = await verifyAppleToken(idToken);
        break;
    }

    if (!profile) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    await OAuthService.linkOAuthProvider(req.user!.id, profile);

    res.json({ message: `${provider} account linked successfully` });

  } catch (error) {
    console.error('Link OAuth provider error:', error);
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
 *           enum: [google, microsoft, apple]
 *     responses:
 *       200:
 *         description: Provider unlinked successfully
 *       400:
 *         description: Cannot unlink last authentication method
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.delete('/unlink/:provider', requireAuth, authLimiter, async (req: AuthRequest, res) => {
  try {
    const { provider } = req.params;

    if (!['google', 'microsoft', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid OAuth provider' });
    }

    await OAuthService.unlinkOAuthProvider(req.user!.id, provider.toUpperCase() as any);

    res.json({ message: `${provider} account unlinked successfully` });

  } catch (error) {
    console.error('Unlink OAuth provider error:', error);
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
router.get('/linked', requireAuth, async (req: AuthRequest, res) => {
  try {
    const providers = await OAuthService.getUserOAuthProviders(req.user!.id);

    res.json({ providers });

  } catch (error) {
    console.error('Get linked providers error:', error);
    res.status(500).json({ error: 'Failed to get linked providers' });
  }
});

// OAuth token verification functions

async function verifyGoogleToken(idToken: string): Promise<OAuthProfile | null> {
  try {
    // In production, you would verify the Google ID token with Google's API
    // For now, we'll implement a basic JWT decode for development
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as any;

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
  } catch (error) {
    console.error('Google token verification error:', error);
    return null;
  }
}

async function verifyMicrosoftToken(accessToken: string): Promise<OAuthProfile | null> {
  try {
    // Get user profile from Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const profile = await response.json() as any;

    return {
      id: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      firstName: profile.givenName,
      lastName: profile.surname,
      provider: 'MICROSOFT',
      accessToken
    };
  } catch (error) {
    console.error('Microsoft token verification error:', error);
    return null;
  }
}

async function verifyAppleToken(identityToken: string, appleUser?: any): Promise<OAuthProfile | null> {
  try {
    // For Apple Sign In, you need to verify the JWT token with Apple's public keys
    // This is a simplified implementation - in production you'd use the jose library
    // to properly verify the JWT signature
    
    const tokenParts = identityToken.split('.');
    if (tokenParts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());

    // Basic validation
    if (!payload.sub || !payload.email) {
      return null;
    }

    // Verify the token is for our app
    if (payload.aud !== process.env.APPLE_CLIENT_ID) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: appleUser?.name ? `${appleUser.name.firstName} ${appleUser.name.lastName}` : undefined,
      firstName: appleUser?.name?.firstName,
      lastName: appleUser?.name?.lastName,
      provider: 'APPLE'
    };
  } catch (error) {
    console.error('Apple token verification error:', error);
    return null;
  }
}

export default router;