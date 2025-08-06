import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { PrismaClient } from '@prisma/client';
import { sessionManager } from '../services/sessionManager';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isModerator?: boolean;
    isAdmin?: boolean;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Check if token is blacklisted
    const tokenId = `${decoded.userId}_${token.slice(-10)}`; // Use last 10 chars as token ID
    if (await sessionManager.isTokenBlacklisted(tokenId)) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, isModerator: true, isAdmin: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    
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