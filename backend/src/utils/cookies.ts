/**
 * @module utils/cookies
 * @description Environment-aware cookie naming for dev/production isolation
 *
 * This module provides centralized cookie name management to prevent cookie conflicts
 * between development and production environments. All cookies are prefixed with '_dev'
 * in development environments to ensure independent auth sessions.
 *
 * @example
 * import { COOKIE_NAMES } from '../utils/cookies';
 * res.cookie(COOKIE_NAMES.AUTH_TOKEN, token, { ... });
 * const token = req.cookies[COOKIE_NAMES.AUTH_TOKEN];
 */

import { isDevelopment } from './environment';

/**
 * Get environment-aware cookie name
 *
 * @param baseName - Base cookie name (e.g., 'authToken')
 * @returns Environment-prefixed name in development, base name in production
 *
 * @example
 * getCookieName('authToken')
 * // Production: 'authToken'
 * // Development: 'authToken_dev'
 */
export function getCookieName(baseName: string): string {
  return isDevelopment() ? `${baseName}_dev` : baseName;
}

/**
 * Centralized cookie names for consistent usage across the application
 *
 * @constant
 * @type {Object}
 * @property {string} AUTH_TOKEN - Access token cookie (30 min expiry)
 * @property {string} REFRESH_TOKEN - Refresh token cookie (30-90 day expiry)
 * @property {string} CSRF_TOKEN - CSRF protection token cookie
 */
export const COOKIE_NAMES = {
  AUTH_TOKEN: getCookieName('authToken'),
  REFRESH_TOKEN: getCookieName('refreshToken'),
  CSRF_TOKEN: getCookieName('csrf-token')
} as const;
