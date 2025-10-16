/**
 * Email Normalization Utility
 *
 * Handles email normalization for duplicate detection across authentication methods.
 * Particularly important for Gmail addresses which ignore dots and plus-sign suffixes.
 *
 * Use cases:
 * - OAuth login/registration
 * - Email availability checking
 * - Account merging/linking
 *
 * @example
 * normalizeEmail('Jeffrey.A.Benson+spam@gmail.com')
 * // Returns: 'jeffreyabenson@gmail.com'
 *
 * normalizeEmail('User.Name@Example.COM')
 * // Returns: 'user.name@example.com' (non-Gmail, only lowercased)
 */
export interface EmailNormalizationResult {
    original: string;
    normalized: string;
    isGmail: boolean;
    localPart: string;
    domain: string;
}
/**
 * Normalize email address for duplicate detection
 *
 * Rules:
 * - All emails: Convert to lowercase
 * - Gmail/Googlemail: Remove dots from local part, ignore everything after '+'
 * - Other providers: Keep dots, only lowercase
 *
 * @param email - Email address to normalize
 * @returns Normalized email string
 */
export declare function normalizeEmail(email: string): string;
/**
 * Get detailed normalization information
 * Useful for logging and debugging duplicate account issues
 *
 * @param email - Email address to analyze
 * @returns Detailed normalization result
 */
export declare function analyzeEmail(email: string): EmailNormalizationResult;
/**
 * Check if two emails are equivalent (accounting for normalization)
 *
 * @param email1 - First email address
 * @param email2 - Second email address
 * @returns True if emails are equivalent after normalization
 */
export declare function emailsAreEquivalent(email1: string, email2: string): boolean;
/**
 * Find duplicate emails in a list (accounting for normalization)
 * Useful for batch operations and data cleanup
 *
 * @param emails - Array of email addresses
 * @returns Map of normalized email to array of original emails
 */
export declare function findDuplicateEmails(emails: string[]): Map<string, string[]>;
//# sourceMappingURL=emailNormalization.d.ts.map