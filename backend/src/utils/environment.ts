/**
 * @module utils/environment
 * @description Centralized environment detection for backend
 *
 * SINGLE SOURCE OF TRUTH for environment detection across the entire backend.
 * All environment checks should use these functions instead of direct NODE_ENV checks.
 */

/**
 * Get current environment based on NODE_ENV
 * @returns {'development' | 'production'} The current environment
 */
export function getEnvironment(): 'development' | 'production' {
    // Production environment
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }

    // Everything else is development (staging, development, test, undefined, etc.)
    return 'development';
}

/**
 * Check if running in development environment
 * @returns {boolean} True if development environment
 */
export function isDevelopment(): boolean {
    return getEnvironment() === 'development';
}

/**
 * Check if running in production environment
 * @returns {boolean} True if production environment
 */
export function isProduction(): boolean {
    return getEnvironment() === 'production';
}

/**
 * Check if captcha verification is required
 * @returns {boolean} True if captcha should be verified
 */
export function requiresCaptcha(): boolean {
    return isProduction();
}

/**
 * Check if admin debugging is enabled
 * @returns {boolean} True if admin debugging should be enabled
 */
export function isAdminDebuggingEnabled(): boolean {
    return isDevelopment();
}

/**
 * Get cookie security settings for current environment
 * @returns {boolean} True if cookies should be secure (HTTPS only)
 */
export function requireSecureCookies(): boolean {
    // Both production and staging use HTTPS (Azure Static Web Apps + Container Apps)
    // Secure cookies required for SameSite=none to work for cross-subdomain auth
    return true;
}

/**
 * Check if request logging should be enabled
 * @returns {boolean} True if request logging should be enabled
 */
export function enableRequestLogging(): boolean {
    return isDevelopment();
}

/**
 * Check if Swagger/API docs should be enabled
 * @returns {boolean} True if API documentation should be served
 */
export function enableApiDocs(): boolean {
    return isDevelopment() || process.env.ENABLE_DOCS === 'true';
}

/**
 * Get database logging level based on environment
 * @returns Prisma log levels to enable
 */
export function getDatabaseLogLevel(): ('query' | 'info' | 'warn' | 'error')[] {
    if (isDevelopment()) {
        return ['query', 'error', 'warn'];
    }
    return ['error'];
}

/**
 * Log environment information using Pino structured logging
 * Migration: Phase 3-4 Pino structured logging (2025-11-13)
 */
export function logEnvironmentInfo(): void {
    // Import logger dynamically to avoid circular dependency
    // (environment.ts is imported by services/logger.ts)
    const { logger } = require('../services/logger');

    const env = getEnvironment();

    logger.info({
        environment: env,
        nodeEnv: process.env.NODE_ENV || 'undefined',
        captchaRequired: requiresCaptcha(),
        secureCookies: requireSecureCookies(),
        requestLogging: enableRequestLogging()
    }, `🌍 Backend starting in ${env.toUpperCase()} mode`);
}

export default {
    getEnvironment,
    isDevelopment,
    isProduction,
    requiresCaptcha,
    isAdminDebuggingEnabled,
    requireSecureCookies,
    enableRequestLogging,
    enableApiDocs,
    getDatabaseLogLevel,
    logEnvironmentInfo
};