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
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
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
        res: (res) => ({
            statusCode: res.statusCode,
            headers: {
                'content-type': res.getHeader('content-type'),
                'content-length': res.getHeader('content-length'),
            },
        }),
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