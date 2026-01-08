import { prisma } from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import crypto from 'crypto';
import { sessionManager } from '../services/sessionManager';
import { metricsService } from '../services/metricsService';
import { isDevelopment, enableRequestLogging } from '../utils/environment';
import { COOKIE_NAMES } from '../utils/cookies';
import { logger } from '../services/logger';

// Using singleton prisma from lib/prisma.ts

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    isModerator?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    totpVerified?: boolean;
    totpVerifiedAt?: number | null;
  };
  sensitiveAction?: {
    description: string;
    totpVerifiedAt: Date;
    adminUsername: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Generate unique request ID for tracing
  const requestId = crypto.randomBytes(4).toString('hex');

  try {
    if (enableRequestLogging()) {
      logger.info({
        requestId,
        path: req.path,
        method: req.method,
        hasCookie: !!req.cookies?.[COOKIE_NAMES.AUTH_TOKEN],
        hasAuthHeader: !!req.header('Authorization')
      }, 'AUTH Middleware Entry');
    }

    // Get token from cookie first, fallback to header for transition period
    let token = req.cookies?.[COOKIE_NAMES.AUTH_TOKEN];

    // Fallback for migration period
    if (!token) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }


    if (!token) {
      // Keep error logs unconditional (401 response)
      logger.info({
        requestId,
        path: req.path,
        method: req.method,
        reason: 'no_token'
      }, 'AUTH 401: No token provided');
      metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'no_token' });
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    if (enableRequestLogging()) {
      logger.info({ requestId }, 'AUTH Token Verification: Verifying JWT token');
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      // Keep error logs unconditional (401 response)
      logger.info({
        requestId,
        reason: 'invalid_token'
      }, 'AUTH 401: Token verification failed');
      metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'invalid_token' });
      return res.status(401).json({ error: 'Invalid token.', code: 'ACCESS_TOKEN_EXPIRED' });
    }

    if (enableRequestLogging()) {
      logger.info({
        requestId,
        userId: decoded.userId,
        totpVerified: decoded.totpVerified || false
      }, 'AUTH Token Decoded');
    }

    // SECURITY FIX: Check if token is blacklisted using secure hash
    // Use SHA-256 hash of full token to prevent collisions and improve security
    const tokenId = crypto.createHash('sha256').update(token).digest('hex');
    if (await sessionManager.isTokenBlacklisted(tokenId)) {
      // SECURITY EVENT: Always log blacklisted tokens
      logger.warn({
        requestId,
        userId: decoded.userId,
        event: 'token_blacklisted'
      }, 'AUTH 401: Token blacklisted');
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    if (enableRequestLogging()) {
      logger.info({ requestId }, 'AUTH Database Lookup: Querying user from database');
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
    });

    if (!user) {
      // Keep error logs unconditional (401 response)
      logger.info({
        requestId,
        userId: decoded.userId,
        reason: 'user_not_found'
      }, 'AUTH 401: User not found in database');
      return res.status(401).json({ error: 'User not found.' });
    }

    if (enableRequestLogging()) {
      logger.info({
        requestId,
        userId: user.id,
        username: user.username,
        dbIsAdmin: user.isAdmin,
        dbIsModerator: user.isModerator,
        dbIsSuperAdmin: user.isSuperAdmin
      }, 'AUTH User Found');
    }

    // Add TOTP verification status from JWT to user object
    req.user = {
      ...user,
      totpVerified: decoded.totpVerified || false,
      totpVerifiedAt: decoded.totpVerifiedAt || null
    };

    if (enableRequestLogging()) {
      logger.info({
        requestId,
        userId: user.id,
        username: user.username,
        reqUserIsAdmin: req.user.isAdmin,
        reqUserIsModerator: req.user.isModerator,
        reqUserIsSuperAdmin: req.user.isSuperAdmin,
        reqUserTotpVerified: req.user.totpVerified,
        rawDatabaseUser: {
          isAdmin: user.isAdmin,
          isModerator: user.isModerator,
          isSuperAdmin: user.isSuperAdmin
        }
      }, 'AUTH req.user Assigned');

      logger.info({
        requestId,
        userId: user.id,
        username: user.username
      }, 'AUTH Basic Auth Successful');
    }

    // Record successful authentication
    metricsService.incrementCounter('auth_middleware_success_total', {
      method: req.cookies?.[COOKIE_NAMES.AUTH_TOKEN] ? 'cookie' : 'header'
    });
    
    // Update user's lastSeenAt, but only if it's been more than 5 minutes since last update to avoid database spam
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Only update if user hasn't been seen recently (batch updates to reduce DB load)
    if (!user.lastSeenAt || user.lastSeenAt < fiveMinutesAgo) {
      // CRITICAL FIX: Properly await and handle database operation to prevent uncaught promise rejections
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSeenAt: now }
        });
      } catch (error) {
        // Log but don't fail the request if lastSeenAt update fails
        logger.error({ error, userId: user.id }, 'Failed to update lastSeenAt');
      }
    }
    
    // Update session activity if available
    const sessionId = req.header('X-Session-ID');
    if (sessionId) {
      try {
        await sessionManager.updateSessionActivity(sessionId);
      } catch (error) {
        // Log but don't fail the request if session update fails
        logger.error({ error, sessionId, userId: user.id }, 'Failed to update session activity');
      }
    }

    // NOTE: Admin route authorization removed from requireAuth (H2 security fix)
    // Admin routes must explicitly use requireAdmin middleware instead of relying
    // on implicit path-based detection. This prevents authorization bypass via
    // path manipulation and ensures explicit, auditable access control.
    // All admin routes in admin.ts, moderation.ts, motd.ts, appeals.ts, etc.
    // already use requireAdmin middleware explicitly.

    if (enableRequestLogging()) {
      logger.info({
        requestId,
        path: req.path,
        userId: user.id,
        username: user.username,
        isAdmin: req.user.isAdmin
      }, 'AUTH Middleware Complete: Passing to next()');
    }

    next();
  } catch (error) {
    logger.error({ error, requestId }, 'AUTH Error in middleware');
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Generate unique request ID for tracing
  const requestId = crypto.randomBytes(4).toString('hex');

  if (enableRequestLogging()) {
    logger.info({
      requestId,
      path: req.path,
      method: req.method,
      hasUser: !!req.user,
      reqUserIsAdmin: req.user?.isAdmin,
      reqUserTotpVerified: req.user?.totpVerified
    }, 'requireAdmin Middleware Entry');
  }

  if (!req.user?.isAdmin) {
    // SECURITY EVENT: Always log admin access denials
    logger.error({
      requestId,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      username: req.user?.username,
      reqUserIsAdmin: req.user?.isAdmin,
      reason: 'NOT_ADMIN',
      event: 'admin_access_denied'
    }, 'AUTH 403: requireAdmin - User not admin');
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check TOTP verification for admin users
  // Admin users must have TOTP verified in their JWT token
  if (!req.user?.totpVerified) {
    // SECURITY EVENT: Always log TOTP verification failures for admin access
    logger.error({
      requestId,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      username: req.user?.username,
      reqUserTotpVerified: req.user?.totpVerified,
      reqUserTotpVerifiedAt: req.user?.totpVerifiedAt,
      reason: 'TOTP_NOT_VERIFIED',
      event: 'totp_required'
    }, 'AUTH 403: requireAdmin - TOTP not verified');
    return res.status(403).json({
      error: 'TOTP_REQUIRED',
      message: 'Two-factor authentication required. Please log in with TOTP.'
    });
  }

  if (enableRequestLogging()) {
    logger.info({
      requestId,
      path: req.path,
      userId: req.user.id,
      username: req.user.username
    }, 'requireAdmin Passed');
  }

  next();
};

// Environment-aware authentication for staging
export const requireStagingAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // If not in development environment, proceed with normal auth
  if (!isDevelopment()) {
    return requireAuth(req, res, next);
  }

  // In development environment, require admin access for all protected routes
  await requireAuth(req, res, async (authError?: any) => {
    if (authError) {
      return next(authError);
    }

    // After successful auth, check for admin status in development
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        error: 'Access denied - staging environment'
      });
    }

    next();
  });
};