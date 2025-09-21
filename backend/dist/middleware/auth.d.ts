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
    };
    sensitiveAction?: {
        description: string;
        totpVerifiedAt: Date;
        adminUsername: string;
    };
}
export declare const requireAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireStagingAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map