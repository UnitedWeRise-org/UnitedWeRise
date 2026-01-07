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

import { Request, Response } from 'express';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { logger } from '../services/logger';
import { enableRequestLogging } from '../utils/environment';
import { redactSensitiveParams, redactSensitiveQuery } from '../utils/urlSanitizer';

/**
 * Pino HTTP middleware configuration
 */
export const requestLoggingMiddleware = pinoHttp({
  logger,
  genReqId: () => crypto.randomUUID(),
  autoLogging: enableRequestLogging(),

  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return enableRequestLogging() ? 'info' : 'silent';
  },

  // Serialize request with user context
  // Security: URL and query parameters are sanitized to redact OAuth tokens and sensitive data
  serializers: {
    req: (req: Request) => ({
      id: req.id,
      method: req.method,
      // Security: Redact sensitive query parameters (OAuth tokens, codes, etc.) from URL
      url: redactSensitiveParams(req.url),
      // Security: Redact sensitive values from query object
      query: redactSensitiveQuery(req.query as Record<string, any>),
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
