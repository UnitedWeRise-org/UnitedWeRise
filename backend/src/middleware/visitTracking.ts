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
import visitorAnalytics from '../services/visitorAnalytics';
import { logger } from '../services/logger';

/**
 * Extract client IP address from request
 * Handles X-Forwarded-For header from Azure Container Apps proxy
 */
function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (Azure Container Apps, nginx, etc.)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can be comma-separated list, take first IP
    const ips = typeof forwardedFor === 'string' ? forwardedFor.split(',') : forwardedFor;
    return ips[0].trim();
  }

  // Fallback to direct connection IP
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Determine if a path should be tracked
 * Excludes health checks, static assets, and admin endpoints
 */
function shouldTrackPath(path: string): boolean {
  const excludedPaths = [
    '/health',
    '/api/health',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ];

  const excludedPrefixes = [
    '/static/',
    '/assets/',
    '/_next/', // Next.js
    '/admin/api/', // Admin API endpoints (separate analytics)
  ];

  // Exact match
  if (excludedPaths.includes(path)) {
    return false;
  }

  // Prefix match
  if (excludedPrefixes.some(prefix => path.startsWith(prefix))) {
    return false;
  }

  return true;
}

/**
 * Visit tracking middleware
 * Tracks pageviews asynchronously without blocking the request
 */
export async function visitTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only track GET requests (pageviews, not API actions)
  if (req.method !== 'GET') {
    return next();
  }

  // Skip excluded paths
  if (!shouldTrackPath(req.path)) {
    return next();
  }

  // Extract tracking data
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const path = req.path;
  const referrer = req.headers['referer'] || req.headers['referrer'];

  // Get user ID if authenticated
  const userId = (req as any).user?.userId || null;

  // Track asynchronously (don't block request)
  visitorAnalytics
    .trackPageView({
      path,
      ip,
      userAgent,
      referrer: typeof referrer === 'string' ? referrer : undefined,
      userId,
    })
    .catch(err => {
      // Log error but don't fail the request
      logger.error({ error: err, path, userId, ip }, 'VisitTracking: Error tracking pageview');
    });

  // Continue processing request immediately
  next();
}

export default visitTrackingMiddleware;
