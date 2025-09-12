import { prisma } from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
;
import { sessionManager } from '../services/sessionManager';
import { metricsService } from '../services/metricsService';

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
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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

    // Check if token is blacklisted
    const tokenId = `${decoded.userId}_${token.slice(-10)}`; // Use last 10 chars as token ID
    if (await sessionManager.isTokenBlacklisted(tokenId)) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true, lastSeenAt: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    
    // Record successful authentication
    metricsService.incrementCounter('auth_middleware_success_total', { 
      method: req.cookies?.authToken ? 'cookie' : 'header' 
    });
    
    // Update user's lastSeenAt, but only if it's been more than 5 minutes since last update to avoid database spam
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Only update if user hasn't been seen recently (batch updates to reduce DB load)
    if (!user.lastSeenAt || user.lastSeenAt < fiveMinutesAgo) {
      // Use upsert to handle race conditions gracefully
      prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: now }
      }).catch(error => {
        // Log but don't fail the request if lastSeenAt update fails
        console.error('Failed to update lastSeenAt:', error);
      });
    }
    
    // Update session activity if available
    const sessionId = req.header('X-Session-ID');
    if (sessionId) {
      await sessionManager.updateSessionActivity(sessionId);
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
  next();
};