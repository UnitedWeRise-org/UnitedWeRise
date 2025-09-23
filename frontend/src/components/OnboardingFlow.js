// Comprehensive onboarding flow for United We Rise
class OnboardingFlow {
    constructor() {
        this.currentStepIndex = 0;
        this.steps = [];
        this.stepData = {};
        this.isVisible = false;
        this.init();
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
                                <span id="currentStepNum">1</span> of <span id="totalSteps">7</span>
                            </div>
                        </div>
                        <button class="close-btn" onclick="onboardingFlow.close()" title="Exit onboarding">&times;</button>
                    </div>
                    
                    <div class="onboarding-body">
                        <div id="onboardingMessage" class="message-container"></div>
                        
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

                        <!-- Verification Step -->
                        <div id="step-verification" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">🔐</div>
                                <h2>Secure Your Account</h2>
                                <p class="step-subtitle">Verify your contact information for account security</p>
                            </div>
                            
                            <div class="verification-status">
                                <div class="verification-item">
                                    <span class="verification-icon" id="emailVerificationIcon">⏳</span>
                                    <div class="verification-info">
                                        <strong>Email Verification</strong>
                                        <p id="emailVerificationStatus">Checking status...</p>
                                    </div>
                                    <button id="emailVerificationBtn" class="btn btn-secondary" style="display: none;">
                                        Verify Email
                                    </button>
                                </div>
                                
                                <div class="verification-item">
                                    <span class="verification-icon" id="phoneVerificationIcon">⏳</span>
                                    <div class="verification-info">
                                        <strong>Phone Verification</strong>
                                        <p id="phoneVerificationStatus">Checking status...</p>
                                    </div>
                                    <button id="phoneVerificationBtn" class="btn btn-secondary" style="display: none;">
                                        Verify Phone
                                    </button>
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
                                
                                <button onclick="onboardingFlow.validateLocation()" class="btn btn-primary" id="validateLocationBtn">
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
                                <p class="form-help">This helps us personalize your feed and suggest relevant discussions</p>
                                
                                <div id="interestsList" class="interests-grid">
                                    <!-- Interests will be loaded dynamically -->
                                </div>
                                
                                <div class="selected-interests">
                                    <h4>Selected Interests: <span id="selectedCount">0</span></h4>
                                    <div id="selectedInterestsList" class="selected-list"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Experience Step -->
                        <div id="step-experience" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">🌱</div>
                                <h2>Your Political Engagement</h2>
                                <p class="step-subtitle">Help us tailor your experience to your engagement level</p>
                            </div>
                            
                            <div class="experience-options">
                                <div class="experience-option" data-value="new">
                                    <div class="option-icon">🌟</div>
                                    <h4>New to Politics</h4>
                                    <p>I'm just starting to learn about political issues and want to get more involved</p>
                                    <div class="option-features">
                                        <span class="feature-tag">Beginner guides</span>
                                        <span class="feature-tag">Educational content</span>
                                    </div>
                                </div>
                                
                                <div class="experience-option" data-value="casual">
                                    <div class="option-icon">👀</div>
                                    <h4>Casual Observer</h4>
                                    <p>I follow politics occasionally and like to stay informed about major issues</p>
                                    <div class="option-features">
                                        <span class="feature-tag">News summaries</span>
                                        <span class="feature-tag">Key updates</span>
                                    </div>
                                </div>
                                
                                <div class="experience-option" data-value="engaged">
                                    <div class="option-icon">💪</div>
                                    <h4>Actively Engaged</h4>
                                    <p>I regularly follow politics and participate in discussions and civic activities</p>
                                    <div class="option-features">
                                        <span class="feature-tag">In-depth discussions</span>
                                        <span class="feature-tag">Action opportunities</span>
                                    </div>
                                </div>
                                
                                <div class="experience-option" data-value="activist">
                                    <div class="option-icon">🔥</div>
                                    <h4>Political Activist</h4>
                                    <p>I'm heavily involved in political advocacy and community organizing</p>
                                    <div class="option-features">
                                        <span class="feature-tag">Advanced tools</span>
                                        <span class="feature-tag">Organizing features</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Notifications Step -->
                        <div id="step-notifications" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">🔔</div>
                                <h2>Stay Connected</h2>
                                <p class="step-subtitle">Choose how you'd like to receive updates and notifications</p>
                            </div>
                            
                            <div class="notifications-form">
                                <div class="notification-group">
                                    <h4>Email Notifications</h4>
                                    <div class="notification-option">
                                        <input type="checkbox" id="emailUpdates" checked>
                                        <label for="emailUpdates">
                                            <strong>Important Updates</strong>
                                            <span>Security alerts, policy changes, and important announcements</span>
                                        </label>
                                    </div>
                                    <div class="notification-option">
                                        <input type="checkbox" id="weeklyDigest" checked>
                                        <label for="weeklyDigest">
                                            <strong>Weekly Digest</strong>
                                            <span>Summary of trending discussions and representative activity</span>
                                        </label>
                                    </div>
                                    <div class="notification-option">
                                        <input type="checkbox" id="repUpdates">
                                        <label for="repUpdates">
                                            <strong>Representative Updates</strong>
                                            <span>When your representatives post updates or take positions</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="notification-group">
                                    <h4>In-App Notifications</h4>
                                    <div class="notification-option">
                                        <input type="checkbox" id="mentions" checked>
                                        <label for="mentions">
                                            <strong>Mentions & Replies</strong>
                                            <span>When someone mentions you or replies to your posts</span>
                                        </label>
                                    </div>
                                    <div class="notification-option">
                                        <input type="checkbox" id="discussions">
                                        <label for="discussions">
                                            <strong>Discussion Updates</strong>
                                            <span>New activity in discussions you're following</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="notification-group">
                                    <h4>SMS Notifications (if phone verified)</h4>
                                    <div class="notification-option">
                                        <input type="checkbox" id="urgentSMS">
                                        <label for="urgentSMS">
                                            <strong>Urgent Alerts Only</strong>
                                            <span>Critical security alerts and emergency announcements</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Profile Step -->
                        <div id="step-profile" class="onboarding-step" style="display: none;">
                            <div class="step-header">
                                <div class="step-icon">👤</div>
                                <h2>Complete Your Profile</h2>
                                <p class="step-subtitle">Help others connect with you in the community</p>
                            </div>
                            
                            <div class="profile-form">
                                <div class="avatar-section">
                                    <div class="avatar-upload">
                                        <div id="avatarPreview" class="avatar-preview">
                                            <span class="avatar-placeholder">📷</span>
                                        </div>
                                        <input type="file" id="avatarUpload" accept="image/*" style="display: none;">
                                        <button onclick="document.getElementById('avatarUpload').click()" class="btn btn-secondary">
                                            Choose Photo
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="displayName">Display Name (Optional)</label>
                                    <input type="text" id="displayName" class="form-input" placeholder="How you'd like to be known">
                                    <small>Leave blank to use your first name</small>
                                </div>
                                
                                <div class="form-group">
                                    <label for="profileBio">Bio (Optional)</label>
                                    <textarea id="profileBio" class="form-textarea" placeholder="Tell the community a bit about yourself..." maxlength="500"></textarea>
                                    <small class="char-count">0 / 500 characters</small>
                                </div>
                                
                                <div class="privacy-notice">
                                    <h4>Privacy Note</h4>
                                    <p>Your profile information is optional and can be updated anytime. Only information you choose to share will be visible to other users.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="onboarding-footer">
                        <button id="backBtn" class="btn btn-secondary" onclick="onboardingFlow.previousStep()" style="display: none;">
                            ← Back
                        </button>
                        
                        <div class="footer-actions">
                            <button id="skipBtn" class="btn btn-text" onclick="onboardingFlow.skipStep()" style="display: none;">
                                Skip for now
                            </button>
                            <button id="nextBtn" class="btn btn-primary" onclick="onboardingFlow.nextStep()">
                                Get Started →
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
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e0e0e0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4b5c09, #6b7c29);
                transition: width 0.3s ease;
            }
            
            .progress-text {
                font-size: 0.875rem;
                color: #666;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #999;
                cursor: pointer;
                padding: 0.5rem;
                margin-left: 1rem;
            }
            
            .close-btn:hover {
                color: #333;
            }
            
            .onboarding-body {
                flex: 1;
                padding: 2rem;
                overflow-y: auto;
            }
            
            .onboarding-step {
                text-align: center;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .step-header {
                margin-bottom: 2rem;
            }
            
            .step-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .step-header h2 {
                margin: 0 0 0.5rem 0;
                color: #333;
            }
            
            .step-subtitle {
                color: #666;
                font-size: 1.1rem;
                margin: 0;
            }
            
            /* Welcome Step */
            .welcome-content {
                text-align: left;
            }
            
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin: 2rem 0;
            }
            
            .feature-item {
                background: #f8f9fa;
                padding: 1.5rem;
                border-radius: 8px;
                text-align: center;
            }
            
            .feature-icon {
                font-size: 2rem;
                margin-bottom: 1rem;
            }
            
            .feature-item h4 {
                margin: 0 0 0.5rem 0;
                color: #4b5c09;
            }
            
            .community-guidelines {
                background: #e8f4fd;
                padding: 1.5rem;
                border-radius: 8px;
                border-left: 4px solid #17a2b8;
            }
            
            .community-guidelines h4 {
                margin: 0 0 1rem 0;
                color: #0c5460;
            }
            
            .community-guidelines ul {
                margin: 0;
                padding-left: 1.5rem;
            }
            
            /* Verification Step */
            .verification-status {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                text-align: left;
            }
            
            .verification-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .verification-icon {
                font-size: 1.5rem;
            }
            
            .verification-info {
                flex: 1;
            }
            
            .verification-info strong {
                display: block;
                margin-bottom: 0.25rem;
            }
            
            .verification-info p {
                margin: 0;
                color: #666;
                font-size: 0.9rem;
            }
            
            /* Location Step */
            .location-form {
                text-align: left;
                max-width: 400px;
                margin: 0 auto;
            }
            
            .location-preview {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                margin-top: 1rem;
                text-align: center;
            }
            
            .representatives-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                justify-content: center;
                margin: 1rem 0;
            }
            
            .representative-chip {
                background: #4b5c09;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.875rem;
            }
            
            .location-note {
                font-size: 0.875rem;
                color: #666;
                margin: 0;
            }
            
            /* Interests Step */
            .interests-form {
                text-align: left;
            }
            
            .form-help {
                text-align: center;
                color: #666;
                margin-bottom: 2rem;
            }
            
            .interests-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
                margin: 2rem 0;
            }
            
            .interest-option {
                background: #f8f9fa;
                border: 2px solid transparent;
                padding: 1rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            }
            
            .interest-option:hover {
                background: #e9ecef;
            }
            
            .interest-option.selected {
                background: #e8f4fd;
                border-color: #17a2b8;
            }
            
            .selected-interests {
                margin-top: 2rem;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .selected-list {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 1rem;
            }
            
            .selected-chip {
                background: #4b5c09;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.875rem;
            }
            
            /* Experience Step */
            .experience-options {
                display: grid;
                gap: 1rem;
                text-align: left;
            }
            
            .experience-option {
                background: #f8f9fa;
                border: 2px solid transparent;
                padding: 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .experience-option:hover {
                background: #e9ecef;
            }
            
            .experience-option.selected {
                background: #e8f4fd;
                border-color: #17a2b8;
            }
            
            .option-icon {
                font-size: 2rem;
                margin-bottom: 1rem;
            }
            
            .experience-option h4 {
                margin: 0 0 0.5rem 0;
                color: #333;
            }
            
            .experience-option p {
                margin: 0 0 1rem 0;
                color: #666;
            }
            
            .option-features {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }
            
            .feature-tag {
                background: #4b5c09;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                font-size: 0.75rem;
            }
            
            /* Notifications Step */
            .notifications-form {
                text-align: left;
            }
            
            .notification-group {
                margin-bottom: 2rem;
            }
            
            .notification-group h4 {
                margin: 0 0 1rem 0;
                color: #4b5c09;
                border-bottom: 2px solid #4b5c09;
                padding-bottom: 0.5rem;
            }
            
            .notification-option {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .notification-option input[type="checkbox"] {
                margin-top: 0.25rem;
            }
            
            .notification-option label {
                flex: 1;
                cursor: pointer;
            }
            
            .notification-option label strong {
                display: block;
                margin-bottom: 0.25rem;
            }
            
            .notification-option label span {
                color: #666;
                font-size: 0.9rem;
            }
            
            /* Profile Step */
            .profile-form {
                text-align: left;
            }
            
            .avatar-section {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .avatar-upload {
                display: inline-block;
            }
            
            .avatar-preview {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
                font-size: 2rem;
                color: #999;
                overflow: hidden;
            }
            
            .avatar-preview img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .char-count {
                display: block;
                text-align: right;
                color: #666;
                font-size: 0.875rem;
                margin-top: 0.25rem;
            }
            
            .privacy-notice {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1.5rem;
            }
            
            .privacy-notice h4 {
                margin: 0 0 0.5rem 0;
                color: #856404;
            }
            
            .privacy-notice p {
                margin: 0;
                color: #856404;
                font-size: 0.9rem;
            }
            
            /* Footer */
            .onboarding-footer {
                padding: 1rem 2rem;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .footer-actions {
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            
            /* Form Elements */
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #333;
            }
            
            .form-input, .form-textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 1rem;
                transition: border-color 0.3s ease;
            }
            
            .form-input:focus, .form-textarea:focus {
                outline: none;
                border-color: #4b5c09;
                box-shadow: 0 0 0 2px rgba(75, 92, 9, 0.1);
            }
            
            .form-textarea {
                min-height: 100px;
                resize: vertical;
                font-family: inherit;
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
        // Avatar upload
        document.getElementById('avatarUpload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('avatarPreview');
                    preview.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Bio character counter
        document.getElementById('profileBio').addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.querySelector('.char-count').textContent = `${count} / 500 characters`;
        });

        // ZIP code validation
        document.getElementById('zipCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
        });

        // Experience option selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.experience-option')) {
                document.querySelectorAll('.experience-option').forEach(opt => opt.classList.remove('selected'));
                e.target.closest('.experience-option').classList.add('selected');
            }
        });
    }

    async loadSteps() {
        // Don't load steps if user is not logged in
        // Use unified authentication check instead of localStorage
        if (!window.authUtils?.isUserAuthenticated()) {
            console.log('User not authenticated, skipping onboarding steps load');
            return;
        }
        
        try {
            const API_BASE = 'https://api.unitedwerise.org/api';
            const response = await fetch(`${API_BASE}/onboarding/steps`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.steps = data.steps;
                this.updateProgress();
                
                // Load interests for interests step
                await this.loadInterests();
            }
        } catch (error) {
            console.error('Failed to load onboarding steps:', error);
        }
    }

    async loadInterests() {
        try {
            const API_BASE = 'https://api.unitedwerise.org/api';
            const response = await fetch(`${API_BASE}/onboarding/interests`);
            if (response.ok) {
                const data = await response.json();
                this.populateInterests(data.interests);
            }
        } catch (error) {
            console.error('Failed to load interests:', error);
        }
    }

    populateInterests(interests) {
        const container = document.getElementById('interestsList');
        container.innerHTML = '';

        interests.forEach(interest => {
            const option = document.createElement('div');
            option.className = 'interest-option';
            option.textContent = interest;
            option.onclick = () => this.toggleInterest(option, interest);
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
        document.getElementById('selectedCount').textContent = interests.length;
        
        const container = document.getElementById('selectedInterestsList');
        container.innerHTML = interests.map(interest => 
            `<span class="selected-chip">${interest}</span>`
        ).join('');
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
            const API_BASE = 'https://api.unitedwerise.org/api';
            const response = await fetch(`${API_BASE}/onboarding/location/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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

    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        document.getElementById('onboardingModal').style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Start from the first incomplete step
        this.currentStepIndex = this.steps.findIndex(step => !step.completed);
        if (this.currentStepIndex === -1) this.currentStepIndex = 0;
        
        this.showCurrentStep();
        this.trackEvent('onboarding_opened');
    }

    close() {
        this.isVisible = false;
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

        document.getElementById(`step-${currentStep.id}`).style.display = 'block';
        
        // Update progress
        this.updateProgress();
        
        // Update navigation
        this.updateNavigation();
        
        // Step-specific setup
        this.setupCurrentStep(currentStep);
    }

    setupCurrentStep(step) {
        switch (step.id) {
            case 'verification':
                this.updateVerificationStatus(step.data);
                break;
            case 'interests':
                if (step.data && step.data.length > 0) {
                    this.stepData.interests = [...step.data];
                    this.updateSelectedInterests();
                    // Mark selected interests
                    step.data.forEach(interest => {
                        const option = Array.from(document.querySelectorAll('.interest-option'))
                            .find(el => el.textContent === interest);
                        if (option) option.classList.add('selected');
                    });
                }
                break;
            case 'experience':
                if (step.data) {
                    document.querySelector(`[data-value="${step.data}"]`)?.classList.add('selected');
                }
                break;
        }
    }

    updateVerificationStatus(data) {
        if (!data) return;

        // Email verification
        const emailIcon = document.getElementById('emailVerificationIcon');
        const emailStatus = document.getElementById('emailVerificationStatus');
        const emailBtn = document.getElementById('emailVerificationBtn');

        if (data.emailVerified) {
            emailIcon.textContent = '✅';
            emailStatus.textContent = 'Email verified successfully';
            emailBtn.style.display = 'none';
        } else {
            emailIcon.textContent = '⏳';
            emailStatus.textContent = 'Email verification pending';
            emailBtn.style.display = 'inline-block';
            emailBtn.onclick = () => verificationFlow.showVerificationModal();
        }

        // Phone verification
        const phoneIcon = document.getElementById('phoneVerificationIcon');
        const phoneStatus = document.getElementById('phoneVerificationStatus');
        const phoneBtn = document.getElementById('phoneVerificationBtn');

        if (data.phoneVerified) {
            phoneIcon.textContent = '✅';
            phoneStatus.textContent = 'Phone verified successfully';
            phoneBtn.style.display = 'none';
        } else {
            phoneIcon.textContent = '⏳';
            phoneStatus.textContent = 'Phone verification pending';
            phoneBtn.style.display = 'inline-block';
            phoneBtn.onclick = () => verificationFlow.showVerificationModal();
        }
    }

    updateProgress() {
        const completedSteps = this.steps.filter(s => s.completed).length;
        const progress = (completedSteps / this.steps.length) * 100;
        
        document.getElementById('onboardingProgress').style.width = `${progress}%`;
        document.getElementById('currentStepNum').textContent = this.currentStepIndex + 1;
        document.getElementById('totalSteps').textContent = this.steps.length;
    }

    updateNavigation() {
        const currentStep = this.steps[this.currentStepIndex];
        
        // Back button
        const backBtn = document.getElementById('backBtn');
        backBtn.style.display = this.currentStepIndex > 0 ? 'inline-block' : 'none';
        
        // Skip button
        const skipBtn = document.getElementById('skipBtn');
        skipBtn.style.display = !currentStep.required ? 'inline-block' : 'none';
        
        // Next button
        const nextBtn = document.getElementById('nextBtn');
        if (this.currentStepIndex === this.steps.length - 1) {
            nextBtn.textContent = 'Complete Setup';
        } else if (this.currentStepIndex === 0) {
            nextBtn.textContent = 'Get Started →';
        } else {
            nextBtn.textContent = 'Continue →';
        }
    }

    async nextStep() {
        const currentStep = this.steps[this.currentStepIndex];
        
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

    async skipStep() {
        const currentStep = this.steps[this.currentStepIndex];
        const token = localStorage.getItem('authToken');
        
        if (currentStep.required) {
            this.showMessage('This step is required', 'error');
            return;
        }

        try {
            const API_BASE = 'https://api.unitedwerise.org/api';
            await fetch(`${API_BASE}/onboarding/skip-step`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ stepId: currentStep.id })
            });

            this.trackEvent('step_skipped', currentStep.id);
            
            if (this.currentStepIndex < this.steps.length - 1) {
                this.currentStepIndex++;
                this.showCurrentStep();
            } else {
                await this.completeOnboarding();
            }
        } catch (error) {
            this.showMessage('Failed to skip step', 'error');
        }
    }

    async validateCurrentStep(step) {
        switch (step.id) {
            case 'location':
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
            case 'experience':
                const selected = document.querySelector('.experience-option.selected');
                if (!selected) {
                    this.showMessage('Please select your engagement level', 'error');
                    return false;
                }
                this.stepData.experience = selected.dataset.value;
                break;
            case 'notifications':
                // Collect notification preferences
                this.stepData.notifications = {
                    email: document.getElementById('emailUpdates').checked,
                    weeklyDigest: document.getElementById('weeklyDigest').checked,
                    repUpdates: document.getElementById('repUpdates').checked,
                    mentions: document.getElementById('mentions').checked,
                    discussions: document.getElementById('discussions').checked,
                    sms: document.getElementById('urgentSMS').checked
                };
                break;
            case 'profile':
                // Collect profile data
                this.stepData.profile = {
                    displayName: document.getElementById('displayName').value,
                    bio: document.getElementById('profileBio').value,
                    avatar: document.getElementById('avatarPreview').querySelector('img')?.src
                };
                break;
        }

        return true;
    }

    async completeCurrentStep(step) {
        const stepData = this.stepData[step.id] || this.stepData[step.id.replace('step-', '')];
        const token = localStorage.getItem('authToken');
        
        const API_BASE = 'https://api.unitedwerise.org/api';
        const response = await fetch(`${API_BASE}/onboarding/complete-step`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
        this.trackEvent('onboarding_completed');
        
        // Show completion message
        this.showMessage('Welcome to United We Rise! Your account setup is complete.', 'success');
        
        setTimeout(() => {
            this.close();
            
            // Redirect to main app or show success screen
            if (window.onOnboardingComplete) {
                window.onOnboardingComplete();
            } else {
                // Reload to show the updated user interface
                window.location.reload();
            }
        }, 2000);
    }

    showMessage(text, type = 'info') {
        const messageContainer = document.getElementById('onboardingMessage');
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
        // This would integrate with your analytics
        console.log(`[ONBOARDING] ${event}`, { stepId, timestamp: new Date().toISOString() });
    }
}

// Initialize onboarding flow
const onboardingFlow = new OnboardingFlow();

// Make it globally available
window.onboardingFlow = onboardingFlow;

// Auto-show onboarding for new users
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const API_BASE = 'https://api.unitedwerise.org/api';
            const response = await fetch(`${API_BASE}/onboarding/progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const progress = await response.json();
                
                // Show onboarding if not complete
                if (!progress.isComplete && progress.nextStep) {
                    setTimeout(() => {
                        onboardingFlow.show();
                    }, 1000); // Small delay to let the page load
                }
            }
        } catch (error) {
            console.error('Failed to check onboarding progress:', error);
        }
    }
});