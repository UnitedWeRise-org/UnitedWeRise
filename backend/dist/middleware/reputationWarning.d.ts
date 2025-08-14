/**
 * Reputation-based Content Warning Middleware
 *
 * Analyzes content before posting and shows warnings for potentially problematic content
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
interface ContentWarningRequest extends AuthRequest {
    contentWarning?: {
        showWarning: boolean;
        issues: string[];
        potentialPenalty: number;
        message: string;
    };
}
/**
 * Middleware that analyzes content and attaches warning info to request
 * Does not block the request - just provides warning data
 */
export declare const analyzeContentForWarning: (req: ContentWarningRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware that blocks posting if user hasn't acknowledged warning
 * Use this for strict content moderation
 */
export declare const requireWarningAcknowledgment: (req: ContentWarningRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware that applies reputation penalties after content is posted
 * Use this after successful post creation
 */
export declare const applyReputationPenalties: (req: ContentWarningRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Rate limiting for content warnings to prevent spam
 */
export declare const warningRateLimit: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export type { ContentWarningRequest };
//# sourceMappingURL=reputationWarning.d.ts.map