/**
 * @module services/logger
 * @description Centralized Pino logger configuration for structured logging
 *
 * Provides environment-aware logging with automatic redaction of sensitive data.
 * Supports pretty-printing in development and JSON output in production.
 */

import pino from 'pino';
import { isDevelopment, enableRequestLogging } from '../utils/environment';

/**
 * Pino logger configuration
 * - Development: Pretty-printed colored output
 * - Production: JSON-formatted logs
 * - Automatic redaction of sensitive fields (passwords, tokens, cookies)
 * - Environment-aware log levels
 */
const pinoConfig: pino.LoggerOptions = {
  level: enableRequestLogging() ? 'debug' : 'info',
  transport: isDevelopment()
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
  timestamp: pino.stdTimeFunctions.isoTime,
};

/**
 * Main application logger
 */
export const logger = pino(pinoConfig);

/**
 * Security-specific logger
 * Child logger with component tag for security events
 */
export const securityLogger = logger.child({ component: 'security' });

/**
 * Create a request-scoped logger with contextual information
 * @param requestId - Unique request identifier
 * @param userId - Optional authenticated user ID
 * @param ip - Optional client IP address
 * @returns Child logger with request context
 */
export function createRequestLogger(
  requestId: string,
  userId?: number,
  ip?: string
): pino.Logger {
  return logger.child({ requestId, userId, ip });
}

/**
 * Default export for convenience
 */
export default logger;
