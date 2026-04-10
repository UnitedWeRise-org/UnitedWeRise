/**
 * @module utils/cookies
 * @description Environment-aware cookie naming for dev/production isolation
 *
 * This module provides centralized cookie name management to prevent cookie conflicts
 * between development and production environments. All cookies are prefixed with '_dev'
 * in development environments to ensure independent auth sessions.
 *
 * @example
 * import { COOKIE_NAMES } from './cookies.js';
 * const csrfToken = getCookie(COOKIE_NAMES.CSRF_TOKEN);
 */

import { isDevelopment } from './environment.js';

/**
 * Get environment-aware cookie name
 *
 * @param {string} baseName - Base cookie name (e.g., 'authToken')
 * @returns {string} Environment-prefixed name in development, base name in production
 *
 * @example
 * getCookieName('authToken')
 * // Production: 'authToken'
 * // Development: 'authToken_dev'
 */
export function getCookieName(baseName) {
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
};

/**
 * Read a cookie value by name from document.cookie
 *
 * @param {string} name - Cookie name to read
 * @returns {string|null} Cookie value or null if not found
 */
export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

/**
 * Get the current CSRF token from the cookie (single source of truth)
 *
 * The CSRF cookie is set by the backend on login/register/refresh responses
 * with httpOnly: false so JavaScript can read it for the double-submit pattern.
 *
 * @returns {string} CSRF token value, or empty string if not found
 */
export function getCsrfToken() {
  return getCookie(COOKIE_NAMES.CSRF_TOKEN) || '';
}
