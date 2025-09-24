import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

export const requireModerator = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isModerator && !req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Moderator access required'
    });
  }
  next();
};

export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required'
    });
  }
  next();
};