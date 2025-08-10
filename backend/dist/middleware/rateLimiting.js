"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationLimiter = exports.messageLimiter = exports.postLimiter = exports.apiLimiter = exports.passwordResetLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Custom key generator for Azure Container Apps - strips port numbers from IPs
const azureKeyGenerator = (request) => {
    if (!request.ip) {
        console.error('Warning: request.ip is missing!');
        return request.socket.remoteAddress || 'unknown';
    }
    // Strip port number from IP for Azure Container Apps compatibility
    return request.ip.replace(/:\d+[^:]*$/, '');
};
// Strict rate limiting for authentication endpoints
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs for login/register
    message: {
        error: 'Too many authentication attempts, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: azureKeyGenerator
});
// Moderate rate limiting for password reset
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
        error: 'Too many password reset attempts, please try again in an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: azureKeyGenerator
});
// General API rate limiting
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: azureKeyGenerator
});
// Strict rate limiting for posting content
exports.postLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 posts per 15 minutes
    message: {
        error: 'Too many posts created, please wait before posting again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: azureKeyGenerator
});
// Rate limiting for messaging
exports.messageLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 messages per minute
    message: {
        error: 'Too many messages sent, please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: azureKeyGenerator
});
// Reasonable rate limiting for email/phone verification
exports.verificationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes (much more reasonable than 15)
    max: 10, // 10 verification attempts per 5 minutes
    message: {
        error: 'Too many verification attempts, please wait a few minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: azureKeyGenerator
});
//# sourceMappingURL=rateLimiting.js.map