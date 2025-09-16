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
 * Handle login form submission
 * Extracted from index.html handleLogin function
 */
export async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error', 'login');
        return;
    }
    
    try {
        showAuthMessage('Logging in...', 'info', 'login');
        
        const response = await apiClient.call('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.success && response.user) {
            // Set user state
            userState.current = response.user;
            setUserLoggedIn(response.user);
            
            showAuthMessage('Login successful!', 'success', 'login');
            
            // Close modal after short delay
            setTimeout(() => {
                closeAuthModal();
            }, 1000);
            
            console.log('✅ Login successful:', response.user.username || response.user.email);
        } else {
            showAuthMessage(response.message || 'Login failed', 'error', 'login');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage('Login failed. Please try again.', 'error', 'login');
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
    
    try {
        showAuthMessage('Creating account...', 'info', 'register');
        
        const response = await apiClient.call('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                firstName,
                username
            })
        });
        
        if (response.success && response.user) {
            // Set user state
            userState.current = response.user;
            setUserLoggedIn(response.user);
            
            showAuthMessage('Account created successfully!', 'success', 'register');
            
            // Close modal after short delay
            setTimeout(() => {
                closeAuthModal();
            }, 1000);
            
            console.log('✅ Registration successful:', response.user.username);
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