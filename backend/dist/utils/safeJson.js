"use strict";
/**
 * Safe JSON Parsing Utilities
 *
 * Provides secure JSON parsing with error handling and optional validation
 * to prevent unhandled exceptions from malformed user input.
 *
 * @module utils/safeJson
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGINATION_LIMITS = void 0;
exports.safeJSONParse = safeJSONParse;
exports.safePaginationParams = safePaginationParams;
const logger_1 = require("../services/logger");
/**
 * Safely parses JSON with error handling and optional validation
 *
 * @template T - The expected type of the parsed JSON
 * @param input - The JSON string to parse
 * @param defaultValue - Default value if parsing fails or input is undefined/null
 * @param validator - Optional type guard function to validate parsed data
 * @returns Parsed value or default value if parsing fails or validation fails
 *
 * @example
 * // Basic usage with default
 * const weights = safeJSONParse(req.query.weights as string, {});
 *
 * @example
 * // With validation
 * const isStringArray = (val: any): val is string[] =>
 *   Array.isArray(val) && val.every(item => typeof item === 'string');
 * const tags = safeJSONParse(input, [], isStringArray);
 */
function safeJSONParse(input, defaultValue, validator) {
    if (!input)
        return defaultValue;
    try {
        const parsed = JSON.parse(input);
        if (validator && !validator(parsed)) {
            return defaultValue;
        }
        return parsed;
    }
    catch (error) {
        // Log for debugging but don't expose error details to user
        logger_1.logger.warn({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to parse JSON input');
        return defaultValue;
    }
}
/**
 * Pagination constants to prevent memory exhaustion attacks
 */
exports.PAGINATION_LIMITS = {
    /** Maximum number of items per page */
    MAX_LIMIT: 100,
    /** Maximum offset for pagination */
    MAX_OFFSET: 10000,
    /** Default number of items per page */
    DEFAULT_LIMIT: 20,
    /** Default offset */
    DEFAULT_OFFSET: 0
};
/**
 * Safely parses and constrains pagination parameters
 *
 * @param limit - Raw limit value from query parameters
 * @param offset - Raw offset value from query parameters
 * @param maxLimit - Optional custom max limit (defaults to PAGINATION_LIMITS.MAX_LIMIT)
 * @param maxOffset - Optional custom max offset (defaults to PAGINATION_LIMITS.MAX_OFFSET)
 * @returns Object with validated limit and offset values
 *
 * @example
 * const { limit, offset } = safePaginationParams(req.query.limit, req.query.offset);
 */
function safePaginationParams(limit, offset, maxLimit = exports.PAGINATION_LIMITS.MAX_LIMIT, maxOffset = exports.PAGINATION_LIMITS.MAX_OFFSET) {
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : (limit ?? exports.PAGINATION_LIMITS.DEFAULT_LIMIT);
    const parsedOffset = typeof offset === 'string' ? parseInt(offset, 10) : (offset ?? exports.PAGINATION_LIMITS.DEFAULT_OFFSET);
    return {
        limit: Math.min(Math.max(1, isNaN(parsedLimit) ? exports.PAGINATION_LIMITS.DEFAULT_LIMIT : parsedLimit), maxLimit),
        offset: Math.min(Math.max(0, isNaN(parsedOffset) ? exports.PAGINATION_LIMITS.DEFAULT_OFFSET : parsedOffset), maxOffset)
    };
}
//# sourceMappingURL=safeJson.js.map