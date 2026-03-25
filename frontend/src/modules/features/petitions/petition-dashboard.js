/**
 * Petition Dashboard Module
 * Standalone page for managing petitions — create, list, and view details
 *
 * @module features/petitions/petition-dashboard
 */

import { standaloneAuthRefresh } from '../../core/auth/standalone-refresh.js';

// ==================== Constants ====================

/**
 * Status badge CSS class mapping
 * @type {Object<string, string>}
 */
const STATUS_CLASSES = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    CLOSED: 'closed',
    SUBMITTED_TO_STATE: 'submitted'
};

/**
 * Status display labels
 * @type {Object<string, string>}
 */
const STATUS_LABELS = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    SUBMITTED_TO_STATE: 'Submitted'
};

/**
 * Verification status CSS class mapping
 * @type {Object<string, string>}
 */
const VERIFICATION_CLASSES = {
    UNVERIFIED: 'unverified',
    VOTER_VERIFIED: 'voter-verified',
    FLAGGED_DUPLICATE: 'flagged',
    REJECTED: 'rejected'
};

/**
 * Verification status display labels
 * @type {Object<string, string>}
 */
const VERIFICATION_LABELS = {
    UNVERIFIED: 'Unverified',
    VOTER_VERIFIED: 'Verified',
    FLAGGED_DUPLICATE: 'Flagged',
    REJECTED: 'Rejected'
};

/**
 * Petition category options
 * @type {Array<{value: string, label: string}>}
 */
const CATEGORY_OPTIONS = [
    { value: '', label: 'Select a category...' },
    { value: 'BALLOT_ACCESS', label: 'Ballot Access' },
    { value: 'CIVIC_ADVOCACY', label: 'Civic Advocacy' },
    { value: 'COMMUNITY', label: 'Community' },
    { value: 'POLICY', label: 'Policy' }
];

/**
 * Geographic scope options
 * @type {Array<{value: string, label: string}>}
 */
const SCOPE_OPTIONS = [
    { value: '', label: 'Select scope (optional)...' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'COUNTY', label: 'County' },
    { value: 'STATE', label: 'State' },
    { value: 'NATIONAL', label: 'National' },
    { value: 'REGIONAL', label: 'Regional' }
];

/**
 * Available signer fields for required fields checkboxes
 * @type {Array<{value: string, label: string}>}
 */
const SIGNER_FIELDS = [
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'ZIP Code' },
    { value: 'county', label: 'County' },
    { value: 'dateOfBirth', label: 'Date of Birth' },
    { value: 'email', label: 'Email' }
];

const DEFAULT_ATTESTATION = 'I affirm under penalty of perjury that the information provided above is true and correct to the best of my knowledge.';

// ==================== API Base ====================

/**
 * Detect API base URL based on hostname
 * @returns {string} API base URL
 */
function detectApiBase() {
    const hostname = window.location.hostname;
    if (hostname === 'dev.unitedwerise.org' ||
        hostname === 'dev-admin.unitedwerise.org' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1') {
        return 'https://dev-api.unitedwerise.org/api';
    }
    return 'https://api.unitedwerise.org/api';
}

const API_BASE = detectApiBase();

// ==================== State ====================

/**
 * Dashboard state object
 * @type {Object}
 */
let dashboardState = {
    view: 'list',
    petitions: [],
    selectedPetition: null,
    signatures: [],
    signaturePagination: { page: 1, limit: 20, total: 0 },
    signatureFilters: { status: '', search: '' },
    isCandidate: false,
    loading: true,
    currentUser: null,
    qrCodeUrl: null,
    auditLog: [],
    auditLogOpen: false,
    error: null,
    creating: false,
    verificationBalance: null,
    verificationPurchases: [],
    verificationBalanceLoading: false
};

// ==================== Utility Functions ====================

/**
 * Escape HTML to prevent XSS
 * @param {string} str - Raw string to escape
 * @returns {string} Escaped HTML string
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Get CSRF token from window or cookie
 * @returns {string} CSRF token or empty string
 */
function getCsrfToken() {
    if (window.csrfToken) return window.csrfToken;
    const match = document.cookie.match(/(?:^|;\s*)csrf-token(?:_dev)?=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {Object} [options={}] - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const csrfToken = getCsrfToken();
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`);
    }

    const data = await response.json();

    // Update CSRF token if provided
    if (data.csrfToken) {
        window.csrfToken = data.csrfToken;
    }

    return data;
}

/**
 * Format a date string for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format a date string with time for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date and time string
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show a toast notification
 * @param {string} message - Toast message
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification show';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Get the public signing URL for a petition
 * @param {Object} petition - Petition object
 * @returns {string} Signing page URL
 */
function getSigningUrl(petition) {
    const base = window.location.origin;
    if (petition.customSlug) {
        return `${base}/sign/${petition.customSlug}`;
    }
    return `${base}/sign/${petition.id}`;
}

// ==================== Auth ====================

/**
 * Check user authentication via /auth/me
 * @returns {Promise<Object|null>} User data or null if not authenticated
 */
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            return data.data;
        }
    } catch (e) {
        // Auth check failed silently
    }
    return null;
}

// ==================== API Functions ====================

/**
 * Create a new petition
 * @param {Object} petitionData - Petition creation data
 * @returns {Promise<Object>} Created petition
 */
async function createPetition(petitionData) {
    const result = await apiRequest('/petitions', {
        method: 'POST',
        body: JSON.stringify(petitionData)
    });
    return result.petition || result;
}

/**
 * Get petitions created by the current user
 * @returns {Promise<Array>} Array of petition objects
 */
async function getMyPetitions() {
    const result = await apiRequest('/petitions/mine');
    return result.petitions || result.data || [];
}

/**
 * Get petition details by ID
 * @param {string} petitionId - Petition ID
 * @returns {Promise<Object>} Petition details
 */
async function getPetitionDetails(petitionId) {
    const result = await apiRequest(`/petitions/${petitionId}/details`);
    return result.data || result.petition || result;
}

/**
 * Publish a draft petition (set to ACTIVE)
 * @param {string} petitionId - Petition ID
 * @returns {Promise<Object>} Updated petition
 */
async function publishPetition(petitionId) {
    const result = await apiRequest(`/petitions/${petitionId}/publish`, {
        method: 'POST'
    });
    return result.petition || result;
}

/**
 * Close an active petition
 * @param {string} petitionId - Petition ID
 * @returns {Promise<Object>} Updated petition
 */
async function closePetition(petitionId) {
    const result = await apiRequest(`/petitions/${petitionId}/close`, {
        method: 'POST'
    });
    return result.petition || result;
}

/**
 * Get petition signatures with pagination and filters
 * @param {string} petitionId - Petition ID
 * @param {Object} [params={}] - Query parameters (page, limit, status, search)
 * @returns {Promise<Object>} Signatures response with pagination
 */
async function getPetitionSignatures(petitionId, params = {}) {
    const queryParts = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
    if (params.status) queryParts.push(`status=${params.status}`);
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);

    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiRequest(`/petitions/${petitionId}/signatures${query}`);
}

/**
 * Get QR code data URL for a petition
 * @param {string} petitionId - Petition ID
 * @returns {Promise<string>} QR code data URL
 */
async function getQRCode(petitionId) {
    const result = await apiRequest(`/petitions/${petitionId}/qr-code`);
    return result.data || result.qrCodeUrl || result.dataUrl || result;
}

/**
 * Get audit log for a petition
 * @param {string} petitionId - Petition ID
 * @returns {Promise<Array>} Array of audit log entries
 */
async function getAuditLog(petitionId) {
    const result = await apiRequest(`/petitions/${petitionId}/audit-log`);
    return result.auditLog || result.entries || result.data || [];
}

// ==================== Verification Balance API ====================

/**
 * Get campaign verification balance
 * @returns {Promise<Object>} Balance data
 */
async function getVerificationBalance() {
    const result = await apiRequest('/verification-billing/balance');
    return result;
}

/**
 * Get verification purchase history
 * @returns {Promise<Array>} Array of purchase objects
 */
async function getVerificationPurchases() {
    const result = await apiRequest('/verification-billing/purchases');
    return result.purchases || result.data || [];
}

/**
 * Create Stripe Checkout for verification credits
 * @param {Object} [options] - Checkout options
 * @returns {Promise<Object>} Checkout session with url
 */
async function createVerificationCheckout(options = {}) {
    const result = await apiRequest('/verification-billing/checkout', {
        method: 'POST',
        body: JSON.stringify(options)
    });
    return result;
}

/**
 * Toggle auto-replenish for verification credits
 * @param {boolean} enabled - Whether to enable or disable
 * @returns {Promise<Object>} Updated settings
 */
async function toggleAutoReplenish(enabled) {
    const result = await apiRequest('/petitions/verification-auto-replenish', {
        method: 'POST',
        body: JSON.stringify({ enabled })
    });
    return result;
}

// ==================== Dashboard Init ====================

/**
 * Initialize the petition dashboard
 */
async function initDashboard() {
    const container = document.getElementById('petitionDashboardContainer');
    if (!container) return;

    try {
        dashboardState.currentUser = await checkAuth();

        if (dashboardState.currentUser) {
            standaloneAuthRefresh.start();

            // Detect candidate status
            dashboardState.isCandidate = !!(
                dashboardState.currentUser.candidateProfile?.isVerified ||
                dashboardState.currentUser.candidateId
            );

            // Load petitions
            await loadPetitions();
        }

        dashboardState.loading = false;
        render(container);
        setupEventListeners(container);
    } catch (error) {
        dashboardState.loading = false;
        dashboardState.error = error.message;
        render(container);
    }
}

/**
 * Load petitions for the current user
 */
async function loadPetitions() {
    try {
        dashboardState.petitions = await getMyPetitions();
    } catch (error) {
        dashboardState.petitions = [];
    }
}

/**
 * Load petition details, signatures, QR code, and audit log
 * @param {string} petitionId - Petition ID
 */
async function loadPetitionDetail(petitionId) {
    const container = document.getElementById('petitionDashboardContainer');
    dashboardState.loading = true;
    dashboardState.view = 'detail';
    render(container);

    try {
        dashboardState.selectedPetition = await getPetitionDetails(petitionId);
        dashboardState.signaturePagination.page = 1;
        dashboardState.signatureFilters = { status: '', search: '' };

        // Load signatures, QR code, and audit log in parallel
        const [sigResult, qrCode, auditLog] = await Promise.allSettled([
            getPetitionSignatures(petitionId, {
                page: 1,
                limit: dashboardState.signaturePagination.limit
            }),
            dashboardState.selectedPetition.status !== 'DRAFT'
                ? getQRCode(petitionId)
                : Promise.resolve(null),
            getAuditLog(petitionId)
        ]);

        if (sigResult.status === 'fulfilled') {
            const sigData = sigResult.value.data || sigResult.value;
            dashboardState.signatures = sigData.signatures || (Array.isArray(sigData) ? sigData : []);
            dashboardState.signaturePagination.total = sigData.total || sigData.pagination?.total || 0;
        }

        if (qrCode.status === 'fulfilled' && qrCode.value) {
            dashboardState.qrCodeUrl = qrCode.value;
        }

        if (auditLog.status === 'fulfilled') {
            dashboardState.auditLog = auditLog.value;
        }

        // Load verification balance if petition has voter verification enabled
        if (dashboardState.selectedPetition.voterVerificationEnabled && dashboardState.isCandidate) {
            loadVerificationBalance(container);
        }

        dashboardState.loading = false;
        render(container);
    } catch (error) {
        dashboardState.loading = false;
        dashboardState.error = error.message;
        render(container);
    }
}

/**
 * Reload signatures with current filters and pagination
 */
async function reloadSignatures() {
    if (!dashboardState.selectedPetition) return;

    try {
        const result = await getPetitionSignatures(dashboardState.selectedPetition.id, {
            page: dashboardState.signaturePagination.page,
            limit: dashboardState.signaturePagination.limit,
            status: dashboardState.signatureFilters.status || undefined,
            search: dashboardState.signatureFilters.search || undefined
        });

        dashboardState.signatures = result.signatures || result.data || [];
        dashboardState.signaturePagination.total = result.total || result.pagination?.total || 0;

        const container = document.getElementById('petitionDashboardContainer');
        render(container);
    } catch (error) {
        showToast('Failed to load signatures');
    }
}

// ==================== Event Listeners ====================

/**
 * Set up event delegation for the dashboard
 * @param {HTMLElement} container - Dashboard container element
 */
function setupEventListeners(container) {
    container.addEventListener('click', async (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const petitionId = target.dataset.petitionId;

        switch (action) {
            case 'show-create':
                dashboardState.view = 'create';
                render(container);
                break;

            case 'back-to-list':
                dashboardState.view = 'list';
                dashboardState.selectedPetition = null;
                dashboardState.qrCodeUrl = null;
                dashboardState.auditLog = [];
                dashboardState.auditLogOpen = false;
                await loadPetitions();
                render(container);
                break;

            case 'view-petition':
                if (petitionId) {
                    await loadPetitionDetail(petitionId);
                }
                break;

            case 'create-petition':
                await handleCreatePetition(container);
                break;

            case 'publish-petition':
                await handlePublishPetition(container);
                break;

            case 'close-petition':
                await handleClosePetition(container);
                break;

            case 'download-qr':
                handleDownloadQR();
                break;

            case 'copy-link':
                handleCopyLink();
                break;

            case 'view-signing-page':
                if (dashboardState.selectedPetition) {
                    window.open(getSigningUrl(dashboardState.selectedPetition), '_blank');
                }
                break;

            case 'toggle-audit-log':
                dashboardState.auditLogOpen = !dashboardState.auditLogOpen;
                render(container);
                break;

            case 'purchase-verifications':
                handlePurchaseVerifications();
                break;

            case 'load-verification-balance':
                loadVerificationBalance(container);
                break;

            case 'sig-prev-page':
                if (dashboardState.signaturePagination.page > 1) {
                    dashboardState.signaturePagination.page--;
                    await reloadSignatures();
                }
                break;

            case 'sig-next-page': {
                const totalPages = Math.ceil(
                    dashboardState.signaturePagination.total / dashboardState.signaturePagination.limit
                );
                if (dashboardState.signaturePagination.page < totalPages) {
                    dashboardState.signaturePagination.page++;
                    await reloadSignatures();
                }
                break;
            }
        }
    });

    // Handle signature filter changes via input/change events
    container.addEventListener('change', (e) => {
        if (e.target.id === 'sig-status-filter') {
            dashboardState.signatureFilters.status = e.target.value;
            dashboardState.signaturePagination.page = 1;
            reloadSignatures();
        }
        if (e.target.id === 'auto-replenish-toggle') {
            handleToggleAutoReplenish(e.target.checked, container);
        }
    });

    // Debounced search input
    let searchTimeout = null;
    container.addEventListener('input', (e) => {
        if (e.target.id === 'sig-search-input') {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                dashboardState.signatureFilters.search = e.target.value;
                dashboardState.signaturePagination.page = 1;
                reloadSignatures();
            }, 400);
        }
    });
}

// ==================== Action Handlers ====================

/**
 * Handle create petition form submission
 * @param {HTMLElement} container - Dashboard container element
 */
async function handleCreatePetition(container) {
    if (dashboardState.creating) return;

    const form = container.querySelector('#petition-create-form');
    if (!form) return;

    // Gather form data
    const title = form.querySelector('#petition-title')?.value?.trim();
    const description = form.querySelector('#petition-description')?.value?.trim();
    const category = form.querySelector('#petition-category')?.value || undefined;
    const geographicScope = form.querySelector('#petition-scope')?.value || undefined;
    const signatureGoalStr = form.querySelector('#petition-goal')?.value;
    const signatureGoal = signatureGoalStr ? parseInt(signatureGoalStr, 10) : undefined;
    const attestationLanguage = form.querySelector('#petition-attestation')?.value?.trim() || undefined;
    const voterVerification = form.querySelector('#petition-voter-verification')?.checked || false;
    const privacyConsentText = form.querySelector('#petition-privacy-consent')?.value?.trim() || undefined;

    // Collect required signer fields
    const requiredFields = [];
    const checkboxes = form.querySelectorAll('.signer-field-checkbox:checked');
    checkboxes.forEach(cb => requiredFields.push(cb.value));

    // Candidate-specific fields
    const customSlug = form.querySelector('#petition-slug')?.value?.trim() || undefined;
    const party = form.querySelector('#petition-party')?.value?.trim() || undefined;
    const electionYearStr = form.querySelector('#petition-election-year')?.value;
    const electionYear = electionYearStr ? parseInt(electionYearStr, 10) : undefined;
    const filingDeadline = form.querySelector('#petition-filing-deadline')?.value || undefined;

    // Validate
    if (!title || title.length < 3 || title.length > 200) {
        showToast('Title must be between 3 and 200 characters');
        return;
    }
    if (!description || description.length < 10 || description.length > 5000) {
        showToast('Description must be between 10 and 5000 characters');
        return;
    }

    const petitionData = {
        title,
        description,
        category,
        geographicScope,
        signatureGoal,
        attestationLanguage,
        voterRegistrationVerification: voterVerification,
        privacyConsentText,
        requiredSignerFields: requiredFields.length > 0 ? requiredFields : undefined,
        customSlug,
        party,
        electionYear,
        filingDeadline
    };

    // Remove undefined values
    Object.keys(petitionData).forEach(key => {
        if (petitionData[key] === undefined) {
            delete petitionData[key];
        }
    });

    dashboardState.creating = true;
    render(container);

    try {
        const petition = await createPetition(petitionData);
        showToast('Petition created successfully');
        await loadPetitionDetail(petition.id);
    } catch (error) {
        showToast(error.message || 'Failed to create petition');
        dashboardState.creating = false;
        render(container);
    }
}

/**
 * Handle publishing a draft petition
 * @param {HTMLElement} container - Dashboard container element
 */
async function handlePublishPetition(container) {
    if (!dashboardState.selectedPetition) return;
    if (!confirm('Are you sure you want to publish this petition? It will become active and open for signatures.')) return;

    try {
        await publishPetition(dashboardState.selectedPetition.id);
        showToast('Petition published successfully');
        await loadPetitionDetail(dashboardState.selectedPetition.id);
    } catch (error) {
        showToast(error.message || 'Failed to publish petition');
    }
}

/**
 * Handle closing an active petition
 * @param {HTMLElement} container - Dashboard container element
 */
async function handleClosePetition(container) {
    if (!dashboardState.selectedPetition) return;
    if (!confirm('Are you sure you want to close this petition? No new signatures will be accepted.')) return;

    try {
        await closePetition(dashboardState.selectedPetition.id);
        showToast('Petition closed successfully');
        await loadPetitionDetail(dashboardState.selectedPetition.id);
    } catch (error) {
        showToast(error.message || 'Failed to close petition');
    }
}

/**
 * Handle downloading the QR code image
 */
function handleDownloadQR() {
    if (!dashboardState.qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = dashboardState.qrCodeUrl;
    link.download = `petition-qr-${dashboardState.selectedPetition?.id || 'code'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Handle copying the signing page link to clipboard
 */
function handleCopyLink() {
    if (!dashboardState.selectedPetition) return;

    const url = getSigningUrl(dashboardState.selectedPetition);
    navigator.clipboard.writeText(url).then(() => {
        showToast('Signing link copied to clipboard');
    }).catch(() => {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Signing link copied to clipboard');
    });
}

// ==================== Verification Balance Handlers ====================

/**
 * Load verification balance and purchase history
 * @param {HTMLElement} container - Dashboard container element
 */
async function loadVerificationBalance(container) {
    dashboardState.verificationBalanceLoading = true;
    render(container);

    try {
        const [balance, purchases] = await Promise.allSettled([
            getVerificationBalance(),
            getVerificationPurchases()
        ]);

        if (balance.status === 'fulfilled') {
            dashboardState.verificationBalance = balance.value;
        }
        if (purchases.status === 'fulfilled') {
            dashboardState.verificationPurchases = purchases.value;
        }
    } catch {
        // Non-critical failure
    }

    dashboardState.verificationBalanceLoading = false;
    render(container);
}

/**
 * Handle purchasing more verification credits via Stripe Checkout
 */
async function handlePurchaseVerifications() {
    try {
        const result = await createVerificationCheckout();
        if (result.url) {
            window.location.href = result.url;
        } else {
            showToast('Failed to create checkout session');
        }
    } catch (error) {
        showToast(error.message || 'Failed to create checkout session');
    }
}

/**
 * Handle toggling auto-replenish for verification credits
 * @param {boolean} enabled - Whether to enable or disable
 * @param {HTMLElement} container - Dashboard container element
 */
async function handleToggleAutoReplenish(enabled, container) {
    try {
        await toggleAutoReplenish(enabled);
        if (dashboardState.verificationBalance) {
            dashboardState.verificationBalance.autoReplenish = enabled;
        }
        showToast(enabled ? 'Auto-replenish enabled' : 'Auto-replenish disabled');
    } catch (error) {
        showToast(error.message || 'Failed to update auto-replenish');
        render(container);
    }
}

// ==================== Render ====================

/**
 * Main render function — rebuilds dashboard view based on state
 * @param {HTMLElement} container - Dashboard container element
 */
function render(container) {
    if (!container) return;

    // Loading state
    if (dashboardState.loading) {
        container.innerHTML = `
            <div class="petition-dashboard-loading">
                <div class="loading-spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        `;
        return;
    }

    // Error state
    if (dashboardState.error) {
        container.innerHTML = `
            <div class="petition-dashboard-error">
                <h2>Error</h2>
                <p>${escapeHtml(dashboardState.error)}</p>
                <a href="/" class="petition-btn petition-btn-primary">Return to Home</a>
            </div>
        `;
        return;
    }

    // Not authenticated
    if (!dashboardState.currentUser) {
        container.innerHTML = `
            <div class="petition-login-prompt">
                <h2>Sign In Required</h2>
                <p>You need to be signed in to manage your petitions.</p>
                <a href="/#login" class="petition-btn petition-btn-primary">Sign In</a>
            </div>
        `;
        return;
    }

    // Route to appropriate view
    switch (dashboardState.view) {
        case 'list':
            container.innerHTML = renderListView();
            break;
        case 'create':
            container.innerHTML = renderCreateView();
            break;
        case 'detail':
            container.innerHTML = renderDetailView();
            break;
        default:
            container.innerHTML = renderListView();
    }
}

// ==================== List View ====================

/**
 * Render the petition list view
 * @returns {string} HTML string
 */
function renderListView() {
    const petitions = dashboardState.petitions;

    if (petitions.length === 0) {
        return `
            <div class="petition-header">
                <h1>My Petitions</h1>
            </div>
            <div class="petition-empty-state">
                <h3>No Petitions Yet</h3>
                <p>You haven't created any petitions yet. Create your first petition to start collecting signatures.</p>
                <button class="petition-btn petition-btn-primary" data-action="show-create">
                    Create New Petition
                </button>
            </div>
        `;
    }

    const cardsHtml = petitions.map(p => renderPetitionCard(p)).join('');

    return `
        <div class="petition-header">
            <h1>My Petitions</h1>
            <button class="petition-btn petition-btn-primary" data-action="show-create">
                Create New Petition
            </button>
        </div>
        <div class="petition-cards">
            ${cardsHtml}
        </div>
    `;
}

/**
 * Render a single petition card
 * @param {Object} petition - Petition object
 * @returns {string} HTML string
 */
function renderPetitionCard(petition) {
    const statusClass = STATUS_CLASSES[petition.status] || 'draft';
    const statusLabel = STATUS_LABELS[petition.status] || petition.status;
    const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === petition.category)?.label;

    const signatureCount = petition.currentSignatures ?? petition._count?.signatures ?? petition.signatureCount ?? 0;
    const goal = petition.signatureGoal;

    let progressHtml = '';
    if (goal) {
        const pct = Math.min(100, Math.round((signatureCount / goal) * 100));
        progressHtml = `
            <div class="petition-progress">
                <div class="petition-progress-bar">
                    <div class="petition-progress-fill" style="width: ${pct}%"></div>
                </div>
                <div class="petition-progress-text">${signatureCount.toLocaleString()} / ${goal.toLocaleString()} signatures (${pct}%)</div>
            </div>
        `;
    }

    return `
        <div class="petition-card" data-action="view-petition" data-petition-id="${petition.id}">
            <div class="petition-card-header">
                <h3 class="petition-card-title">${escapeHtml(petition.title)}</h3>
                <div class="petition-card-meta">
                    <span class="petition-status-badge ${statusClass}">${statusLabel}</span>
                    ${categoryLabel ? `<span class="petition-category-badge">${escapeHtml(categoryLabel)}</span>` : ''}
                </div>
            </div>
            <div class="petition-card-stats">
                <span><strong>${signatureCount.toLocaleString()}</strong> signatures</span>
                <span>Created ${formatDate(petition.createdAt)}</span>
            </div>
            ${progressHtml}
        </div>
    `;
}

// ==================== Create View ====================

/**
 * Render the petition creation form
 * @returns {string} HTML string
 */
function renderCreateView() {
    const candidateFieldsHtml = dashboardState.isCandidate ? renderCandidateFields() : '';

    return `
        <button class="petition-back-btn" data-action="back-to-list">
            &larr; Back to My Petitions
        </button>
        <div class="petition-form">
            <h2>Create New Petition</h2>
            <form id="petition-create-form" onsubmit="return false;">
                <div class="petition-form-group">
                    <label for="petition-title">
                        Title <span class="form-hint">(3-200 characters)</span>
                    </label>
                    <input type="text" id="petition-title" minlength="3" maxlength="200"
                        placeholder="Enter your petition title" required>
                </div>

                <div class="petition-form-group">
                    <label for="petition-description">
                        Description <span class="form-hint">(10-5000 characters)</span>
                    </label>
                    <textarea id="petition-description" minlength="10" maxlength="5000"
                        placeholder="Describe your petition's purpose and goals" required></textarea>
                </div>

                <div class="petition-form-group">
                    <label for="petition-category">Category</label>
                    <select id="petition-category">
                        ${CATEGORY_OPTIONS.map(opt => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`).join('')}
                    </select>
                </div>

                <div class="petition-form-group">
                    <label for="petition-scope">Geographic Scope</label>
                    <select id="petition-scope">
                        ${SCOPE_OPTIONS.map(opt => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`).join('')}
                    </select>
                </div>

                <div class="petition-form-group">
                    <label for="petition-goal">
                        Signature Goal <span class="form-hint">(optional)</span>
                    </label>
                    <input type="number" id="petition-goal" min="1" placeholder="e.g. 1000">
                </div>

                <div class="petition-form-section">
                    <h3>Required Signer Fields</h3>
                    <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
                        Select additional fields that signers must provide.
                        Name is always required.
                    </p>
                    <div class="petition-checkbox-group">
                        ${SIGNER_FIELDS.map(field => `
                            <label class="petition-checkbox-item">
                                <input type="checkbox" class="signer-field-checkbox" value="${field.value}">
                                ${escapeHtml(field.label)}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="petition-form-section">
                    <h3>Attestation &amp; Verification</h3>

                    <div class="petition-form-group">
                        <label for="petition-attestation">
                            Attestation Language <span class="form-hint">(optional)</span>
                        </label>
                        <textarea id="petition-attestation"
                            placeholder="Custom attestation language...">${escapeHtml(DEFAULT_ATTESTATION)}</textarea>
                    </div>

                    <div class="petition-form-group">
                        <label class="petition-toggle">
                            <input type="checkbox" id="petition-voter-verification">
                            <span class="petition-toggle-switch"></span>
                            <span class="petition-toggle-label">Enable voter registration verification for signers</span>
                        </label>
                    </div>

                    <div class="petition-form-group">
                        <label for="petition-privacy-consent">
                            Privacy Consent Text <span class="form-hint">(optional)</span>
                        </label>
                        <textarea id="petition-privacy-consent"
                            placeholder="Custom privacy consent text shown to signers..."></textarea>
                    </div>
                </div>

                ${candidateFieldsHtml}

                <div class="petition-form-actions">
                    <button type="button" class="petition-btn petition-btn-secondary" data-action="back-to-list">
                        Cancel
                    </button>
                    <button type="button" class="petition-btn petition-btn-primary"
                        data-action="create-petition" ${dashboardState.creating ? 'disabled' : ''}>
                        ${dashboardState.creating ? 'Creating...' : 'Create Petition'}
                    </button>
                </div>
            </form>
        </div>
    `;
}

/**
 * Render candidate-specific form fields
 * @returns {string} HTML string
 */
function renderCandidateFields() {
    return `
        <div class="petition-form-section">
            <h3>Candidate Information</h3>
            <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
                These fields are available to verified candidates for ballot access petitions.
            </p>

            <div class="petition-form-group">
                <label for="petition-slug">
                    Custom Slug <span class="form-hint">(optional)</span>
                </label>
                <input type="text" id="petition-slug"
                    placeholder="my-petition-name" pattern="[a-z0-9-]+"
                    oninput="this.value = this.value.toLowerCase().replace(/[^a-z0-9-]/g, '')">
                <div class="petition-slug-preview" id="slug-preview">
                    Preview: ${window.location.origin}/sign/<span id="slug-preview-text">your-slug</span>
                </div>
            </div>

            <div class="petition-form-group">
                <label for="petition-party">Party</label>
                <input type="text" id="petition-party" placeholder="e.g. Independent">
            </div>

            <div class="petition-form-group">
                <label for="petition-election-year">Election Year</label>
                <input type="number" id="petition-election-year"
                    min="2024" max="2040" placeholder="e.g. 2026">
            </div>

            <div class="petition-form-group">
                <label for="petition-filing-deadline">Filing Deadline</label>
                <input type="date" id="petition-filing-deadline">
            </div>
        </div>
    `;
}

// ==================== Detail View ====================

/**
 * Render the petition detail view
 * @returns {string} HTML string
 */
function renderDetailView() {
    const p = dashboardState.selectedPetition;
    if (!p) return '';

    const statusClass = STATUS_CLASSES[p.status] || 'draft';
    const statusLabel = STATUS_LABELS[p.status] || p.status;
    const categoryLabel = CATEGORY_OPTIONS.find(c => c.value === p.category)?.label;

    return `
        <button class="petition-back-btn" data-action="back-to-list">
            &larr; Back to My Petitions
        </button>
        <div class="petition-detail">
            ${renderDetailHeader(p, statusClass, statusLabel, categoryLabel)}
            ${renderStatsRow(p)}
            ${p.voterVerificationEnabled && dashboardState.isCandidate ? renderVerificationBalanceSection() : ''}
            ${p.status !== 'DRAFT' ? renderQRSection(p) : ''}
            ${renderSignaturesSection()}
            ${renderAuditLogSection()}
        </div>
    `;
}

/**
 * Render the detail view header with title, description, and actions
 * @param {Object} p - Petition object
 * @param {string} statusClass - CSS class for status badge
 * @param {string} statusLabel - Display label for status
 * @param {string|undefined} categoryLabel - Display label for category
 * @returns {string} HTML string
 */
function renderDetailHeader(p, statusClass, statusLabel, categoryLabel) {
    let actionsHtml = '';
    if (p.status === 'DRAFT') {
        actionsHtml = `
            <button class="petition-btn petition-btn-success" data-action="publish-petition">
                Publish Petition
            </button>
        `;
    } else if (p.status === 'ACTIVE') {
        actionsHtml = `
            <button class="petition-btn petition-btn-secondary" data-action="view-signing-page">
                View Signing Page
            </button>
            <button class="petition-btn petition-btn-danger" data-action="close-petition">
                Close Petition
            </button>
        `;
    }

    return `
        <div class="petition-detail-header">
            <h2 class="petition-detail-title">${escapeHtml(p.title)}</h2>
            <div class="petition-detail-meta">
                <span class="petition-status-badge ${statusClass}">${statusLabel}</span>
                ${categoryLabel ? `<span class="petition-category-badge">${escapeHtml(categoryLabel)}</span>` : ''}
                <span style="color: #6b7280; font-size: 14px;">Created ${formatDate(p.createdAt)}</span>
            </div>
            <div class="petition-detail-description">${escapeHtml(p.description)}</div>
            ${actionsHtml ? `<div class="petition-detail-actions">${actionsHtml}</div>` : ''}
        </div>
    `;
}

/**
 * Render the stats row with signature counts
 * @param {Object} p - Petition object
 * @returns {string} HTML string
 */
function renderStatsRow(p) {
    const total = p._count?.signatures ?? p.signatureCount ?? dashboardState.signaturePagination.total;
    const verified = p.verifiedCount ?? 0;
    const unverified = p.unverifiedCount ?? (total - verified);
    const flagged = p.flaggedCount ?? 0;
    const rejected = p.rejectedCount ?? 0;

    return `
        <div class="petition-stats-row">
            <div class="petition-stat-card">
                <div class="petition-stat-value">${total.toLocaleString()}</div>
                <div class="petition-stat-label">Total Signatures</div>
            </div>
            <div class="petition-stat-card">
                <div class="petition-stat-value">${verified.toLocaleString()}</div>
                <div class="petition-stat-label">Verified</div>
            </div>
            <div class="petition-stat-card">
                <div class="petition-stat-value">${Math.max(0, unverified).toLocaleString()}</div>
                <div class="petition-stat-label">Unverified</div>
            </div>
            <div class="petition-stat-card">
                <div class="petition-stat-value">${flagged.toLocaleString()}</div>
                <div class="petition-stat-label">Flagged</div>
            </div>
            <div class="petition-stat-card">
                <div class="petition-stat-value">${rejected.toLocaleString()}</div>
                <div class="petition-stat-label">Rejected</div>
            </div>
        </div>
    `;
}

/**
 * Render the verification balance section for petitions with voter verification
 * @returns {string} HTML string
 */
function renderVerificationBalanceSection() {
    const balance = dashboardState.verificationBalance;
    const purchases = dashboardState.verificationPurchases;
    const loading = dashboardState.verificationBalanceLoading;

    if (loading) {
        return `
            <div class="petition-verification-balance-section">
                <h3>Verification Balance</h3>
                <p style="color: #9ca3af; text-align: center; padding: 16px;">Loading balance...</p>
            </div>
        `;
    }

    if (!balance) {
        return `
            <div class="petition-verification-balance-section">
                <h3>Verification Balance</h3>
                <p style="color: #9ca3af; text-align: center; padding: 16px;">Unable to load balance.</p>
                <div style="text-align: center;">
                    <button class="petition-btn petition-btn-secondary petition-btn-sm" data-action="load-verification-balance">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    const used = balance.used || 0;
    const total = balance.total || 0;
    const remaining = Math.max(0, total - used);
    const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    const autoReplenish = balance.autoReplenish || false;

    let purchaseRowsHtml = '';
    if (purchases.length > 0) {
        purchaseRowsHtml = purchases.map(p => `
            <tr>
                <td>${formatDate(p.createdAt || p.date)}</td>
                <td>${(p.amount || 1000).toLocaleString()}</td>
                <td>$${((p.price || p.amountPaid || 10000) / 100).toFixed(2)}</td>
                <td><span class="petition-verification-badge ${p.status === 'completed' || p.status === 'succeeded' ? 'voter-verified' : 'unverified'}">${escapeHtml(p.status || 'Completed')}</span></td>
            </tr>
        `).join('');
    } else {
        purchaseRowsHtml = `
            <tr>
                <td colspan="4" class="petition-table-empty">No purchases yet</td>
            </tr>
        `;
    }

    return `
        <div class="petition-verification-balance-section">
            <h3>Verification Balance</h3>

            <div class="petition-verification-balance-bar-wrapper">
                <div class="petition-verification-balance-stats">
                    <span>${used.toLocaleString()} of ${total.toLocaleString()} verifications used</span>
                    <span>${remaining.toLocaleString()} remaining</span>
                </div>
                <div class="petition-verification-balance-bar">
                    <div class="petition-verification-balance-fill" style="width: ${pct}%"></div>
                </div>
            </div>

            <div class="petition-verification-balance-actions">
                <button class="petition-btn petition-btn-primary petition-btn-sm" data-action="purchase-verifications">
                    Purchase More
                </button>

                <label class="petition-toggle" style="margin: 0;">
                    <input type="checkbox" id="auto-replenish-toggle" data-action="toggle-auto-replenish" ${autoReplenish ? 'checked' : ''}>
                    <span class="petition-toggle-switch"></span>
                    <span class="petition-toggle-label">Auto-Replenish</span>
                </label>
            </div>

            <div class="petition-verification-purchase-history">
                <h4>Purchase History</h4>
                <div class="petition-table-wrapper">
                    <table class="petition-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Verifications</th>
                                <th>Price</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${purchaseRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render the QR code section for non-draft petitions
 * @param {Object} p - Petition object
 * @returns {string} HTML string
 */
function renderQRSection(p) {
    const qrHtml = dashboardState.qrCodeUrl
        ? `<img src="${dashboardState.qrCodeUrl}" alt="Petition QR Code">`
        : '<p style="color: #9ca3af;">Loading QR code...</p>';

    return `
        <div class="petition-qr-section">
            <h3>Share This Petition</h3>
            ${qrHtml}
            <div class="petition-qr-actions">
                ${dashboardState.qrCodeUrl ? `
                    <button class="petition-btn petition-btn-secondary petition-btn-sm" data-action="download-qr">
                        Download QR Code
                    </button>
                ` : ''}
                <button class="petition-btn petition-btn-secondary petition-btn-sm" data-action="copy-link">
                    Copy Signing Link
                </button>
            </div>
            <p style="margin-top: 12px; font-size: 13px; color: #6b7280;">
                ${escapeHtml(getSigningUrl(p))}
            </p>
        </div>
    `;
}

/**
 * Render the signatures table section with filters and pagination
 * @returns {string} HTML string
 */
function renderSignaturesSection() {
    const sigs = dashboardState.signatures;
    const { page, limit, total } = dashboardState.signaturePagination;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    let tableBodyHtml = '';
    if (sigs.length === 0) {
        tableBodyHtml = `
            <tr>
                <td colspan="5" class="petition-table-empty">
                    No signatures found
                </td>
            </tr>
        `;
    } else {
        tableBodyHtml = sigs.map(sig => {
            const verClass = VERIFICATION_CLASSES[sig.signatureStatus || sig.verificationStatus] || 'unverified';
            const verLabel = VERIFICATION_LABELS[sig.signatureStatus || sig.verificationStatus] || sig.signatureStatus || 'Unverified';
            const name = [sig.signerFirstName || sig.firstName, sig.signerLastName || sig.lastName].filter(Boolean).join(' ') || 'Anonymous';
            const location = [sig.signerCity || sig.city, sig.signerState || sig.state].filter(Boolean).join(', ') || '-';

            return `
                <tr>
                    <td>${escapeHtml(name)}</td>
                    <td>${escapeHtml(location)}</td>
                    <td>${formatDate(sig.signedAt || sig.createdAt)}</td>
                    <td>
                        <span class="petition-verification-badge ${verClass}">${verLabel}</span>
                    </td>
                    <td>-</td>
                </tr>
            `;
        }).join('');
    }

    return `
        <div class="petition-signatures-section">
            <h3>Signatures</h3>
            <div class="petition-signatures-filters">
                <input type="text" id="sig-search-input" placeholder="Search by name..."
                    value="${escapeHtml(dashboardState.signatureFilters.search)}">
                <select id="sig-status-filter">
                    <option value="">All Statuses</option>
                    <option value="UNVERIFIED" ${dashboardState.signatureFilters.status === 'UNVERIFIED' ? 'selected' : ''}>Unverified</option>
                    <option value="VOTER_VERIFIED" ${dashboardState.signatureFilters.status === 'VOTER_VERIFIED' ? 'selected' : ''}>Verified</option>
                    <option value="FLAGGED_DUPLICATE" ${dashboardState.signatureFilters.status === 'FLAGGED_DUPLICATE' ? 'selected' : ''}>Flagged</option>
                    <option value="REJECTED" ${dashboardState.signatureFilters.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
            <div class="petition-table-wrapper">
                <table class="petition-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBodyHtml}
                    </tbody>
                </table>
            </div>
            ${total > 0 ? `
                <div class="petition-pagination">
                    <span>Showing ${((page - 1) * limit) + 1}-${Math.min(page * limit, total)} of ${total}</span>
                    <div class="petition-pagination-controls">
                        <button class="petition-btn petition-btn-secondary petition-btn-sm"
                            data-action="sig-prev-page" ${page <= 1 ? 'disabled' : ''}>
                            Previous
                        </button>
                        <button class="petition-btn petition-btn-secondary petition-btn-sm"
                            data-action="sig-next-page" ${page >= totalPages ? 'disabled' : ''}>
                            Next
                        </button>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render the collapsible audit log section
 * @returns {string} HTML string
 */
function renderAuditLogSection() {
    const entries = dashboardState.auditLog;
    const isOpen = dashboardState.auditLogOpen;

    let contentHtml = '';
    if (isOpen) {
        if (entries.length === 0) {
            contentHtml = `
                <div class="petition-audit-content">
                    <p style="color: #9ca3af; text-align: center; padding: 20px;">No audit log entries</p>
                </div>
            `;
        } else {
            const rowsHtml = entries.map(entry => `
                <tr>
                    <td>${formatDateTime(entry.createdAt || entry.timestamp)}</td>
                    <td>${escapeHtml(entry.action || entry.type)}</td>
                    <td>${escapeHtml(entry.actorName || entry.actor || '-')}</td>
                    <td>${escapeHtml(entry.details || entry.description || '-')}</td>
                </tr>
            `).join('');

            contentHtml = `
                <div class="petition-audit-content">
                    <div class="petition-table-wrapper">
                        <table class="petition-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Action</th>
                                    <th>Actor</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    return `
        <div class="petition-audit-section">
            <button class="petition-audit-toggle" data-action="toggle-audit-log">
                <span>Audit Log (${entries.length})</span>
                <span class="chevron ${isOpen ? 'open' : ''}">&#9660;</span>
            </button>
            ${contentHtml}
        </div>
    `;
}

// ==================== Initialize ====================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

export { initDashboard };
export default { initDashboard };
