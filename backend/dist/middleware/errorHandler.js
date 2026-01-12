"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.securityLogger = exports.requestLogger = exports.notFoundHandler = exports.errorHandler = void 0;
const environment_1 = require("../utils/environment");
const logger_1 = require("../services/logger");
const urlSanitizer_1 = require("../utils/urlSanitizer");
// Global error handler
const errorHandler = (err, req, res, next) => {
    // Log error details using Pino
    // Security: Sanitize URL to redact sensitive query parameters (OAuth tokens, etc.)
    req.log.error({
        error: {
            message: err.message,
            stack: err.stack,
            statusCode: err.statusCode
        },
        method: req.method,
        url: (0, urlSanitizer_1.redactSensitiveParams)(req.url),
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, 'Error occurred');
    // Determine status code
    const statusCode = err.statusCode || 500;
    // Prepare error response - use error field as message for API consistency
    let errorMessage = err.message;
    // In production, sanitize server errors
    if (!(0, environment_1.isDevelopment)() && statusCode >= 500) {
        errorMessage = 'Internal server error';
    }
    const errorResponse = {
        error: errorMessage, // Consistent with validation errors
        timestamp: new Date().toISOString(),
        path: req.url
    };
    // In development, include full error details
    if ((0, environment_1.isDevelopment)()) {
        errorResponse.stack = err.stack;
        errorResponse.statusCode = statusCode;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
    // Security: Sanitize URL in response to prevent token leakage
    const sanitizedUrl = (0, urlSanitizer_1.redactSensitiveParams)(req.url);
    const error = {
        error: 'Route not found', // Consistent with other error responses
        path: sanitizedUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    };
    // Security event: Log 404s to detect scanning/probing
    // URL sanitized to redact any OAuth tokens in query params
    req.log.warn({
        method: req.method,
        url: sanitizedUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, '404 - Route not found');
    res.status(404).json(error);
};
exports.notFoundHandler = notFoundHandler;
// Request logger middleware - DEPRECATED
// NOTE: Request logging now handled by pino-http middleware (registered in server.ts)
// This function kept for backwards compatibility but no longer used
const requestLogger = (req, res, next) => {
    // No-op - pino-http handles all request logging
    next();
};
exports.requestLogger = requestLogger;
// Security event logger
// Uses Pino structured logging for security events
// Security: URLs are sanitized to prevent OAuth token leakage in logs
const securityLogger = (event, details, req) => {
    if (req) {
        // Use request logger if available
        req.log.warn({
            event,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: (0, urlSanitizer_1.redactSensitiveParams)(req.url),
            method: req.method,
            ...details
        }, 'SECURITY EVENT');
    }
    else {
        // Fallback to global logger if no request context
        logger_1.logger.warn({
            event,
            ...details
        }, 'SECURITY EVENT');
    }
};
exports.securityLogger = securityLogger;
// Create custom error
const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
//# sourceMappingURL=errorHandler.js.map