import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../utils/environment';
import { logger } from '../services/logger';
import { redactSensitiveParams } from '../utils/urlSanitizer';

export interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Global error handler
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details using Pino
  // Security: Sanitize URL to redact sensitive query parameters (OAuth tokens, etc.)
  req.log.error({
    error: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    },
    method: req.method,
    url: redactSensitiveParams(req.url),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, 'Error occurred');

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Prepare error response - use error field as message for API consistency
  let errorMessage = err.message;

  // In production, sanitize server errors
  if (!isDevelopment() && statusCode >= 500) {
    errorMessage = 'Internal server error';
  }

  const errorResponse: any = {
    error: errorMessage, // Consistent with validation errors
    timestamp: new Date().toISOString(),
    path: req.url
  };

  // In development, include full error details
  if (isDevelopment()) {
    errorResponse.stack = err.stack;
    errorResponse.statusCode = statusCode;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response) => {
  // Security: Sanitize URL in response to prevent token leakage
  const sanitizedUrl = redactSensitiveParams(req.url);

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

// Request logger middleware - DEPRECATED
// NOTE: Request logging now handled by pino-http middleware (registered in server.ts)
// This function kept for backwards compatibility but no longer used
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // No-op - pino-http handles all request logging
  next();
};

// Security event logger
// Uses Pino structured logging for security events
// Security: URLs are sanitized to prevent OAuth token leakage in logs
export const securityLogger = (event: string, details: any, req?: Request) => {
  if (req) {
    // Use request logger if available
    req.log.warn({
      event,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: redactSensitiveParams(req.url),
      method: req.method,
      ...details
    }, 'SECURITY EVENT');
  } else {
    // Fallback to global logger if no request context
    logger.warn({
      event,
      ...details
    }, 'SECURITY EVENT');
  }
};

// Create custom error
export const createError = (message: string, statusCode: number): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};