/**
 * @module components/VerificationFlow
 * @description Enhanced verification flow component for user email and phone verification
 * Handles account verification workflow with multi-step process
 * Migrated to ES6 modules: October 11, 2025 (Batch 6)
 */

class VerificationFlow {
    constructor() {
        this.currentStep = 'welcome';
        this.userData = {};
        this.hcaptchaWidgetId = null;
        this.phoneVerificationTimer = null;
        this.API_BASE = 'https://api.unitedwerise.org/api';
        this.init();
    }

    init() {
        this.createVerificationModal();
        this.loadHCaptcha();
        this.setupMessageListeners();
    }
    
    setupMessageListeners() {
        // Listen for email verification completion from verify-email.html
        window.addEventListener('message', (event) => {
            if (event.data.type === 'EMAIL_VERIFIED' && event.data.success) {
                console.log('Email verification detected, refreshing status...');
                
                // Update auth token if provided
                if (event.data.token) {
                    localStorage.setItem('authToken', event.data.token);
                    window.authToken = event.data.token;
                    console.log('Auth token updated from verification response');
                }
                
                // Update user data if provided
                if (event.data.user) {
                    localStorage.setItem('currentUser', JSON.stringify(event.data.user));
                    window.currentUser = event.data.user;
                    console.log('User data updated from verification response');
                }
                
                this.checkEmailVerification();
            }
        });
    }

    createVerificationModal() {
        const modalHtml = `
            <div id="verificationModal" class="modal verification-modal">
                <div class="modal-content verification-content">
                    <div class="verification-header">
                        <h2 id="verificationTitle">Account Verification</h2>
                        <div class="verification-progress">
                            <div class="progress-step active" data-step="welcome">1</div>
                            <div class="progress-step" data-step="email">2</div>
                            <div class="progress-step" data-step="phone">3</div>
                            <div class="progress-step" data-step="complete">4</div>
                        </div>
                    </div>
                    <div class="verification-body">
                        <div id="verificationMessage" class="message-container"></div>
                        
                        <!-- Welcome Step -->
                        <div id="welcomeStep" class="verification-step">
                            <div class="step-icon">✉️</div>
                            <h3>Welcome to United We Rise!</h3>
                            <p>To ensure the authenticity of our community, please verify your account:</p>
                            <ul>
                                <li>📧 Email verification (required)</li>
                                <li>📱 Phone verification (recommended)</li>
                                <li>🛡️ Security verification</li>
                            </ul>
                            <button onclick="verificationFlow.startVerification()" class="btn btn-primary">
                                Start Verification
                            </button>
                        </div>

                        <!-- Email Verification Step -->
                        <div id="emailStep" class="verification-step" style="display: none;">
                            <div class="step-icon">📧</div>
                            <h3>Verify Your Email</h3>
                            <p>We've sent a verification email to <strong id="userEmail"></strong></p>
                            <p>Please check your inbox and click the verification link.</p>
                            
                            <div class="verification-actions">
                                <button onclick="verificationFlow.checkEmailVerification()" class="btn btn-primary">
                                    I've Verified My Email
                                </button>
                                <button onclick="verificationFlow.resendEmailVerification()" class="btn btn-secondary">
                                    Resend Email
                                </button>
                            </div>
                            
                            <div class="verification-help">
                                <details>
                                    <summary>Didn't receive the email?</summary>
                                    <ul>
                                        <li>Check your spam/junk folder</li>
                                        <li>Make sure the email address is correct</li>
                                        <li>Wait a few minutes for delivery</li>
                                        <li>Try resending the verification email</li>
                                    </ul>
                                </details>
                            </div>
                        </div>

                        <!-- Phone Verification Step -->
                        <div id="phoneStep" class="verification-step" style="display: none;">
                            <div class="step-icon">📱</div>
                            <h3>Verify Your Phone Number</h3>
                            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                                <strong>⚠️ Note:</strong> Phone verification is not yet fully implemented. Please click "Skip" to continue.
                            </div>
                            <p>Phone verification helps secure your account and enables important notifications.</p>
                            
                            <div class="phone-input-section">
                                <label for="phoneNumber">Phone Number</label>
                                <input type="tel" id="phoneNumber" placeholder="(555) 123-4567" class="form-input">
                                <small>Enter your US phone number. International numbers can include country code (+1, +44, etc.)</small>
                                
                                <div id="hcaptcha-phone" class="hcaptcha-container"></div>
                                
                                <button onclick="verificationFlow.sendPhoneVerification()" class="btn btn-primary" id="sendPhoneBtn">
                                    Send Verification Code
                                </button>
                            </div>
                            
                            <div id="phoneCodeSection" class="phone-code-section" style="display: none;">
                                <label for="phoneCode">Enter 6-digit code</label>
                                <input type="text" id="phoneCode" maxlength="6" pattern="[0-9]{6}" class="form-input code-input">
                                <div id="phoneTimer" class="timer"></div>
                                
                                <button onclick="verificationFlow.verifyPhoneCode()" class="btn btn-primary">
                                    Verify Code
                                </button>
                                <button onclick="verificationFlow.resendPhoneCode()" class="btn btn-secondary" id="resendPhoneBtn" disabled>
                                    Resend Code
                                </button>
                            </div>
                            
                            <button onclick="verificationFlow.skipPhoneVerification()" class="btn btn-text" style="background: #4b5c09; color: white; padding: 12px 24px; font-weight: bold;">
                                Skip Phone Verification (Recommended)
                            </button>
                        </div>

                        <!-- Completion Step -->
                        <div id="completeStep" class="verification-step" style="display: none;">
                            <div class="step-icon">🎉</div>
                            <h3>Verification Complete!</h3>
                            <p>Your account has been successfully verified.</p>
                            
                            <div class="verification-summary">
                                <div class="verification-item">
                                    <span class="status-icon" id="emailStatus">✅</span>
                                    Email Verified
                                </div>
                                <div class="verification-item">
                                    <span class="status-icon" id="phoneStatus">➖</span>
                                    Phone Verification
                                </div>
                            </div>
                            
                            <div class="next-steps">
                                <h4>Next Steps:</h4>
                                <ul>
                                    <li>Complete your profile</li>
                                    <li>Add your location to find representatives</li>
                                    <li>Start engaging with the community</li>
                                </ul>
                            </div>
                            
                            <button onclick="verificationFlow.completeVerification()" class="btn btn-primary">
                                Continue to United We Rise
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.addVerificationStyles();
    }

    addVerificationStyles() {
        const styles = `
            <style>
            .verification-modal .modal-content {
                max-width: 500px;
                width: 90%;
            }
            
            .verification-content {
                padding: 2rem;
            }
            
            .verification-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .verification-progress {
                display: flex;
                justify-content: center;
                gap: 1rem;
                margin-top: 1rem;
            }
            
            .progress-step {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .progress-step.active {
                background: #4b5c09;
                color: white;
            }
            
            .progress-step.completed {
                background: #22c55e;
                color: white;
            }
            
            .verification-step {
                text-align: center;
                padding: 1rem 0;
            }
            
            .step-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            
            .verification-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin: 2rem 0;
            }
            
            .verification-help {
                margin-top: 2rem;
                text-align: left;
            }
            
            .verification-help details {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            
            .phone-input-section, .phone-code-section {
                text-align: left;
                margin: 1.5rem 0;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .form-input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin: 0.5rem 0;
                font-size: 1rem;
            }
            
            .code-input {
                text-align: center;
                font-size: 1.5rem;
                letter-spacing: 0.2em;
                font-weight: bold;
            }
            
            .hcaptcha-container {
                margin: 1rem 0;
                display: flex;
                justify-content: center;
            }
            
            .timer {
                text-align: center;
                color: #666;
                margin: 0.5rem 0;
                font-weight: bold;
            }
            
            .verification-summary {
                text-align: left;
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                margin: 1.5rem 0;
            }
            
            .verification-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0.5rem 0;
            }
            
            .status-icon {
                font-size: 1.2rem;
            }
            
            .next-steps {
                text-align: left;
                margin: 1.5rem 0;
            }
            
            .next-steps h4 {
                color: #4b5c09;
                margin-bottom: 0.5rem;
            }
            
            .next-steps ul {
                margin: 0.5rem 0;
                padding-left: 1.5rem;
            }
            
            .btn-text {
                background: none;
                border: none;
                color: #666;
                text-decoration: underline;
                cursor: pointer;
                padding: 0.5rem;
                margin-top: 1rem;
            }
            
            .btn-text:hover {
                color: #4b5c09;
            }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    loadHCaptcha() {
        if (!window.hcaptcha) {
            const script = document.createElement('script');
            script.src = 'https://js.hcaptcha.com/1/api.js';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }

    showVerificationModal(userData) {
        this.userData = userData;
        document.getElementById('verificationModal').style.display = 'block';
        document.getElementById('userEmail').textContent = userData.email;
        
        // Check current verification status
        this.checkVerificationStatus();
        
        // Start periodic status checking while modal is open
        this.startStatusChecking();
    }
    
    startStatusChecking() {
        // Clear any existing interval
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        // Check status every 10 seconds while modal is open
        this.statusCheckInterval = setInterval(() => {
            if (document.getElementById('verificationModal').style.display !== 'none') {
                this.checkVerificationStatus();
            } else {
                // Modal is closed, stop checking
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
            }
        }, 10000);
    }

    hideVerificationModal() {
        document.getElementById('verificationModal').style.display = 'none';
        if (this.phoneVerificationTimer) {
            clearInterval(this.phoneVerificationTimer);
        }
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    async checkVerificationStatus() {
        try {
            const response = await fetch(`${this.API_BASE}/verification/status`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const status = await response.json();
                
                if (status.email.verified) {
                    // Skip phone verification - go directly to complete
                    this.currentStep = 'complete';
                } else {
                    this.currentStep = 'email';
                }
                
                this.updateStep();
            }
        } catch (error) {
            console.error('Failed to check verification status:', error);
        }
    }

    startVerification() {
        this.currentStep = 'email';
        this.updateStep();
        this.sendInitialEmailVerification();
    }

    async sendInitialEmailVerification() {
        try {
            const response = await fetch(`${this.API_BASE}/verification/email/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                this.showMessage('Verification email sent!', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.error || 'Failed to send verification email', 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async checkEmailVerification() {
        try {
            const response = await fetch(`${this.API_BASE}/verification/status`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const status = await response.json();
                if (status.email.verified) {
                    // Skip phone verification since it's not implemented
                    this.currentStep = 'complete';
                    this.updateStep();
                    this.showMessage('Email verified successfully! Phone verification skipped.', 'success');
                } else {
                    this.showMessage('Email not yet verified. Please check your inbox.', 'warning');
                }
            }
        } catch (error) {
            this.showMessage('Failed to check verification status', 'error');
        }
    }

    async resendEmailVerification() {
        await this.sendInitialEmailVerification();
    }

    async sendPhoneVerification() {
        const phoneNumber = document.getElementById('phoneNumber').value;
        const hcaptchaToken = window.hcaptcha?.getResponse(this.hcaptchaWidgetId);
        
        if (!phoneNumber) {
            this.showMessage('Please enter a phone number', 'error');
            return;
        }
        
        if (!hcaptchaToken) {
            this.showMessage('Please complete the captcha', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/verification/phone/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    phoneNumber,
                    hcaptchaToken
                })
            });
            
            if (response.ok) {
                document.getElementById('phoneCodeSection').style.display = 'block';
                document.getElementById('sendPhoneBtn').disabled = true;
                this.startPhoneTimer();
                this.showMessage('Verification code sent!', 'success');
            } else {
                const data = await response.json();
                this.showMessage(data.error || 'Failed to send verification code', 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    async verifyPhoneCode() {
        const phoneNumber = document.getElementById('phoneNumber').value;
        const code = document.getElementById('phoneCode').value;
        
        if (!code || code.length !== 6) {
            this.showMessage('Please enter the 6-digit code', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE}/verification/phone/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    phoneNumber,
                    code
                })
            });
            
            if (response.ok) {
                this.currentStep = 'complete';
                this.updateStep();
                this.showMessage('Phone verified successfully!', 'success');
                document.getElementById('phoneStatus').textContent = '✅';
            } else {
                const data = await response.json();
                this.showMessage(data.error || 'Invalid verification code', 'error');
            }
        } catch (error) {
            this.showMessage('Network error. Please try again.', 'error');
        }
    }

    startPhoneTimer() {
        let timeLeft = 600; // 10 minutes
        const timerElement = document.getElementById('phoneTimer');
        const resendBtn = document.getElementById('resendPhoneBtn');
        
        this.phoneVerificationTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `Code expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(this.phoneVerificationTimer);
                timerElement.textContent = 'Code expired';
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend Code';
            }
            
            timeLeft--;
        }, 1000);
    }

    async resendPhoneCode() {
        document.getElementById('resendPhoneBtn').disabled = true;
        await this.sendPhoneVerification();
    }

    skipPhoneVerification() {
        this.currentStep = 'complete';
        this.updateStep();
        document.getElementById('phoneStatus').textContent = '⏭️';
    }

    completeVerification() {
        this.hideVerificationModal();
        // Trigger app to continue with onboarding or main app
        if (window.onVerificationComplete) {
            window.onVerificationComplete();
        }
    }

    updateStep() {
        // Hide all steps
        document.querySelectorAll('.verification-step').forEach(step => {
            step.style.display = 'none';
        });
        
        // Show current step
        const stepMap = {
            'welcome': 'welcomeStep',
            'email': 'emailStep',
            'phone': 'phoneStep',
            'complete': 'completeStep'
        };
        
        document.getElementById(stepMap[this.currentStep]).style.display = 'block';
        
        // Update progress
        document.querySelectorAll('.progress-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        
        const steps = ['welcome', 'email', 'phone', 'complete'];
        const currentIndex = steps.indexOf(this.currentStep);
        
        steps.forEach((step, index) => {
            const element = document.querySelector(`[data-step="${step}"]`);
            if (index < currentIndex) {
                element.classList.add('completed');
            } else if (index === currentIndex) {
                element.classList.add('active');
            }
        });
        
        // Setup hCaptcha for phone step
        if (this.currentStep === 'phone' && window.hcaptcha) {
            setTimeout(() => {
                if (document.getElementById('hcaptcha-phone')) {
                    this.hcaptchaWidgetId = window.hcaptcha.render('hcaptcha-phone', {
                        // Production: 9c5af3a8-5066-446c-970e-1c18d9fe8d9e
                        // Test for localhost: 10000000-ffff-ffff-ffff-000000000001  
                        sitekey: '10000000-ffff-ffff-ffff-000000000001'
                    });
                }
                
                // Add phone number formatting
                this.setupPhoneFormatting();
            }, 100);
        }
    }
    
    setupPhoneFormatting() {
        const phoneInput = document.getElementById('phoneNumber');
        if (!phoneInput) return;
        
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            let formattedValue = '';
            
            // Don't format if it looks like international (starts with country code other than 1)
            if (value.length > 0 && value[0] !== '1' && value.length > 10) {
                e.target.value = value; // Keep raw international format
                return;
            }
            
            // Format US numbers: (555) 123-4567
            if (value.length >= 6) {
                formattedValue = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            } else if (value.length >= 3) {
                formattedValue = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
                formattedValue = value;
            }
            
            e.target.value = formattedValue;
        });
    }

    showMessage(text, type = 'info') {
        const messageContainer = document.getElementById('verificationMessage');
        messageContainer.innerHTML = `
            <div class="alert alert-${type}">
                ${text}
            </div>
        `;
        
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }
}

// Initialize verification flow when DOM is ready
function initializeVerificationFlow() {
    if (document.body) {
        const verificationFlow = new VerificationFlow();
        // Make it globally available
        window.verificationFlow = verificationFlow;
    } else {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                const verificationFlow = new VerificationFlow();
                window.verificationFlow = verificationFlow;
            });
        } else {
            // DOM is already ready
            const verificationFlow = new VerificationFlow();
            window.verificationFlow = verificationFlow;
        }
    }
}

// Initialize
initializeVerificationFlow();

// ES6 Module Exports
export { VerificationFlow, initializeVerificationFlow };
export default VerificationFlow;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.VerificationFlow = VerificationFlow;
}