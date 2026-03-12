/**
 * @module components/OnboardingFlow
 * @description Verification-gated onboarding flow for United We Rise.
 *
 * Flow: Email Verification → Welcome → Location → Interests
 *
 * The modal is undismissable until onboarding is complete (emailVerified +
 * all required steps). On page load, if the authenticated user has not
 * completed onboarding, the modal is shown automatically.
 *
 * Verification polling checks /api/verification/status every 5 seconds
 * and auto-advances when the user verifies via the email link.
 */
class OnboardingFlow {
    constructor() {
        this.currentStepIndex = 0;
        this.steps = [];
        this.stepData = {};
        this.isVisible = false;
        this.emailVerified = false;
        this.onboardingCompleted = false;
        this.verificationPollTimer = null;
        this.init();
        this.setupEventDelegation();
    }

    /**
     * Get CSRF token for POST requests.
     * Mirrors the pattern in api-manager.js: window.csrfToken or cookie fallback.
     * @returns {string} CSRF token or empty string
     */
    getCSRFToken() {
        if (window.csrfToken) return window.csrfToken;
        const match = document.cookie.match(/uwr_csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    /**
     * Get the API base URL using global config or fallback.
     * @returns {string} API base URL
     */
    getApiBase() {
        return window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://api.unitedwerise.org/api';
    }

    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-onboarding-action]');
            if (!target) return;

            const action = target.dataset.onboardingAction;
            const interest = target.dataset.interest;

            switch (action) {
                case 'validateLocation':
                    this.validateLocation();
                    break;
                case 'previousStep':
                    this.previousStep();
                    break;
                case 'nextStep':
                    this.nextStep();
                    break;
                case 'toggleInterest':
                    this.toggleInterest(target, interest);
                    break;
                case 'resendVerification':
                    this.resendVerificationEmail();
                    break;
            }
        });

        // Block Escape key from closing the modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible && !this.onboardingCompleted) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    async init() {
        this.createOnboardingModal();
        this.addOnboardingStyles();
        await this.loadSteps();
    }

    createOnboardingModal() {
        const modalHtml = `
            <div id="onboardingModal" class="modal onboarding-modal" style="display: none;">
                <div class="modal-content onboarding-content">
                    <div class="onboarding-header">
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="onboardingProgress"></div>
                            </div>
                            <div class="progress-text">
                                <span id="currentStepNum">1</span> of <span id="totalSteps">3</span>
                            </div>
                        </div>
                    </div>

                    <div class="onboarding-body">
                        <div id="onboardingMessage" class="message-container"></div>

                        <!-- Email Verification Prerequisite Screen -->
                        <div id="step-email-verification" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">📧</div>
                                <h2>Verify Your Email</h2>
                                <p class="step-subtitle">Check your inbox for a verification link</p>
                            </div>

                            <div class="verification-gate-content">
                                <div class="verification-gate-status">
                                    <div class="verification-spinner" id="verificationSpinner">
                                        <div class="spinner-ring"></div>
                                    </div>
                                    <p class="verification-gate-message" id="verificationGateMessage">
                                        We sent a verification email to your address. Click the link in the email to continue.
                                    </p>
                                </div>

                                <div class="verification-gate-actions">
                                    <button class="btn btn-secondary" data-onboarding-action="resendVerification" id="resendVerificationBtn">
                                        Resend Verification Email
                                    </button>
                                    <p class="verification-help-text">
                                        Didn't receive it? Check your spam folder, or click above to resend.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Welcome Step -->
                        <div id="step-welcome" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">🏛️</div>
                                <h2>Welcome to United We Rise</h2>
                                <p class="step-subtitle">Your platform for democratic engagement</p>
                            </div>

                            <div class="welcome-content">
                                <div class="feature-grid">
                                    <div class="feature-item">
                                        <div class="feature-icon">🗳️</div>
                                        <h4>Find Your Representatives</h4>
                                        <p>Connect directly with your local, state, and federal representatives</p>
                                    </div>
                                    <div class="feature-item">
                                        <div class="feature-icon">💬</div>
                                        <h4>Join the Conversation</h4>
                                        <p>Engage in respectful political discourse with your community</p>
                                    </div>
                                    <div class="feature-item">
                                        <div class="feature-icon">📢</div>
                                        <h4>Make Your Voice Heard</h4>
                                        <p>Share your views on the issues that matter most to you</p>
                                    </div>
                                    <div class="feature-item">
                                        <div class="feature-icon">🤝</div>
                                        <h4>Build Bridges</h4>
                                        <p>Find common ground with people across the political spectrum</p>
                                    </div>
                                </div>

                                <div class="community-guidelines">
                                    <h4>Our Community Values</h4>
                                    <ul>
                                        <li>Respectful dialogue across all viewpoints</li>
                                        <li>Fact-based discussions and reliable sources</li>
                                        <li>Focus on issues, not personal attacks</li>
                                        <li>Constructive engagement with representatives</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <!-- Location Step -->
                        <div id="step-location" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">📍</div>
                                <h2>Find Your Representatives</h2>
                                <p class="step-subtitle">Add your location to connect with your elected officials</p>
                            </div>

                            <div class="location-form">
                                <div class="form-group">
                                    <label for="zipCode">ZIP Code *</label>
                                    <input type="text" id="zipCode" class="form-input" placeholder="12345" maxlength="5" pattern="[0-9]{5}">
                                    <small>We use your ZIP code to find your representatives</small>
                                </div>

                                <div class="form-group">
                                    <label for="fullAddress">Full Address (Optional)</label>
                                    <input type="text" id="fullAddress" class="form-input" placeholder="123 Main St, City, State">
                                    <small>More precise location helps us find all your representatives</small>
                                </div>

                                <button data-onboarding-action="validateLocation" class="btn btn-primary" id="validateLocationBtn">
                                    Find My Representatives
                                </button>

                                <div id="locationPreview" class="location-preview" style="display: none;">
                                    <h4>Your Representatives Preview</h4>
                                    <div id="representativesList" class="representatives-list"></div>
                                    <p class="location-note">We'll show you all your representatives after you complete this step</p>
                                </div>
                            </div>
                        </div>

                        <!-- Interests Step -->
                        <div id="step-interests" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">📋</div>
                                <h2>Choose Your Interests</h2>
                                <p class="step-subtitle">Select the issues and topics you care about most</p>
                            </div>

                            <div class="interests-form">
                                <p class="form-help">This helps us personalize your feed and suggest relevant discussions. <strong>Select at least 3.</strong></p>

                                <div id="interestsList" class="interests-grid">
                                    <!-- Interests will be loaded dynamically -->
                                </div>

                                <div class="selected-interests">
                                    <h4>Selected Interests: <span id="selectedCount">0</span></h4>
                                    <div id="selectedInterestsList" class="selected-list"></div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="onboarding-footer" id="onboardingFooter">
                        <button id="backBtn" class="btn btn-secondary" data-onboarding-action="previousStep" style="display: none;">
                            &larr; Back
                        </button>

                        <div class="footer-actions">
                            <button id="nextBtn" class="btn btn-primary" data-onboarding-action="nextStep">
                                Get Started &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.setupEventListeners();
    }

    addOnboardingStyles() {
        const styles = `
            <style>
            .onboarding-modal .modal-content {
                max-width: 800px;
                width: 95%;
                max-height: 90vh;
                overflow-y: auto;
                padding: 0;
            }

            .onboarding-content {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .onboarding-header {
                padding: 2rem 2rem 1rem;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .progress-container {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .progress-bar {
                flex: 1;
                height: 8px;
                background-color: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(135deg, #4b5c09, #7a9614);
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-text {
                font-size: 0.875rem;
                color: #666;
                white-space: nowrap;
            }

            .onboarding-body {
                flex: 1;
                padding: 2rem;
                overflow-y: auto;
            }

            .onboarding-footer {
                padding: 1.5rem 2rem;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .footer-actions {
                display: flex;
                gap: 1rem;
                align-items: center;
                margin-left: auto;
            }

            .step-header {
                text-align: center;
                margin-bottom: 2rem;
            }

            .step-icon {
                font-size: 3rem;
                margin-bottom: 0.5rem;
            }

            .step-subtitle {
                color: #666;
                font-size: 1.1rem;
            }

            /* Verification Gate Styles */
            .verification-gate-content {
                text-align: center;
                padding: 2rem 0;
            }

            .verification-gate-status {
                margin-bottom: 2rem;
            }

            .verification-spinner {
                display: inline-block;
                margin-bottom: 1.5rem;
            }

            .spinner-ring {
                width: 48px;
                height: 48px;
                border: 4px solid #e0e0e0;
                border-top-color: #4b5c09;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .verification-gate-message {
                font-size: 1.1rem;
                color: #555;
                line-height: 1.6;
                max-width: 500px;
                margin: 0 auto;
            }

            .verification-gate-actions {
                margin-top: 1.5rem;
            }

            .verification-help-text {
                margin-top: 0.75rem;
                font-size: 0.875rem;
                color: #888;
            }

            .verification-success-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }

            /* Feature Grid */
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .feature-item {
                padding: 1.5rem;
                border: 1px solid #eee;
                border-radius: 12px;
                text-align: center;
            }

            .feature-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }

            .feature-item h4 {
                margin-bottom: 0.5rem;
            }

            .feature-item p {
                color: #666;
                font-size: 0.875rem;
            }

            .community-guidelines {
                background: #f8f9fa;
                padding: 1.5rem;
                border-radius: 12px;
            }

            .community-guidelines ul {
                list-style: none;
                padding: 0;
            }

            .community-guidelines li {
                padding: 0.5rem 0;
                padding-left: 1.5rem;
                position: relative;
            }

            .community-guidelines li::before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #4b5c09;
                font-weight: bold;
            }

            /* Interests Grid */
            .interests-grid {
                margin-bottom: 1.5rem;
            }

            .interest-category-section {
                margin-bottom: 1rem;
            }

            .interest-category-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 0;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid #eee;
                margin-bottom: 0.75rem;
            }

            .interest-category-title {
                margin: 0;
                font-size: 0.95rem;
                color: #444;
            }

            .interest-category-toggle {
                font-size: 0.75rem;
                color: #888;
            }

            .interest-category-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 0.75rem;
                margin-bottom: 0.5rem;
            }

            .interest-option {
                padding: 0.75rem 1rem;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.875rem;
            }

            .interest-option:hover {
                border-color: #4b5c09;
                background: #f8fce8;
            }

            .interest-option.selected {
                border-color: #4b5c09;
                background: #4b5c09;
                color: white;
            }

            .selected-interests {
                margin-top: 1rem;
            }

            .selected-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }

            .selected-chip {
                background: #e8f5e9;
                color: #2e7d32;
                padding: 0.25rem 0.75rem;
                border-radius: 16px;
                font-size: 0.875rem;
            }

            /* Location */
            .location-preview {
                margin-top: 1.5rem;
                padding: 1rem;
                background: #f0f8ff;
                border-radius: 8px;
            }

            .representatives-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }

            .representative-chip {
                background: #e3f2fd;
                color: #1565c0;
                padding: 0.25rem 0.75rem;
                border-radius: 16px;
                font-size: 0.875rem;
            }

            /* Button overrides */
            .onboarding-modal .btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.2s;
            }

            .onboarding-modal .btn-primary {
                background: #4b5c09;
                color: white;
            }

            .onboarding-modal .btn-primary:hover {
                background: #5d7109;
            }

            .onboarding-modal .btn-primary:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            .onboarding-modal .btn-secondary {
                background: #f0f0f0;
                color: #333;
            }

            .onboarding-modal .btn-secondary:hover {
                background: #e0e0e0;
            }

            /* Message / Alert */
            .message-container .alert {
                padding: 0.75rem 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
            }

            .alert-success { background: #e8f5e9; color: #2e7d32; }
            .alert-error { background: #ffebee; color: #c62828; }
            .alert-info { background: #e3f2fd; color: #1565c0; }

            /* Form */
            .form-group {
                margin-bottom: 1.5rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }

            .form-input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ccc;
                border-radius: 8px;
                font-size: 1rem;
                box-sizing: border-box;
            }

            .form-input:focus {
                border-color: #4b5c09;
                outline: none;
                box-shadow: 0 0 0 2px rgba(75, 92, 9, 0.2);
            }

            .form-help {
                color: #666;
                margin-bottom: 1rem;
            }

            .form-group small {
                display: block;
                margin-top: 0.25rem;
                color: #666;
                font-size: 0.875rem;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .onboarding-modal .modal-content {
                    width: 100%;
                    height: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                }

                .onboarding-header,
                .onboarding-body,
                .onboarding-footer {
                    padding-left: 1rem;
                    padding-right: 1rem;
                }

                .feature-grid {
                    grid-template-columns: 1fr;
                }

                .interests-grid {
                    grid-template-columns: 1fr;
                }
            }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        // ZIP code validation
        const zipInput = document.getElementById('zipCode');
        if (zipInput) {
            zipInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
            });
        }
    }

    /**
     * Load onboarding steps and verification status from the backend.
     * Sets this.emailVerified and this.onboardingCompleted from the response.
     */
    async loadSteps() {
        if (!window.authUtils?.isUserAuthenticated()) {
            return;
        }

        try {
            const response = await fetch(`${this.getApiBase()}/onboarding/steps`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.steps = data.steps;
                this.emailVerified = data.emailVerified ?? false;
                this.onboardingCompleted = data.onboardingCompleted ?? false;
                this.updateProgress();

                // Load interests for interests step
                await this.loadInterests();
            } else {
                const errorText = await response.text();
                console.error(`[OnboardingFlow] Failed to load steps: ${response.status} ${response.statusText}`, errorText);
            }
        } catch (error) {
            console.error('[OnboardingFlow] Load steps exception:', error);
        }
    }

    async loadInterests() {
        try {
            const response = await fetch(`${this.getApiBase()}/onboarding/interests`);
            if (response.ok) {
                const data = await response.json();
                if (data.categories) {
                    this.populateCategorizedInterests(data.categories);
                } else {
                    this.populateInterests(data.interests);
                }
            }
        } catch (error) {
            console.error('Failed to load interests:', error);
        }
    }

    /**
     * Render interests grouped by category with collapsible section headers.
     * @param {Array<{category: string, interests: string[]}>} categories
     */
    populateCategorizedInterests(categories) {
        const container = document.getElementById('interestsList');
        if (!container) return;
        container.innerHTML = '';

        categories.forEach((cat, index) => {
            const section = document.createElement('div');
            section.className = 'interest-category-section';

            const header = document.createElement('div');
            header.className = 'interest-category-header';
            header.innerHTML = `
                <h4 class="interest-category-title">${cat.category}</h4>
                <span class="interest-category-toggle" data-category-index="${index}">&#9660;</span>
            `;
            header.addEventListener('click', () => {
                const grid = section.querySelector('.interest-category-grid');
                const toggle = header.querySelector('.interest-category-toggle');
                if (grid.style.display === 'none') {
                    grid.style.display = 'grid';
                    toggle.innerHTML = '&#9660;';
                } else {
                    grid.style.display = 'none';
                    toggle.innerHTML = '&#9654;';
                }
            });

            const grid = document.createElement('div');
            grid.className = 'interest-category-grid';

            cat.interests.forEach(interest => {
                const option = document.createElement('div');
                option.className = 'interest-option';
                option.textContent = interest;
                option.dataset.onboardingAction = 'toggleInterest';
                option.dataset.interest = interest;
                grid.appendChild(option);
            });

            section.appendChild(header);
            section.appendChild(grid);
            container.appendChild(section);
        });
    }

    /**
     * Fallback: render flat interest list (backwards compatibility).
     * @param {string[]} interests
     */
    populateInterests(interests) {
        const container = document.getElementById('interestsList');
        if (!container) return;
        container.innerHTML = '';

        interests.forEach(interest => {
            const option = document.createElement('div');
            option.className = 'interest-option';
            option.textContent = interest;
            option.dataset.onboardingAction = 'toggleInterest';
            option.dataset.interest = interest;
            container.appendChild(option);
        });
    }

    toggleInterest(element, interest) {
        element.classList.toggle('selected');

        if (!this.stepData.interests) this.stepData.interests = [];

        const index = this.stepData.interests.indexOf(interest);
        if (index === -1) {
            this.stepData.interests.push(interest);
        } else {
            this.stepData.interests.splice(index, 1);
        }

        this.updateSelectedInterests();
    }

    updateSelectedInterests() {
        const interests = this.stepData.interests || [];
        const countEl = document.getElementById('selectedCount');
        if (countEl) countEl.textContent = interests.length;

        const container = document.getElementById('selectedInterestsList');
        if (container) {
            container.innerHTML = interests.map(interest =>
                `<span class="selected-chip">${interest}</span>`
            ).join('');
        }
    }

    async validateLocation() {
        const zipCode = document.getElementById('zipCode').value;
        const address = document.getElementById('fullAddress').value;

        if (!zipCode) {
            this.showMessage('Please enter your ZIP code', 'error');
            return;
        }

        const btn = document.getElementById('validateLocationBtn');
        btn.disabled = true;
        btn.textContent = 'Finding representatives...';

        try {
            const response = await fetch(`${this.getApiBase()}/onboarding/location/validate`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken()
                },
                body: JSON.stringify({ zipCode, address })
            });

            const data = await response.json();

            if (response.ok) {
                this.showLocationPreview(data.location);
                this.stepData.location = {
                    zipCode,
                    address,
                    representatives: data.location.representatives
                };
            } else {
                this.showMessage(data.error || 'Invalid location', 'error');
            }
        } catch (error) {
            this.showMessage('Failed to validate location', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Find My Representatives';
        }
    }

    showLocationPreview(location) {
        const preview = document.getElementById('locationPreview');
        const list = document.getElementById('representativesList');

        list.innerHTML = location.representatives.slice(0, 3).map(rep =>
            `<span class="representative-chip">${rep.name}</span>`
        ).join('');

        if (location.representatives.length > 3) {
            list.innerHTML += `<span class="representative-chip">+${location.representatives.length - 3} more</span>`;
        }

        preview.style.display = 'block';
    }

    /**
     * Show the onboarding modal. If email is not verified, shows the
     * verification prerequisite screen and starts polling.
     */
    async show() {
        if (this.isVisible) return;

        this.isVisible = true;
        const modal = document.getElementById('onboardingModal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Prevent backdrop click from closing
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !this.onboardingCompleted) {
                e.stopPropagation();
            }
        });

        // Ensure steps are loaded
        if (this.steps.length === 0) {
            await this.loadSteps();
        }

        // If still no steps after loading, show error but don't auto-close
        if (this.steps.length === 0) {
            console.error('Failed to load onboarding steps');
            this.showMessage('Failed to load onboarding. Please refresh the page and try again.', 'error');
            return;
        }

        // Check email verification status
        if (!this.emailVerified) {
            this.showVerificationGate();
            return;
        }

        // Email verified — show onboarding steps
        this.showOnboardingSteps();
        this.trackEvent('onboarding_opened');
    }

    /**
     * Show the email verification prerequisite screen and start polling.
     */
    showVerificationGate() {
        // Hide all step divs and footer
        document.querySelectorAll('.onboarding-step').forEach(step => {
            step.style.display = 'none';
        });
        document.getElementById('onboardingFooter').style.display = 'none';

        // Show verification gate screen
        document.getElementById('step-email-verification').style.display = 'block';

        // Update progress to show 0%
        document.getElementById('onboardingProgress').style.width = '0%';
        document.getElementById('currentStepNum').textContent = '0';

        // Start polling for verification
        this.startVerificationPolling();
        this.trackEvent('verification_gate_shown');
    }

    /**
     * Poll /api/verification/status every 5 seconds to detect when the
     * user verifies their email in another tab.
     */
    startVerificationPolling() {
        this.stopVerificationPolling();

        this.verificationPollTimer = setInterval(async () => {
            try {
                const response = await fetch(`${this.getApiBase()}/verification/status`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.emailVerified) {
                        this.emailVerified = true;
                        this.stopVerificationPolling();
                        this.onVerificationComplete();
                    }
                }
            } catch (error) {
                console.error('[OnboardingFlow] Verification poll error:', error);
            }
        }, 5000);
    }

    stopVerificationPolling() {
        if (this.verificationPollTimer) {
            clearInterval(this.verificationPollTimer);
            this.verificationPollTimer = null;
        }
    }

    /**
     * Called when email verification is detected. Shows a brief success
     * message then transitions to onboarding steps.
     */
    onVerificationComplete() {
        const messageEl = document.getElementById('verificationGateMessage');
        const spinnerEl = document.getElementById('verificationSpinner');
        const resendBtn = document.getElementById('resendVerificationBtn');
        const helpText = document.querySelector('.verification-help-text');

        if (spinnerEl) spinnerEl.innerHTML = '<div class="verification-success-icon">✅</div>';
        if (messageEl) messageEl.textContent = 'Email verified! Setting up your account...';
        if (resendBtn) resendBtn.style.display = 'none';
        if (helpText) helpText.style.display = 'none';

        this.trackEvent('email_verified_via_poll');

        setTimeout(() => {
            this.showOnboardingSteps();
        }, 1500);
    }

    /**
     * Transition from verification gate to onboarding steps.
     */
    showOnboardingSteps() {
        // Hide verification gate
        document.getElementById('step-email-verification').style.display = 'none';

        // Show footer
        document.getElementById('onboardingFooter').style.display = 'flex';

        // Start from first incomplete step
        this.currentStepIndex = this.steps.findIndex(step => !step.completed);
        if (this.currentStepIndex === -1) this.currentStepIndex = 0;

        this.showCurrentStep();
    }

    /**
     * Resend the verification email. Rate-limited on the backend.
     */
    async resendVerificationEmail() {
        const btn = document.getElementById('resendVerificationBtn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Sending...';

        try {
            const response = await fetch(`${this.getApiBase()}/verification/email/send`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken()
                }
            });

            if (response.ok) {
                this.showMessage('Verification email sent! Check your inbox.', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.error || 'Failed to send verification email', 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * Close the modal. Only allowed if onboarding is complete.
     */
    close() {
        if (!this.onboardingCompleted) {
            return; // Cannot dismiss until complete
        }

        this.isVisible = false;
        this.stopVerificationPolling();
        document.getElementById('onboardingModal').style.display = 'none';
        document.body.style.overflow = '';
        this.trackEvent('onboarding_closed');
    }

    showCurrentStep() {
        // Hide all steps
        document.querySelectorAll('.onboarding-step').forEach(step => {
            step.style.display = 'none';
        });

        // Show current step
        const currentStep = this.steps[this.currentStepIndex];
        if (!currentStep) return;

        const stepEl = document.getElementById(`step-${currentStep.id}`);
        if (stepEl) stepEl.style.display = 'block';

        // Update progress
        this.updateProgress();

        // Update navigation
        this.updateNavigation();

        // Step-specific setup
        this.setupCurrentStep(currentStep);
    }

    setupCurrentStep(step) {
        switch (step.id) {
            case 'interests':
                if (step.data && step.data.length > 0) {
                    this.stepData.interests = [...step.data];
                    this.updateSelectedInterests();
                    step.data.forEach(interest => {
                        const option = Array.from(document.querySelectorAll('.interest-option'))
                            .find(el => el.textContent === interest);
                        if (option) option.classList.add('selected');
                    });
                }
                break;
        }
    }

    updateProgress() {
        const completedSteps = this.steps.filter(s => s.completed).length;
        const total = this.steps.length;
        const progress = total > 0 ? (completedSteps / total) * 100 : 0;

        const progressEl = document.getElementById('onboardingProgress');
        if (progressEl) progressEl.style.width = `${progress}%`;

        const currentNumEl = document.getElementById('currentStepNum');
        if (currentNumEl) currentNumEl.textContent = this.currentStepIndex + 1;

        const totalEl = document.getElementById('totalSteps');
        if (totalEl) totalEl.textContent = total;
    }

    updateNavigation() {
        const currentStep = this.steps[this.currentStepIndex];

        // Back button — not shown on first step
        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.style.display = this.currentStepIndex > 0 ? 'inline-block' : 'none';

        // Next button text
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            if (this.currentStepIndex === this.steps.length - 1) {
                nextBtn.textContent = 'Complete Setup';
            } else if (this.currentStepIndex === 0) {
                nextBtn.textContent = 'Get Started \u2192';
            } else {
                nextBtn.textContent = 'Continue \u2192';
            }
        }
    }

    async nextStep() {
        if (this.steps.length === 0) {
            this.showMessage('Onboarding data not loaded. Please refresh the page.', 'error');
            return;
        }

        const currentStep = this.steps[this.currentStepIndex];

        if (!currentStep) {
            console.error('Current step is undefined', { currentStepIndex: this.currentStepIndex, stepsLength: this.steps.length });
            this.showMessage('Onboarding step error. Please refresh the page.', 'error');
            return;
        }

        // Validate current step
        if (!await this.validateCurrentStep(currentStep)) {
            return;
        }

        // Complete current step
        try {
            await this.completeCurrentStep(currentStep);
        } catch (error) {
            this.showMessage('Failed to save step data', 'error');
            return;
        }

        // Move to next step or complete onboarding
        if (this.currentStepIndex < this.steps.length - 1) {
            this.currentStepIndex++;
            this.showCurrentStep();
        } else {
            await this.completeOnboarding();
        }
    }

    previousStep() {
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.showCurrentStep();
        }
    }

    async validateCurrentStep(step) {
        if (!step || !step.id) {
            console.error('validateCurrentStep called with invalid step:', step);
            return false;
        }

        switch (step.id) {
            case 'location': {
                const zipCode = document.getElementById('zipCode').value;
                if (!zipCode) {
                    this.showMessage('Please enter your ZIP code', 'error');
                    return false;
                }
                if (!this.stepData.location) {
                    this.showMessage('Please validate your location first', 'error');
                    return false;
                }
                break;
            }
            case 'interests': {
                const interests = this.stepData.interests || [];
                if (interests.length < 3) {
                    this.showMessage('Please select at least 3 interests', 'error');
                    return false;
                }
                break;
            }
        }

        return true;
    }

    async completeCurrentStep(step) {
        const stepData = this.stepData[step.id] || this.stepData[step.id.replace('step-', '')];

        const response = await fetch(`${this.getApiBase()}/onboarding/complete-step`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.getCSRFToken()
            },
            body: JSON.stringify({
                stepId: step.id,
                stepData
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to complete step');
        }

        const data = await response.json();

        // Update local step data
        step.completed = true;

        this.trackEvent('step_completed', step.id);

        return data;
    }

    async completeOnboarding() {
        this.onboardingCompleted = true;
        this.trackEvent('onboarding_completed');

        // Show completion message
        this.showMessage('Welcome to United We Rise! Your account setup is complete.', 'success');

        setTimeout(() => {
            this.isVisible = false;
            this.stopVerificationPolling();
            document.getElementById('onboardingModal').style.display = 'none';
            document.body.style.overflow = '';

            if (window.onOnboardingComplete) {
                window.onOnboardingComplete();
            } else {
                window.location.reload();
            }
        }, 2000);
    }

    showMessage(text, type = 'info') {
        const messageContainer = document.getElementById('onboardingMessage');
        if (!messageContainer) return;

        messageContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${text}
            </div>
        `;

        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }

    trackEvent(event, stepId = null) {
        console.log(`[ONBOARDING] ${event}`, { stepId, timestamp: new Date().toISOString() });
    }
}

// Initialize onboarding flow
const onboardingFlow = new OnboardingFlow();

// Make it globally available
window.onboardingFlow = onboardingFlow;

/**
 * Auto-show onboarding for users who haven't completed it.
 * Checks onboarding progress on page load; if incomplete, shows the
 * undismissable modal immediately.
 */
document.addEventListener('DOMContentLoaded', async () => {
    if (window.authUtils?.isUserAuthenticated()) {
        try {
            const API_BASE = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://api.unitedwerise.org/api';
            const response = await fetch(`${API_BASE}/onboarding/progress`, {
                credentials: 'include'
            });

            if (response.ok) {
                const progress = await response.json();

                // Show onboarding if not complete (either verification or steps)
                if (!progress.isComplete || !progress.emailVerified) {
                    setTimeout(() => {
                        onboardingFlow.show();
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Failed to check onboarding progress:', error);
        }
    }
});
