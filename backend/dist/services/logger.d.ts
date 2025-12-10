/**
 * @module services/logger
 * @description Centralized Pino logger configuration for structured logging
 *
 * Provides environment-aware logging with automatic redaction of sensitive data.
 * Supports pretty-printing in development and JSON output in production.
 */
import pino from 'pino';
/**
 * Main application logger
 */
export declare const logger: any;
/**
 * Security-specific logger
 * Child logger with component tag for security events
 */
export declare const securityLogger: any;
/**
 * Create a request-scoped logger with contextual information
 * @param requestId - Unique request identifier
 * @param userId - Optional authenticated user ID
 * @param ip - Optional client IP address
 * @returns Child logger with request context
 */
export declare function createRequestLogger(requestId: string, userId?: number, ip?: string): pino.Logger;
/**
 * Default export for convenience
 */
export default logger;
//# sourceMappingURL=logger.d.ts.map