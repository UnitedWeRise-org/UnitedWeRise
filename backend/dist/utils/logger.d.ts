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
declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map