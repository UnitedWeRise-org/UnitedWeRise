"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.securityLogger = exports.requestLogger = exports.notFoundHandler = exports.errorHandler = void 0;
// Global error handler
const errorHandler = (err, req, res, next) => {
    // Log error details
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: {
            message: err.message,
            stack: err.stack,
            statusCode: err.statusCode
        }
    });
    // Determine status code
    const statusCode = err.statusCode || 500;
    // Prepare error response
    const errorResponse = {
        error: true,
        timestamp: new Date().toISOString(),
        path: req.url
    };
    // In development, include full error details
    if (process.env.NODE_ENV === 'development') {
        errorResponse.message = err.message;
        errorResponse.stack = err.stack;
    }
    else {
        // In production, only show generic messages for server errors
        if (statusCode >= 500) {
            errorResponse.message = 'Internal server error';
        }
        else {
            errorResponse.message = err.message;
        }
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
    const error = {
        error: true,
        message: 'Route not found',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    };
    console.warn('404 - Route not found:', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.status(404).json(error);
};
exports.notFoundHandler = notFoundHandler;
// Request logger middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    // Log request
    console.log(`${req.method} ${req.url}`, {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length') || '0'
    });
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        console[logLevel](`${req.method} ${req.url} - ${res.statusCode}`, {
            timestamp: new Date().toISOString(),
            duration: `${duration}ms`,
            statusCode: res.statusCode,
            contentLength: res.get('Content-Length') || '0'
        });
    });
    next();
};
exports.requestLogger = requestLogger;
// Security event logger
const securityLogger = (event, details, req) => {
    console.warn('SECURITY EVENT:', {
        event,
        timestamp: new Date().toISOString(),
        ip: req?.ip,
        userAgent: req?.get('User-Agent'),
        url: req?.url,
        method: req?.method,
        details
    });
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