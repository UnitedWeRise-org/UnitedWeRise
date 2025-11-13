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

import { Request, Response } from 'express';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import { logger } from '../services/logger';
import { enableRequestLogging } from '../utils/environment';

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
  serializers: {
    req: (req: Request) => ({
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
    res: (res: Response) => ({
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
