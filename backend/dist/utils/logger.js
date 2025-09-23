"use strict";
/**
 * Simple logger utility for the backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
const environment_1 = require("./environment");
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
        if ((0, environment_1.isDevelopment)()) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map