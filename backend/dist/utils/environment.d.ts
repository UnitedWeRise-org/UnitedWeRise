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
export declare function getEnvironment(): 'development' | 'production';
/**
 * Check if running in development environment
 * @returns {boolean} True if development environment
 */
export declare function isDevelopment(): boolean;
/**
 * Check if running in production environment
 * @returns {boolean} True if production environment
 */
export declare function isProduction(): boolean;
/**
 * Check if captcha verification is required
 * @returns {boolean} True if captcha should be verified
 */
export declare function requiresCaptcha(): boolean;
/**
 * Check if admin debugging is enabled
 * @returns {boolean} True if admin debugging should be enabled
 */
export declare function isAdminDebuggingEnabled(): boolean;
/**
 * Get cookie security settings for current environment
 * @returns {boolean} True if cookies should be secure (HTTPS only)
 */
export declare function requireSecureCookies(): boolean;
/**
 * Check if request logging should be enabled
 * @returns {boolean} True if request logging should be enabled
 */
export declare function enableRequestLogging(): boolean;
/**
 * Check if Swagger/API docs should be enabled
 * @returns {boolean} True if API documentation should be served
 */
export declare function enableApiDocs(): boolean;
/**
 * Get database logging level based on environment
 * @returns Prisma log levels to enable
 */
export declare function getDatabaseLogLevel(): ('query' | 'info' | 'warn' | 'error')[];
/**
 * Log environment information to console
 */
export declare function logEnvironmentInfo(): void;
declare const _default: {
    getEnvironment: typeof getEnvironment;
    isDevelopment: typeof isDevelopment;
    isProduction: typeof isProduction;
    requiresCaptcha: typeof requiresCaptcha;
    isAdminDebuggingEnabled: typeof isAdminDebuggingEnabled;
    requireSecureCookies: typeof requireSecureCookies;
    enableRequestLogging: typeof enableRequestLogging;
    enableApiDocs: typeof enableApiDocs;
    getDatabaseLogLevel: typeof getDatabaseLogLevel;
    logEnvironmentInfo: typeof logEnvironmentInfo;
};
export default _default;
//# sourceMappingURL=environment.d.ts.map