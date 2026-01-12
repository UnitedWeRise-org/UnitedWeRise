/**
 * Safe JSON Parsing Utilities
 *
 * Provides secure JSON parsing with error handling and optional validation
 * to prevent unhandled exceptions from malformed user input.
 *
 * @module utils/safeJson
 */
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
export declare function safeJSONParse<T>(input: string | undefined | null, defaultValue: T, validator?: (val: unknown) => val is T): T;
/**
 * Pagination constants to prevent memory exhaustion attacks
 */
export declare const PAGINATION_LIMITS: {
    /** Maximum number of items per page */
    readonly MAX_LIMIT: 100;
    /** Maximum offset for pagination */
    readonly MAX_OFFSET: 10000;
    /** Default number of items per page */
    readonly DEFAULT_LIMIT: 20;
    /** Default offset */
    readonly DEFAULT_OFFSET: 0;
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
export declare function safePaginationParams(limit: string | number | undefined, offset: string | number | undefined, maxLimit?: number, maxOffset?: number): {
    limit: number;
    offset: number;
};
//# sourceMappingURL=safeJson.d.ts.map