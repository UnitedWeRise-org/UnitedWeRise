/**
 * @module core/auth/modal
 * @description Authentication modal management (login/register)
 * Extracted from index.html lines 1324-1500
 * 
 * @example
 * import { openAuthModal, closeAuthModal } from '@/modules/core/auth/modal';
 * openAuthModal('login');
 */

import { apiClient } from '../api/client.js';
import { userState } from '../state/user.js';
import { setUserLoggedIn } from './session.js';
import { unifiedAuthManager } from './unified-manager.js';
import { isDevelopment } from '../../../utils/environment.js';

/**
 * Open authentication modal
 * Extracted from index.html line 1324
 */
export function openAuthModal(mode = 'login') {
    const authModal = document.getElementById('authModal');
    if (!authModal) {
        console.error('Auth modal not found');
        return;
    }
    
    authModal.style.display = 'block';
    
    if (mode === 'login') {
        switchToLogin();
    } else {
        switchToRegister();
    }
}

/**
 * Close authentication modal
 * Extracted from index.html closeAuthModal function
 */
export function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.style.display = 'none';
        clearAuthForm();
    }
}

/**
 * Switch to login form
 * Extracted from index.html switchToLogin function
 */
export function switchToLogin() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const modalTitle = document.querySelector('#authModal h2');
    
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Login';
    
    clearAuthForm();
}

/**
 * Switch to register form
 * Extracted from index.html switchToRegister function
 */
export function switchToRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const modalTitle = document.querySelector('#authModal h2');
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (modalTitle) modalTitle.textContent = 'Create Account';
    
    clearAuthForm();
}

/**
 * Clear authentication form
 * Extracted from index.html clearAuthForm function
 */
export function clearAuthForm() {
    // Clear login form
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    
    // Clear register form
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerFirstName = document.getElementById('registerFirstName');
    const registerUsername = document.getElementById('registerUsername');
    
    if (registerEmail) registerEmail.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerFirstName) registerFirstName.value = '';
    if (registerUsername) registerUsername.value = '';
    
    // Clear messages
    clearAuthMessages();
}

/**
 * Clear authentication messages
 */
function clearAuthMessages() {
    const loginMessage = document.getElementById('loginMessage');
    const registerMessage = document.getElementById('registerMessage');
    
    if (loginMessage) {
        loginMessage.textContent = '';
        loginMessage.style.display = 'none';
    }
    if (registerMessage) {
        registerMessage.textContent = '';
        registerMessage.style.display = 'none';
    }
}

/**
 * Restore login button to original state
 */
function restoreLoginButton() {
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerHTML = 'Login';
    }
}

/**
 * Handle login form submission
 * Uses unified authentication manager for perfect synchronization
 */
export async function handleLogin() {
    console.log('🔍 Modular handleLogin called - using unified auth manager');
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const loginButton = document.getElementById('loginButton');

    console.log('🔍 Login inputs:', {email: email ? 'present' : 'missing', password: password ? 'present' : 'missing'});

    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error', 'login');
        return;
    }

    // Show loading spinner
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>';
    }

    try {
        showAuthMessage('Logging in...', 'info', 'login');
        console.log('🔍 Using unified auth manager for login');
        
        // Use the unified auth manager for login
        const result = await unifiedAuthManager.login(email, password);
        
        console.log('🔍 Unified login result:', result);
        
        if (result.success) {
            showAuthMessage('Login successful!', 'success', 'login');

            // Close modal after short delay
            setTimeout(() => {
                closeAuthModal();
                console.log('✅ Login successful via unified manager:', result.user.username || result.user.email);
            }, 1000);

        } else if (result.requiresTOTP) {
            console.log('🔍 TOTP required, showing TOTP input...');
            showAuthMessage('Two-factor authentication required...', 'info', 'login');
            restoreLoginButton(); // Restore button for TOTP input

            // Handle TOTP requirement (you could implement TOTP input UI here)
            // For now, fall back to the unified login system for TOTP handling
            try {
                const totpResult = await window.unifiedLogin(email, password, 'main-site');
                if (totpResult.success) {
                    closeAuthModal();
                    showAuthMessage('Login successful!', 'success');
                } else {
                    showAuthMessage(totpResult.error || 'Two-factor authentication failed', 'error', 'login');
                }
            } catch (totpError) {
                console.error('TOTP login error:', totpError);
                showAuthMessage('Two-factor authentication failed', 'error', 'login');
            }
        } else {
            showAuthMessage(result.error || 'Login failed', 'error', 'login');
            restoreLoginButton(); // Restore button on login failure
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage('Login failed. Please try again.', 'error', 'login');
        restoreLoginButton(); // Restore button on error
    }
}

/**
 * Handle registration form submission
 * Extracted from index.html handleRegister function
 */
export async function handleRegister() {
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    const firstName = document.getElementById('registerFirstName')?.value;
    const lastName = document.getElementById('registerLastName')?.value;
    const username = document.getElementById('registerUsername')?.value;

    if (!email || !password || !firstName || !username) {
        showAuthMessage('Please fill in all fields', 'error', 'register');
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAuthMessage('Please enter a valid email address', 'error', 'register');
        return;
    }

    // Password strength validation
    if (password.length < 8) {
        showAuthMessage('Password must be at least 8 characters long', 'error', 'register');
        return;
    }

    // Get hCaptcha token
    let hcaptchaToken = null;
    try {
        if (typeof hcaptcha !== 'undefined') {
            hcaptchaToken = hcaptcha.getResponse('hcaptcha-register');
        }
    } catch (captchaError) {
        console.log('hCaptcha not available or local development mode');
    }

    // Check if we need captcha (skip for development environment)
    if (!isDevelopment() && !hcaptchaToken) {
        showAuthMessage('Please complete the captcha verification', 'error', 'register');
        return;
    }

    try {
        showAuthMessage('Creating account...', 'info', 'register');

        const requestBody = {
            email,
            password,
            firstName,
            username
        };

        // Add optional fields
        if (lastName) requestBody.lastName = lastName;
        if (hcaptchaToken) requestBody.hcaptchaToken = hcaptchaToken;

        const response = await apiClient.call('/auth/register', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        if (response.user) {
            // Registration now uses cookie-based auth (matching login pattern)
            // The backend has already set the httpOnly authToken cookie
            // Use unified auth manager for registration success
            unifiedAuthManager.setAuthenticatedUser(response.user, response.csrfToken);

            showAuthMessage('Account created successfully!', 'success', 'register');

            // Close modal after short delay
            setTimeout(() => {
                closeAuthModal();
            }, 1000);

            console.log('✅ Registration successful via unified manager:', response.user.username);
        } else {
            showAuthMessage(response.message || 'Registration failed', 'error', 'register');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAuthMessage('Registration failed. Please try again.', 'error', 'register');
    }
}

/**
 * Show authentication message
 * Extracted from index.html showAuthMessage function
 */
export function showAuthMessage(message, type = 'info', form = 'login') {
    const messageElement = document.getElementById(form + 'Message');
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    
    // Set appropriate styling based on type
    messageElement.className = `auth-message ${type}`;
    
    // Clear message after 5 seconds for non-persistent messages
    if (type !== 'success') {
        setTimeout(() => {
            if (messageElement.textContent === message) {
                messageElement.style.display = 'none';
            }
        }, 5000);
    }
}

// Setup event listeners for auth modal
export function setupAuthModalEvents() {
    // Close modal when clicking outside
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.addEventListener('click', (event) => {
            if (event.target === authModal) {
                closeAuthModal();
            }
        });
    }
    
    // Handle form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handleLogin();
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            handleRegister();
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthModalEvents);
} else {
    setupAuthModalEvents();
}

// Maintain backward compatibility
if (typeof window !== 'undefined') {
    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
    window.switchToLogin = switchToLogin;
    window.switchToRegister = switchToRegister;
    window.handleLogin = handleLogin;
    window.handleRegister = handleRegister;
    window.showAuthMessage = showAuthMessage;
}

export default {
    openAuthModal,
    closeAuthModal,
    switchToLogin,
    switchToRegister,
    handleLogin,
    handleRegister,
    showAuthMessage
};