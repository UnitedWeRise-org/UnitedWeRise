/**
 * @module features/petitions/sign-petition
 * @description Multi-step wizard for signing a petition via public link.
 * No account required. Uses hCaptcha for bot protection.
 *
 * URL format: /sign/{code}
 * Where {code} is the petition short code or custom slug.
 */

import { getPetitionForSigning, submitSignature } from './petitions-api.js';

// ==================== Constants ====================

/**
 * US states for address dropdown
 * @type {Array<{code: string, name: string}>}
 */
const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
    { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

/** hCaptcha site key */
const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001';

/** Step definitions for the wizard */
const STEPS = [
    { id: 'info', title: 'Petition Info' },
    { id: 'signer', title: 'Your Information' },
    { id: 'attest', title: 'Attestation' },
    { id: 'captcha', title: 'Verify & Submit' },
    { id: 'confirmation', title: 'Confirmed' }
];

// ==================== State ====================

/**
 * Application state for the signing wizard
 */
const state = {
    currentStep: 0,
    petition: null,
    code: '',
    formData: {
        signerFirstName: '',
        signerLastName: '',
        signerAddress: '',
        signerCity: '',
        signerState: '',
        signerZip: '',
        signerCounty: '',
        signerDateOfBirth: '',
        signerEmail: '',
        signerPhone: '',
        signatureConfirmation: '',
        attestedAt: null,
        privacyConsented: false,
        captchaToken: null,
        geolocation: null,
        geolocationConsented: false,
        deviceFingerprint: null
    },
    errors: {},
    submitting: false,
    submitted: false,
    result: null,
    errorMessage: null,
    alreadySigned: false
};

/** @type {HTMLElement|null} */
let appContainer = null;

// ==================== Utility Functions ====================

/**
 * Escape HTML entities to prevent XSS in rendered content
 * @param {string} str - Raw string
 * @returns {string} Escaped string safe for innerHTML
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Generate a lightweight device fingerprint from browser properties.
 * Uses only standard browser APIs -- no external libraries.
 * @returns {string} Base-36 hash string
 */
function generateDeviceFingerprint() {
    const components = [
        screen.width,
        screen.height,
        screen.colorDepth,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.language,
        navigator.platform,
        new Date().getTimezoneOffset()
    ];
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Validate an email address format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a US ZIP code format (5 digits or 5+4)
 * @param {string} zip - ZIP code to validate
 * @returns {boolean} True if valid format
 */
function isValidZip(zip) {
    return /^\d{5}(-\d{4})?$/.test(zip);
}

/**
 * Format a number with commas for display
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
    return (num || 0).toLocaleString();
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} [type='info'] - Toast type: 'info', 'success', 'error'
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `sign-toast sign-toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('sign-toast--visible'));

    setTimeout(() => {
        toast.classList.remove('sign-toast--visible');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==================== Petition Loading ====================

/**
 * Load petition data from the API
 * @param {string} code - Petition short code or custom slug
 */
async function loadPetition(code) {
    try {
        const data = await getPetitionForSigning(code);
        state.petition = data.petition || data;

        if (data.alreadySigned) {
            state.alreadySigned = true;
        }

        state.formData.deviceFingerprint = generateDeviceFingerprint();
        render();
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
            state.errorMessage = 'This petition could not be found. It may have been closed or the link may be incorrect.';
        } else if (error.message.includes('not active') || error.message.includes('closed')) {
            state.errorMessage = 'This petition is no longer accepting signatures.';
        } else if (error.message.includes('already signed')) {
            state.alreadySigned = true;
            state.errorMessage = 'You have already signed this petition.';
        } else {
            state.errorMessage = 'Failed to load petition. Please check your connection and try again.';
        }
        render();
    }
}

// ==================== Validation ====================

/**
 * Validate the signer information form fields
 * @returns {boolean} True if all required fields are valid
 */
function validateSignerFields() {
    const errors = {};
    const { formData, petition } = state;
    const required = petition.requiredSignerFields || [];

    if (!formData.signerFirstName.trim()) {
        errors.signerFirstName = 'First name is required';
    }
    if (!formData.signerLastName.trim()) {
        errors.signerLastName = 'Last name is required';
    }

    if (required.includes('address') && !formData.signerAddress.trim()) {
        errors.signerAddress = 'Street address is required';
    }
    if (required.includes('city') && !formData.signerCity.trim()) {
        errors.signerCity = 'City is required';
    }
    if (required.includes('state') && !formData.signerState) {
        errors.signerState = 'State is required';
    }
    if (required.includes('zip')) {
        if (!formData.signerZip.trim()) {
            errors.signerZip = 'ZIP code is required';
        } else if (!isValidZip(formData.signerZip.trim())) {
            errors.signerZip = 'Enter a valid ZIP code (e.g., 12345)';
        }
    }
    if (required.includes('county') && !formData.signerCounty.trim()) {
        errors.signerCounty = 'County is required';
    }
    if (required.includes('dateOfBirth') && !formData.signerDateOfBirth) {
        errors.signerDateOfBirth = 'Date of birth is required';
    }
    if (required.includes('email')) {
        if (!formData.signerEmail.trim()) {
            errors.signerEmail = 'Email is required';
        } else if (!isValidEmail(formData.signerEmail.trim())) {
            errors.signerEmail = 'Enter a valid email address';
        }
    }

    // Validate optional fields if provided
    if (formData.signerEmail.trim() && !required.includes('email') && !isValidEmail(formData.signerEmail.trim())) {
        errors.signerEmail = 'Enter a valid email address';
    }
    if (formData.signerZip.trim() && !required.includes('zip') && !isValidZip(formData.signerZip.trim())) {
        errors.signerZip = 'Enter a valid ZIP code (e.g., 12345)';
    }

    state.errors = errors;
    return Object.keys(errors).length === 0;
}

/**
 * Validate the attestation step
 * @returns {boolean} True if attestation is complete
 */
function validateAttestation() {
    const errors = {};
    const { formData, petition } = state;

    const expectedName = `${formData.signerFirstName} ${formData.signerLastName}`.trim().toLowerCase();
    const typedName = (formData.signatureConfirmation || '').trim().toLowerCase();

    if (!typedName) {
        errors.signatureConfirmation = 'Please type your full name to confirm';
    } else if (typedName !== expectedName) {
        errors.signatureConfirmation = 'Name must match your first and last name above';
    }

    if (!formData.attestedAt) {
        errors.attestation = 'You must agree to the attestation statement';
    }

    if (petition.privacyConsentText && !formData.privacyConsented) {
        errors.privacyConsent = 'You must consent to the privacy terms';
    }

    state.errors = errors;
    return Object.keys(errors).length === 0;
}

// ==================== Step Navigation ====================

/**
 * Advance to the next step, validating the current step first
 */
function nextStep() {
    const stepId = STEPS[state.currentStep].id;

    if (stepId === 'signer' && !validateSignerFields()) {
        render();
        return;
    }
    if (stepId === 'attest' && !validateAttestation()) {
        render();
        return;
    }

    state.currentStep = Math.min(state.currentStep + 1, STEPS.length - 1);
    state.errors = {};
    render();

    if (STEPS[state.currentStep].id === 'captcha') {
        renderCaptcha();
    }
}

/**
 * Go back to the previous step
 */
function previousStep() {
    state.currentStep = Math.max(state.currentStep - 1, 0);
    state.errors = {};
    render();
}

// ==================== Submission ====================

/**
 * Submit the petition signature to the backend
 */
async function handleSubmit() {
    if (state.submitting || !state.formData.captchaToken) return;

    state.submitting = true;
    state.errors = {};
    render();

    try {
        const payload = {
            signerFirstName: state.formData.signerFirstName.trim(),
            signerLastName: state.formData.signerLastName.trim(),
            signatureConfirmation: state.formData.signatureConfirmation.trim(),
            attestedAt: state.formData.attestedAt,
            privacyConsented: state.formData.privacyConsented,
            captchaToken: state.formData.captchaToken,
            deviceFingerprint: state.formData.deviceFingerprint
        };

        const optionalFields = [
            'signerAddress', 'signerCity', 'signerState', 'signerZip',
            'signerCounty', 'signerDateOfBirth', 'signerEmail', 'signerPhone'
        ];
        for (const field of optionalFields) {
            const value = state.formData[field];
            if (value && (typeof value !== 'string' || value.trim())) {
                payload[field] = typeof value === 'string' ? value.trim() : value;
            }
        }

        if (state.formData.geolocationConsented && state.formData.geolocation) {
            payload.geolocation = state.formData.geolocation;
            payload.geolocationConsented = true;
        }

        const result = await submitSignature(state.code, payload);
        state.result = result;
        state.submitted = true;
        state.currentStep = STEPS.length - 1;
        render();
    } catch (error) {
        state.submitting = false;
        if (error.message.includes('already signed')) {
            state.alreadySigned = true;
            state.errors.submit = 'You have already signed this petition.';
        } else if (error.message.includes('closed') || error.message.includes('not active')) {
            state.errors.submit = 'This petition is no longer accepting signatures.';
        } else {
            state.errors.submit = error.message || 'Failed to submit signature. Please try again.';
        }
        state.formData.captchaToken = null;
        render();
        if (STEPS[state.currentStep].id === 'captcha') {
            renderCaptcha();
        }
    }
}

// ==================== hCaptcha ====================

/**
 * Render the hCaptcha widget into the captcha container
 */
function renderCaptcha() {
    const container = document.getElementById('hcaptcha-container');
    if (!container || !window.hcaptcha) {
        setTimeout(renderCaptcha, 500);
        return;
    }

    container.innerHTML = '';

    try {
        window.hcaptcha.render(container, {
            sitekey: HCAPTCHA_SITE_KEY,
            callback: (token) => {
                state.formData.captchaToken = token;
                render();
            },
            'expired-callback': () => {
                state.formData.captchaToken = null;
                render();
            },
            'error-callback': () => {
                state.formData.captchaToken = null;
                showToast('CAPTCHA error. Please try again.', 'error');
            }
        });
    } catch (e) {
        container.innerHTML = '<p class="sign-captcha-error">CAPTCHA could not load. Please disable your ad blocker and reload.</p>';
    }
}

// ==================== Geolocation ====================

/**
 * Request geolocation from the browser with user consent
 */
function requestGeolocation() {
    if (!navigator.geolocation) return;

    state.formData.geolocationConsented = true;
    render();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            state.formData.geolocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        },
        () => {
            state.formData.geolocation = null;
        },
        { timeout: 10000, maximumAge: 300000 }
    );
}

// ==================== Rendering ====================

/**
 * Main render function. Rebuilds the app UI based on current state.
 */
function render() {
    if (!appContainer) return;

    // Error state -- petition failed to load
    if (state.errorMessage && !state.petition) {
        appContainer.innerHTML = renderErrorPage(state.errorMessage);
        return;
    }

    // Already signed state
    if (state.alreadySigned && !state.submitted) {
        appContainer.innerHTML = renderAlreadySigned();
        return;
    }

    // Loading state (no petition yet, no error)
    if (!state.petition) {
        return;
    }

    const stepContent = renderCurrentStep();
    const showProgress = state.currentStep > 0 && state.currentStep < STEPS.length - 1;

    appContainer.innerHTML = `
        <div class="sign-page">
            <header class="sign-header">
                <a href="/" class="sign-logo" title="United We Rise">
                    <span class="sign-logo-text">United We Rise</span>
                </a>
            </header>
            <main class="sign-main">
                <div class="sign-container">
                    ${showProgress ? renderProgressBar() : ''}
                    ${stepContent}
                </div>
            </main>
            <footer class="sign-footer">
                <p>Powered by <a href="/" target="_blank" rel="noopener">United We Rise</a></p>
            </footer>
        </div>
    `;
}

/**
 * Render the progress bar indicator
 * @returns {string} Progress bar HTML
 */
function renderProgressBar() {
    const activeSteps = STEPS.slice(1, 4);
    const adjustedCurrent = state.currentStep - 1;
    const progress = ((adjustedCurrent + 1) / activeSteps.length) * 100;

    return `
        <div class="sign-progress">
            <div class="sign-progress-bar">
                <div class="sign-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="sign-progress-steps">
                ${activeSteps.map((step, i) => `
                    <span class="sign-progress-step ${i <= adjustedCurrent ? 'sign-progress-step--active' : ''} ${i < adjustedCurrent ? 'sign-progress-step--complete' : ''}">
                        <span class="sign-progress-dot">${i < adjustedCurrent ? '&#10003;' : i + 1}</span>
                        <span class="sign-progress-label">${escapeHtml(step.title)}</span>
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render the current step based on state
 * @returns {string} Step HTML
 */
function renderCurrentStep() {
    const stepId = STEPS[state.currentStep].id;
    switch (stepId) {
        case 'info': return renderInfoStep();
        case 'signer': return renderSignerStep();
        case 'attest': return renderAttestationStep();
        case 'captcha': return renderCaptchaStep();
        case 'confirmation': return renderConfirmationStep();
        default: return '<p>Unknown step</p>';
    }
}

/**
 * Step 0: Petition information and CTA
 * @returns {string} HTML for info step
 */
function renderInfoStep() {
    const p = state.petition;
    const isBallotAccess = p.type === 'BALLOT_ACCESS';
    const hasGoal = p.signatureGoal && p.signatureGoal > 0;
    const count = p.signatureCount || p._count?.signatures || 0;
    const progressPct = hasGoal ? Math.min(100, Math.round((count / p.signatureGoal) * 100)) : 0;

    return `
        <div class="sign-step sign-step--info">
            ${isBallotAccess && p.candidateName ? `
                <div class="sign-candidate-banner">
                    <span class="sign-candidate-label">Ballot Access Petition</span>
                    <h3 class="sign-candidate-name">${escapeHtml(p.candidateName)}</h3>
                    ${p.officeTarget ? `<p class="sign-candidate-office">${escapeHtml(p.officeTarget)}${p.party ? ` &mdash; ${escapeHtml(p.party)}` : ''}</p>` : ''}
                </div>
            ` : ''}

            <h1 class="sign-title">${escapeHtml(p.title)}</h1>

            ${p.description ? `
                <div class="sign-description">${escapeHtml(p.description)}</div>
            ` : ''}

            ${p.organizationName ? `
                <p class="sign-org">Created by <strong>${escapeHtml(p.organizationName)}</strong></p>
            ` : ''}

            ${hasGoal ? `
                <div class="sign-goal">
                    <div class="sign-goal-bar">
                        <div class="sign-goal-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="sign-goal-text">
                        <span><strong>${formatNumber(count)}</strong> signatures</span>
                        <span>Goal: <strong>${formatNumber(p.signatureGoal)}</strong></span>
                    </div>
                </div>
            ` : count > 0 ? `
                <p class="sign-count"><strong>${formatNumber(count)}</strong> people have signed</p>
            ` : ''}

            <button class="sign-btn sign-btn--primary sign-btn--large" data-action="start">
                Sign This Petition
            </button>

            ${p.deadline ? `
                <p class="sign-deadline">Deadline: ${new Date(p.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            ` : ''}
        </div>
    `;
}

/**
 * Step 1: Signer information form
 * @returns {string} HTML for signer info step
 */
function renderSignerStep() {
    const required = state.petition.requiredSignerFields || [];
    const fd = state.formData;
    const errors = state.errors;

    /**
     * Render a single form field
     * @param {string} field - Field key
     * @param {string} label - Display label
     * @param {string} type - Input type
     * @param {boolean} isRequired - Whether this field is required
     * @param {Object} [extra] - Extra properties
     * @returns {string} Field HTML
     */
    function renderField(field, label, type, isRequired, extra = {}) {
        const value = fd[field] || '';
        const error = errors[field];
        const requiredMark = isRequired ? ' *' : '';

        if (field === 'signerState') {
            return `
                <div class="sign-field ${error ? 'sign-field--error' : ''}">
                    <label for="${field}">${escapeHtml(label)}${requiredMark}</label>
                    <select id="${field}" class="sign-input" data-field="${field}">
                        <option value="">Select state...</option>
                        ${US_STATES.map(s => `<option value="${s.code}" ${value === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                    ${error ? `<span class="sign-field-error">${escapeHtml(error)}</span>` : ''}
                </div>
            `;
        }

        return `
            <div class="sign-field ${error ? 'sign-field--error' : ''}">
                <label for="${field}">${escapeHtml(label)}${requiredMark}</label>
                <input
                    type="${type}"
                    id="${field}"
                    class="sign-input"
                    value="${escapeHtml(value)}"
                    data-field="${field}"
                    ${extra.placeholder ? `placeholder="${escapeHtml(extra.placeholder)}"` : ''}
                    ${extra.maxlength ? `maxlength="${extra.maxlength}"` : ''}
                    ${extra.pattern ? `pattern="${extra.pattern}"` : ''}
                />
                ${error ? `<span class="sign-field-error">${escapeHtml(error)}</span>` : ''}
            </div>
        `;
    }

    const fieldConfigs = [
        { field: 'signerFirstName', label: 'First Name', type: 'text', required: true, extra: { placeholder: 'John', maxlength: '100' } },
        { field: 'signerLastName', label: 'Last Name', type: 'text', required: true, extra: { placeholder: 'Doe', maxlength: '100' } }
    ];

    const conditionalFields = [
        { key: 'address', field: 'signerAddress', label: 'Street Address', type: 'text', extra: { placeholder: '123 Main St', maxlength: '200' } },
        { key: 'city', field: 'signerCity', label: 'City', type: 'text', extra: { placeholder: 'Austin', maxlength: '100' } },
        { key: 'state', field: 'signerState', label: 'State', type: 'select' },
        { key: 'zip', field: 'signerZip', label: 'ZIP Code', type: 'text', extra: { placeholder: '78701', maxlength: '10', pattern: '\\d{5}(-\\d{4})?' } },
        { key: 'county', field: 'signerCounty', label: 'County', type: 'text', extra: { placeholder: 'Travis', maxlength: '100' } },
        { key: 'dateOfBirth', field: 'signerDateOfBirth', label: 'Date of Birth', type: 'date' },
        { key: 'email', field: 'signerEmail', label: 'Email Address', type: 'email', extra: { placeholder: 'john@example.com', maxlength: '200' } },
        { key: 'phone', field: 'signerPhone', label: 'Phone Number', type: 'tel', extra: { placeholder: '(555) 123-4567', maxlength: '20' } }
    ];

    for (const cf of conditionalFields) {
        if (required.includes(cf.key)) {
            fieldConfigs.push({ field: cf.field, label: cf.label, type: cf.type, required: true, extra: cf.extra || {} });
        }
    }

    // Show email as optional if not already required
    for (const cf of conditionalFields) {
        if (!required.includes(cf.key) && cf.key === 'email') {
            fieldConfigs.push({
                field: cf.field,
                label: cf.label,
                type: cf.type,
                required: false,
                extra: { ...cf.extra, placeholder: `${cf.extra?.placeholder || ''} (optional)` }
            });
        }
    }

    return `
        <div class="sign-step sign-step--signer">
            <h2 class="sign-step-title">Your Information</h2>
            <p class="sign-step-subtitle">Please provide the following information to sign this petition.</p>

            <form class="sign-form" autocomplete="on">
                ${fieldConfigs.map(fc => renderField(fc.field, fc.label, fc.type, fc.required, fc.extra)).join('')}
            </form>

            <div class="sign-step-actions">
                <button class="sign-btn sign-btn--secondary" data-action="back">Back</button>
                <button class="sign-btn sign-btn--primary" data-action="next">Continue</button>
            </div>
        </div>
    `;
}

/**
 * Step 2: Attestation and signature confirmation
 * @returns {string} HTML for attestation step
 */
function renderAttestationStep() {
    const p = state.petition;
    const fd = state.formData;
    const errors = state.errors;

    const expectedName = `${fd.signerFirstName} ${fd.signerLastName}`.trim();
    const typedName = (fd.signatureConfirmation || '').trim();
    const namesMatch = typedName.toLowerCase() === expectedName.toLowerCase() && typedName.length > 0;

    const declarationText = p.declarationLanguage ||
        'I hereby declare that the information I have provided is true and correct to the best of my knowledge. I understand that this electronic signature carries the same legal weight as a handwritten signature.';

    return `
        <div class="sign-step sign-step--attest">
            <h2 class="sign-step-title">Attestation & Signature</h2>
            <p class="sign-step-subtitle">Please review and confirm your signature.</p>

            <div class="sign-declaration">
                <p>${escapeHtml(declarationText)}</p>
            </div>

            <div class="sign-field ${errors.attestation ? 'sign-field--error' : ''}">
                <label class="sign-checkbox-label">
                    <input
                        type="checkbox"
                        data-field="attestation"
                        ${fd.attestedAt ? 'checked' : ''}
                    />
                    <span>I agree that this has the full binding force as though it were signed in the presence of the bearer under penalty of perjury.</span>
                </label>
                ${errors.attestation ? `<span class="sign-field-error">${escapeHtml(errors.attestation)}</span>` : ''}
            </div>

            ${p.privacyConsentText ? `
                <div class="sign-privacy-consent ${errors.privacyConsent ? 'sign-field--error' : ''}">
                    <p class="sign-privacy-text">${escapeHtml(p.privacyConsentText)}</p>
                    <label class="sign-checkbox-label">
                        <input
                            type="checkbox"
                            data-field="privacyConsent"
                            ${fd.privacyConsented ? 'checked' : ''}
                        />
                        <span>I consent to the above privacy terms.</span>
                    </label>
                    ${errors.privacyConsent ? `<span class="sign-field-error">${escapeHtml(errors.privacyConsent)}</span>` : ''}
                </div>
            ` : ''}

            <div class="sign-field ${errors.signatureConfirmation ? 'sign-field--error' : ''}">
                <label for="signatureConfirmation">Type your full name to confirm: <strong>${escapeHtml(expectedName)}</strong></label>
                <input
                    type="text"
                    id="signatureConfirmation"
                    class="sign-input sign-input--signature"
                    value="${escapeHtml(typedName)}"
                    data-field="signatureConfirmation"
                    placeholder="Type your full name exactly as shown"
                    autocomplete="off"
                />
                <div class="sign-signature-feedback">
                    ${typedName ? (namesMatch
                        ? '<span class="sign-match sign-match--valid">Name matches</span>'
                        : '<span class="sign-match sign-match--invalid">Name does not match</span>'
                    ) : ''}
                </div>
                ${errors.signatureConfirmation ? `<span class="sign-field-error">${escapeHtml(errors.signatureConfirmation)}</span>` : ''}
            </div>

            ${navigator.geolocation && !fd.geolocationConsented ? `
                <div class="sign-geolocation-opt">
                    <button class="sign-btn sign-btn--link" data-action="geolocation">
                        Share my location to help verify my signature (optional)
                    </button>
                </div>
            ` : fd.geolocationConsented ? `
                <p class="sign-geolocation-status">Location sharing enabled</p>
            ` : ''}

            <div class="sign-step-actions">
                <button class="sign-btn sign-btn--secondary" data-action="back">Back</button>
                <button class="sign-btn sign-btn--primary" data-action="next" ${!namesMatch || !fd.attestedAt ? 'disabled' : ''}>Continue</button>
            </div>
        </div>
    `;
}

/**
 * Step 3: CAPTCHA verification and submit
 * @returns {string} HTML for captcha step
 */
function renderCaptchaStep() {
    const fd = state.formData;
    const errors = state.errors;
    const p = state.petition;

    return `
        <div class="sign-step sign-step--captcha">
            <h2 class="sign-step-title">Verify & Submit</h2>

            <div class="sign-summary">
                <h3>You are signing:</h3>
                <p class="sign-summary-title">${escapeHtml(p.title)}</p>
                <p class="sign-summary-signer">As: <strong>${escapeHtml(fd.signerFirstName)} ${escapeHtml(fd.signerLastName)}</strong></p>
            </div>

            <div class="sign-captcha-wrapper">
                <p class="sign-captcha-label">Please complete the verification below:</p>
                <div id="hcaptcha-container"></div>
            </div>

            ${errors.submit ? `
                <div class="sign-error-banner">
                    <p>${escapeHtml(errors.submit)}</p>
                </div>
            ` : ''}

            <div class="sign-step-actions">
                <button class="sign-btn sign-btn--secondary" data-action="back" ${state.submitting ? 'disabled' : ''}>Back</button>
                <button
                    class="sign-btn sign-btn--primary sign-btn--large"
                    data-action="submit"
                    ${!fd.captchaToken || state.submitting ? 'disabled' : ''}
                >
                    ${state.submitting ? '<span class="sign-btn-spinner"></span> Submitting...' : 'Submit Signature'}
                </button>
            </div>
        </div>
    `;
}

/**
 * Step 4: Confirmation after successful submission
 * @returns {string} HTML for confirmation step
 */
function renderConfirmationStep() {
    const p = state.petition;
    const result = state.result || {};
    const count = result.signatureCount || result.totalSignatures || p.signatureCount || 0;

    let verificationMessage = '';
    if (result.voterVerification === 'verified') {
        verificationMessage = '<p class="sign-verification sign-verification--success">Your voter registration has been verified.</p>';
    } else if (result.voterVerification === 'unavailable') {
        verificationMessage = '<p class="sign-verification sign-verification--pending">Unable to check registration at this time. Your response has been saved with a note to independently verify registration later.</p>';
    }

    const shareUrl = window.location.href;

    return `
        <div class="sign-step sign-step--confirmation">
            <div class="sign-success-icon">
                <svg viewBox="0 0 52 52" class="sign-checkmark">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="#22c55e" stroke-width="2"/>
                    <path fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
            </div>

            <h2 class="sign-step-title">Thank you for signing!</h2>
            <p class="sign-confirmation-title">${escapeHtml(p.title)}</p>

            ${verificationMessage}

            ${count > 0 ? `
                <p class="sign-confirmation-count"><strong>${formatNumber(count)}</strong> total signatures</p>
            ` : ''}

            <div class="sign-share">
                <p>Help this petition reach its goal:</p>
                <div class="sign-share-actions">
                    <button class="sign-btn sign-btn--secondary" data-action="copy-link" data-url="${escapeHtml(shareUrl)}">
                        Copy Link
                    </button>
                </div>
            </div>

            <div class="sign-cta-account">
                <a href="/" class="sign-btn sign-btn--link">
                    Create a United We Rise account to track your civic engagement
                </a>
            </div>
        </div>
    `;
}

/**
 * Render an error page when the petition cannot be loaded
 * @param {string} message - Error message to display
 * @returns {string} Error page HTML
 */
function renderErrorPage(message) {
    return `
        <div class="sign-page">
            <header class="sign-header">
                <a href="/" class="sign-logo" title="United We Rise">
                    <span class="sign-logo-text">United We Rise</span>
                </a>
            </header>
            <main class="sign-main">
                <div class="sign-container">
                    <div class="sign-step sign-step--error">
                        <div class="sign-error-icon">
                            <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                        </div>
                        <h2 class="sign-step-title">Unable to Load Petition</h2>
                        <p class="sign-error-message">${escapeHtml(message)}</p>
                        <a href="/" class="sign-btn sign-btn--primary">Go to United We Rise</a>
                    </div>
                </div>
            </main>
            <footer class="sign-footer">
                <p>Powered by <a href="/" target="_blank" rel="noopener">United We Rise</a></p>
            </footer>
        </div>
    `;
}

/**
 * Render the "already signed" state
 * @returns {string} Already signed HTML
 */
function renderAlreadySigned() {
    const p = state.petition;
    const title = p ? p.title : 'this petition';
    return `
        <div class="sign-page">
            <header class="sign-header">
                <a href="/" class="sign-logo" title="United We Rise">
                    <span class="sign-logo-text">United We Rise</span>
                </a>
            </header>
            <main class="sign-main">
                <div class="sign-container">
                    <div class="sign-step sign-step--already-signed">
                        <div class="sign-success-icon">
                            <svg viewBox="0 0 52 52" class="sign-checkmark" width="64" height="64">
                                <circle cx="26" cy="26" r="25" fill="none" stroke="#4b5c09" stroke-width="2"/>
                                <path fill="none" stroke="#4b5c09" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                        </div>
                        <h2 class="sign-step-title">Already Signed</h2>
                        <p>You have already signed <strong>${escapeHtml(title)}</strong>.</p>
                        <div class="sign-share">
                            <p>Share this petition to help it reach its goal:</p>
                            <div class="sign-share-actions">
                                <button class="sign-btn sign-btn--secondary" data-action="copy-link" data-url="${escapeHtml(window.location.href)}">
                                    Copy Link
                                </button>
                            </div>
                        </div>
                        <a href="/" class="sign-btn sign-btn--link">Go to United We Rise</a>
                    </div>
                </div>
            </main>
            <footer class="sign-footer">
                <p>Powered by <a href="/" target="_blank" rel="noopener">United We Rise</a></p>
            </footer>
        </div>
    `;
}

// ==================== Event Handling ====================

/**
 * Handle all click events via delegation on the app container
 * @param {Event} e - Click event
 */
function handleClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    switch (action) {
        case 'start':
            nextStep();
            break;
        case 'next':
            nextStep();
            break;
        case 'back':
            previousStep();
            break;
        case 'submit':
            handleSubmit();
            break;
        case 'geolocation':
            requestGeolocation();
            break;
        case 'copy-link': {
            const url = actionEl.dataset.url || window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                showToast('Link copied to clipboard!', 'success');
                actionEl.textContent = 'Copied!';
                setTimeout(() => { actionEl.textContent = 'Copy Link'; }, 2000);
            }).catch(() => {
                showToast('Could not copy link', 'error');
            });
            break;
        }
    }
}

/**
 * Handle input and change events via delegation on the app container
 * @param {Event} e - Input or change event
 */
function handleInput(e) {
    const field = e.target.dataset.field;
    if (!field) return;

    if (field === 'attestation') {
        state.formData.attestedAt = e.target.checked ? new Date().toISOString() : null;
        render();
        return;
    }
    if (field === 'privacyConsent') {
        state.formData.privacyConsented = e.target.checked;
        render();
        return;
    }

    if (field in state.formData) {
        state.formData[field] = e.target.value;

        if (state.errors[field]) {
            delete state.errors[field];
        }

        // Live validation feedback for signature confirmation
        if (field === 'signatureConfirmation') {
            const feedbackEl = appContainer.querySelector('.sign-signature-feedback');
            if (feedbackEl) {
                const expected = `${state.formData.signerFirstName} ${state.formData.signerLastName}`.trim().toLowerCase();
                const typed = e.target.value.trim().toLowerCase();
                if (typed) {
                    feedbackEl.innerHTML = typed === expected
                        ? '<span class="sign-match sign-match--valid">Name matches</span>'
                        : '<span class="sign-match sign-match--invalid">Name does not match</span>';
                } else {
                    feedbackEl.innerHTML = '';
                }

                const nextBtn = appContainer.querySelector('[data-action="next"]');
                if (nextBtn) {
                    nextBtn.disabled = !(typed === expected && state.formData.attestedAt);
                }
            }
        }
    }
}

// ==================== Initialization ====================

/**
 * Initialize the petition signing application
 */
document.addEventListener('DOMContentLoaded', async () => {
    appContainer = document.getElementById('petition-app');
    if (!appContainer) return;

    appContainer.addEventListener('click', handleClick);
    appContainer.addEventListener('input', handleInput);
    appContainer.addEventListener('change', handleInput);

    // Parse code from URL: /sign/{code}
    const pathParts = window.location.pathname.split('/');
    const signIndex = pathParts.indexOf('sign');
    const code = signIndex >= 0 ? pathParts[signIndex + 1] : pathParts[pathParts.length - 1];

    if (!code) {
        state.errorMessage = 'No petition code provided. Please check the URL.';
        render();
        return;
    }

    state.code = code;
    await loadPetition(code);
});
