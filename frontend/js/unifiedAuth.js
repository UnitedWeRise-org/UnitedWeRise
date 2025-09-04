/**
 * Unified Authentication System for United We Rise
 * Handles login for both main site and admin dashboard with TOTP support
 */

const BACKEND_URL = window.BACKEND_URL || 'https://unitedwerise-backend.wonderfulpond-f8a8271f.eastus.azurecontainerapps.io';

/**
 * Show TOTP verification modal (extracted from admin dashboard)
 * @param {string} context - 'main-site' or 'admin-dashboard'
 * @returns {Promise<string>} - Resolves with verification token
 */
function showTOTPModal(context = 'main-site') {
    return new Promise((resolve, reject) => {
        // Remove existing modal
        const existingModal = document.querySelector('.totp-unified-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.className = 'totp-unified-modal';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.8) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
            font-family: Arial, sans-serif !important;
        `;
        
        const modalTitle = context === 'admin-dashboard' 
            ? '🔒 Admin Access Verification' 
            : '🔒 Two-Factor Authentication';
        
        const modalDescription = context === 'admin-dashboard'
            ? 'Enter your 6-digit authenticator code to access admin features:'
            : 'Enter your 6-digit authenticator code to complete login:';
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 20px 0; color: #333;">${modalTitle}</h3>
                <p style="color: #666; margin-bottom: 20px;">${modalDescription}</p>
                <input type="text" id="unifiedTotpCode" placeholder="000000" maxlength="6" 
                       style="width: 100%; padding: 15px; font-size: 24px; text-align: center; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 20px; letter-spacing: 0.3em;"
                       oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="unifiedVerifyTotpBtn" 
                            style="background: #4b5c09; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Verify & Continue
                    </button>
                    <button onclick="window.location.href='/'" 
                            style="background: #ccc; color: #333; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
                <p style="font-size: 12px; color: #888; margin-top: 15px;">This verification is required for security.</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const input = document.getElementById('unifiedTotpCode');
        const verifyBtn = document.getElementById('unifiedVerifyTotpBtn');
        
        input.focus();
        
        // Auto-submit on 6 digits
        input.addEventListener('input', () => {
            if (input.value.length === 6) {
                verifyBtn.click();
            }
        });
        
        verifyBtn.onclick = async () => {
            const code = input.value;
            if (code.length !== 6) {
                alert('Please enter a 6-digit code');
                return;
            }
            
            // Simply return the TOTP code - verification happens in login retry
            modal.remove();
            console.log(`🔑 TOTP code entered for ${context} - will verify via login endpoint`);
            resolve(code);
        };
        
        // Allow Enter key to submit
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.length === 6) {
                verifyBtn.click();
            }
        });
    });
}

/**
 * Unified login function that handles both main site and admin dashboard authentication
 * @param {string} email - User email
 * @param {string} password - User password  
 * @param {string} context - 'main-site' or 'admin-dashboard'
 * @param {string} totpSessionToken - Optional existing TOTP session token
 * @returns {Promise<Object>} - Login result with user data and tokens
 */
async function unifiedLogin(email, password, context = 'main-site', totpSessionToken = null) {
    try {
        console.log(`🔐 Starting unified login for ${context}`);
        
        // Get existing TOTP token if available
        const storagePrefix = context === 'admin-dashboard' ? 'admin_' : 'user_';
        const existingTotpToken = totpSessionToken || localStorage.getItem(`${storagePrefix}totp_token`);
        
        // Initial login attempt
        const loginData = { email, password };
        if (existingTotpToken) {
            loginData.totpSessionToken = existingTotpToken;
        }
        
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        console.log('Login response:', result);
        
        // If TOTP is required
        if (result.requiresTOTP) {
            console.log('🔑 TOTP verification required');
            
            // Show TOTP modal and get user's 6-digit code
            const verificationToken = await showTOTPModal(context);
            
            // Retry login with TOTP token
            const totpLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    totpToken: verificationToken
                })
            });
            
            const totpResult = await totpLoginResponse.json();
            console.log('TOTP login response:', totpResult);
            
            if (totpLoginResponse.ok) {
                // Store auth tokens
                window.authToken = totpResult.token;
                localStorage.setItem('authToken', totpResult.token);
                localStorage.setItem('currentUser', JSON.stringify(totpResult.user));
                
                // Store new session token if provided
                if (totpResult.totpSessionToken) {
                    localStorage.setItem(`${storagePrefix}totp_token`, totpResult.totpSessionToken);
                    localStorage.setItem(`${storagePrefix}totp_verified`, 'true');
                }
                
                console.log(`✅ Unified login successful for ${context} with TOTP`);
                return {
                    success: true,
                    user: totpResult.user,
                    token: totpResult.token,
                    totpSessionToken: totpResult.totpSessionToken
                };
            } else {
                throw new Error(totpResult.error || 'TOTP login failed');
            }
        }
        
        // Regular login (no TOTP required)
        if (response.ok) {
            // Store auth tokens
            window.authToken = result.token;
            localStorage.setItem('authToken', result.token);
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            console.log(`✅ Unified login successful for ${context} (no TOTP)`);
            return {
                success: true,
                user: result.user,
                token: result.token
            };
        } else {
            throw new Error(result.error || 'Login failed');
        }
        
    } catch (error) {
        console.error('Unified login error:', error);
        return {
            success: false,
            error: error.message || 'Login failed'
        };
    }
}

/**
 * Check if user has valid TOTP session for context
 * @param {string} context - 'main-site' or 'admin-dashboard'
 * @returns {boolean} - True if valid TOTP session exists
 */
function hasValidTOTPSession(context = 'main-site') {
    const storagePrefix = context === 'admin-dashboard' ? 'admin_' : 'user_';
    const verified = localStorage.getItem(`${storagePrefix}totp_verified`) === 'true';
    const token = localStorage.getItem(`${storagePrefix}totp_token`);
    return verified && token;
}

/**
 * Clear TOTP session for context
 * @param {string} context - 'main-site' or 'admin-dashboard'
 */
function clearTOTPSession(context = 'main-site') {
    const storagePrefix = context === 'admin-dashboard' ? 'admin_' : 'user_';
    localStorage.removeItem(`${storagePrefix}totp_verified`);
    localStorage.removeItem(`${storagePrefix}totp_token`);
    console.log(`🔑 TOTP session cleared for ${context}`);
}

/**
 * Unified logout function
 * @param {string} context - 'main-site' or 'admin-dashboard'
 */
function unifiedLogout(context = 'main-site') {
    // Clear auth tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.authToken = null;
    
    // Clear TOTP sessions for both contexts
    clearTOTPSession('main-site');
    clearTOTPSession('admin-dashboard');
    
    console.log(`🚪 Unified logout completed for ${context}`);
    
    // Redirect based on context
    if (context === 'admin-dashboard') {
        window.location.href = '/admin-dashboard.html';
    } else {
        window.location.href = '/';
    }
}

// Export functions for global access
window.unifiedLogin = unifiedLogin;
window.showTOTPModal = showTOTPModal;
window.hasValidTOTPSession = hasValidTOTPSession;
window.clearTOTPSession = clearTOTPSession;
window.unifiedLogout = unifiedLogout;