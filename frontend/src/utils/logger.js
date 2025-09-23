// Production-safe logging utility
import { isDevelopment } from './environment.js';
class Logger {
    constructor() {
        this.isDevelopment = isDevelopment() || window.location.search.includes('debug=true');
    }

    log(message, ...args) {
        if (this.isDevelopment) {
            console.log(message, ...args);
        }
    }

    info(message, ...args) {
        if (this.isDevelopment) {
            console.info(message, ...args);
        }
    }

    warn(message, ...args) {
        // Always show warnings
        console.warn(message, ...args);
    }

    error(message, ...args) {
        // Always show errors
        console.error(message, ...args);
    }

    // For critical production events
    production(message, ...args) {
        console.log(`🚀 ${message}`, ...args);
    }
}

// Global logger instance
window.logger = new Logger();

// Compatibility - replace console calls gradually
if (!window.logger.isDevelopment) {
    // Reduce noise in production
    const originalLog = console.log;
    console.log = function(...args) {
        // Only log if it's not a debug message (starts with emoji or contains debug keywords)
        const firstArg = args[0];
        if (typeof firstArg === 'string' && 
            (firstArg.match(/^[🔍🚀📝✅❌🔄💬📊🎯🔧⚠️💥🚫📱]/u) ||
             firstArg.includes('debug') || 
             firstArg.includes('Debug') ||
             firstArg.toLowerCase().includes('initialization'))) {
            return; // Skip debug messages
        }
        originalLog.apply(console, args);
    };
}

export default window.logger;