import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metricsService';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 * Verifies that the CSRF token in the request header matches the one in the cookie
 */
export const verifyCsrf = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID for tracing
  const requestId = crypto.randomBytes(4).toString('hex');

  // 🔍 LAYER 4 DEBUG: CSRF Middleware Entry
  console.log(`[${requestId}] 🔍 CSRF Middleware Entry:`, {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
    hasHeaderToken: !!req.headers['x-csrf-token'],
    hasBodyToken: !!(req.body && req.body._csrf),
    hasCookie: !!req.cookies['csrf-token']
  });

  // Skip CSRF verification for GET requests (they should be safe by design)
  if (req.method === 'GET') {
    console.log(`[${requestId}] ✅ CSRF Skip: GET request`);
    return next();
  }

  // Skip CSRF verification for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ CSRF Skip: OPTIONS request`);
    return next();
  }

  // CRITICAL: Exempt authentication routes from CSRF protection
  // These routes are accessed before users have CSRF tokens or during logout
  const exemptedPaths = [
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
  ];

  // Check if current path is exempted
  const isExempted = exemptedPaths.some(path => req.path === path || req.path.startsWith(path));
  if (isExempted) {
    console.log(`[${requestId}] ✅ CSRF Skip: Exempted path - ${req.path}`);
    return next();
  }

  // Get CSRF token from request header or body
  // Note: req.body might be undefined for multipart/form-data before body parsing
  const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);

  // Get CSRF token from cookie
  const cookie = req.cookies['csrf-token'];

  console.log(`[${requestId}] 🔍 CSRF Token Check:`, {
    headerToken: token ? `${token.substring(0, 8)}...` : 'MISSING',
    cookieToken: cookie ? `${cookie.substring(0, 8)}...` : 'MISSING',
    tokensMatch: token && cookie ? (token === cookie) : false
  });

  // Verify both tokens exist
  if (!token) {
    console.log(`[${requestId}] 🚨 CSRF 403: Missing token in request`, {
      path: req.path,
      method: req.method,
      reason: 'CSRF_TOKEN_MISSING'
    });
    metricsService.incrementCounter('csrf_failures_total', { reason: 'missing_token' });
    return res.status(403).json({
      error: 'CSRF token missing in request',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  if (!cookie) {
    console.log(`[${requestId}] 🚨 CSRF 403: Missing cookie`, {
      path: req.path,
      method: req.method,
      reason: 'CSRF_COOKIE_MISSING'
    });
    metricsService.incrementCounter('csrf_failures_total', { reason: 'missing_cookie' });
    return res.status(403).json({
      error: 'CSRF token missing in cookies',
      code: 'CSRF_COOKIE_MISSING'
    });
  }

  // Verify tokens match (double-submit cookie pattern)
  if (token !== cookie) {
    console.log(`[${requestId}] 🚨 CSRF 403: Token mismatch`, {
      path: req.path,
      method: req.method,
      headerToken: `${token.substring(0, 8)}...`,
      cookieToken: `${cookie.substring(0, 8)}...`,
      reason: 'CSRF_TOKEN_MISMATCH'
    });
    metricsService.incrementCounter('csrf_failures_total', { reason: 'token_mismatch' });
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_MISMATCH'
    });
  }

  // CSRF validation passed
  console.log(`[${requestId}] ✅ CSRF Validation Passed:`, {
    path: req.path,
    method: req.method
  });
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
  const cookie = req.cookies['csrf-token'];

  if (!token || !cookie || token !== cookie) {
    console.warn(`⚠️  CSRF Warning: ${req.method} ${req.path} - Missing or mismatched CSRF token`);
    // Continue with request but log the warning
  }

  next();
};