/**
 * Candidate Registration Fee Payment System
 * Handles non-tax-deductible registration fees for candidate accounts
 */

class CandidateRegistrationPayment {
    constructor() {
        this.API_BASE = 'https://api.unitedwerise.org/api';
        this.registrationFee = 10000; // $100.00 in cents
    }

    /**
     * Process candidate registration fee payment
     * @param {string} candidateRegistrationId - ID of the candidate registration
     * @param {string} description - Description of the registration fee
     */
    async processCandidateRegistrationFee(candidateRegistrationId, description = 'Candidate Registration Fee') {
        if (!window.currentUser) {
            throw new Error('Please log in to complete registration');
        }

        try {
            // Call the fee payment endpoint using apiCall for cookie authentication
            const response = await window.apiCall('/payments/fee', {
                method: 'POST',
                body: {
                    amount: this.registrationFee,
                    feeType: 'CANDIDATE_REGISTRATION',
                    candidateRegistrationId: candidateRegistrationId,
                    description: description
                }
            });

            if (response.ok && response.data && response.data.success) {
                // Open Stripe Checkout in new tab for registration fee
                console.log('💳 Opening candidate registration payment in new tab:', response.data.data.checkoutUrl);
                window.open(response.data.data.checkoutUrl, '_blank');
                return response.data.data;
            } else {
                throw new Error(response.data?.error || 'Failed to create registration payment');
            }

        } catch (error) {
            console.error('Candidate registration payment error:', error);
            throw error;
        }
    }

    /**
     * Show registration fee modal
     * @param {string} candidateRegistrationId - ID of the candidate registration
     */
    showRegistrationFeeModal(candidateRegistrationId) {
        const modalHTML = `
            <div id="registrationFeeModal" class="modal" style="display: block;">
                <div class="modal-content" style="max-width: 500px; margin: 10% auto; padding: 20px; background: white; border-radius: 8px;">
                    <div class="modal-header" style="text-align: center; margin-bottom: 20px;">
                        <h2>🗳️ Complete Candidate Registration</h2>
                        <span class="close" onclick="this.closest('.modal').remove()" style="float: right; cursor: pointer; font-size: 24px;">&times;</span>
                    </div>
                    
                    <div class="modal-body">
                        <div class="fee-info" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                            <h3>Registration Fee: $100.00</h3>
                            <p><strong>Important:</strong> This is a non-tax-deductible registration fee, not a donation.</p>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>✅ Verifies serious candidates</li>
                                <li>✅ Supports platform operations</li>
                                <li>✅ Enables full candidate features</li>
                                <li>❌ Not tax-deductible</li>
                            </ul>
                        </div>
                        
                        <div class="live-mode-notice" style="background: #d4edda; border: 1px solid #28a745; color: #155724; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                            <strong>💳 SECURE PAYMENT</strong> - Registration fee processed securely through Stripe
                        </div>
                        
                        <button id="payRegistrationFee" class="btn-primary" style="width: 100%; padding: 15px; background: #007bff; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                            Pay $100 Registration Fee
                        </button>
                        
                        <div id="registrationFeeError" class="error-message" style="display: none; background: #fee; border: 1px solid #fcc; color: #c00; padding: 12px; border-radius: 6px; margin-top: 15px; text-align: center;"></div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('registrationFeeModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Set up event listeners
        document.getElementById('payRegistrationFee').onclick = async () => {
            const btn = document.getElementById('payRegistrationFee');
            const errorDiv = document.getElementById('registrationFeeError');
            
            btn.disabled = true;
            btn.textContent = 'Processing...';
            errorDiv.style.display = 'none';

            try {
                await this.processCandidateRegistrationFee(candidateRegistrationId);
                // Close modal on success
                document.getElementById('registrationFeeModal').remove();
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Pay $100 Registration Fee';
            }
        };
    }
}

// Initialize the registration payment system
window.candidateRegistrationPayment = new CandidateRegistrationPayment();

console.log('🗳️ Candidate registration payment system loaded');