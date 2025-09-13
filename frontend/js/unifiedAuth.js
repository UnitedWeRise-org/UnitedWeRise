/**
 * Unified Authentication System for United We Rise
 * Handles login for both main site and admin dashboard with TOTP support
 */

// Use existing BACKEND_URL if defined, otherwise set default
const BACKEND_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL.replace('/api', '') : 'https://api.unitedwerise.org';

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
            adminDebugLog('UnifiedAuth', `TOTP code entered for ${context} - will verify via login endpoint`);
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
        adminDebugLog('UnifiedAuth', `Starting unified login for ${context}`);
        
        // TOTP session tokens now handled by secure httpOnly cookies automatically
        // No need to manually include TOTP tokens - server will read from cookies
        
        // Initial login attempt
        const loginData = { email, password };
        
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // CRITICAL: Include cookies
            body: JSON.stringify(loginData)
        });
        
        const result = await response.json();
        adminDebugSensitive('UnifiedAuth', 'Login response', result);
        
        // If TOTP is required
        if (result.requiresTOTP) {
            adminDebugLog('UnifiedAuth', 'TOTP verification required');
            
            // Show TOTP modal and get user's 6-digit code
            const verificationToken = await showTOTPModal(context);
            
            // Retry login with TOTP token
            const totpLoginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // CRITICAL: Include cookies
                body: JSON.stringify({
                    email,
                    password,
                    totpToken: verificationToken
                })
            });
            
            const totpResult = await totpLoginResponse.json();
            adminDebugSensitive('UnifiedAuth', 'TOTP login response', totpResult);
            
            if (totpLoginResponse.ok && !totpResult.requiresTOTP) {
                // NEW: Store CSRF token and user data only
                window.csrfToken = totpResult.csrfToken;
                localStorage.setItem('currentUser', JSON.stringify(totpResult.user));
                
                
                // TOTP tokens now stored in secure httpOnly cookies (no localStorage needed)
                
                // Token is now in httpOnly cookie
                
                adminDebugLog('UnifiedAuth', `Unified login successful for ${context} with TOTP`);
                return {
                    success: true,
                    user: totpResult.user,
                    totpSessionToken: totpResult.totpSessionToken
                };
            } else {
                // Check if TOTP is still required (invalid code)
                if (totpResult.requiresTOTP) {
                    throw new Error('Invalid TOTP code. Please try again.');
                } else {
                    throw new Error(totpResult.error || 'TOTP login failed');
                }
            }
        }
        
        // Regular login (no TOTP required)
        if (response.ok) {
            // NEW: Store CSRF token and user data only
            window.csrfToken = result.csrfToken;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            
            // Token is now in httpOnly cookie
            adminDebugLog('UnifiedAuth', `Unified login successful for ${context} (no TOTP)`);
            return {
                success: true,
                user: result.user
            };
        } else {
            throw new Error(result.error || 'Login failed');
        }
        
    } catch (error) {
        adminDebugError('UnifiedAuth', 'Unified login error', error);
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
    // TOTP tokens are now in secure httpOnly cookies - cannot check client-side
    // Instead, make API call to verify TOTP status or rely on server responses
    console.log('TOTP session status now handled by secure httpOnly cookies');
    return true; // Assume valid - server will reject if expired
}

/**
 * Clear TOTP session for context
 * @param {string} context - 'main-site' or 'admin-dashboard'
 */
function clearTOTPSession(context = 'main-site') {
    // TOTP tokens are now in secure httpOnly cookies - cleared server-side via logout
    console.log(`TOTP session cleared for ${context} via server-side cookie clearing`);
}

/**
 * Unified logout function
 * @param {string} context - 'main-site' or 'admin-dashboard'
 */
function unifiedLogout(context = 'main-site') {
    // Call logout endpoint to clear cookies
    fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-CSRF-Token': window.csrfToken
        }
    }).catch(error => {
        console.warn('Logout endpoint call failed:', error);
    });
    
    // Clear local data
    localStorage.removeItem('currentUser');
    window.csrfToken = null;
    
    // Clear TOTP sessions for both contexts
    clearTOTPSession('main-site');
    clearTOTPSession('admin-dashboard');
    
    adminDebugLog('UnifiedAuth', `Unified logout completed for ${context}`);
    
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