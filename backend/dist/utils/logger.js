"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../services/logger");
/**
 * Backwards-compatible wrapper around Pino logger
 * Adapts old API (message, ...args) to Pino API (obj, msg) or (msg)
 */
const logger = {
    info: (message, ...args) => {
        if (args.length > 0) {
            // If args provided, log them as context object
            logger_1.logger.info({ data: args }, message);
        }
        else {
            logger_1.logger.info(message);
        }
    },
    warn: (message, ...args) => {
        if (args.length > 0) {
            logger_1.logger.warn({ data: args }, message);
        }
        else {
            logger_1.logger.warn(message);
        }
    },
    error: (message, ...args) => {
        if (args.length > 0) {
            logger_1.logger.error({ data: args }, message);
        }
        else {
            logger_1.logger.error(message);
        }
    },
    debug: (message, ...args) => {
        if (args.length > 0) {
            logger_1.logger.debug({ data: args }, message);
        }
        else {
            logger_1.logger.debug(message);
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map