"use strict";
/**
 * @module utils/environment
 * @description Centralized environment detection for backend
 *
 * SINGLE SOURCE OF TRUTH for environment detection across the entire backend.
 * All environment checks should use these functions instead of direct NODE_ENV checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvironment = getEnvironment;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.requiresCaptcha = requiresCaptcha;
exports.isAdminDebuggingEnabled = isAdminDebuggingEnabled;
exports.requireSecureCookies = requireSecureCookies;
exports.enableRequestLogging = enableRequestLogging;
exports.enableApiDocs = enableApiDocs;
exports.getDatabaseLogLevel = getDatabaseLogLevel;
exports.logEnvironmentInfo = logEnvironmentInfo;
/**
 * Get current environment based on NODE_ENV
 * @returns {'development' | 'production'} The current environment
 */
function getEnvironment() {
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
function isDevelopment() {
    return getEnvironment() === 'development';
}
/**
 * Check if running in production environment
 * @returns {boolean} True if production environment
 */
function isProduction() {
    return getEnvironment() === 'production';
}
/**
 * Check if captcha verification is required
 * @returns {boolean} True if captcha should be verified
 */
function requiresCaptcha() {
    return isProduction();
}
/**
 * Check if admin debugging is enabled
 * @returns {boolean} True if admin debugging should be enabled
 */
function isAdminDebuggingEnabled() {
    return isDevelopment();
}
/**
 * Get cookie security settings for current environment
 * @returns {boolean} True if cookies should be secure (HTTPS only)
 */
function requireSecureCookies() {
    return isProduction();
}
/**
 * Check if request logging should be enabled
 * @returns {boolean} True if request logging should be enabled
 */
function enableRequestLogging() {
    return isDevelopment();
}
/**
 * Check if Swagger/API docs should be enabled
 * @returns {boolean} True if API documentation should be served
 */
function enableApiDocs() {
    return isDevelopment() || process.env.ENABLE_DOCS === 'true';
}
/**
 * Get database logging level based on environment
 * @returns Prisma log levels to enable
 */
function getDatabaseLogLevel() {
    if (isDevelopment()) {
        return ['query', 'error', 'warn'];
    }
    return ['error'];
}
/**
 * Log environment information to console
 */
function logEnvironmentInfo() {
    const env = getEnvironment();
    console.log(`🌍 BACKEND ENVIRONMENT: ${env.toUpperCase()}`);
    console.log(`📊 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`🔒 Captcha Required: ${requiresCaptcha()}`);
    console.log(`🍪 Secure Cookies: ${requireSecureCookies()}`);
    console.log(`📝 Request Logging: ${enableRequestLogging()}`);
}
exports.default = {
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
//# sourceMappingURL=environment.js.map