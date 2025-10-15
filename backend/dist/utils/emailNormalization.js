"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEmail = normalizeEmail;
exports.analyzeEmail = analyzeEmail;
exports.emailsAreEquivalent = emailsAreEquivalent;
exports.findDuplicateEmails = findDuplicateEmails;
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
function normalizeEmail(email) {
    if (!email || !email.includes('@')) {
        return email.toLowerCase();
    }
    const [localPart, domain] = email.toLowerCase().split('@');
    // For Gmail and Google Workspace domains, ignore dots and plus signs
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        // Remove all dots and everything after (and including) '+'
        const normalizedLocal = localPart.replace(/\./g, '').replace(/\+.*/, '');
        return `${normalizedLocal}@${domain}`;
    }
    // For other providers, just lowercase the entire email
    return email.toLowerCase();
}
/**
 * Get detailed normalization information
 * Useful for logging and debugging duplicate account issues
 *
 * @param email - Email address to analyze
 * @returns Detailed normalization result
 */
function analyzeEmail(email) {
    const lowerEmail = email.toLowerCase();
    const [localPart, domain] = lowerEmail.split('@');
    const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
    const normalized = normalizeEmail(email);
    return {
        original: email,
        normalized,
        isGmail,
        localPart,
        domain
    };
}
/**
 * Check if two emails are equivalent (accounting for normalization)
 *
 * @param email1 - First email address
 * @param email2 - Second email address
 * @returns True if emails are equivalent after normalization
 */
function emailsAreEquivalent(email1, email2) {
    return normalizeEmail(email1) === normalizeEmail(email2);
}
/**
 * Find duplicate emails in a list (accounting for normalization)
 * Useful for batch operations and data cleanup
 *
 * @param emails - Array of email addresses
 * @returns Map of normalized email to array of original emails
 */
function findDuplicateEmails(emails) {
    const normalized = new Map();
    for (const email of emails) {
        const norm = normalizeEmail(email);
        if (!normalized.has(norm)) {
            normalized.set(norm, []);
        }
        normalized.get(norm).push(email);
    }
    // Filter to only duplicates
    return new Map(Array.from(normalized.entries()).filter(([_, originals]) => originals.length > 1));
}
//# sourceMappingURL=emailNormalization.js.map