/**
 * @module utils/logger
 * @description Legacy logger utility - wrapper around Pino for backwards compatibility
 *
 * DEPRECATED: This file is kept for backwards compatibility only.
 * New code should import directly from '../services/logger'
 *
 * Migration: Phase 3-4 Pino structured logging
 * Date: 2025-11-13
 */

import { logger as pinoLogger } from '../services/logger';

interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Backwards-compatible wrapper around Pino logger
 * Adapts old API (message, ...args) to Pino API (obj, msg) or (msg)
 */
const logger: Logger = {
  info: (message: string, ...args: any[]) => {
    if (args.length > 0) {
      // If args provided, log them as context object
      pinoLogger.info({ data: args }, message);
    } else {
      pinoLogger.info(message);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (args.length > 0) {
      pinoLogger.warn({ data: args }, message);
    } else {
      pinoLogger.warn(message);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (args.length > 0) {
      pinoLogger.error({ data: args }, message);
    } else {
      pinoLogger.error(message);
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (args.length > 0) {
      pinoLogger.debug({ data: args }, message);
    } else {
      pinoLogger.debug(message);
    }
  }
};

export default logger;