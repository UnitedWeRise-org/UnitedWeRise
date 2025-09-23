/**
 * OAuth Provider Management Component
 * Handles linking/unlinking social login providers in user settings
 */

class OAuthProviderManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.linkedProviders = [];
        this.init();
    }

    async init() {
        await this.loadLinkedProviders();
        this.render();
    }

    async loadLinkedProviders() {
        try {
            const response = await window.apiCall('/oauth/linked');

            if (response.ok) {
                this.linkedProviders = response.data?.providers || [];
            } else {
                console.error('Failed to load linked providers');
            }
        } catch (error) {
            console.error('Error loading linked providers:', error);
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const providers = [
            { id: 'google', name: 'Google', icon: this.getGoogleIcon() },
            { id: 'microsoft', name: 'Microsoft', icon: this.getMicrosoftIcon() },
            { id: 'apple', name: 'Apple', icon: this.getAppleIcon() }
        ];

        container.innerHTML = `
            <div class="oauth-provider-manager">
                <h3>Connected Accounts</h3>
                <p class="oauth-description">
                    Link your social accounts for easy sign-in. You can always sign in with your email and password.
                </p>
                
                <div class="oauth-provider-list">
                    ${providers.map(provider => this.renderProviderCard(provider)).join('')}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    renderProviderCard(provider) {
        const isLinked = this.linkedProviders.some(p => p.provider.toLowerCase() === provider.id);
        const linkedProvider = this.linkedProviders.find(p => p.provider.toLowerCase() === provider.id);

        return `
            <div class="oauth-provider-card ${isLinked ? 'linked' : 'unlinked'}">
                <div class="provider-info">
                    <div class="provider-icon">${provider.icon}</div>
                    <div class="provider-details">
                        <h4>${provider.name}</h4>
                        ${isLinked ? `
                            <p class="provider-email">${linkedProvider.email || 'Connected'}</p>
                            <p class="provider-date">Connected ${new Date(linkedProvider.createdAt).toLocaleDateString()}</p>
                        ` : `
                            <p class="provider-status">Not connected</p>
                        `}
                    </div>
                </div>
                <div class="provider-actions">
                    ${isLinked ? `
                        <button class="btn-secondary unlink-btn" data-provider="${provider.id}">
                            Unlink
                        </button>
                    ` : `
                        <button class="btn link-btn" data-provider="${provider.id}">
                            Link Account
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Link account buttons
        document.querySelectorAll('.link-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const provider = e.target.dataset.provider;
                this.linkProvider(provider);
            });
        });

        // Unlink account buttons
        document.querySelectorAll('.unlink-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const provider = e.target.dataset.provider;
                this.unlinkProvider(provider);
            });
        });
    }

    async linkProvider(provider) {
        try {
            let authData = null;

            // Initiate OAuth flow based on provider
            switch (provider) {
                case 'google':
                    authData = await this.initiateGoogleLink();
                    break;
                case 'microsoft':
                    authData = await this.initiateMicrosoftLink();
                    break;
                case 'apple':
                    authData = await this.initiateAppleLink();
                    break;
                default:
                    throw new Error('Unsupported provider');
            }

            if (!authData) return;

            // Send link request to backend
            const response = await fetch(`/api/oauth/link/${provider}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(authData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`${provider} account linked successfully!`, 'success');
                await this.loadLinkedProviders();
                this.render();
            } else {
                this.showMessage(data.error || `Failed to link ${provider} account`, 'error');
            }

        } catch (error) {
            console.error(`Error linking ${provider}:`, error);
            this.showMessage(`Failed to link ${provider} account. Please try again.`, 'error');
        }
    }

    async unlinkProvider(provider) {
        const confirmed = confirm(`Are you sure you want to unlink your ${provider} account?`);
        if (!confirmed) return;

        try {
            const response = await window.apiCall(`/oauth/unlink/${provider}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage(`${provider} account unlinked successfully!`, 'success');
                await this.loadLinkedProviders();
                this.render();
            } else {
                this.showMessage(data.error || `Failed to unlink ${provider} account`, 'error');
            }

        } catch (error) {
            console.error(`Error unlinking ${provider}:`, error);
            this.showMessage(`Failed to unlink ${provider} account. Please try again.`, 'error');
        }
    }

    async initiateGoogleLink() {
        return new Promise((resolve, reject) => {
            if (!window.google?.accounts?.id) {
                // Load Google Sign-In SDK
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    google.accounts.id.initialize({
                        client_id: 'YOUR_GOOGLE_CLIENT_ID',
                        callback: (response) => {
                            resolve({ idToken: response.credential });
                        }
                    });
                    google.accounts.id.prompt();
                };
                script.onerror = () => reject(new Error('Failed to load Google SDK'));
                document.head.appendChild(script);
            } else {
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed()) {
                        reject(new Error('Google Sign-In not available'));
                    }
                });
            }
        });
    }

    async initiateMicrosoftLink() {
        return new Promise((resolve, reject) => {
            if (!window.msal) {
                // Load Microsoft MSAL SDK
                const script = document.createElement('script');
                script.src = 'https://alcdn.msauth.net/browser/2.38.1/js/msal-browser.min.js';
                script.onload = async () => {
                    const msalConfig = {
                        auth: {
                            clientId: 'YOUR_MICROSOFT_CLIENT_ID',
                            authority: 'https://login.microsoftonline.com/common'
                        }
                    };
                    const msalInstance = new msal.PublicClientApplication(msalConfig);
                    
                    try {
                        const response = await msalInstance.loginPopup({ scopes: ['User.Read'] });
                        resolve({ accessToken: response.accessToken });
                    } catch (error) {
                        reject(error);
                    }
                };
                script.onerror = () => reject(new Error('Failed to load Microsoft SDK'));
                document.head.appendChild(script);
            }
        });
    }

    async initiateAppleLink() {
        return new Promise((resolve, reject) => {
            if (!window.AppleID) {
                // Load Apple Sign-In SDK
                const script = document.createElement('script');
                script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
                script.onload = async () => {
                    AppleID.auth.init({
                        clientId: 'YOUR_APPLE_CLIENT_ID',
                        scope: 'name email',
                        redirectURI: window.location.origin,
                        usePopup: true
                    });
                    
                    try {
                        const response = await AppleID.auth.signIn();
                        resolve({ 
                            identityToken: response.authorization.id_token,
                            user: response.user 
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                script.onerror = () => reject(new Error('Failed to load Apple SDK'));
                document.head.appendChild(script);
            }
        });
    }

    showMessage(message, type) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Remove existing message
        const existingMessage = container.querySelector('.oauth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Add new message
        const messageEl = document.createElement('div');
        messageEl.className = `oauth-message ${type}-message`;
        messageEl.textContent = message;
        container.insertBefore(messageEl, container.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    getGoogleIcon() {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
        `;
    }

    getMicrosoftIcon() {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
            </svg>
        `;
    }

    getAppleIcon() {
        return `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
        `;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OAuthProviderManager;
} else if (typeof window !== 'undefined') {
    window.OAuthProviderManager = OAuthProviderManager;
}