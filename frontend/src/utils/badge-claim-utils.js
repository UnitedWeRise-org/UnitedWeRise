/**
 * @module utils/badge-claim-utils
 * @description Utility functions for badge claim code management
 */

/**
 * Generates a shareable claim URL for a badge claim code
 * @param {string} code - The claim code
 * @returns {string} Full URL to claim page with code parameter
 */
export function getClaimUrl(code) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/claim.html?code=${encodeURIComponent(code)}`;
}

/**
 * Validates and parses email list input
 * @param {string} emailText - Raw email text (newline separated)
 * @returns {Object} { emails: string[], duplicates: number, invalid: number }
 */
export function parseEmailList(emailText) {
    const lines = emailText.split('\n');
    const emails = [];
    const seen = new Set();
    let duplicates = 0;
    let invalid = 0;

    // Basic email regex (RFC 5322 simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const line of lines) {
        const email = line.trim().toLowerCase();

        // Skip empty lines
        if (!email) continue;

        // Validate email format
        if (!emailRegex.test(email)) {
            invalid++;
            continue;
        }

        // Check for duplicates
        if (seen.has(email)) {
            duplicates++;
        } else {
            seen.add(email);
            emails.push(email);
        }
    }

    return {
        emails: Array.from(seen),
        duplicates,
        invalid
    };
}

/**
 * Downloads array of claim codes as CSV file
 * @param {Array} codes - Array of claim code objects with structure: { code, type, maxClaims, expiresAt }
 * @param {string} badgeName - Badge name for filename
 */
export function downloadCodesAsCSV(codes, badgeName) {
    // Build CSV header and rows
    const csvRows = ['Code,ClaimURL,Type,MaxClaims,Expires'];

    for (const codeObj of codes) {
        const url = getClaimUrl(codeObj.code);
        const expires = codeObj.expiresAt
            ? new Date(codeObj.expiresAt).toLocaleDateString()
            : 'Never';
        const maxClaims = codeObj.maxClaims || 'Unlimited';

        csvRows.push(`${codeObj.code},${url},${codeObj.type},${maxClaims},${expires}`);
    }

    const csv = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Sanitize badge name for filename
    const safeBadgeName = badgeName.replace(/[^a-z0-9]/gi, '_');
    link.href = url;
    link.download = `${safeBadgeName}_claim_codes_${new Date().toISOString().split('T')[0]}.csv`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL
    URL.revokeObjectURL(url);
}

/**
 * Copies text to clipboard with fallback for older browsers
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function copyToClipboard(text) {
    try {
        // Modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        return success;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Formats claim code statistics for display
 * @param {Object} code - Claim code object with claimsUsed and maxClaims
 * @returns {string} Formatted string like "5 / 10" or "5 / Unlimited"
 */
export function formatClaimStats(code) {
    const used = code.claimsUsed || 0;
    const max = code.maxClaims || 'Unlimited';
    return `${used} / ${max}`;
}

/**
 * Determines if a claim code is still valid
 * @param {Object} code - Claim code object with isActive, expiresAt, claimsUsed, maxClaims
 * @returns {Object} { valid: boolean, reason: string }
 */
export function isClaimCodeValid(code) {
    if (!code.isActive) {
        return { valid: false, reason: 'Code has been deactivated' };
    }

    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
        return { valid: false, reason: 'Code has expired' };
    }

    if (code.maxClaims && code.claimsUsed >= code.maxClaims) {
        return { valid: false, reason: 'Maximum claims reached' };
    }

    return { valid: true, reason: 'Active' };
}

/**
 * Formats expiration date for display
 * @param {string|null} expiresAt - ISO date string or null
 * @returns {string} Formatted date or "Never"
 */
export function formatExpiration(expiresAt) {
    if (!expiresAt) return 'Never';

    const date = new Date(expiresAt);
    const now = new Date();

    // Check if expired
    if (date < now) {
        return `Expired ${date.toLocaleDateString()}`;
    }

    return date.toLocaleDateString();
}
