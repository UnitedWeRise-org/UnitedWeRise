"use strict";
/**
 * Simple logger utility for the backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map