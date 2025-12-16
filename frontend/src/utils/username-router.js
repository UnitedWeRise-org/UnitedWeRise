/**
 * Username-based URL Router for UnitedWeRise
 * Handles direct navigation to user profiles via /{username}
 * Supports both regular users and candidates
 */

import { apiCall } from '../js/api-compatibility-shim.js';

class UsernameRouter {
    constructor() {
        // Routes that are reserved and should not be treated as usernames
        this.reservedRoutes = [
            'api', 'admin', 'assets', 'uploads',
            'admin-dashboard.html', 'candidate-verification.html',
            'donation-success.html', 'donation-cancelled.html',
            'verify-email.html', 'admin-feedback',
            'reset-password'
        ];

        this.init();
    }

    init() {
        // Handle browser back/forward navigation
        window.addEventListener('popstate', () => this.handleRoute());

        // Handle initial page load
        this.handleRoute();

        // Make router available globally for programmatic navigation
        window.usernameRouter = this;
    }

    handleRoute() {
        const path = window.location.pathname.substring(1); // Remove leading /

        // Skip if it's a reserved route, empty, or contains file extensions
        if (!path || this.isReservedRoute(path) || path.includes('.')) {
            return;
        }

        // Treat remaining path as username
        this.loadUserProfile(path);
    }

    isReservedRoute(path) {
        // Check if path starts with any reserved route
        return this.reservedRoutes.some(route =>
            path === route ||
            path.startsWith(route + '/') ||
            path.startsWith(route + '.')
        );
    }

    async loadUserProfile(username) {
        try {
            // Show loading state
            this.showLoadingState();

            // Call existing API endpoint
            const response = await apiCall(`/api/users/by-username/${username}`);

            if (response.ok) {
                const user = response.data.user;

                // Determine if user is a candidate and show appropriate profile
                if (user.candidateProfile) {
                    await this.showCandidateProfile(user);
                } else {
                    await this.showUserProfile(user);
                }

                // Update page metadata for SEO and social sharing
                this.updatePageMeta(user);

                // Hide any loading states
                this.hideLoadingState();

            } else {
                // User not found
                this.show404(username);
            }
        } catch (error) {
            console.error('Profile loading error:', error);
            await window.adminDebugError('UsernameRouter', 'Profile loading failed', { username, error: error.message });
            this.show404(username);
        }
    }

    async showCandidateProfile(user) {
        // Update page title for candidate
        document.title = `${user.candidateProfile.name} - Candidate | United We Rise`;

        // Use existing showProfile function but ensure candidate context is highlighted
        if (window.showProfile) {
            await window.showProfile(user.id);

            // Add candidate badge/indicator if not already present
            this.highlightCandidateStatus(user.candidateProfile);
        } else {
            console.error('showProfile function not available');
        }
    }

    async showUserProfile(user) {
        // Update page title for regular user
        const displayName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : `@${user.username}`;
        document.title = `${displayName} | United We Rise`;

        // Use existing showProfile function
        if (window.showProfile) {
            await window.showProfile(user.id);
        } else {
            console.error('showProfile function not available');
        }
    }

    highlightCandidateStatus(candidateProfile) {
        // Add visual indicator that this is a candidate profile
        // This could be enhanced later with a banner or special styling
        const profileContainer = document.querySelector('.profile-container, #profileContent');
        if (profileContainer && !profileContainer.querySelector('.candidate-badge')) {
            const badge = document.createElement('div');
            badge.className = 'candidate-badge';
            badge.innerHTML = `
                <span class="badge badge-primary">
                    <i class="fas fa-vote-yea"></i> Candidate for ${candidateProfile.office}
                </span>
            `;
            profileContainer.insertBefore(badge, profileContainer.firstChild);
        }
    }

    updatePageMeta(user) {
        const displayName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : `@${user.username}`;

        // Set Open Graph meta tags for social sharing
        this.setMetaTag('og:type', 'profile');
        this.setMetaTag('og:title', displayName + ' | United We Rise');
        this.setMetaTag('og:url', `${window.location.origin}/${user.username}`);
        this.setMetaTag('og:site_name', 'United We Rise');

        // Add profile-specific meta
        if (user.bio) {
            this.setMetaTag('og:description', user.bio);
            this.setMetaTag('description', user.bio);
        }

        if (user.avatar) {
            this.setMetaTag('og:image', user.avatar);
        }

        // Candidate-specific meta tags
        if (user.candidateProfile) {
            this.setMetaTag('og:title', `${user.candidateProfile.name} - Candidate | United We Rise`);
            if (user.candidateProfile.platformSummary) {
                this.setMetaTag('og:description', user.candidateProfile.platformSummary);
            }
        }

        // Set canonical URL
        this.setLinkTag('canonical', `${window.location.origin}/${user.username}`);
    }

    setMetaTag(property, content) {
        // Remove existing meta tag if present
        let existing = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
        if (existing) {
            existing.remove();
        }

        // Create new meta tag
        const meta = document.createElement('meta');
        if (property.startsWith('og:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }

    setLinkTag(rel, href) {
        // Remove existing link tag if present
        let existing = document.querySelector(`link[rel="${rel}"]`);
        if (existing) {
            existing.remove();
        }

        // Create new link tag
        const link = document.createElement('link');
        link.setAttribute('rel', rel);
        link.setAttribute('href', href);
        document.head.appendChild(link);
    }

    showLoadingState() {
        // Add loading indicator - could be enhanced with better UI
        const body = document.body;
        if (!body.querySelector('.profile-loading')) {
            const loading = document.createElement('div');
            loading.className = 'profile-loading';
            loading.innerHTML = '<div class="spinner-border" role="status"><span class="sr-only">Loading profile...</span></div>';
            loading.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;';
            body.appendChild(loading);
        }
    }

    hideLoadingState() {
        const loading = document.querySelector('.profile-loading');
        if (loading) {
            loading.remove();
        }
    }

    show404(username) {
        document.title = `@${username} not found | United We Rise`;

        // Hide loading state
        this.hideLoadingState();

        // Show 404 message - could be enhanced with better UI
        const mainContent = document.querySelector('#mainContent, .main-content, main');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container mt-5 text-center">
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <h1>404</h1>
                            <h3>User Not Found</h3>
                            <p>The user <strong>@${username}</strong> doesn't exist or may have changed their username.</p>
                            <div class="mt-4">
                                <button class="btn btn-primary" data-router-action="go-home">
                                    Return Home
                                </button>
                                <button class="btn btn-outline-secondary ml-2" data-router-action="go-back">
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Fallback alert if main content area not found
            alert(`User @${username} not found. You will be redirected to the home page.`);
            window.location.href = '/';
        }
    }

    // Public method for programmatic navigation to profiles
    navigateToProfile(username) {
        if (!username) return;

        const url = `/${username}`;
        history.pushState(null, '', url);
        this.handleRoute();
    }

    // Helper method to get clean profile URL
    static getProfileUrl(username) {
        return `${window.location.origin}/${username}`;
    }

    // Helper method to extract username from current URL
    getCurrentUsername() {
        const path = window.location.pathname.substring(1);
        return this.isReservedRoute(path) ? null : path;
    }
}

// Global helper functions
window.navigateToProfile = function(username) {
    if (window.usernameRouter) {
        window.usernameRouter.navigateToProfile(username);
    }
};

window.getProfileUrl = function(username) {
    return UsernameRouter.getProfileUrl(username);
};

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new UsernameRouter();
    });
} else {
    new UsernameRouter();
}

// Event delegation for router actions
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-router-action]');
    if (!target) return;

    const action = target.dataset.routerAction;
    switch (action) {
        case 'go-home':
            window.location.href = '/';
            break;
        case 'go-back':
            window.history.back();
            break;
    }
});

// Export for ES6 modules
export default UsernameRouter;