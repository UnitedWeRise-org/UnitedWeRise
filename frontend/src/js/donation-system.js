/**
 * Donation System - Stripe Integration for United We Rise
 * Handles tax-deductible donations through Stripe Checkout
 * ES6 Module Version
 */
import { apiCall } from './api-compatibility-shim.js';

export class DonationSystem {
    constructor() {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('DonationSystem', 'DonationSystem constructor called');
        }
        this.isInitialized = false;
        this.modalElement = null;
        this.presetAmounts = [10, 25, 50, 100, 250, 500];
        this.donationType = 'ONE_TIME';
        this.selectedAmount = 25; // Default $25
        this.init();
    }

    init() {
        // Add donation button to sidebar
        this.addDonationButton();
        
        // Create modal HTML
        this.createModal();
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('DonationSystem', 'Donation system initialized');
        }
    }

    addDonationButton() {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('DonationSystem', 'Looking for sidebar...');
        }
        const sidebar = document.querySelector('.sidebar .thumbs');
        const messagesThumb = document.getElementById('messagesThumb');
        
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('DonationSystem', 'Sidebar found: ' + !!sidebar + ', Messages button found: ' + !!messagesThumb);
        }
        
        if (sidebar && messagesThumb) {
            // Check if button already exists
            if (document.getElementById('donationThumb')) {
                if (typeof adminDebugLog !== 'undefined') {
                    adminDebugLog('DonationSystem', 'Donation button already exists');
                }
                return;
            }
            
            // Create donation button
            const donationButton = document.createElement('div');
            donationButton.className = 'thumb';
            donationButton.id = 'donationThumb';
            donationButton.title = 'Support Our Mission';
            donationButton.innerHTML = '💝 <span class="label">Donate</span>';
            donationButton.onclick = () => this.openDonationModal();
            
            // Insert after messages button
            messagesThumb.insertAdjacentElement('afterend', donationButton);
            console.log('✅ Donation button added to sidebar');
        } else {
            console.log('❌ Could not add donation button - sidebar or messages button not found');
        }
    }

    createModal() {
        // Create modal container
        const modalHTML = `
            <div id="donationModal" class="donation-modal" style="display: none;">
                <div class="donation-modal-content">
                    <div class="donation-modal-header">
                        <h2>Support United We Rise</h2>
                        <span class="donation-close">&times;</span>
                    </div>
                    
                    <div class="donation-modal-body">
                        <p class="donation-intro">
                            Your tax-deductible donation supports civic engagement and democratic participation.
                            <br><small>United We Rise is a registered 501(c)(3) nonprofit organization.</small>
                        </p>
                        
                        <!-- Donation Type Selector -->
                        <div class="donation-type-selector">
                            <label class="donation-type-option">
                                <input type="radio" name="donationType" value="ONE_TIME" checked>
                                <span>One-Time</span>
                            </label>
                            <label class="donation-type-option">
                                <input type="radio" name="donationType" value="MONTHLY">
                                <span>Monthly</span>
                            </label>
                            <label class="donation-type-option">
                                <input type="radio" name="donationType" value="YEARLY">
                                <span>Yearly</span>
                            </label>
                        </div>
                        
                        <!-- Amount Selector -->
                        <div class="donation-amounts">
                            <button class="amount-btn" data-amount="10">$10</button>
                            <button class="amount-btn selected" data-amount="25">$25</button>
                            <button class="amount-btn" data-amount="50">$50</button>
                            <button class="amount-btn" data-amount="100">$100</button>
                            <button class="amount-btn" data-amount="250">$250</button>
                            <button class="amount-btn" data-amount="500">$500</button>
                        </div>
                        
                        <!-- Custom Amount -->
                        <div class="custom-amount-container">
                            <label for="customAmount">Or enter custom amount:</label>
                            <div class="custom-amount-input">
                                <span class="currency-symbol">$</span>
                                <input type="number" id="customAmount" min="1" max="10000" placeholder="0">
                            </div>
                        </div>
                        
                        <!-- Recurring Info -->
                        <div id="recurringInfo" class="recurring-info" style="display: none;">
                            <p>💳 Your card will be charged <span id="recurringAmount">$25</span> <span id="recurringFrequency">monthly</span></p>
                        </div>
                        
                        <!-- Live Mode Notice -->
                        <div class="live-mode-notice">
                            <strong>💳 SECURE PAYMENT</strong> - Your donation is processed securely through Stripe
                        </div>
                        
                        <!-- Donate Button -->
                        <button id="donateButton" class="donate-btn">
                            <span id="donateButtonText">Donate $25</span>
                        </button>
                        
                        <!-- Loading State -->
                        <div id="donationLoading" class="donation-loading" style="display: none;">
                            <div class="spinner"></div>
                            <p>Processing your donation...</p>
                        </div>
                        
                        <!-- Error Message -->
                        <div id="donationError" class="donation-error" style="display: none;"></div>
                        
                        <!-- Tax Info -->
                        <div class="tax-info">
                            <small>
                                🎫 You'll receive a tax-deductible receipt via email<br>
                                EIN: 99-2862201 | All donations are tax-deductible to the extent allowed by law
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modalElement = document.getElementById('donationModal');
        
        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style>
                .donation-modal {
                    display: none;
                    position: fixed;
                    z-index: 10000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    animation: fadeIn 0.3s;
                }
                
                .donation-modal-content {
                    position: relative;
                    background-color: #fff;
                    margin: 5% auto;
                    padding: 0;
                    width: 90%;
                    max-width: 500px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    animation: slideIn 0.3s;
                }
                
                .donation-modal-header {
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px 12px 0 0;
                    position: relative;
                }
                
                .donation-modal-header h2 {
                    margin: 0;
                    font-size: 24px;
                }
                
                .donation-close {
                    position: absolute;
                    right: 20px;
                    top: 20px;
                    font-size: 28px;
                    font-weight: bold;
                    color: white;
                    cursor: pointer;
                    transition: opacity 0.3s;
                }
                
                .donation-close:hover {
                    opacity: 0.8;
                }
                
                .donation-modal-body {
                    padding: 30px;
                }
                
                .donation-intro {
                    text-align: center;
                    margin-bottom: 25px;
                    color: #555;
                    line-height: 1.6;
                }
                
                .donation-type-selector {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 25px;
                    justify-content: center;
                }
                
                .donation-type-option {
                    flex: 1;
                    position: relative;
                    cursor: pointer;
                }
                
                .donation-type-option input {
                    position: absolute;
                    opacity: 0;
                }
                
                .donation-type-option span {
                    display: block;
                    padding: 10px;
                    text-align: center;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    transition: all 0.3s;
                    background: white;
                }
                
                .donation-type-option input:checked + span {
                    border-color: #667eea;
                    background: #667eea;
                    color: white;
                }
                
                .donation-amounts {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .amount-btn {
                    padding: 15px;
                    border: 2px solid #ddd;
                    background: white;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .amount-btn:hover {
                    border-color: #667eea;
                    transform: translateY(-2px);
                }
                
                .amount-btn.selected {
                    border-color: #667eea;
                    background: #667eea;
                    color: white;
                }
                
                .custom-amount-container {
                    margin-bottom: 20px;
                }
                
                .custom-amount-container label {
                    display: block;
                    margin-bottom: 8px;
                    color: #555;
                    font-weight: 500;
                }
                
                .custom-amount-input {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                
                .currency-symbol {
                    position: absolute;
                    left: 15px;
                    font-size: 18px;
                    color: #666;
                }
                
                #customAmount {
                    width: 100%;
                    padding: 12px 12px 12px 35px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 18px;
                    transition: border-color 0.3s;
                }
                
                #customAmount:focus {
                    outline: none;
                    border-color: #667eea;
                }
                
                .recurring-info {
                    background: #f0f4f8;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    color: #555;
                }
                
                .live-mode-notice {
                    background: #d4edda;
                    border: 1px solid #28a745;
                    color: #155724;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 14px;
                }
                
                .donate-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.3s, box-shadow 0.3s;
                }
                
                .donate-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                
                .donate-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .donation-loading {
                    text-align: center;
                    padding: 20px;
                }
                
                .spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .donation-error {
                    background: #fee;
                    border: 1px solid #fcc;
                    color: #c00;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                }
                
                .tax-info {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    text-align: center;
                    color: #777;
                    line-height: 1.6;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                /* Mobile Responsive Styles */
                @media screen and (max-width: 767px) {
                    .donation-modal-content {
                        width: 95%;
                        margin: 2% auto;
                        max-height: 95vh;
                        overflow-y: auto;
                        border-radius: 8px;
                    }

                    .donation-modal-header {
                        padding: 15px;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    }

                    .donation-modal-header h2 {
                        font-size: 1.2rem;
                    }

                    .donation-modal-header .tagline {
                        font-size: 0.9rem;
                    }

                    .donation-modal-body {
                        padding: 15px;
                    }

                    .donation-amounts {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                    }

                    .amount-btn {
                        padding: 10px 5px;
                        font-size: 14px;
                    }

                    .custom-amount-container label {
                        font-size: 14px;
                    }

                    .custom-amount-input input {
                        font-size: 16px; /* Prevents zoom on iOS */
                    }

                    .donate-btn {
                        padding: 12px;
                        font-size: 16px;
                    }

                    .donation-type label {
                        padding: 10px 15px;
                        font-size: 14px;
                    }

                    .live-mode-notice {
                        font-size: 12px;
                        padding: 10px;
                    }

                    .tax-info {
                        font-size: 11px;
                        padding: 15px 10px 10px;
                    }

                    .donation-close {
                        width: 28px;
                        height: 28px;
                        font-size: 20px;
                    }
                }

                /* Very small mobile screens */
                @media screen and (max-width: 400px) {
                    .donation-modal-content {
                        width: 100%;
                        margin: 0;
                        border-radius: 0;
                        height: 100vh;
                        max-height: 100vh;
                    }

                    .donation-amounts {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 5px;
                    }

                    .amount-btn {
                        padding: 8px 3px;
                        font-size: 13px;
                    }
                }

                /* Landscape mode for mobile */
                @media screen and (max-width: 767px) and (orientation: landscape) {
                    .donation-modal-content {
                        margin: 1% auto;
                        max-height: 90vh;
                    }

                    .donation-modal-header {
                        padding: 10px 15px;
                    }

                    .donation-modal-header h2 {
                        font-size: 1.1rem;
                    }

                    .donation-modal-body {
                        padding: 10px 15px;
                    }

                    .donation-amounts {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.querySelector('.donation-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeDonationModal();
        }
        
        // Click outside to close
        window.onclick = (event) => {
            if (event.target === this.modalElement) {
                this.closeDonationModal();
            }
        };
        
        // Amount buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.onclick = (e) => this.selectAmount(e.target);
        });
        
        // Custom amount input
        const customAmountInput = document.getElementById('customAmount');
        if (customAmountInput) {
            customAmountInput.oninput = (e) => this.handleCustomAmount(e.target.value);
        }
        
        // Donation type radio buttons
        document.querySelectorAll('input[name="donationType"]').forEach(radio => {
            radio.onchange = (e) => this.updateDonationType(e.target.value);
        });
        
        // Donate button
        const donateBtn = document.getElementById('donateButton');
        if (donateBtn) {
            donateBtn.onclick = () => this.processDonation();
        }
    }

    openDonationModal() {
        if (!this.modalElement) return;
        
        // Check if user is logged in (using current user data)
        if (!window.currentUser) {
            alert('Please log in to make a donation');
            return;
        }
        
        this.modalElement.style.display = 'block';
        console.log('💝 Donation modal opened');

        // Inform users about ad blocker compatibility (Stripe analytics may be blocked)
        console.info('💡 If using an ad blocker: Stripe analytics may be blocked (normal), payments work fine');
    }

    closeDonationModal() {
        if (this.modalElement) {
            this.modalElement.style.display = 'none';
        }
    }

    selectAmount(button) {
        // Remove selected class from all buttons
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Add selected class to clicked button
        button.classList.add('selected');
        
        // Clear custom amount
        document.getElementById('customAmount').value = '';
        
        // Update selected amount
        this.selectedAmount = parseInt(button.dataset.amount);
        this.updateDonateButton();
    }

    handleCustomAmount(value) {
        const amount = parseInt(value);
        
        if (amount > 0) {
            // Remove selected class from preset buttons
            document.querySelectorAll('.amount-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            this.selectedAmount = amount;
            this.updateDonateButton();
        }
    }

    updateDonationType(type) {
        this.donationType = type;
        
        // Show/hide recurring info
        const recurringInfo = document.getElementById('recurringInfo');
        if (recurringInfo) {
            if (type !== 'ONE_TIME') {
                recurringInfo.style.display = 'block';
                document.getElementById('recurringAmount').textContent = `$${this.selectedAmount}`;
                document.getElementById('recurringFrequency').textContent = 
                    type === 'MONTHLY' ? 'monthly' : 'yearly';
            } else {
                recurringInfo.style.display = 'none';
            }
        }
        
        this.updateDonateButton();
    }

    updateDonateButton() {
        const btnText = document.getElementById('donateButtonText');
        if (btnText) {
            const frequencyText = this.donationType === 'ONE_TIME' ? '' : 
                                 this.donationType === 'MONTHLY' ? '/month' : '/year';
            btnText.textContent = `Donate $${this.selectedAmount}${frequencyText}`;
        }
        
        // Update recurring info if visible
        const recurringAmount = document.getElementById('recurringAmount');
        if (recurringAmount) {
            recurringAmount.textContent = `$${this.selectedAmount}`;
        }
    }

    async processDonation() {
        const donateBtn = document.getElementById('donateButton');
        const loadingDiv = document.getElementById('donationLoading');
        const errorDiv = document.getElementById('donationError');
        
        // Hide error, show loading
        errorDiv.style.display = 'none';
        donateBtn.disabled = true;
        loadingDiv.style.display = 'block';
        
        try {
            // Prepare donation data
            const donationData = {
                amount: this.selectedAmount * 100, // Convert to cents
                donationType: this.donationType,
                isRecurring: this.donationType !== 'ONE_TIME'
            };
            
            // Add recurring interval if it's a recurring donation
            if (donationData.isRecurring) {
                donationData.recurringInterval = 'MONTHLY'; // Default to monthly
            }
            
            console.log('💳 Sending donation request:', donationData);
            
            // Call API to create Stripe checkout session using apiCall for cookie auth
            const response = await apiCall('/payments/donation', {
                method: 'POST',
                body: donationData
            });
            
            console.log('💳 Donation API response:', response);
            
            // Handle response from apiCall (already parsed)
            if (response.ok && response.data && response.data.success) {
                // Store checkout URL for fallback
                const checkoutUrl = response.data.data.checkoutUrl;
                console.log('💳 Redirecting to Stripe Checkout:', checkoutUrl);
                
                // Update loading message
                const loadingText = loadingDiv.querySelector('p');
                if (loadingText) {
                    loadingText.textContent = 'Redirecting to secure payment page...';
                }
                
                // Try direct redirect (most reliable with adblockers)
                setTimeout(() => {
                    window.location.href = checkoutUrl;
                }, 500);
                
                // Show fallback link after delay in case redirect is blocked
                setTimeout(() => {
                    if (loadingDiv.style.display !== 'none') {
                        loadingDiv.innerHTML = `
                            <div class="spinner"></div>
                            <p>If you're not redirected automatically:</p>
                            <a href="${checkoutUrl}" target="_blank" style="
                                display: inline-block;
                                margin-top: 10px;
                                padding: 10px 20px;
                                background: #667eea;
                                color: white;
                                text-decoration: none;
                                border-radius: 5px;
                                font-weight: bold;
                            ">Click here to complete your donation</a>
                            <p style="margin-top: 15px; font-size: 12px; color: #666;">
                                💡 Tip: If you have an adblocker, you may need to disable it or whitelist our domain.
                            </p>
                        `;
                    }
                }, 3000);
                
            } else {
                // Better error handling for various response structures
                let errorMessage = 'Failed to create donation';
                
                if (response.data) {
                    if (typeof response.data === 'string') {
                        errorMessage = response.data;
                    } else if (response.data.errors && Array.isArray(response.data.errors)) {
                        // Handle validation errors from express-validator
                        errorMessage = response.data.errors.map(e => e.msg || e.message).join(', ');
                    } else if (response.data.error) {
                        errorMessage = response.data.error;
                    } else if (response.data.message) {
                        errorMessage = response.data.message;
                    } else if (response.data.success === false && response.data.data) {
                        // Handle nested error structure
                        errorMessage = response.data.data.error || response.data.data.message || errorMessage;
                    } else if (response.data.success !== undefined) {
                        // If we just have success: false/true with no error message
                        errorMessage = 'Payment processing failed. Please try again.';
                    }
                }
                
                // Log the full response for debugging
                console.error('Donation API error response:', response);
                console.error('Response data:', response.data);
                
                throw new Error(errorMessage);
            }
            
        } catch (error) {
            console.error('Donation error:', error);
            errorDiv.innerHTML = `
                <strong>Unable to process donation</strong><br>
                ${error.message || 'Failed to connect to payment processor.'}<br>
                <small style="display: block; margin-top: 10px;">
                    If you have an ad blocker enabled, please try:
                    <ul style="text-align: left; margin-top: 5px;">
                        <li>Disabling your ad blocker for this site</li>
                        <li>Using a different browser</li>
                        <li>Opening this page in an incognito/private window</li>
                    </ul>
                </small>
            `;
            errorDiv.style.display = 'block';
            donateBtn.disabled = false;
            loadingDiv.style.display = 'none';
        }
    }
}

// Auto-initialization function for ES6 module system
export function initializeDonationSystem() {
    if (!window.donationSystem) {
        window.donationSystem = new DonationSystem();
        console.log('💝 Donation system initialized via ES6 module');
    }
    return window.donationSystem;
}

// Legacy compatibility - maintain global access
window.DonationSystem = DonationSystem;

console.log('💝 Donation system ES6 module loaded');