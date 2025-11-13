"use strict";
/**
 * @module services/logger
 * @description Centralized Pino logger configuration for structured logging
 *
 * Provides environment-aware logging with automatic redaction of sensitive data.
 * Supports pretty-printing in development and JSON output in production.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.logger = void 0;
exports.createRequestLogger = createRequestLogger;
const pino_1 = __importDefault(require("pino"));
const environment_1 = require("../utils/environment");
/**
 * Pino logger configuration
 * - Development: Pretty-printed colored output
 * - Production: JSON-formatted logs
 * - Automatic redaction of sensitive fields (passwords, tokens, cookies)
 * - Environment-aware log levels
 */
const pinoConfig = {
    level: (0, environment_1.enableRequestLogging)() ? 'debug' : 'info',
    transport: (0, environment_1.isDevelopment)()
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        env: process.env.NODE_ENV || 'development',
        service: 'unitedwerise-backend',
    },
    redact: {
        paths: [
            'password',
            'authToken',
            'refreshToken',
            'csrfToken',
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
};
/**
 * Main application logger
 */
exports.logger = (0, pino_1.default)(pinoConfig);
/**
 * Security-specific logger
 * Child logger with component tag for security events
 */
exports.securityLogger = exports.logger.child({ component: 'security' });
/**
 * Create a request-scoped logger with contextual information
 * @param requestId - Unique request identifier
 * @param userId - Optional authenticated user ID
 * @param ip - Optional client IP address
 * @returns Child logger with request context
 */
function createRequestLogger(requestId, userId, ip) {
    return exports.logger.child({ requestId, userId, ip });
}
/**
 * Default export for convenience
 */
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map