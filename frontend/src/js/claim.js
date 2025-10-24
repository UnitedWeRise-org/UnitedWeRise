/**
 * @module claim
 * @description Badge claim page functionality
 */

import { getApiBaseUrl } from '../utils/environment.js';

/**
 * Parse claim code from URL parameters
 * @returns {string|null} Claim code if present in URL, null otherwise
 */
function getClaimCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

/**
 * Show error message to user
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showError(title, message) {
    const errorDisplay = document.getElementById('error-display');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');

    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorDisplay.classList.add('active');

    // Hide loading and form
    document.getElementById('loading').style.display = 'none';
    document.getElementById('claim-form').style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    const errorDisplay = document.getElementById('error-display');
    errorDisplay.classList.remove('active');
}

/**
 * Show loading state
 */
function showLoading() {
    document.getElementById('claim-form').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    hideError();
}

/**
 * Show badge result
 * @param {Object} badge - Badge object with name, description, imageUrl
 */
function showBadgeResult(badge) {
    document.getElementById('loading').style.display = 'none';

    const badgeResult = document.getElementById('badge-result');
    document.getElementById('badge-image').src = badge.imageUrl;
    document.getElementById('badge-image').alt = badge.name;
    document.getElementById('badge-name').textContent = badge.name;
    document.getElementById('badge-description').textContent = badge.description;

    badgeResult.classList.add('active');
}

/**
 * Check if user is logged in
 * @returns {boolean} True if logged in, false otherwise
 */
function isLoggedIn() {
    // Check for authentication cookie (backend uses 'authToken' cookie)
    // This matches the cookie-based authentication in backend/src/middleware/auth.ts
    return document.cookie.includes('authToken');
}

/**
 * Redirect to login page with return URL
 * @param {string} claimCode - Claim code to preserve in URL
 */
function redirectToLogin(claimCode) {
    const returnUrl = encodeURIComponent(`/claim.html?code=${claimCode}`);
    window.location.href = `/login.html?return=${returnUrl}`;
}

/**
 * Claim badge via API
 * @param {string} claimCode - The claim code to redeem
 */
async function claimBadge(claimCode) {
    if (!claimCode || claimCode.trim().length === 0) {
        showError('Invalid Code', 'Please enter a valid claim code.');
        return;
    }

    // Check if user is logged in
    if (!isLoggedIn()) {
        showError('Login Required', 'You must be logged in to claim a badge.');

        // Offer redirect to login
        const errorMessage = document.getElementById('error-message');
        errorMessage.innerHTML = `
            You must be logged in to claim a badge.
            <br><br>
            <a href="/login.html?return=${encodeURIComponent('/claim.html?code=' + claimCode)}"
               style="color: #4CAF50; font-weight: bold;">
                Click here to log in
            </a>
        `;
        return;
    }

    showLoading();

    try {
        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/badges/claim/${encodeURIComponent(claimCode)}`, {
            method: 'POST',
            credentials: 'include', // Include cookies for authentication
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle different error cases
            if (response.status === 401) {
                redirectToLogin(claimCode);
                return;
            }

            if (response.status === 404) {
                showError('Invalid Code', 'This claim code does not exist or has been deactivated.');
                return;
            }

            if (response.status === 400) {
                // Handle specific error messages from backend
                if (data.error && data.error.includes('expired')) {
                    showError('Code Expired', 'This claim code has expired.');
                } else if (data.error && data.error.includes('maximum claims')) {
                    showError('Code Exhausted', 'This claim code has reached its maximum number of claims.');
                } else if (data.error && data.error.includes('already claimed')) {
                    showError('Already Claimed', 'You have already claimed this badge.');
                } else {
                    showError('Claim Failed', data.error || 'Unable to claim this badge.');
                }
                return;
            }

            throw new Error(data.error || 'Failed to claim badge');
        }

        // Success - show the badge
        if (data.success && data.data && data.data.badge) {
            showBadgeResult(data.data.badge);
        } else {
            throw new Error('Invalid response from server');
        }

    } catch (error) {
        console.error('Error claiming badge:', error);
        showError('Network Error', 'Unable to connect to the server. Please try again later.');
    }
}

/**
 * Initialize claim page
 */
function init() {
    const claimCodeInput = document.getElementById('claim-code-input');
    const claimBtn = document.getElementById('claim-btn');

    // Check if code is in URL
    const urlCode = getClaimCodeFromUrl();
    if (urlCode) {
        claimCodeInput.value = urlCode;
        // Auto-claim if code is in URL
        claimBadge(urlCode);
    }

    // Handle claim button click
    claimBtn.addEventListener('click', () => {
        const code = claimCodeInput.value.trim();
        claimBadge(code);
    });

    // Handle Enter key in input
    claimCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const code = claimCodeInput.value.trim();
            claimBadge(code);
        }
    });

    // Auto-focus input if no URL code
    if (!urlCode) {
        claimCodeInput.focus();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
