import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
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
//# sourceMappingURL=totpAuth.d.ts.map