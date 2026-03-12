import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
/**
 * Verification and onboarding enforcement middleware.
 *
 * Reads emailVerified and onboardingCompleted from req.user (set by requireAuth).
 * No additional DB query — piggybacks on requireAuth's existing user fetch.
 *
 * Enforcement:
 * - Unverified email → 403 (hard block, must verify first)
 * - Verified but onboarding incomplete → 200 with X-Onboarding-Required header
 *
 * Applied as route-level middleware after requireAuth. Exempt paths are
 * skipped so users can complete the verification and onboarding flow.
 *
 * @param req - Express request with user from requireAuth middleware
 * @param res - Express response
 * @param next - Next middleware function
 */
export declare function checkVerificationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=verificationEnforcement.d.ts.map