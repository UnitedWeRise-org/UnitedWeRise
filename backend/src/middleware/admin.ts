import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { securityLogger } from '../services/logger';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    // Log role requirement for debugging, but don't expose to client
    securityLogger.warn({ userId: req.user?.id || 'unknown', requiredRole: 'admin' }, 'Admin access denied');
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  next();
};

export const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isModerator && !req.user?.isAdmin) {
    // Log role requirement for debugging, but don't expose to client
    securityLogger.warn({ userId: req.user?.id || 'unknown', requiredRole: 'moderator' }, 'Moderator access denied');
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  next();
};

export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    // Log role requirement for debugging, but don't expose to client
    securityLogger.warn({ userId: req.user?.id || 'unknown', requiredRole: 'superAdmin' }, 'Super admin access denied');
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }
  next();
};