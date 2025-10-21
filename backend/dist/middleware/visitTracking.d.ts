/**
 * Visit Tracking Middleware
 *
 * Automatically tracks all pageviews for analytics purposes.
 * Features:
 * - Tracks authenticated and anonymous visitors
 * - Rate limiting and bot detection
 * - Non-blocking (tracking failures don't affect user experience)
 * - Extracts IP from X-Forwarded-For header (Azure Container Apps proxy)
 *
 * Usage:
 * Add to Express app BEFORE route handlers:
 *   app.use(visitTrackingMiddleware);
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Visit tracking middleware
 * Tracks pageviews asynchronously without blocking the request
 */
export declare function visitTrackingMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export default visitTrackingMiddleware;
//# sourceMappingURL=visitTracking.d.ts.map