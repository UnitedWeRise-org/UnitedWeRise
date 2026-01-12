"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLoggingMiddleware = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../services/logger");
const environment_1 = require("../utils/environment");
const urlSanitizer_1 = require("../utils/urlSanitizer");
/**
 * Pino HTTP middleware configuration
 */
exports.requestLoggingMiddleware = (0, pino_http_1.default)({
    logger: logger_1.logger,
    genReqId: () => crypto_1.default.randomUUID(),
    autoLogging: (0, environment_1.enableRequestLogging)(),
    // Custom log level based on response status
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) {
            return 'error';
        }
        if (res.statusCode >= 400) {
            return 'warn';
        }
        return (0, environment_1.enableRequestLogging)() ? 'info' : 'silent';
    },
    // Serialize request with user context
    // Security: URL and query parameters are sanitized to redact OAuth tokens and sensitive data
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            // Security: Redact sensitive query parameters (OAuth tokens, codes, etc.) from URL
            url: (0, urlSanitizer_1.redactSensitiveParams)(req.url),
            // Security: Redact sensitive values from query object
            query: (0, urlSanitizer_1.redactSensitiveQuery)(req.query),
            // @ts-ignore - userId added by auth middleware
            userId: req.userId,
            headers: {
                host: req.headers.host,
                'user-agent': req.headers['user-agent'],
                referer: req.headers.referer,
                // Redact sensitive headers (handled by logger config)
            },
            remoteAddress: req.ip,
        }),
        // Use default res serializer (res object is already serialized by pino-http)
        // Custom serializer was causing TypeError: res.getHeader is not a function
    },
    // Redact sensitive data
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
    },
});
exports.default = exports.requestLoggingMiddleware;
//# sourceMappingURL=requestLogger.js.map