import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '../utils/environment';

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
  const errorResponse: any = {
    error: true,
    timestamp: new Date().toISOString(),
    path: req.url
  };

  // In development, include full error details
  if (isDevelopment()) {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  } else {
    // In production, only show generic messages for server errors
    if (statusCode >= 500) {
      errorResponse.message = 'Internal server error';
    } else {
      errorResponse.message = err.message;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response) => {
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

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
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

// Security event logger
export const securityLogger = (event: string, details: any, req?: Request) => {
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

// Create custom error
export const createError = (message: string, statusCode: number): CustomError => {
  const error = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};