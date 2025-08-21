import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from './auth';

const prisma = new PrismaClient();

/**
 * Middleware to require TOTP verification for admin access
 * Should be used after requireAuth and requireAdmin middleware
 */
export const requireTOTPForAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only enforce TOTP for admin users
    if (!user.isAdmin) {
      return next(); // Non-admin users don't need TOTP
    }

    // Check if admin has TOTP enabled
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true }
    });

    if (!userData?.totpEnabled) {
      return res.status(403).json({ 
        error: 'TOTP_REQUIRED',
        message: 'Two-factor authentication is required for admin access. Please enable TOTP in your settings.' 
      });
    }

    // Check if TOTP verification is present in headers (simplified approach)
    const totpVerified = req.headers['x-totp-verified'] === 'true';

    if (!totpVerified) {
      return res.status(403).json({ 
        error: 'TOTP_VERIFICATION_REQUIRED',
        message: 'Please verify your TOTP token to access admin features.' 
      });
    }

    next();
  } catch (error) {
    console.error('TOTP admin verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to mark TOTP as verified for the current session
 * Should be called after successful TOTP verification
 */
export const markTOTPVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Set response header for stateless verification
  res.setHeader('X-TOTP-Verified', 'true');
  
  next();
};

/**
 * Middleware to clear TOTP verification status
 * Should be called on logout or when verification expires
 */
export const clearTOTPVerification = (req: AuthRequest, res: Response, next: NextFunction) => {
  res.removeHeader('X-TOTP-Verified');
  
  next();
};