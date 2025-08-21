import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from './auth';
import * as speakeasy from 'speakeasy';

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

    // Check if admin has TOTP enabled and get their secret
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        totpEnabled: true,
        totpSecret: true 
      }
    });

    if (!userData?.totpEnabled || !userData?.totpSecret) {
      return res.status(403).json({ 
        error: 'TOTP_REQUIRED',
        message: 'Two-factor authentication is required for admin access. Please enable TOTP in your settings.' 
      });
    }

    // Check if TOTP verification is present in headers
    const totpVerified = req.headers['x-totp-verified'] === 'true';
    const totpToken = req.headers['x-totp-token'] as string;

    if (!totpVerified || !totpToken) {
      return res.status(403).json({ 
        error: 'TOTP_VERIFICATION_REQUIRED',
        message: 'Please verify your TOTP token to access admin features.' 
      });
    }

    // Verify the temporary verification token
    // This uses a 5-minute window for the verification token
    const isValidToken = speakeasy.totp.verify({
      secret: userData.totpSecret!,
      encoding: 'base32',
      token: totpToken,
      step: 300, // 5 minutes - must match the generation in /api/totp/verify
      window: 1 // Allow 1 step for slight timing differences
    });

    if (!isValidToken) {
      return res.status(403).json({ 
        error: 'TOTP_VERIFICATION_EXPIRED',
        message: 'Your TOTP verification has expired. Please verify again.' 
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