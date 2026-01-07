import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metricsService';
import crypto from 'crypto';
import { COOKIE_NAMES } from '../utils/cookies';

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 * Verifies that the CSRF token in the request header matches the one in the cookie
 */
export const verifyCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID for tracing (Pino auto-generates, but keep for backwards compat)
  const requestId = (req as any).id || crypto.randomBytes(4).toString('hex');

  req.log.debug({
    requestId,
    method: req.method,
    path: req.path,
    hasHeaderToken: !!req.headers['x-csrf-token'],
    hasBodyToken: !!(req.body && req.body._csrf),
    hasCookie: !!req.cookies[COOKIE_NAMES.CSRF_TOKEN]
  }, 'CSRF Middleware Entry');

  // Skip CSRF verification for GET requests (they should be safe by design)
  if (req.method === 'GET') {
    req.log.debug({ requestId }, 'CSRF Skip: GET request');
    return next();
  }

  // Skip CSRF verification for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    req.log.debug({ requestId }, 'CSRF Skip: OPTIONS request');
    return next();
  }

  // CRITICAL: Exempt authentication routes from CSRF protection
  // These routes are accessed before users have CSRF tokens or during logout
  // SECURITY: Use Set for O(1) exact matching - prevents bypass via URL manipulation
  // (e.g., /api/auth/login-admin would NOT be exempted just because /api/auth/login is)
  const exemptedPathsExact = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/check-email',  // Email validation during registration (before session)
    '/api/auth/check-username',  // Username availability check during registration (before session)
    '/api/auth/google',
    '/api/auth/google/callback',
    '/api/auth/refresh',
    '/api/auth/logout',  // Logout must work even if CSRF token issues
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/health',
    '/api/health'
  ]);

  // Check if current path is exempted using exact match only
  const isExempted = exemptedPathsExact.has(req.path);
  if (isExempted) {
    req.log.debug({ requestId, path: req.path }, 'CSRF Skip: Exempted path');
    return next();
  }

  // Get CSRF token from request header or body
  // Note: req.body might be undefined for multipart/form-data before body parsing
  const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);

  // Get CSRF token from cookie
  const cookie = req.cookies[COOKIE_NAMES.CSRF_TOKEN];

  req.log.debug({
    requestId,
    hasHeaderToken: !!token,
    hasCookieToken: !!cookie,
    tokensMatch: token && cookie ? (token === cookie) : false
  }, 'CSRF Token Check');

  // Verify both tokens exist
  if (!token) {
    // SECURITY EVENT: Always log CSRF failures (warn level ensures always logged)
    req.log.warn({
      requestId,
      path: req.path,
      method: req.method,
      reason: 'CSRF_TOKEN_MISSING'
    }, 'CSRF 403: Missing token in request');
    metricsService.incrementCounter('csrf_failures_total', { reason: 'missing_token' });
    return res.status(403).json({
      error: 'CSRF token missing in request',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  if (!cookie) {
    // SECURITY EVENT: Always log CSRF failures (warn level ensures always logged)
    req.log.warn({
      requestId,
      path: req.path,
      method: req.method,
      reason: 'CSRF_COOKIE_MISSING'
    }, 'CSRF 403: Missing cookie');
    metricsService.incrementCounter('csrf_failures_total', { reason: 'missing_cookie' });
    return res.status(403).json({
      error: 'CSRF token missing in cookies',
      code: 'CSRF_COOKIE_MISSING'
    });
  }

  // Verify tokens match (double-submit cookie pattern)
  if (token !== cookie) {
    // SECURITY EVENT: Always log CSRF failures (warn level ensures always logged)
    req.log.warn({
      requestId,
      path: req.path,
      method: req.method,
      reason: 'CSRF_TOKEN_MISMATCH'
    }, 'CSRF 403: Token mismatch');
    metricsService.incrementCounter('csrf_failures_total', { reason: 'token_mismatch' });
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }

  req.log.debug({
    requestId,
    path: req.path,
    method: req.method
  }, 'CSRF Validation Passed');
  metricsService.incrementCounter('csrf_validations_total', { status: 'success' });
  next();
};

/**
 * Optional CSRF protection - logs warnings but doesn't block requests
 * Useful for gradual migration
 */
export const warnCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Skip for GET and OPTIONS
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  const cookie = req.cookies[COOKIE_NAMES.CSRF_TOKEN];

  if (!token || !cookie || token !== cookie) {
    req.log.warn({
      method: req.method,
      path: req.path
    }, 'CSRF Warning: Missing or mismatched CSRF token');
    // Continue with request but log the warning
  }

  next();
};