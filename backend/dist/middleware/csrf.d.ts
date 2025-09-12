import { Request, Response, NextFunction } from 'express';
/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 * Verifies that the CSRF token in the request header matches the one in the cookie
 */
export declare const verifyCsrf: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Optional CSRF protection - logs warnings but doesn't block requests
 * Useful for gradual migration
 */
export declare const warnCsrf: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=csrf.d.ts.map