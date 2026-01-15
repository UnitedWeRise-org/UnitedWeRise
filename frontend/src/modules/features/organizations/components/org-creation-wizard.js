/**
 * Organization Creation Wizard Component
 * Multi-step wizard for creating a new organization
 *
 * @module features/organizations/components/org-creation-wizard
 */

import { organizationsApi } from '../organizations-api.js';
import { showToast } from '../../../../utils/toast.js';
import { ORG_TYPE_LABELS, JURISDICTION_LABELS } from './org-card.js';

/**
 * US States for jurisdiction dropdown
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

/**
 * Wizard steps configuration
 */
const WIZARD_STEPS = [
    { id: 'basic', title: 'Basic Info', required: true },
    { id: 'type', title: 'Type & Jurisdiction', required: true },
    { id: 'details', title: 'Details', required: false },
    { id: 'review', title: 'Review', required: true }
];

/**
 * Wizard state
 */
let wizardState = {
    isOpen: false,
    currentStep: 0,
    formData: {
        name: '',
        slug: '',
        slugAvailable: null,
        slugChecking: false,
        type: 'COMMUNITY_ORG',
        jurisdictionType: 'STATE',
        jurisdictionValue: '',
        description: '',
        website: ''
    },
    errors: {},
    submitting: false
};

let slugCheckTimeout = null;
let wizardContainer = null;
let escapeHandler = null;

/**
 * Show the create organization wizard
 */
export function showCreateOrgWizard() {
    // Check if user is logged in
    if (!window.currentUser) {
        showToast('Please log in to create an organization');
        // Trigger login modal if available
        if (window.authModal?.show) {
            window.authModal.show('login');
        }
        return;
    }

    // Reset state
    wizardState = {
        isOpen: true,
        currentStep: 0,
        formData: {
            name: '',
            slug: '',
            slugAvailable: null,
            slugChecking: false,
            type: 'COMMUNITY_ORG',
            jurisdictionType: 'STATE',
            jurisdictionValue: '',
            description: '',
            website: ''
        },
        errors: {},
        submitting: false
    };

    // Create container
    wizardContainer = document.getElementById('orgCreationWizard');
    if (!wizardContainer) {
        wizardContainer = document.createElement('div');
        wizardContainer.id = 'orgCreationWizard';
        wizardContainer.className = 'org-wizard-overlay';
        document.body.appendChild(wizardContainer);
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Setup escape key handler
    escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeCreateOrgWizard();
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Render
    renderWizard();
    attachWizardListeners();

    console.log('🏢 Organization creation wizard opened');
}

/**
 * Close the create organization wizard
 */
export function closeCreateOrgWizard() {
    if (wizardContainer) {
        wizardContainer.remove();
        wizardContainer = null;
    }

    document.body.style.overflow = '';

    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }

    if (slugCheckTimeout) {
        clearTimeout(slugCheckTimeout);
        slugCheckTimeout = null;
    }

    wizardState.isOpen = false;
    console.log('🏢 Organization creation wizard closed');
}

/**
 * Render the wizard
 */
function renderWizard() {
    if (!wizardContainer) return;

    const step = WIZARD_STEPS[wizardState.currentStep];
    const progress = ((wizardState.currentStep + 1) / WIZARD_STEPS.length) * 100;

    wizardContainer.innerHTML = `
        <div class="org-wizard">
            <div class="org-wizard-content">
                <div class="org-wizard-header">
                    <div class="org-wizard-progress">
                        <div class="org-wizard-progress-bar">
                            <div class="org-wizard-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="org-wizard-progress-text">
                            Step ${wizardState.currentStep + 1} of ${WIZARD_STEPS.length}: ${step.title}
                        </span>
                    </div>
                    <button class="org-wizard-close" data-wizard-action="close" title="Close">✕</button>
                </div>

                <div class="org-wizard-body">
                    ${renderCurrentStep()}
                </div>

                <div class="org-wizard-footer">
                    ${wizardState.currentStep > 0 ? `
                        <button class="org-wizard-btn org-wizard-btn-secondary" data-wizard-action="back">
                            ← Back
                        </button>
                    ` : '<div></div>'}

                    <div class="org-wizard-footer-right">
                        ${wizardState.currentStep === WIZARD_STEPS.length - 1 ? `
                            <button
                                class="org-wizard-btn org-wizard-btn-primary"
                                data-wizard-action="submit"
                                ${wizardState.submitting ? 'disabled' : ''}
                            >
                                ${wizardState.submitting ? 'Creating...' : 'Create Organization'}
                            </button>
                        ` : `
                            <button class="org-wizard-btn org-wizard-btn-primary" data-wizard-action="next">
                                Continue →
                            </button>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render the current step content
 */
function renderCurrentStep() {
    const stepId = WIZARD_STEPS[wizardState.currentStep].id;

    switch (stepId) {
        case 'basic':
            return renderBasicInfoStep();
        case 'type':
            return renderTypeStep();
        case 'details':
            return renderDetailsStep();
        case 'review':
            return renderReviewStep();
        default:
            return '<p>Unknown step</p>';
    }
}

/**
 * Step 1: Basic Info
 */
function renderBasicInfoStep() {
    const { name, slug, slugAvailable, slugChecking } = wizardState.formData;
    const errors = wizardState.errors;

    let slugStatus = '';
    if (slugChecking) {
        slugStatus = '<span class="org-wizard-slug-status checking">Checking...</span>';
    } else if (slug && slugAvailable === true) {
        slugStatus = '<span class="org-wizard-slug-status available">Available</span>';
    } else if (slug && slugAvailable === false) {
        slugStatus = '<span class="org-wizard-slug-status taken">Already taken</span>';
    }

    return `
        <div class="org-wizard-step">
            <div class="org-wizard-step-header">
                <h2>Create Your Organization</h2>
                <p>Let's start with the basics. Choose a name and URL for your organization.</p>
            </div>

            <div class="org-wizard-form">
                <div class="org-wizard-field ${errors.name ? 'has-error' : ''}">
                    <label for="orgName">Organization Name *</label>
                    <input
                        type="text"
                        id="orgName"
                        class="org-wizard-input"
                        value="${escapeHtml(name)}"
                        placeholder="e.g., Austin Citizens for Change"
                        maxlength="100"
                        data-field="name"
                    />
                    ${errors.name ? `<span class="org-wizard-error">${errors.name}</span>` : ''}
                    <small>Choose a clear, descriptive name (max 100 characters)</small>
                </div>

                <div class="org-wizard-field ${errors.slug ? 'has-error' : ''}">
                    <label for="orgSlug">URL Slug *</label>
                    <div class="org-wizard-slug-input">
                        <span class="org-wizard-slug-prefix">unitedwerise.org/org/</span>
                        <input
                            type="text"
                            id="orgSlug"
                            class="org-wizard-input"
                            value="${escapeHtml(slug)}"
                            placeholder="austin-citizens"
                            maxlength="50"
                            data-field="slug"
                        />
                    </div>
                    <div class="org-wizard-slug-feedback">
                        ${slugStatus}
                        ${errors.slug ? `<span class="org-wizard-error">${errors.slug}</span>` : ''}
                    </div>
                    <small>Lowercase letters, numbers, and hyphens only. This cannot be changed later.</small>
                </div>
            </div>
        </div>
    `;
}

/**
 * Step 2: Type & Jurisdiction
 */
function renderTypeStep() {
    const { type, jurisdictionType, jurisdictionValue } = wizardState.formData;
    const errors = wizardState.errors;

    // Build type options
    const typeOptions = Object.entries(ORG_TYPE_LABELS).map(([value, label]) =>
        `<option value="${value}" ${type === value ? 'selected' : ''}>${label}</option>`
    ).join('');

    // Build jurisdiction type options (exclude CUSTOM for now)
    const jurisdictionOptions = Object.entries(JURISDICTION_LABELS)
        .filter(([value]) => value !== 'CUSTOM')
        .map(([value, label]) =>
            `<option value="${value}" ${jurisdictionType === value ? 'selected' : ''}>${label}</option>`
        ).join('');

    // Build state dropdown if needed
    const stateOptions = US_STATES.map(state =>
        `<option value="${state.code}" ${jurisdictionValue === state.code ? 'selected' : ''}>${state.name}</option>`
    ).join('');

    const showJurisdictionValue = ['STATE', 'COUNTY', 'CITY'].includes(jurisdictionType);

    return `
        <div class="org-wizard-step">
            <div class="org-wizard-step-header">
                <h2>Organization Type & Jurisdiction</h2>
                <p>Tell us what kind of organization this is and where it operates.</p>
            </div>

            <div class="org-wizard-form">
                <div class="org-wizard-field ${errors.type ? 'has-error' : ''}">
                    <label for="orgType">Organization Type *</label>
                    <select id="orgType" class="org-wizard-select" data-field="type">
                        ${typeOptions}
                    </select>
                    ${errors.type ? `<span class="org-wizard-error">${errors.type}</span>` : ''}
                    <small>Select the category that best describes your organization</small>
                </div>

                <div class="org-wizard-field ${errors.jurisdictionType ? 'has-error' : ''}">
                    <label for="orgJurisdiction">Jurisdiction Scope *</label>
                    <select id="orgJurisdiction" class="org-wizard-select" data-field="jurisdictionType">
                        ${jurisdictionOptions}
                    </select>
                    ${errors.jurisdictionType ? `<span class="org-wizard-error">${errors.jurisdictionType}</span>` : ''}
                    <small>What geographic area does your organization cover?</small>
                </div>

                ${showJurisdictionValue ? `
                    <div class="org-wizard-field ${errors.jurisdictionValue ? 'has-error' : ''}">
                        <label for="orgJurisdictionValue">
                            ${jurisdictionType === 'STATE' ? 'State *' :
                              jurisdictionType === 'COUNTY' ? 'County *' : 'City *'}
                        </label>
                        ${jurisdictionType === 'STATE' ? `
                            <select id="orgJurisdictionValue" class="org-wizard-select" data-field="jurisdictionValue">
                                <option value="">Select a state...</option>
                                ${stateOptions}
                            </select>
                        ` : `
                            <input
                                type="text"
                                id="orgJurisdictionValue"
                                class="org-wizard-input"
                                value="${escapeHtml(jurisdictionValue)}"
                                placeholder="${jurisdictionType === 'COUNTY' ? 'e.g., Travis County, TX' : 'e.g., Austin, TX'}"
                                data-field="jurisdictionValue"
                            />
                        `}
                        ${errors.jurisdictionValue ? `<span class="org-wizard-error">${errors.jurisdictionValue}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Step 3: Details (optional)
 */
function renderDetailsStep() {
    const { description, website } = wizardState.formData;
    const errors = wizardState.errors;

    return `
        <div class="org-wizard-step">
            <div class="org-wizard-step-header">
                <h2>Additional Details</h2>
                <p>Add more information to help people learn about your organization. These fields are optional.</p>
            </div>

            <div class="org-wizard-form">
                <div class="org-wizard-field ${errors.description ? 'has-error' : ''}">
                    <label for="orgDescription">Description</label>
                    <textarea
                        id="orgDescription"
                        class="org-wizard-textarea"
                        placeholder="Tell people what your organization does and what you stand for..."
                        maxlength="1000"
                        rows="4"
                        data-field="description"
                    >${escapeHtml(description)}</textarea>
                    <div class="org-wizard-char-count">
                        <span id="descCharCount">${description.length}</span>/1000
                    </div>
                    ${errors.description ? `<span class="org-wizard-error">${errors.description}</span>` : ''}
                </div>

                <div class="org-wizard-field ${errors.website ? 'has-error' : ''}">
                    <label for="orgWebsite">Website</label>
                    <input
                        type="url"
                        id="orgWebsite"
                        class="org-wizard-input"
                        value="${escapeHtml(website)}"
                        placeholder="https://example.org"
                        data-field="website"
                    />
                    ${errors.website ? `<span class="org-wizard-error">${errors.website}</span>` : ''}
                    <small>Your organization's website (optional)</small>
                </div>
            </div>

            <div class="org-wizard-skip-hint">
                <p>You can add or update these details later from your organization dashboard.</p>
            </div>
        </div>
    `;
}

/**
 * Step 4: Review
 */
function renderReviewStep() {
    const { name, slug, type, jurisdictionType, jurisdictionValue, description, website } = wizardState.formData;

    const typeLabel = ORG_TYPE_LABELS[type] || type;
    const jurisdictionLabel = JURISDICTION_LABELS[jurisdictionType] || jurisdictionType;

    let jurisdictionDisplay = jurisdictionLabel;
    if (jurisdictionValue) {
        if (jurisdictionType === 'STATE') {
            const state = US_STATES.find(s => s.code === jurisdictionValue);
            jurisdictionDisplay += ` - ${state?.name || jurisdictionValue}`;
        } else {
            jurisdictionDisplay += ` - ${jurisdictionValue}`;
        }
    }

    return `
        <div class="org-wizard-step">
            <div class="org-wizard-step-header">
                <h2>Review & Create</h2>
                <p>Please review the information below before creating your organization.</p>
            </div>

            <div class="org-wizard-review">
                <div class="org-wizard-review-section">
                    <h3>Basic Information</h3>
                    <dl class="org-wizard-review-list">
                        <div class="org-wizard-review-item">
                            <dt>Name</dt>
                            <dd>${escapeHtml(name)}</dd>
                        </div>
                        <div class="org-wizard-review-item">
                            <dt>URL</dt>
                            <dd>unitedwerise.org/org/${escapeHtml(slug)}</dd>
                        </div>
                    </dl>
                </div>

                <div class="org-wizard-review-section">
                    <h3>Type & Jurisdiction</h3>
                    <dl class="org-wizard-review-list">
                        <div class="org-wizard-review-item">
                            <dt>Type</dt>
                            <dd>${typeLabel}</dd>
                        </div>
                        <div class="org-wizard-review-item">
                            <dt>Jurisdiction</dt>
                            <dd>${jurisdictionDisplay}</dd>
                        </div>
                    </dl>
                </div>

                ${description || website ? `
                    <div class="org-wizard-review-section">
                        <h3>Details</h3>
                        <dl class="org-wizard-review-list">
                            ${description ? `
                                <div class="org-wizard-review-item">
                                    <dt>Description</dt>
                                    <dd>${escapeHtml(description)}</dd>
                                </div>
                            ` : ''}
                            ${website ? `
                                <div class="org-wizard-review-item">
                                    <dt>Website</dt>
                                    <dd><a href="${escapeHtml(website)}" target="_blank" rel="noopener">${escapeHtml(website)}</a></dd>
                                </div>
                            ` : ''}
                        </dl>
                    </div>
                ` : ''}

                <div class="org-wizard-notice">
                    <p><strong>Note:</strong> By creating this organization, you will become its head. You can invite members, assign roles, and manage settings from the dashboard.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners
 */
function attachWizardListeners() {
    if (!wizardContainer) return;

    // Close on overlay click
    wizardContainer.addEventListener('click', (e) => {
        if (e.target === wizardContainer || e.target.classList.contains('org-wizard')) {
            closeCreateOrgWizard();
        }
    });

    // Action buttons
    wizardContainer.addEventListener('click', (e) => {
        const target = e.target.closest('[data-wizard-action]');
        if (!target) return;

        const action = target.dataset.wizardAction;
        handleWizardAction(action);
    });

    // Input changes
    wizardContainer.addEventListener('input', handleInputChange);
    wizardContainer.addEventListener('change', handleInputChange);
}

/**
 * Handle wizard actions
 */
export async function handleWizardAction(action) {
    switch (action) {
        case 'close':
            closeCreateOrgWizard();
            break;
        case 'back':
            previousStep();
            break;
        case 'next':
            nextStep();
            break;
        case 'submit':
            await submitWizard();
            break;
    }
}

/**
 * Handle input changes
 */
function handleInputChange(e) {
    const field = e.target.dataset.field;
    if (!field) return;

    let value = e.target.value;

    // Special handling for slug - enforce format
    if (field === 'slug') {
        value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        e.target.value = value;
        checkSlugAvailability(value);
    }

    wizardState.formData[field] = value;

    // Clear error for this field
    if (wizardState.errors[field]) {
        delete wizardState.errors[field];
    }

    // Update character count for description
    if (field === 'description') {
        const countEl = document.getElementById('descCharCount');
        if (countEl) {
            countEl.textContent = value.length;
        }
    }

    // Re-render type step when jurisdiction type changes (to show/hide value input)
    if (field === 'jurisdictionType') {
        wizardState.formData.jurisdictionValue = ''; // Reset value
        renderWizard();
        attachWizardListeners();
    }
}

/**
 * Check slug availability (debounced)
 */
function checkSlugAvailability(slug) {
    if (slugCheckTimeout) {
        clearTimeout(slugCheckTimeout);
    }

    if (!slug || slug.length < 3) {
        wizardState.formData.slugAvailable = null;
        wizardState.formData.slugChecking = false;
        updateSlugStatus();
        return;
    }

    wizardState.formData.slugChecking = true;
    updateSlugStatus();

    slugCheckTimeout = setTimeout(async () => {
        try {
            const result = await organizationsApi.checkSlugAvailable(slug);
            wizardState.formData.slugAvailable = result.available;
        } catch (error) {
            console.error('Slug check failed:', error);
            wizardState.formData.slugAvailable = null;
        }
        wizardState.formData.slugChecking = false;
        updateSlugStatus();
    }, 300);
}

/**
 * Update slug status display
 */
function updateSlugStatus() {
    const feedbackEl = document.querySelector('.org-wizard-slug-feedback');
    if (!feedbackEl) return;

    const { slug, slugAvailable, slugChecking } = wizardState.formData;
    let status = '';

    if (slugChecking) {
        status = '<span class="org-wizard-slug-status checking">Checking...</span>';
    } else if (slug && slugAvailable === true) {
        status = '<span class="org-wizard-slug-status available">Available</span>';
    } else if (slug && slugAvailable === false) {
        status = '<span class="org-wizard-slug-status taken">Already taken</span>';
    }

    feedbackEl.innerHTML = status;
}

/**
 * Move to next step
 */
function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    if (wizardState.currentStep < WIZARD_STEPS.length - 1) {
        wizardState.currentStep++;
        renderWizard();
        attachWizardListeners();
    }
}

/**
 * Move to previous step
 */
function previousStep() {
    if (wizardState.currentStep > 0) {
        wizardState.currentStep--;
        renderWizard();
        attachWizardListeners();
    }
}

/**
 * Validate current step
 */
function validateCurrentStep() {
    const stepId = WIZARD_STEPS[wizardState.currentStep].id;
    wizardState.errors = {};

    switch (stepId) {
        case 'basic':
            return validateBasicStep();
        case 'type':
            return validateTypeStep();
        case 'details':
            return validateDetailsStep();
        case 'review':
            return true;
        default:
            return true;
    }
}

/**
 * Validate basic info step
 */
function validateBasicStep() {
    const { name, slug, slugAvailable } = wizardState.formData;
    let valid = true;

    if (!name || name.trim().length === 0) {
        wizardState.errors.name = 'Organization name is required';
        valid = false;
    } else if (name.trim().length < 3) {
        wizardState.errors.name = 'Name must be at least 3 characters';
        valid = false;
    }

    if (!slug || slug.length === 0) {
        wizardState.errors.slug = 'URL slug is required';
        valid = false;
    } else if (slug.length < 3) {
        wizardState.errors.slug = 'Slug must be at least 3 characters';
        valid = false;
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
        wizardState.errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
        valid = false;
    } else if (slugAvailable === false) {
        wizardState.errors.slug = 'This slug is already taken';
        valid = false;
    } else if (slugAvailable === null) {
        wizardState.errors.slug = 'Please wait for slug availability check';
        valid = false;
    }

    if (!valid) {
        renderWizard();
        attachWizardListeners();
    }

    return valid;
}

/**
 * Validate type step
 */
function validateTypeStep() {
    const { type, jurisdictionType, jurisdictionValue } = wizardState.formData;
    let valid = true;

    if (!type) {
        wizardState.errors.type = 'Please select an organization type';
        valid = false;
    }

    if (!jurisdictionType) {
        wizardState.errors.jurisdictionType = 'Please select a jurisdiction scope';
        valid = false;
    }

    // Validate jurisdiction value for non-NATIONAL types
    if (['STATE', 'COUNTY', 'CITY'].includes(jurisdictionType) && !jurisdictionValue) {
        wizardState.errors.jurisdictionValue = `Please specify the ${jurisdictionType.toLowerCase()}`;
        valid = false;
    }

    if (!valid) {
        renderWizard();
        attachWizardListeners();
    }

    return valid;
}

/**
 * Validate details step
 */
function validateDetailsStep() {
    const { website } = wizardState.formData;
    let valid = true;

    // Website URL validation (optional field)
    if (website && website.trim().length > 0) {
        try {
            new URL(website);
        } catch {
            wizardState.errors.website = 'Please enter a valid URL (e.g., https://example.org)';
            valid = false;
        }
    }

    if (!valid) {
        renderWizard();
        attachWizardListeners();
    }

    return valid;
}

/**
 * Submit the wizard and create organization
 */
async function submitWizard() {
    if (wizardState.submitting) return;

    // Validate all steps one more time
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
        wizardState.currentStep = i;
        if (!validateCurrentStep()) {
            renderWizard();
            attachWizardListeners();
            return;
        }
    }
    wizardState.currentStep = WIZARD_STEPS.length - 1;

    wizardState.submitting = true;
    renderWizard();
    attachWizardListeners();

    try {
        const { name, slug, type, jurisdictionType, jurisdictionValue, description, website } = wizardState.formData;

        // Build request data
        const orgData = {
            name: name.trim(),
            slug: slug.trim(),
            type,
            jurisdictionType
        };

        // Add jurisdiction value based on type
        if (jurisdictionType === 'STATE' && jurisdictionValue) {
            orgData.jurisdictionValue = jurisdictionValue;
        } else if (['COUNTY', 'CITY'].includes(jurisdictionType) && jurisdictionValue) {
            orgData.jurisdictionValue = jurisdictionValue.trim();
        }

        // Add optional fields
        if (description && description.trim()) {
            orgData.description = description.trim();
        }
        if (website && website.trim()) {
            orgData.website = website.trim();
        }

        // Create organization
        const newOrg = await organizationsApi.create(orgData);

        showToast('Organization created successfully!');
        closeCreateOrgWizard();

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('orgCreated', { detail: { organization: newOrg } }));

        // Navigate to dashboard
        window.location.href = `/org-dashboard.html?org=${newOrg.slug}`;

    } catch (error) {
        console.error('Failed to create organization:', error);
        wizardState.submitting = false;

        // Check for specific error types
        if (error.message?.includes('already head')) {
            showToast('You can only head one organization at a time');
        } else if (error.message?.includes('slug')) {
            wizardState.errors.slug = 'This slug is no longer available';
            wizardState.currentStep = 0;
        } else {
            showToast(error.message || 'Failed to create organization');
        }

        renderWizard();
        attachWizardListeners();
    }
}

// ==================== Utility Functions ====================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default {
    showCreateOrgWizard,
    closeCreateOrgWizard,
    handleWizardAction
};
