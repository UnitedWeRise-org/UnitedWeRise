import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
/**
 * Middleware to require TOTP verification for any user who has TOTP enabled
 * Should be used after requireAuth middleware
 */
export declare const requireTOTP: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to require TOTP verification for admin access
 * Should be used after requireAuth and requireAdmin middleware
 */
export declare const requireTOTPForAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to mark TOTP as verified for the current session
 * Should be called after successful TOTP verification
 */
export declare const markTOTPVerified: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to clear TOTP verification status
 * Should be called on logout or when verification expires
 */
export declare const clearTOTPVerification: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware to require fresh TOTP verification for highly sensitive admin actions
 * Requires TOTP token in request body for each action (30-second window)
 * Should be used after requireAuth, requireAdmin, and requireTOTPForAdmin middleware
 */
export declare const requireFreshTOTP: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=totpAuth.d.ts.map