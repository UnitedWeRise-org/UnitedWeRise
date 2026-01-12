/**
 * @module middleware/requestLogger
 * @description Pino HTTP request logging middleware
 *
 * Automatically logs all HTTP requests with contextual information:
 * - Request method, URL, headers
 * - Response status, duration
 * - User ID (if authenticated)
 * - Unique request ID for tracing
 *
 * Security: Automatically redacts sensitive OAuth tokens, authorization codes,
 * and other sensitive query parameters from logged URLs.
 */
/**
 * Pino HTTP middleware configuration
 */
export declare const requestLoggingMiddleware: import("pino-http").HttpLogger<import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, never>;
/**
 * TypeScript declaration merging to add requestId to Express Request
 */
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}
export default requestLoggingMiddleware;
//# sourceMappingURL=requestLogger.d.ts.map