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
 * List of sensitive query parameter names that should be redacted from logs.
 * Includes common OAuth, authentication, and session-related parameters.
 */
const SENSITIVE_PARAMS = [
  // OAuth tokens
  'token',
  'id_token',
  'access_token',
  'refresh_token',

  // OAuth authorization codes
  'code',

  // OAuth state parameter (can contain session info)
  'state',

  // API keys and secrets
  'api_key',
  'apikey',
  'key',
  'secret',
  'client_secret',

  // Session and authentication
  'session',
  'session_id',
  'sessionid',
  'auth',
  'authorization',

  // Password reset tokens
  'reset_token',
  'resettoken',
  'reset',

  // Email verification tokens
  'verify_token',
  'verification_token',
  'email_token',

  // CSRF tokens
  'csrf',
  'csrf_token',
  '_csrf',

  // Generic credentials
  'password',
  'passwd',
  'credential',
  'credentials',
];

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
export function redactSensitiveParams(url: string): string {
  if (!url) {
    return url;
  }

  try {
    // Use a placeholder base URL for relative URLs
    const isRelativeUrl = !url.startsWith('http://') && !url.startsWith('https://');
    const baseUrl = isRelativeUrl ? 'http://placeholder' : '';
    const fullUrl = baseUrl + url;

    const parsed = new URL(fullUrl);
    let hasRedactions = false;

    // Check each sensitive parameter (case-insensitive)
    SENSITIVE_PARAMS.forEach(param => {
      const lowerParam = param.toLowerCase();

      // Check all search params for case-insensitive match
      const paramsToRedact: string[] = [];
      parsed.searchParams.forEach((value, key) => {
        if (key.toLowerCase() === lowerParam) {
          paramsToRedact.push(key);
        }
      });

      // Redact matching params
      paramsToRedact.forEach(key => {
        parsed.searchParams.set(key, '[REDACTED]');
        hasRedactions = true;
      });
    });

    // If no redactions were made, return original to preserve formatting
    if (!hasRedactions) {
      return url;
    }

    // Return only the path + query string for relative URLs
    if (isRelativeUrl) {
      return parsed.pathname + parsed.search;
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, try regex-based redaction as fallback
    return redactSensitiveParamsRegex(url);
  }
}

/**
 * Regex-based fallback for redacting sensitive parameters.
 * Used when URL parsing fails (malformed URLs).
 *
 * @param url - The URL string to sanitize
 * @returns URL with sensitive parameters redacted
 */
function redactSensitiveParamsRegex(url: string): string {
  let sanitized = url;

  SENSITIVE_PARAMS.forEach(param => {
    // Match the parameter and its value (up to & or end of string)
    // Case-insensitive matching
    const regex = new RegExp(`([?&])(${param})=([^&]*)`, 'gi');
    sanitized = sanitized.replace(regex, '$1$2=[REDACTED]');
  });

  return sanitized;
}

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
export function redactSensitiveQuery(query: Record<string, any>): Record<string, any> {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(query)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_PARAMS.some(param => param.toLowerCase() === keyLower);

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = redactSensitiveQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Gets the list of sensitive parameter names (for testing/documentation).
 * @returns Array of sensitive parameter names
 */
export function getSensitiveParams(): readonly string[] {
  return SENSITIVE_PARAMS;
}
