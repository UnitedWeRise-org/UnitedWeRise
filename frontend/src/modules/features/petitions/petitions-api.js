/**
 * @module PetitionsAPI
 * @description API client for petition signing and management endpoints.
 * Public signing endpoints do not require authentication.
 * Creator/dashboard endpoints require authentication and include CSRF tokens.
 */

import { API_CONFIG } from '../../../config/api.js';
import { COOKIE_NAMES } from '../../../utils/cookies.js';

const PETITIONS_BASE = 'petitions';
const BILLING_BASE = 'verification-billing';

/**
 * Read a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string} Cookie value or empty string
 */
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Extract CSRF token from cookies for authenticated requests
 * @returns {string} CSRF token value or empty string
 */
function getCsrfToken() {
    return window.csrfToken || getCookie(COOKIE_NAMES.CSRF_TOKEN) || '';
}

/**
 * Build authenticated request headers including CSRF token
 * @returns {Object} Headers object with Content-Type and CSRF token
 */
function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken()
    };
}

// ==================== Public Endpoints (No Auth) ====================

/**
 * Fetch petition data for the signing form (public, no auth required)
 * @param {string} code - Short code or custom slug
 * @returns {Promise<Object>} Petition data including required fields and display info
 * @throws {Error} If petition not found or request fails
 */
export async function getPetitionForSigning(code) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/sign/${encodeURIComponent(code)}`), {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load petition' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Submit a signature on a petition (public, CAPTCHA required)
 * No CSRF token needed -- this endpoint is CSRF-exempt (CAPTCHA protects it)
 * @param {string} code - Short code or custom slug
 * @param {Object} signatureData - Signer information and verification data
 * @param {string} signatureData.signerFirstName - First name
 * @param {string} signatureData.signerLastName - Last name
 * @param {string} [signatureData.signerEmail] - Email address
 * @param {string} [signatureData.signerAddress] - Street address
 * @param {string} [signatureData.signerCity] - City
 * @param {string} [signatureData.signerState] - State code
 * @param {string} [signatureData.signerZip] - ZIP code
 * @param {string} [signatureData.signerCounty] - County
 * @param {string} [signatureData.signerDateOfBirth] - Date of birth (YYYY-MM-DD)
 * @param {string} signatureData.signatureConfirmation - Typed full name confirmation
 * @param {string} signatureData.attestedAt - ISO timestamp of attestation
 * @param {boolean} signatureData.privacyConsented - Whether privacy consent was given
 * @param {string} signatureData.captchaToken - hCaptcha verification token
 * @param {Object} [signatureData.geolocation] - Browser geolocation data
 * @param {boolean} [signatureData.geolocationConsented] - Whether geolocation consent was given
 * @param {string} [signatureData.deviceFingerprint] - Device fingerprint hash
 * @returns {Promise<Object>} Submission result
 * @throws {Error} If submission fails
 */
export async function submitSignature(code, signatureData) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/sign/${encodeURIComponent(code)}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to submit signature' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

// ==================== Authenticated Endpoints (Creator Dashboard) ====================

/**
 * Create a new petition (requires auth)
 * @param {Object} data - Petition creation data
 * @param {string} data.title - Petition title
 * @param {string} data.description - Petition description
 * @param {string} data.type - Petition type (GENERAL, BALLOT_ACCESS, etc.)
 * @param {string[]} data.requiredSignerFields - Required signer fields
 * @param {string} [data.declarationLanguage] - Custom attestation language
 * @param {number} [data.signatureGoal] - Target number of signatures
 * @returns {Promise<Object>} Created petition data
 * @throws {Error} If creation fails
 */
export async function createPetition(data) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/create`), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create petition' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * List the current user's petitions
 * @param {number} [page=1] - Page number
 * @param {number} [limit=20] - Items per page
 * @returns {Promise<{petitions: Array, pagination: Object}>}
 * @throws {Error} If request fails
 */
export async function getMyPetitions(page = 1, limit = 20) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/mine?${params}`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load petitions' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Get full petition details by ID (creator view)
 * @param {string} id - Petition UUID
 * @returns {Promise<Object>} Full petition data with stats
 * @throws {Error} If request fails
 */
export async function getPetitionDetails(id) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/${encodeURIComponent(id)}`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load petition details' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Publish a draft petition (makes it active and signable)
 * @param {string} id - Petition UUID
 * @returns {Promise<Object>} Updated petition data
 * @throws {Error} If publish fails
 */
export async function publishPetition(id) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/${encodeURIComponent(id)}/publish`), {
        method: 'PATCH',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to publish petition' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Close a petition (stop accepting signatures)
 * @param {string} id - Petition UUID
 * @returns {Promise<Object>} Updated petition data
 * @throws {Error} If close fails
 */
export async function closePetition(id) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/${encodeURIComponent(id)}/close`), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to close petition' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Get petition signatures with filtering and pagination
 * @param {string} id - Petition UUID
 * @param {Object} [options={}] - Filter options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Items per page
 * @param {string} [options.status] - Filter by status (VALID, PENDING, REJECTED)
 * @param {string} [options.search] - Search by signer name
 * @returns {Promise<{signatures: Array, pagination: Object, stats: Object}>}
 * @throws {Error} If request fails
 */
export async function getPetitionSignatures(id, options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));
    if (options.status) params.set('status', options.status);
    if (options.search) params.set('search', options.search);

    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/${encodeURIComponent(id)}/signatures?${params}`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load signatures' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Get QR code image data for a petition
 * @param {string} id - Petition UUID
 * @returns {Promise<Object>} QR code data including base64 image
 * @throws {Error} If request fails
 */
export async function getQRCode(id) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/${encodeURIComponent(id)}/qr-code`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate QR code' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Verify voter registration (requires CAPTCHA)
 * @param {Object} data - Signer info + CAPTCHA token
 * @param {string} data.petitionId - Petition UUID
 * @param {string} data.firstName - Signer first name
 * @param {string} data.lastName - Signer last name
 * @param {string} [data.address] - Signer street address
 * @param {string} [data.city] - Signer city
 * @param {string} [data.state] - Signer state code
 * @param {string} [data.zip] - Signer ZIP code
 * @param {string} data.captchaToken - hCaptcha verification token
 * @returns {Promise<Object>} Verification result with status, party, and state fields
 * @throws {Error} If verification request fails
 */
export async function verifyRegistration(data) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/verify-registration`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to verify registration' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Get campaign verification balance
 * @returns {Promise<Object>} Balance data including used, total, and autoReplenish
 * @throws {Error} If request fails
 */
export async function getVerificationBalance() {
    const response = await fetch(API_CONFIG.url(`${BILLING_BASE}/balance`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load balance' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Create Stripe Checkout for verification credits
 * @param {Object} [options] - Checkout options
 * @param {number} [options.quantity=1] - Number of 1,000-verification blocks
 * @returns {Promise<Object>} Checkout session data with url field
 * @throws {Error} If request fails
 */
export async function createVerificationCheckout(options = {}) {
    const response = await fetch(API_CONFIG.url(`${BILLING_BASE}/checkout`), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify(options)
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create checkout' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Get verification purchase history
 * @returns {Promise<Object>} Purchase history with purchases array
 * @throws {Error} If request fails
 */
export async function getVerificationPurchases() {
    const response = await fetch(API_CONFIG.url(`${BILLING_BASE}/purchases`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load purchases' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Enable auto-replenish for verification credits
 * @returns {Promise<Object>} Updated settings
 * @throws {Error} If request fails
 */
export async function enableAutoReplenish() {
    const response = await fetch(API_CONFIG.url(`${BILLING_BASE}/auto-replenish/enable`), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ enabled: true })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to enable auto-replenish' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Disable auto-replenish for verification credits
 * @returns {Promise<Object>} Updated settings
 * @throws {Error} If request fails
 */
export async function disableAutoReplenish() {
    const response = await fetch(API_CONFIG.url(`${BILLING_BASE}/auto-replenish/disable`), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to disable auto-replenish' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

/**
 * Get audit log entries for a petition
 * @param {string} id - Petition UUID
 * @returns {Promise<{auditLog: Array}>} Audit log entries
 * @throws {Error} If request fails
 */
export async function getAuditLog(id) {
    const response = await fetch(API_CONFIG.url(`${PETITIONS_BASE}/${encodeURIComponent(id)}/audit-log`), {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders()
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to load audit log' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}
