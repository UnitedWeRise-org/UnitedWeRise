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
  try {
    // 🔍 LAYER 5 DEBUG: Authentication middleware entry
    console.log('🔍 LAYER 5 | Authentication | Starting auth check:', {
      path: req.path,
      hasCookie: !!req.cookies?.authToken,
      hasAuthHeader: !!req.header('Authorization')
    });

    // Get token from cookie first, fallback to header for transition period
    let token = req.cookies?.authToken;
    
    // Fallback for migration period
    if (!token) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }
    
    
    if (!token) {
      metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'no_token' });
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      metricsService.incrementCounter('auth_middleware_failures_total', { reason: 'invalid_token' });
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // SECURITY FIX: Check if token is blacklisted using secure hash
    // Use SHA-256 hash of full token to prevent collisions and improve security
    const tokenId = crypto.createHash('sha256').update(token).digest('hex');
    if (await sessionManager.isTokenBlacklisted(tokenId)) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, isSuperAdmin: true, lastSeenAt: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Add TOTP verification status from JWT to user object
    req.user = {
      ...user,
      totpVerified: decoded.totpVerified || false,
      totpVerifiedAt: decoded.totpVerifiedAt || null
    };

    // 🔍 DIAGNOSTIC: Show admin status and TOTP verification
    console.log('🔍 DIAGNOSTIC | req.user after assignment:', {
      userId: user.id,
      username: user.username,
      isAdmin: req.user.isAdmin,
      isModerator: req.user.isModerator,
      isSuperAdmin: req.user.isSuperAdmin,
      totpVerified: req.user.totpVerified,
      rawDatabaseUser: {
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
        isSuperAdmin: user.isSuperAdmin
      }
    });

    // 🔍 LAYER 5 DEBUG: Authentication successful
    console.log('🔍 LAYER 5 | Authentication | User authenticated:', {
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

    // 🔍 DIAGNOSTIC: Show admin access check
    if (requiresAdminAccess) {
      console.log('🔍 DIAGNOSTIC | Admin access check:', {
        path: req.path,
        requiresAdminAccess,
        'req.user?.isAdmin': req.user?.isAdmin,
        'user.isAdmin': user.isAdmin,
        willReturn403: !req.user?.isAdmin
      });
    }

    if (requiresAdminAccess && !req.user?.isAdmin) {
      console.error('❌ 403 FORBIDDEN | Admin access denied:', {
        path: req.path,
        userId: req.user?.id,
        username: req.user?.username,
        isAdmin: req.user?.isAdmin,
        rawUserIsAdmin: user.isAdmin
      });
      return res.status(403).json({
        error: 'Admin access required for this endpoint.',
        requiredRole: 'admin'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  // Check TOTP verification for admin users
  // Admin users must have TOTP verified in their JWT token
  if (!req.user?.totpVerified) {
    return res.status(403).json({
      error: 'TOTP_REQUIRED',
      message: 'Two-factor authentication required for admin access. Please log in with TOTP.'
    });
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
        error: 'This is a staging environment - admin access required.',
        environment: 'staging'
      });
    }

    next();
  });
};