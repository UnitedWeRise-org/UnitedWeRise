import { prisma } from '../lib/prisma';
import { Request, Response, NextFunction } from 'express';
;
import type { AuthRequest } from './auth';
import * as speakeasy from 'speakeasy';

// Using singleton prisma from lib/prisma.ts

/**
 * Middleware to require TOTP verification for any user who has TOTP enabled
 * Should be used after requireAuth middleware
 */
export const requireTOTP = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has TOTP enabled
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        totpEnabled: true,
        totpSecret: true 
      }
    });

    // If TOTP is not enabled, allow access
    if (!userData?.totpEnabled || !userData?.totpSecret) {
      return next();
    }

    // TOTP is enabled - verify token
    const totpVerified = req.headers['x-totp-verified'] === 'true';
    const totpToken = req.headers['x-totp-token'] as string;

    if (!totpVerified || !totpToken) {
      return res.status(403).json({ 
        error: 'TOTP_VERIFICATION_REQUIRED',
        message: 'Please verify your TOTP token.' 
      });
    }

    // Verify the temporary verification token (24-hour window)
    const isValidToken = speakeasy.totp.verify({
      secret: userData.totpSecret!,
      encoding: 'base32',
      token: totpToken,
      step: 86400, // 24 hours
      window: 1
    });

    if (!isValidToken) {
      return res.status(403).json({ 
        error: 'TOTP_VERIFICATION_EXPIRED',
        message: 'Your TOTP verification has expired. Please verify again.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('TOTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

    // Check if TOTP verification is present in secure httpOnly cookies
    const totpVerified = req.cookies?.totpVerified === 'true';
    const totpToken = req.cookies?.totpSessionToken;

    if (!totpVerified || !totpToken) {
      return res.status(403).json({ 
        error: 'TOTP_VERIFICATION_REQUIRED',
        message: 'Please verify your TOTP token to access admin features.' 
      });
    }

    // Verify the temporary verification token
    // This uses a 24-hour window for the verification token (session-based)
    const isValidToken = speakeasy.totp.verify({
      secret: userData.totpSecret!,
      encoding: 'base32',
      token: totpToken,
      step: 86400, // 24 hours - must match the generation in /api/totp/verify
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

/**
 * Middleware to require fresh TOTP verification for highly sensitive admin actions
 * Requires TOTP token in request body for each action (30-second window)
 * Should be used after requireAuth, requireAdmin, and requireTOTPForAdmin middleware
 */
export const requireFreshTOTP = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only enforce fresh TOTP for admin users
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get the fresh TOTP token from request body
    const { totpToken, actionDescription } = req.body;

    if (!totpToken) {
      return res.status(403).json({
        error: 'FRESH_TOTP_REQUIRED',
        message: 'This sensitive action requires fresh TOTP verification. Please provide your current TOTP token.'
      });
    }

    // Get admin's TOTP secret
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        totpEnabled: true,
        totpSecret: true,
        username: true
      }
    });

    if (!userData?.totpEnabled || !userData?.totpSecret) {
      return res.status(403).json({
        error: 'TOTP_NOT_ENABLED',
        message: 'TOTP must be enabled for sensitive admin actions.'
      });
    }

    // Verify the fresh TOTP token (standard 30-second window)
    const isValidToken = speakeasy.totp.verify({
      secret: userData.totpSecret!,
      encoding: 'base32',
      token: totpToken,
      step: 30, // Standard 30-second window for fresh verification
      window: 1 // Allow 1 step (30 seconds) for timing differences
    });

    if (!isValidToken) {
      // Log failed attempt for security monitoring
      console.error(`Failed fresh TOTP attempt for admin ${userData.username} (${user.id}) from IP ${req.ip}. Action: ${actionDescription || 'unspecified'}`);

      return res.status(403).json({
        error: 'INVALID_TOTP_TOKEN',
        message: 'Invalid TOTP token provided. Please check your authenticator app and try again.'
      });
    }

    // Log successful sensitive action attempt
    console.log(`Fresh TOTP verified for admin ${userData.username} (${user.id}) from IP ${req.ip}. Action: ${actionDescription || 'unspecified'}`);

    // Store action description for audit logging in subsequent middleware
    req.sensitiveAction = {
      description: actionDescription || 'Sensitive admin action',
      totpVerifiedAt: new Date(),
      adminUsername: userData.username
    };

    next();
  } catch (error) {
    console.error('Fresh TOTP verification error:', error);
    res.status(500).json({ error: 'Internal server error during TOTP verification' });
  }
};