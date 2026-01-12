/**
 * @module utils/urlSanitizer
 * @description URL sanitization utility for redacting sensitive OAuth and authentication parameters from logs
 *
 * Security Fix: Prevents OAuth tokens, authorization codes, and other sensitive data
 * from appearing in server logs when passed via URL query strings.
 *
 * Related to: Security Remediation Issue H9 - OAuth Token in URL Query String
 */
/**
 * Redacts sensitive query parameters from a URL string.
 * Useful for logging URLs without exposing OAuth tokens, authorization codes, etc.
 *
 * @param url - The URL or path string potentially containing query parameters
 * @returns URL with sensitive parameters replaced with '[REDACTED]'
 *
 * @example
 * redactSensitiveParams('/callback?code=abc123&state=xyz')
 * // Returns: '/callback?code=[REDACTED]&state=[REDACTED]'
 *
 * @example
 * redactSensitiveParams('https://api.example.com/oauth?access_token=secret&user=john')
 * // Returns: 'https://api.example.com/oauth?access_token=[REDACTED]&user=john'
 */
export declare function redactSensitiveParams(url: string): string;
/**
 * Redacts sensitive values from a query object (e.g., req.query).
 * Returns a new object with sensitive values replaced.
 *
 * @param query - The query object to sanitize
 * @returns New object with sensitive values redacted
 *
 * @example
 * redactSensitiveQuery({ code: 'abc123', user: 'john' })
 * // Returns: { code: '[REDACTED]', user: 'john' }
 */
export declare function redactSensitiveQuery(query: Record<string, any>): Record<string, any>;
/**
 * Gets the list of sensitive parameter names (for testing/documentation).
 * @returns Array of sensitive parameter names
 */
export declare function getSensitiveParams(): readonly string[];
//# sourceMappingURL=urlSanitizer.d.ts.map