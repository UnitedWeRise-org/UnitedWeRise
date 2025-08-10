import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const checkUserSuspension: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const moderateContent: (contentType: "POST" | "COMMENT" | "MESSAGE") => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const reportRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const logModerationAction: (action: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const contentFilter: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const addContentWarnings: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=moderation.d.ts.map