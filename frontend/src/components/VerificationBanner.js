/**
 * @module components/VerificationBanner
 * @description Persistent banner for unverified users with grace period warning
 */

class VerificationBanner {
    constructor() {
        this.dismissed = false;
        this.init();
    }

    init() {
        this.createBanner();
        this.checkVerificationStatus();
    }

    createBanner() {
        const bannerHtml = `
            <div id="verificationBanner" class="verification-banner" style="display: none;">
                <div class="banner-content">
                    <span class="banner-icon">⚠️</span>
                    <div class="banner-text">
                        <strong>Email verification required</strong>
                        <span id="verificationMessage">Verify your email to secure your account</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="verificationBanner.verify()">
                        Verify Now
                    </button>
                    <button class="banner-close" onclick="verificationBanner.dismiss()">×</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('afterbegin', bannerHtml);
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style>
            .verification-banner {
                background: #fff3cd;
                border-bottom: 2px solid #ffc107;
                padding: 1rem;
                position: sticky;
                top: 0;
                z-index: 1000;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .banner-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .banner-icon {
                font-size: 1.5rem;
            }

            .banner-text {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .banner-text strong {
                color: #856404;
            }

            .banner-text span {
                color: #856404;
                font-size: 0.9rem;
            }

            .banner-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: #856404;
                cursor: pointer;
                padding: 0.25rem 0.5rem;
            }

            .banner-close:hover {
                color: #533f03;
            }

            @media (max-width: 768px) {
                .banner-content {
                    flex-wrap: wrap;
                }
            }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    async checkVerificationStatus() {
        if (!window.authUtils?.isUserAuthenticated()) {
            return;
        }

        try {
            const API_BASE = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'https://api.unitedwerise.org/api';
            const response = await fetch(`${API_BASE}/auth/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const userData = await response.json();

                if (!userData.emailVerified) {
                    this.show(userData);
                }
            }
        } catch (error) {
            console.error('Failed to check verification status:', error);
        }
    }

    show(userData) {
        const banner = document.getElementById('verificationBanner');
        const message = document.getElementById('verificationMessage');

        if (userData.daysSinceRegistration !== undefined) {
            const daysRemaining = 7 - userData.daysSinceRegistration;
            if (daysRemaining > 0) {
                message.textContent = `Verify your email within ${daysRemaining} days to avoid account suspension`;
            } else {
                message.textContent = `Your account may be suspended. Verify now to continue.`;
            }
        }

        banner.style.display = 'block';
    }

    dismiss() {
        document.getElementById('verificationBanner').style.display = 'none';
        this.dismissed = true;
    }

    verify() {
        if (window.verificationFlow) {
            window.verificationFlow.showVerificationModal();
        }
    }
}

// Initialize verification banner
const verificationBanner = new VerificationBanner();
window.verificationBanner = verificationBanner;
