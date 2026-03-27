/**
 * Petition Creator Modal
 * Multi-step wizard modal for creating petitions.
 * Follows the org-creation-wizard pattern for lifecycle, state, and event delegation.
 *
 * @module features/petitions/petition-creator-modal
 */

import { createPetition, publishPetition, getQRCode, getVerificationBalance, createVerificationCheckout } from './petitions-api.js';
import { showToast } from '../../../utils/toast.js';

// ==================== Constants ====================

/**
 * Petition category options
 */
const PETITION_CATEGORIES = [
    { value: 'CIVIC_ADVOCACY', label: 'Civic Advocacy' },
    { value: 'COMMUNITY', label: 'Community' },
    { value: 'POLICY', label: 'Policy' },
    { value: 'BALLOT_ACCESS', label: 'Ballot Access (General)' },
    { value: 'BALLOT_ACCESS_NY', label: 'NYS Ballot Access (§ 6-132)' }
];

/**
 * Template presets for ballot access petition types.
 * Auto-populates required fields, declaration language, and guidance text.
 */
const PETITION_TEMPLATES = {
    BALLOT_ACCESS: {
        requiredFields: ['address', 'city', 'state', 'zip'],
        voterVerificationEnabled: true,
        descriptionPlaceholder: 'Describe the purpose of this ballot access petition and include candidate and office information as required by your state law.',
        guidanceText: 'Include candidate name, office sought, party designation, and any other information required by your state\'s election law.',
        warningText: 'Attention: Many state laws do not currently accept electronic petitions for ballot access. Please consult legal counsel before relying on UWR petitions for official ballot access purposes. UWR will NOT refund voter verification fees if petitions are not accepted by boards of election.'
    },
    BALLOT_ACCESS_NY: {
        requiredFields: ['address', 'city', 'state', 'zip', 'county'],
        voterVerificationEnabled: true,
        declarationLanguage: 'I, the undersigned, do hereby state that I am a duly enrolled voter of the _____ party and entitled to vote at the next primary election of such party, to be held in the year _____, that my residence is truly stated opposite my signature hereto, and that I do hereby designate the above-named candidate(s) as a candidate for the above-designated office to be voted for at such primary election.',
        descriptionPlaceholder: 'e.g., Designating petition for [Candidate Name], residing at [Address], for the office of [Office] on the [Party] party ballot.\n\nCommittee to fill vacancies:\n1. [Name]\n2. [Name]\n3. [Name]',
        guidanceText: 'For NYS § 6-132 compliance, include in the description: candidate name, residence address, office sought, party designation, and committee to fill vacancies (three named enrolled voters of the same party).',
        warningText: 'Attention: Many state laws do not currently accept electronic petitions for ballot access. Please consult legal counsel before relying on UWR petitions for official ballot access purposes. UWR will NOT refund voter verification fees if petitions are not accepted by boards of election.'
    }
};

/**
 * Geographic scope options
 */
const GEOGRAPHIC_SCOPES = [
    { value: '', label: 'Select scope (optional)' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'COUNTY', label: 'County' },
    { value: 'STATE', label: 'State' },
    { value: 'NATIONAL', label: 'National' },
    { value: 'REGIONAL', label: 'Regional' }
];

/**
 * Optional signer fields that can be toggled
 */
const OPTIONAL_SIGNER_FIELDS = [
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'ZIP Code' },
    { value: 'county', label: 'County' },
    { value: 'dateOfBirth', label: 'Date of Birth' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' }
];

/**
 * Step definitions
 */
const STEPS = [
    { id: 'details', title: 'Petition Details' },
    { id: 'signer-config', title: 'Signer Configuration' },
    { id: 'attestation', title: 'Attestation & Settings' },
    { id: 'review', title: 'Review & Create' }
];

/**
 * Default attestation language
 */
const DEFAULT_DECLARATION = 'I affirm under penalty of perjury that the information I have provided is true and correct to the best of my knowledge.';

// ==================== State ====================

let modalState = {
    isOpen: false,
    currentStep: 0,
    selectedTemplate: '', // Tracks the dropdown selection (e.g., BALLOT_ACCESS_NY) separately from DB value
    formData: {
        title: '',
        description: '',
        petitionCategory: 'CIVIC_ADVOCACY',
        geographicScope: '',
        signatureGoal: null,
        requiredSignerFields: ['firstName', 'lastName'],
        declarationLanguage: DEFAULT_DECLARATION,
        voterVerificationEnabled: false,
        party: '',
        electionYear: null,
        filingDeadline: null,
        electionDate: '',
        customSlug: '',
        privacyConsentText: ''
    },
    errors: {},
    submitting: false,
    isCandidate: false,
    createdPetition: null
};

let modalContainer = null;
let escapeHandler = null;

// ==================== Public API ====================

/**
 * Open the petition creator modal
 */
export function showPetitionCreatorModal() {
    // Reset state to defaults
    modalState = {
        isOpen: true,
        currentStep: 0,
        formData: {
            title: '',
            description: '',
            petitionCategory: 'CIVIC_ADVOCACY',
            geographicScope: '',
            signatureGoal: null,
            requiredSignerFields: ['firstName', 'lastName'],
            declarationLanguage: DEFAULT_DECLARATION,
            voterVerificationEnabled: false,
            party: '',
            electionYear: null,
            filingDeadline: null,
            electionDate: '',
            customSlug: '',
            privacyConsentText: ''
        },
        errors: {},
        submitting: false,
        isCandidate: !!(window.currentUser?.candidateProfile?.isVerified),
        createdPetition: null
    };

    // Create container
    modalContainer = document.getElementById('petition-creator-modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'petition-creator-modal-container';
        document.body.appendChild(modalContainer);
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Setup escape key handler
    escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closePetitionCreatorModal();
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Render and attach listeners
    render();
    attachListeners();
}

/**
 * Close the petition creator modal and clean up
 */
export function closePetitionCreatorModal() {
    if (modalContainer) {
        modalContainer.remove();
        modalContainer = null;
    }

    document.body.style.overflow = '';

    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }

    modalState.isOpen = false;
}

// ==================== Rendering ====================

/**
 * Render the full modal into the container
 */
function render() {
    if (!modalContainer) return;

    const step = STEPS[modalState.currentStep];

    // On first render, create the full modal structure
    if (!modalContainer.querySelector('.petition-modal-overlay')) {
        modalContainer.innerHTML = `
            <div class="petition-modal-overlay">
                <div class="petition-modal-content" role="dialog" aria-modal="true" aria-label="Create Petition">
                    <div class="petition-modal-header">
                        <h3 id="petition-modal-title"></h3>
                        <button class="petition-modal-close" data-petition-action="close-modal" title="Close" aria-label="Close">&times;</button>
                    </div>
                    <div class="petition-modal-steps" id="petition-modal-steps"></div>
                    <div class="petition-modal-body" id="petition-modal-body"></div>
                    <div id="petition-modal-footer-container"></div>
                </div>
            </div>
        `;
    }

    // Update only the changing parts (prevents flicker from full DOM replacement)
    const titleEl = modalContainer.querySelector('#petition-modal-title');
    const stepsEl = modalContainer.querySelector('#petition-modal-steps');
    const bodyEl = modalContainer.querySelector('#petition-modal-body');
    const footerEl = modalContainer.querySelector('#petition-modal-footer-container');

    if (titleEl) titleEl.textContent = modalState.createdPetition ? 'Petition Created' : step.title;

    if (stepsEl) {
        stepsEl.innerHTML = STEPS.map((s, i) => {
            let dotClass = 'petition-modal-step-dot';
            if (i === modalState.currentStep) dotClass += ' active';
            else if (i < modalState.currentStep || modalState.createdPetition) dotClass += ' completed';
            return `<div class="${dotClass}"></div>`;
        }).join('');
    }

    if (bodyEl) bodyEl.innerHTML = renderCurrentStep();
    if (footerEl) footerEl.innerHTML = renderFooter();
}

/**
 * Render content for the current step
 * @returns {string} HTML string
 */
function renderCurrentStep() {
    // If petition has been created, show success state
    if (modalState.createdPetition) {
        return renderSuccessState();
    }

    switch (modalState.currentStep) {
        case 0: return renderDetailsStep();
        case 1: return renderSignerConfigStep();
        case 2: return renderAttestationStep();
        case 3: return renderReviewStep();
        default: return '<p>Unknown step</p>';
    }
}

/**
 * Render the modal footer with navigation buttons
 * @returns {string} HTML string
 */
function renderFooter() {
    // No footer for success state
    if (modalState.createdPetition) {
        return '';
    }

    const isFirst = modalState.currentStep === 0;
    const isLast = modalState.currentStep === STEPS.length - 1;

    return `
        <div class="petition-modal-footer">
            ${!isFirst ? `
                <button class="petition-modal-btn petition-modal-btn-secondary" data-petition-action="prev-step">
                    Back
                </button>
            ` : '<div></div>'}

            ${isLast ? `
                <button
                    class="petition-modal-btn petition-modal-btn-primary"
                    data-petition-action="create-petition"
                    ${modalState.submitting ? 'disabled' : ''}
                >
                    ${modalState.submitting ? 'Creating...' : 'Create as Draft'}
                </button>
            ` : `
                <button class="petition-modal-btn petition-modal-btn-primary" data-petition-action="next-step">
                    Next
                </button>
            `}
        </div>
    `;
}

// ==================== Step Renderers ====================

/**
 * Step 0: Petition Details
 * @returns {string} HTML string
 */
function renderDetailsStep() {
    const { title, description, petitionCategory, geographicScope, signatureGoal } = modalState.formData;
    const errors = modalState.errors;

    const availableCategories = modalState.isCandidate
        ? PETITION_CATEGORIES
        : PETITION_CATEGORIES.filter(c => c.value !== 'BALLOT_ACCESS');
    const displayCategory = modalState.selectedTemplate || petitionCategory;
    const categoryOptions = availableCategories.map(c =>
        `<option value="${c.value}" ${displayCategory === c.value ? 'selected' : ''}>${c.label}</option>`
    ).join('');

    const scopeOptions = GEOGRAPHIC_SCOPES.map(s =>
        `<option value="${s.value}" ${geographicScope === s.value ? 'selected' : ''}>${s.label}</option>`
    ).join('');

    return `
        <div class="petition-modal-step">
            <div class="petition-modal-field ${errors.title ? 'has-error' : ''}">
                <label for="petitionTitle">Title *</label>
                <input
                    type="text"
                    id="petitionTitle"
                    class="petition-modal-input"
                    value="${escapeHtml(title)}"
                    placeholder="Give your petition a clear, compelling title"
                    maxlength="200"
                    data-field="title"
                />
                ${errors.title ? `<span class="petition-modal-error">${errors.title}</span>` : ''}
                <small>${title.length}/200 characters</small>
            </div>

            <div class="petition-modal-field ${errors.description ? 'has-error' : ''}">
                <label for="petitionDescription">
                    Description *
                    ${(() => {
                        const tmpl = PETITION_TEMPLATES[petitionCategory];
                        return tmpl?.guidanceText ? `<span class="petition-modal-help-icon" title="${escapeHtml(tmpl.guidanceText)}">&#9432;</span>` : '';
                    })()}
                </label>
                <textarea
                    id="petitionDescription"
                    class="petition-modal-textarea"
                    placeholder="${(() => {
                        const tmpl = PETITION_TEMPLATES[petitionCategory];
                        return tmpl?.descriptionPlaceholder || 'Explain what this petition is about and why people should sign it...';
                    })()}"
                    maxlength="5000"
                    rows="5"
                    data-field="description"
                >${escapeHtml(description)}</textarea>
                ${errors.description ? `<span class="petition-modal-error">${errors.description}</span>` : ''}
                <small>${description.length}/5000 characters</small>
            </div>

            <div class="petition-modal-field">
                <label for="petitionCategory">Category</label>
                <select id="petitionCategory" class="petition-modal-select" data-field="petitionCategory">
                    ${categoryOptions}
                </select>
            </div>

            <div class="petition-modal-field">
                <label for="petitionScope">Geographic Scope</label>
                <select id="petitionScope" class="petition-modal-select" data-field="geographicScope">
                    ${scopeOptions}
                </select>
            </div>

            <div class="petition-modal-field">
                <label for="petitionGoal">Signature Goal</label>
                <input
                    type="number"
                    id="petitionGoal"
                    class="petition-modal-input"
                    value="${signatureGoal || ''}"
                    placeholder="e.g., 1000 (optional)"
                    min="1"
                    data-field="signatureGoal"
                />
                <small>Set a target number of signatures (optional)</small>
            </div>
        </div>
    `;
}

/**
 * Step 1: Signer Configuration
 * @returns {string} HTML string
 */
function renderSignerConfigStep() {
    const { requiredSignerFields, voterVerificationEnabled } = modalState.formData;

    const optionalCheckboxes = OPTIONAL_SIGNER_FIELDS.map(field => {
        const checked = requiredSignerFields.includes(field.value);
        return `
            <label class="petition-modal-checkbox-label">
                <input
                    type="checkbox"
                    data-field="signerField"
                    data-signer-field="${field.value}"
                    ${checked ? 'checked' : ''}
                />
                <span class="petition-modal-checkbox-text">${field.label}</span>
            </label>
        `;
    }).join('');

    return `
        <div class="petition-modal-step">
            <div class="petition-modal-step-header">
                <h4>What information should signers provide?</h4>
                <p>Configure which fields are required when someone signs your petition.</p>
            </div>

            <div class="petition-modal-field-group">
                <label class="petition-modal-group-label">Always included</label>
                <div class="petition-modal-always-fields">
                    <span class="petition-modal-fixed-field">First Name</span>
                    <span class="petition-modal-fixed-field">Last Name</span>
                </div>
            </div>

            <div class="petition-modal-field-group">
                <label class="petition-modal-group-label">Optional fields</label>
                <div class="petition-modal-checkbox-group">
                    ${optionalCheckboxes}
                </div>
            </div>

            <div class="petition-modal-field-group">
                <label class="petition-modal-group-label">Verification</label>
                <label class="petition-modal-toggle-label">
                    <div class="petition-modal-toggle-switch">
                        <input
                            type="checkbox"
                            data-field="voterVerificationEnabled"
                            ${voterVerificationEnabled ? 'checked' : ''}
                        />
                        <span class="petition-modal-toggle-slider"></span>
                    </div>
                    <div class="petition-modal-toggle-text">
                        <span>Enable voter registration verification
                            <span class="petition-modal-help-icon" title="Voter verification uses a third-party API to confirm signer registration. Cost: $0.10 per verification ($100 per 1,000 verifications). Charges apply only to successful lookups — failed or unavailable checks are not billed.">&#9432;</span>
                        </span>
                        <small>Signers' voter registration will be verified in real time. <strong>Additional cost: $0.10 per verification</strong> ($100 per 1,000 block).</small>
                        ${voterVerificationEnabled ? '<small style="color: #b45309; display: block; margin-top: 4px;">⚠ Note: Voter verification service is not yet connected. Signatures will be accepted but marked as unverified until the service is activated.</small>' : ''}
                    </div>
                </label>
            </div>
        </div>
    `;
}

/**
 * Step 2: Attestation & Settings
 * @returns {string} HTML string
 */
function renderAttestationStep() {
    const {
        declarationLanguage, privacyConsentText, customSlug,
        party, electionYear, filingDeadline, electionDate
    } = modalState.formData;
    const errors = modalState.errors;

    let candidateSection = '';
    if (modalState.isCandidate) {
        const slugPreview = customSlug
            ? `unitedwerise.org/sign/${escapeHtml(customSlug)}`
            : 'unitedwerise.org/sign/[your-slug]';

        candidateSection = `
            <div class="petition-modal-candidate-section">
                <h4>Candidate Settings</h4>
                <p class="petition-modal-candidate-note">
                    As a verified candidate, you have access to additional petition options.
                </p>

                <div class="petition-modal-field ${errors.customSlug ? 'has-error' : ''}">
                    <label for="petitionSlug">Custom URL Slug</label>
                    <input
                        type="text"
                        id="petitionSlug"
                        class="petition-modal-input"
                        value="${escapeHtml(customSlug)}"
                        placeholder="e.g., my-petition"
                        maxlength="50"
                        data-field="customSlug"
                    />
                    <small class="petition-modal-slug-preview">${slugPreview}</small>
                    ${errors.customSlug ? `<span class="petition-modal-error">${errors.customSlug}</span>` : ''}
                </div>

                <div class="petition-modal-field">
                    <label for="petitionParty">Party</label>
                    <input
                        type="text"
                        id="petitionParty"
                        class="petition-modal-input"
                        value="${escapeHtml(party)}"
                        placeholder="e.g., Democratic, Republican, Independent"
                        data-field="party"
                    />
                </div>

                <div class="petition-modal-field-row">
                    <div class="petition-modal-field">
                        <label for="petitionElectionYear">Election Year</label>
                        <input
                            type="number"
                            id="petitionElectionYear"
                            class="petition-modal-input"
                            value="${electionYear || ''}"
                            placeholder="e.g., 2026"
                            min="2024"
                            max="2040"
                            data-field="electionYear"
                        />
                    </div>

                    <div class="petition-modal-field">
                        <label for="petitionDeadline">Filing Deadline</label>
                        <input
                            type="date"
                            id="petitionDeadline"
                            class="petition-modal-input"
                            value="${filingDeadline || ''}"
                            data-field="filingDeadline"
                        />
                    </div>
                </div>

                <div class="petition-modal-field">
                    <label for="electionDate">Election Date</label>
                    <input
                        type="date"
                        id="electionDate"
                        class="petition-modal-input"
                        value="${modalState.formData.electionDate || ''}"
                        data-field="electionDate"
                    />
                </div>
            </div>
        `;
    }

    return `
        <div class="petition-modal-step">
            <div class="petition-modal-field ${errors.declarationLanguage ? 'has-error' : ''}">
                <label for="petitionDeclaration">Attestation Language</label>
                <textarea
                    id="petitionDeclaration"
                    class="petition-modal-textarea"
                    rows="3"
                    maxlength="1000"
                    data-field="declarationLanguage"
                >${escapeHtml(declarationLanguage)}</textarea>
                ${errors.declarationLanguage ? `<span class="petition-modal-error">${errors.declarationLanguage}</span>` : ''}
                <small>This is the statement signers will affirm when they sign.</small>
            </div>

            <div class="petition-modal-field">
                <label for="petitionPrivacy">Privacy Consent Text</label>
                <textarea
                    id="petitionPrivacy"
                    class="petition-modal-textarea"
                    rows="2"
                    maxlength="500"
                    placeholder="Optional text about how signer data will be used..."
                    data-field="privacyConsentText"
                >${escapeHtml(privacyConsentText)}</textarea>
                <small>If provided, signers must consent to this before signing (optional).</small>
            </div>

            ${candidateSection}
        </div>
    `;
}

/**
 * Step 3: Review & Create
 * @returns {string} HTML string
 */
function renderReviewStep() {
    const {
        title, description, petitionCategory, geographicScope,
        signatureGoal, requiredSignerFields, declarationLanguage,
        voterVerificationEnabled, privacyConsentText,
        customSlug, party, electionYear, filingDeadline, electionDate
    } = modalState.formData;

    const categoryLabel = PETITION_CATEGORIES.find(c => c.value === petitionCategory)?.label || petitionCategory;
    const scopeLabel = GEOGRAPHIC_SCOPES.find(s => s.value === geographicScope)?.label || 'Not specified';
    const signerFieldLabels = requiredSignerFields.map(f => {
        if (f === 'firstName') return 'First Name';
        if (f === 'lastName') return 'Last Name';
        const found = OPTIONAL_SIGNER_FIELDS.find(o => o.value === f);
        return found ? found.label : f;
    });

    let candidateReview = '';
    if (modalState.isCandidate && (customSlug || party || electionYear || filingDeadline || electionDate)) {
        candidateReview = `
            <div class="petition-modal-review-section">
                <h4>Candidate Settings</h4>
                <dl class="petition-modal-review-list">
                    ${customSlug ? `
                        <div class="petition-modal-review-item">
                            <dt>Custom URL</dt>
                            <dd>unitedwerise.org/sign/${escapeHtml(customSlug)}</dd>
                        </div>
                    ` : ''}
                    ${party ? `
                        <div class="petition-modal-review-item">
                            <dt>Party</dt>
                            <dd>${escapeHtml(party)}</dd>
                        </div>
                    ` : ''}
                    ${electionYear ? `
                        <div class="petition-modal-review-item">
                            <dt>Election Year</dt>
                            <dd>${electionYear}</dd>
                        </div>
                    ` : ''}
                    ${filingDeadline ? `
                        <div class="petition-modal-review-item">
                            <dt>Filing Deadline</dt>
                            <dd>${filingDeadline}</dd>
                        </div>
                    ` : ''}
                    ${electionDate ? `
                        <div class="petition-modal-review-item">
                            <dt>Election Date</dt>
                            <dd>${electionDate}</dd>
                        </div>
                    ` : ''}
                </dl>
            </div>
        `;
    }

    return `
        <div class="petition-modal-step">
            <div class="petition-modal-review">
                <div class="petition-modal-review-section">
                    <h4>Petition Details</h4>
                    <dl class="petition-modal-review-list">
                        <div class="petition-modal-review-item">
                            <dt>Title</dt>
                            <dd>${escapeHtml(title)}</dd>
                        </div>
                        <div class="petition-modal-review-item">
                            <dt>Description</dt>
                            <dd class="petition-modal-review-description">${escapeHtml(description)}</dd>
                        </div>
                        <div class="petition-modal-review-item">
                            <dt>Category</dt>
                            <dd>${categoryLabel}</dd>
                        </div>
                        <div class="petition-modal-review-item">
                            <dt>Geographic Scope</dt>
                            <dd>${scopeLabel}</dd>
                        </div>
                        ${signatureGoal ? `
                            <div class="petition-modal-review-item">
                                <dt>Signature Goal</dt>
                                <dd>${Number(signatureGoal).toLocaleString()}</dd>
                            </div>
                        ` : ''}
                    </dl>
                </div>

                <div class="petition-modal-review-section">
                    <h4>Signer Configuration</h4>
                    <dl class="petition-modal-review-list">
                        <div class="petition-modal-review-item">
                            <dt>Required Fields</dt>
                            <dd>${signerFieldLabels.join(', ')}</dd>
                        </div>
                        <div class="petition-modal-review-item">
                            <dt>Voter Verification</dt>
                            <dd>${voterVerificationEnabled ? 'Enabled' : 'Disabled'}</dd>
                        </div>
                    </dl>
                </div>

                <div class="petition-modal-review-section">
                    <h4>Attestation</h4>
                    <dl class="petition-modal-review-list">
                        <div class="petition-modal-review-item">
                            <dt>Declaration</dt>
                            <dd class="petition-modal-review-description">${escapeHtml(declarationLanguage)}</dd>
                        </div>
                        ${privacyConsentText ? `
                            <div class="petition-modal-review-item">
                                <dt>Privacy Consent</dt>
                                <dd>${escapeHtml(privacyConsentText)}</dd>
                            </div>
                        ` : ''}
                    </dl>
                </div>

                ${candidateReview}

                <div class="petition-modal-notice">
                    <p>Your petition will be created as a <strong>Draft</strong>. You can publish it when you are ready to start collecting signatures.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render the success state after petition creation
 * @returns {string} HTML string
 */
function renderSuccessState() {
    const petition = modalState.createdPetition;
    const signingUrl = petition.signingUrl || `${window.location.origin}/sign/${petition.shortCode || petition.id}`;

    let qrSection = '';
    if (petition.qrCodeData) {
        qrSection = `
            <div class="petition-modal-qr">
                <img src="${petition.qrCodeData}" alt="QR Code for petition signing" class="petition-modal-qr-image" />
            </div>
        `;
    } else {
        qrSection = `
            <div class="petition-modal-qr petition-modal-qr-loading">
                <div class="petition-modal-spinner"></div>
                <span>Loading QR code...</span>
            </div>
        `;
    }

    return `
        <div class="petition-modal-success">
            <div class="petition-modal-success-icon">&#10003;</div>
            <h3>Petition Created Successfully!</h3>
            <p class="petition-modal-success-title">${escapeHtml(petition.title)}</p>

            ${qrSection}

            <div class="petition-modal-signing-link">
                <label>Signing Link</label>
                <div class="petition-modal-link-row">
                    <input
                        type="text"
                        class="petition-modal-input petition-modal-link-input"
                        value="${escapeHtml(signingUrl)}"
                        readonly
                        id="petitionSigningLink"
                    />
                    <button class="petition-modal-btn petition-modal-btn-secondary" data-petition-action="copy-link">
                        Copy
                    </button>
                </div>
            </div>

            <div class="petition-modal-success-actions">
                ${petition.status === 'DRAFT' ? `
                    <button class="petition-modal-btn petition-modal-btn-primary" data-petition-action="publish-petition">
                        Publish Now
                    </button>
                ` : `
                    <span class="petition-modal-published-badge">Published</span>
                `}
                <button class="petition-modal-btn petition-modal-btn-secondary" data-petition-action="close-modal">
                    Close
                </button>
            </div>
        </div>
    `;
}

// ==================== Event Handling ====================

/**
 * Attach event listeners to the modal container using delegation
 */
function attachListeners() {
    if (!modalContainer) return;

    // Close on overlay/backdrop click
    modalContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('petition-modal-overlay')) {
            closePetitionCreatorModal();
        }
    });

    // Action button delegation
    modalContainer.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-petition-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.petitionAction;
        switch (action) {
            case 'next-step':
                nextStep();
                break;
            case 'prev-step':
                prevStep();
                break;
            case 'close-modal':
                closePetitionCreatorModal();
                break;
            case 'create-petition':
                handleCreate();
                break;
            case 'publish-petition':
                handlePublish();
                break;
            case 'copy-link':
                copySigningLink();
                break;
        }
    });

    // Input changes (text, number, date fields)
    modalContainer.addEventListener('input', (e) => {
        const field = e.target.dataset?.field;
        if (!field) return;

        // Handle numeric fields
        if (field === 'signatureGoal' || field === 'electionYear') {
            const val = e.target.value;
            modalState.formData[field] = val ? Number(val) : null;
        } else {
            modalState.formData[field] = e.target.value;
        }

        // Clear error for this field
        if (modalState.errors[field]) {
            delete modalState.errors[field];
        }

        // Update slug preview live
        if (field === 'customSlug') {
            const preview = modalContainer.querySelector('.petition-modal-slug-preview');
            if (preview) {
                const slug = e.target.value;
                preview.textContent = slug
                    ? `unitedwerise.org/sign/${slug}`
                    : 'unitedwerise.org/sign/[your-slug]';
            }
        }
    });

    // Change events (selects, checkboxes)
    modalContainer.addEventListener('change', (e) => {
        const field = e.target.dataset?.field;
        if (!field) return;

        if (field === 'signerField') {
            const signerField = e.target.dataset.signerField;
            const fields = modalState.formData.requiredSignerFields;
            if (e.target.checked) {
                if (!fields.includes(signerField)) {
                    fields.push(signerField);
                }
            } else {
                const idx = fields.indexOf(signerField);
                if (idx > -1) fields.splice(idx, 1);
            }
        } else if (field === 'voterVerificationEnabled') {
            if (e.target.checked) {
                handleVoterVerificationToggle(e.target);
            } else {
                modalState.formData.voterVerificationEnabled = false;
            }
        } else if (field === 'signatureGoal' || field === 'electionYear') {
            const val = e.target.value;
            modalState.formData[field] = val ? Number(val) : null;
        } else {
            modalState.formData[field] = e.target.value;
        }

        // Clear error for this field
        if (modalState.errors[field]) {
            delete modalState.errors[field];
        }

        // Apply template when petition category changes
        if (field === 'petitionCategory') {
            applyPetitionTemplate(e.target.value);
        }
    });
}

/**
 * Apply a petition template based on category selection.
 * Auto-populates required fields, declaration language, and shows warning for ballot access types.
 * @param {string} categoryValue - The selected category value
 */
function applyPetitionTemplate(categoryValue) {
    const template = PETITION_TEMPLATES[categoryValue];

    // Show warning for any ballot access type
    if (categoryValue.startsWith('BALLOT_ACCESS')) {
        const warningText = template?.warningText || PETITION_TEMPLATES.BALLOT_ACCESS.warningText;
        alert(warningText);
    }

    if (!template) {
        // Non-template category — store as-is (BALLOT_ACCESS_NY stores as BALLOT_ACCESS in DB)
        return;
    }

    // Auto-select required signer fields
    if (template.requiredFields) {
        modalState.formData.requiredSignerFields = ['firstName', 'lastName', ...template.requiredFields];
    }

    // Auto-enable voter verification
    if (template.voterVerificationEnabled !== undefined) {
        modalState.formData.voterVerificationEnabled = template.voterVerificationEnabled;
    }

    // Pre-populate declaration language (only if not already customized)
    if (template.declarationLanguage && !modalState.formData.declarationLanguage) {
        modalState.formData.declarationLanguage = template.declarationLanguage;
    }

    // Track the template selection for the dropdown display
    modalState.selectedTemplate = categoryValue;

    // Store the DB-compatible enum value
    if (categoryValue === 'BALLOT_ACCESS_NY') {
        modalState.formData.petitionCategory = 'BALLOT_ACCESS';
    }

    // Re-render to reflect field changes (without full modal re-create)
    render();
}

// ==================== Navigation ====================

/**
 * Advance to the next step after validation
 */
function nextStep() {
    if (!validateCurrentStep()) return;

    if (modalState.currentStep < STEPS.length - 1) {
        modalState.currentStep++;
        render();
        attachListeners();
    }
}

/**
 * Go back to the previous step
 */
function prevStep() {
    if (modalState.currentStep > 0) {
        modalState.currentStep--;
        render();
        attachListeners();
    }
}

// ==================== Validation ====================

/**
 * Validate the current step's form data
 * @returns {boolean} True if valid
 */
function validateCurrentStep() {
    modalState.errors = {};

    switch (modalState.currentStep) {
        case 0:
            return validateDetailsStep();
        case 1:
            // Signer config step has no required validation beyond defaults
            return true;
        case 2:
            return validateAttestationStep();
        case 3:
            // Review step - no additional validation
            return true;
        default:
            return true;
    }
}

/**
 * Validate Step 0: Petition Details
 * @returns {boolean} True if valid
 */
function validateDetailsStep() {
    const { title, description } = modalState.formData;
    let valid = true;

    if (!title.trim() || title.trim().length < 3) {
        modalState.errors.title = 'Title must be at least 3 characters';
        valid = false;
    } else if (title.trim().length > 200) {
        modalState.errors.title = 'Title must be 200 characters or fewer';
        valid = false;
    }

    if (!description.trim() || description.trim().length < 10) {
        modalState.errors.description = 'Description must be at least 10 characters';
        valid = false;
    } else if (description.trim().length > 5000) {
        modalState.errors.description = 'Description must be 5000 characters or fewer';
        valid = false;
    }

    if (!valid) {
        render();
        attachListeners();
    }

    return valid;
}

/**
 * Validate Step 2: Attestation & Settings
 * @returns {boolean} True if valid
 */
function validateAttestationStep() {
    const { declarationLanguage } = modalState.formData;
    let valid = true;

    if (!declarationLanguage.trim()) {
        modalState.errors.declarationLanguage = 'Attestation language is required';
        valid = false;
    }

    if (!valid) {
        render();
        attachListeners();
    }

    return valid;
}

// ==================== Actions ====================

/**
 * Handle voter verification toggle.
 * Simply enables/disables the setting. Payment is handled separately
 * when verification credits are actually needed (at signing time).
 * @param {HTMLInputElement} toggleEl - The checkbox input element
 */
function handleVoterVerificationToggle(toggleEl) {
    modalState.formData.voterVerificationEnabled = toggleEl.checked;
}

/**
 * Handle petition creation submission
 */
async function handleCreate() {
    if (modalState.submitting) return;
    if (!validateCurrentStep()) return;

    modalState.submitting = true;
    render();
    attachListeners();

    try {
        const { formData } = modalState;

        // Build the petition data payload
        const petitionData = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            petitionCategory: formData.petitionCategory,
            requiredSignerFields: formData.requiredSignerFields,
            declarationLanguage: formData.declarationLanguage.trim(),
            voterVerificationEnabled: formData.voterVerificationEnabled
        };

        if (formData.geographicScope) {
            petitionData.geographicScope = formData.geographicScope;
        }
        if (formData.signatureGoal) {
            petitionData.signatureGoal = Number(formData.signatureGoal);
        }
        if (formData.privacyConsentText.trim()) {
            petitionData.privacyConsentText = formData.privacyConsentText.trim();
        }

        // Candidate-only fields
        if (modalState.isCandidate) {
            if (formData.customSlug.trim()) {
                petitionData.customSlug = formData.customSlug.trim();
            }
            if (formData.party.trim()) {
                petitionData.party = formData.party.trim();
            }
            if (formData.electionYear) {
                petitionData.electionYear = Number(formData.electionYear);
            }
            if (formData.filingDeadline) {
                petitionData.filingDeadline = formData.filingDeadline;
            }
            if (formData.electionDate) {
                petitionData.electionDate = formData.electionDate;
            }
        }

        const result = await createPetition(petitionData);
        const petition = result.data || result.petition || result;

        modalState.createdPetition = {
            ...petition,
            status: petition.status || 'DRAFT',
            qrCodeData: null
        };

        modalState.submitting = false;
        render();
        attachListeners();

        // Fetch QR code in background
        fetchQRCode(petition.id);

        showToast('Petition created successfully!');
    } catch (error) {
        modalState.submitting = false;
        modalState.errors.submit = error.message || 'Failed to create petition';
        render();
        attachListeners();
        showToast(error.message || 'Failed to create petition. Please try again.');
    }
}

/**
 * Fetch and display the QR code for the created petition
 * @param {string} petitionId - The petition UUID
 */
async function fetchQRCode(petitionId) {
    try {
        const qrResult = await getQRCode(petitionId);
        if (modalState.createdPetition && modalState.createdPetition.id === petitionId) {
            modalState.createdPetition.qrCodeData = qrResult.data || qrResult.qrCode || qrResult.image || qrResult.dataUrl;
            render();
            attachListeners();
        }
    } catch {
        // QR code is non-critical; silently handle failure
        const qrEl = modalContainer?.querySelector('.petition-modal-qr-loading');
        if (qrEl) {
            qrEl.innerHTML = '<span>QR code unavailable</span>';
        }
    }
}

/**
 * Handle publishing the created petition
 */
async function handlePublish() {
    if (!modalState.createdPetition) return;

    const publishBtn = modalContainer?.querySelector('[data-petition-action="publish-petition"]');
    if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing...';
    }

    try {
        const result = await publishPetition(modalState.createdPetition.id);
        const updated = result.data || result.petition || result;
        modalState.createdPetition.status = updated.status || 'ACTIVE';
        render();
        attachListeners();
        showToast('Petition published! It is now accepting signatures.');
    } catch (error) {
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publish Now';
        }
        showToast(error.message || 'Failed to publish petition.');
    }
}

/**
 * Copy the signing link to clipboard
 */
async function copySigningLink() {
    const linkInput = document.getElementById('petitionSigningLink');
    if (!linkInput) return;

    try {
        await navigator.clipboard.writeText(linkInput.value);
        showToast('Link copied to clipboard!');
    } catch {
        // Fallback: select and copy
        linkInput.select();
        document.execCommand('copy');
        showToast('Link copied to clipboard!');
    }
}

// ==================== Utilities ====================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} Escaped string safe for HTML insertion
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}
