import { prisma } from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import crypto from 'crypto';
import { sessionManager } from '../services/sessionManager';
import { metricsService } from '../services/metricsService';
import { isDevelopment } from '../utils/environment';

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
    // 🔍 LAYER 5 DEBUG: Authentication middleware entry
    console.log(`[${requestId}] 🔍 AUTH Middleware Entry:`, {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      hasCookie: !!req.cookies?.authToken,
      hasAuthHeader: !!req.header('Authorization'),
      cookieValue: req.cookies?.authToken ? `${req.cookies.authToken.substring(0, 10)}...` : 'NONE'
    });

    // Get token from cookie first, fallback to header for transition period
    let token = req.cookies?.authToken;

    // Fallback for migration period
    if (!token) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }


    if (!token) {
      console.log(`[${requestId}] ❌ AUTH 401: No token provided`, {
        path: req.path,
        method: req.method
      });
      metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'no_token' });
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log(`[${requestId}] 🔍 AUTH Token Verification: Verifying JWT token...`);
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log(`[${requestId}] ❌ AUTH 401: Token verification failed`);
      metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'invalid_token' });
      return res.status(401).json({ error: 'Invalid token.' });
    }

    console.log(`[${requestId}] ✅ AUTH Token Decoded:`, {
      userId: decoded.userId,
      totpVerified: decoded.totpVerified || false
    });

    // SECURITY FIX: Check if token is blacklisted using secure hash
    // Use SHA-256 hash of full token to prevent collisions and improve security
    const tokenId = crypto.createHash('sha256').update(token).digest('hex');
    if (await sessionManager.isTokenBlacklisted(tokenId)) {
      console.log(`[${requestId}] ❌ AUTH 401: Token blacklisted`, {
        userId: decoded.userId
      });
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    console.log(`[${requestId}] 🔍 AUTH Database Lookup: Querying user from database...`);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
    });

    if (!user) {
      console.log(`[${requestId}] ❌ AUTH 401: User not found in database`, {
        userId: decoded.userId
      });
      return res.status(401).json({ error: 'User not found.' });
    }

    console.log(`[${requestId}] ✅ AUTH User Found:`, {
      userId: user.id,
      username: user.username,
      dbIsAdmin: user.isAdmin,
      dbIsModerator: user.isModerator,
      dbIsSuperAdmin: user.isSuperAdmin
    });

    // Add TOTP verification status from JWT to user object
    req.user = {
      ...user,
      totpVerified: decoded.totpVerified || false,
      totpVerifiedAt: decoded.totpVerifiedAt || null
    };

    // 🔍 DIAGNOSTIC: Show admin status and TOTP verification
    console.log(`[${requestId}] 🔍 AUTH req.user Assigned:`, {
      userId: user.id,
      username: user.username,
      'req.user.isAdmin': req.user.isAdmin,
      'req.user.isModerator': req.user.isModerator,
      'req.user.isSuperAdmin': req.user.isSuperAdmin,
      'req.user.totpVerified': req.user.totpVerified,
      rawDatabaseUser: {
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
        isSuperAdmin: user.isSuperAdmin
      }
    });

    // 🔍 LAYER 5 DEBUG: Authentication successful
    console.log(`[${requestId}] ✅ AUTH Basic Auth Successful:`, {
      userId: user.id,
      username: user.username
    });

    // Record successful authentication
    metricsService.incrementCounter('auth_middleware_success_total', { 
      method: req.cookies?.authToken ? 'cookie' : 'header' 
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
        console.error('Failed to update lastSeenAt:', error);
      }
    }
    
    // Update session activity if available
    const sessionId = req.header('X-Session-ID');
    if (sessionId) {
      try {
        await sessionManager.updateSessionActivity(sessionId);
      } catch (error) {
        // Log but don't fail the request if session update fails
        console.error('Failed to update session activity:', error);
      }
    }

    // SECURITY FIX: Always enforce admin access for admin routes (not just in staging)
    const adminOnlyRoutes = [
      '/api/admin/', '/api/motd/admin/', '/api/moderation/',
      '/api/candidate-verification/', '/api/appeals/'
    ];

    const requiresAdminAccess = adminOnlyRoutes.some(route =>
      req.path.startsWith(route)
    );

    console.log(`[${requestId}] 🔍 AUTH Admin Route Check:`, {
      path: req.path,
      requiresAdminAccess,
      adminOnlyRoutes,
      matchedRoute: adminOnlyRoutes.find(route => req.path.startsWith(route)) || 'none'
    });

    // 🔍 DIAGNOSTIC: Show admin access check
    if (requiresAdminAccess) {
      console.log(`[${requestId}] 🔍 AUTH Admin Access Evaluation:`, {
        path: req.path,
        requiresAdminAccess,
        'req.user?.isAdmin': req.user?.isAdmin,
        'user.isAdmin': user.isAdmin,
        'req.user?.isSuperAdmin': req.user?.isSuperAdmin,
        'req.user?.totpVerified': req.user?.totpVerified,
        willReturn403: !req.user?.isAdmin
      });
    }

    if (requiresAdminAccess && !req.user?.isAdmin) {
      console.error(`[${requestId}] 🚨 AUTH 403: Admin access denied`, {
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        username: req.user?.username,
        'req.user.isAdmin': req.user?.isAdmin,
        'req.user.isSuperAdmin': req.user?.isSuperAdmin,
        'req.user.totpVerified': req.user?.totpVerified,
        rawDatabaseUser: {
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin
        },
        reason: 'USER_NOT_ADMIN'
      });
      return res.status(403).json({
        error: 'Admin access required for this endpoint.',
        requiredRole: 'admin'
      });
    }

    console.log(`[${requestId}] ✅ AUTH Middleware Complete: Passing to next()`, {
      path: req.path,
      userId: user.id,
      username: user.username,
      isAdmin: req.user.isAdmin
    });

    next();
  } catch (error) {
    console.error(`[${requestId}] ❌ AUTH Error in middleware:`, error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Generate unique request ID for tracing
  const requestId = crypto.randomBytes(4).toString('hex');

  console.log(`[${requestId}] 🔍 requireAdmin Middleware Entry:`, {
    path: req.path,
    method: req.method,
    hasUser: !!req.user,
    'req.user?.isAdmin': req.user?.isAdmin,
    'req.user?.totpVerified': req.user?.totpVerified
  });

  if (!req.user?.isAdmin) {
    console.error(`[${requestId}] 🚨 AUTH 403: requireAdmin - User not admin`, {
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      username: req.user?.username,
      'req.user.isAdmin': req.user?.isAdmin,
      reason: 'NOT_ADMIN'
    });
    return res.status(403).json({ error: 'Admin access required.' });
  }

  // Check TOTP verification for admin users
  // Admin users must have TOTP verified in their JWT token
  if (!req.user?.totpVerified) {
    console.error(`[${requestId}] 🚨 AUTH 403: requireAdmin - TOTP not verified`, {
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      username: req.user?.username,
      'req.user.totpVerified': req.user?.totpVerified,
      'req.user.totpVerifiedAt': req.user?.totpVerifiedAt,
      reason: 'TOTP_NOT_VERIFIED'
    });
    return res.status(403).json({
      error: 'TOTP_REQUIRED',
      message: 'Two-factor authentication required for admin access. Please log in with TOTP.'
    });
  }

  console.log(`[${requestId}] ✅ requireAdmin Passed:`, {
    path: req.path,
    userId: req.user.id,
    username: req.user.username
  });

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
        error: 'This is a staging environment - admin access required.',
        environment: 'staging'
      });
    }

    next();
  });
};