import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
        firstName?: string;
        lastName?: string;
        isModerator?: boolean;
        isAdmin?: boolean;
        isSuperAdmin?: boolean;
        totpVerified?: boolean;
        totpVerifiedAt?: number | null;
    };
    sensitiveAction?: {
        description: string;
        totpVerifiedAt: Date;
        adminUsername: string;
    };
}
export declare const requireAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
/**
 * Optional authentication middleware.
 * Populates req.user if a valid token is present, but does not reject
 * unauthenticated requests. Use on routes that return extra data for
 * authenticated users (e.g. relationship status) but still work publicly.
 */
export declare const optionalAuth: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireStagingAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map