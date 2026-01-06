/**
 * @module components/UserCard
 * @description Anchored popup card component for quick user interactions
 * Created: September 21, 2025
 * Migrated to ES6 modules: October 11, 2025 (Batch 6)
 */
import { apiCall } from '../js/api-compatibility-shim.js';

class UserCard {
    constructor() {
        this.currentCard = null;
        this.currentTrigger = null;
        this.isLoading = false;
        this.userCache = new Map();

        // Bind methods for event listeners
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleCardAction = this.handleCardAction.bind(this);

        this.initializeStyles();
        this.setupEventDelegation();
    }

    /**
     * Setup event delegation for CSP compliance
     * Replaces inline onclick handlers with data-action pattern
     */
    setupEventDelegation() {
        document.addEventListener('click', this.handleCardAction);
    }

    /**
     * Handle delegated click actions from user card
     * @param {Event} e - Click event
     */
    handleCardAction(e) {
        const target = e.target.closest('[data-card-action]');
        if (!target) return;

        const action = target.dataset.cardAction;
        const userId = target.dataset.userId;
        const param1 = target.dataset.param1;
        const param2 = target.dataset.param2;

        switch (action) {
            case 'hideCard':
                this.hideCard();
                break;
            case 'viewProfile':
                this.viewProfile(userId);
                break;
            case 'editProfile':
                this.editProfile();
                break;
            case 'viewSettings':
                this.viewSettings();
                break;
            case 'toggleFollow':
                this.toggleFollow(userId, param1 === 'true');
                break;
            case 'toggleFriend':
                this.toggleFriend(userId, param1, param2 === 'true');
                break;
            case 'toggleSubscribe':
                this.toggleSubscribe(userId, param1 === 'true');
                break;
            case 'toggleBlock':
                this.toggleBlock(userId, param1 === 'true');
                break;
            case 'declineFriend':
                this.declineFriendRequest(userId);
                break;
            case 'reportPost':
                this.reportPost(param1);
                break;
            case 'openAuthModal':
                if (typeof openAuthModal === 'function') {
                    openAuthModal(param1 || 'login');
                }
                break;
        }
    }

    /**
     * Show user card anchored to a trigger element
     * @param {HTMLElement} triggerElement - Element that triggered the card (avatar, username, etc.)
     * @param {string} userId - ID of the user to show
     * @param {Object} context - Context info (postId for reports, etc.)
     */
    async showCard(triggerElement, userId, context = {}) {
        if (!triggerElement || !userId) {
            console.error('UserCard: Invalid parameters', { triggerElement, userId });
            return;
        }

        // Allow current user to view their own profile card with appropriate actions
        const isCurrentUser = userId === window.currentUser?.id;
        if (isCurrentUser) {
            console.log('UserCard: Showing current user profile card with self-actions');
        }

        // Hide existing card
        this.hideCard();

        // Set loading state
        this.isLoading = true;
        this.currentTrigger = triggerElement;
        this.currentContext = context;

        try {
            // Create and show loading card
            this.createCardElement();
            this.showLoadingState();
            this.positionCard(triggerElement);
            this.addEventListeners();

            // Load user data
            const userData = await this.loadUserData(userId);
            const relationshipData = await this.loadRelationshipData(userId);

            // Update card with real data
            this.renderCardContent(userData, relationshipData, context);
            this.isLoading = false;

        } catch (error) {
            console.error('UserCard: Error showing card', error);
            this.showErrorState(error.message);
            this.isLoading = false;
        }
    }

    /**
     * Hide the current user card
     */
    hideCard() {
        if (this.currentCard) {
            this.currentCard.remove();
            this.currentCard = null;
        }
        this.currentTrigger = null;
        this.removeEventListeners();
    }

    /**
     * Create the card DOM element
     */
    createCardElement() {
        this.currentCard = document.createElement('div');
        this.currentCard.className = 'user-card-popup';
        this.currentCard.id = 'userCardPopup';

        // Add to body to avoid z-index issues
        document.body.appendChild(this.currentCard);
    }

    /**
     * Position the card relative to trigger element
     * @param {HTMLElement} triggerElement
     */
    positionCard(triggerElement) {
        if (!this.currentCard || !triggerElement) return;

        const triggerRect = triggerElement.getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = 200; // Estimated
        const padding = 10;

        let left = triggerRect.right + padding;
        let top = triggerRect.top;

        // Check right edge
        if (left + cardWidth > window.innerWidth) {
            left = triggerRect.left - cardWidth - padding;
        }

        // Check left edge
        if (left < padding) {
            left = triggerRect.left;
            top = triggerRect.bottom + padding;
        }

        // Check bottom edge
        if (top + cardHeight > window.innerHeight) {
            top = triggerRect.top - cardHeight - padding;
        }

        // Check top edge
        if (top < padding) {
            top = padding;
        }

        // On mobile, center the card
        if (window.innerWidth <= 768) {
            left = (window.innerWidth - cardWidth) / 2;
            top = (window.innerHeight - cardHeight) / 2;

            // Add backdrop on mobile
            this.currentCard.classList.add('mobile-mode');
        }

        this.currentCard.style.left = `${left}px`;
        this.currentCard.style.top = `${top}px`;
    }

    /**
     * Load user data from API or cache
     * @param {string} userId
     */
    async loadUserData(userId) {
        // Check cache first
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }

        try {
            const response = await apiCall(`/users/${userId}`);

            if (response.ok) {
                const userData = response.data.user;
                this.userCache.set(userId, userData);
                return userData;
            } else {
                throw new Error(response.data?.error || 'Failed to load user data');
            }
        } catch (error) {
            console.error('UserCard: Error loading user data', error);
            throw error;
        }
    }

    /**
     * Load relationship data for the user
     * @param {string} userId
     */
    async loadRelationshipData(userId) {
        if (!window.currentUser) {
            return {
                isFollowing: false,
                friendshipStatus: 'none',
                isSubscribed: false
            };
        }

        try {
            // Use existing relationship utilities
            const relationshipStatus = await window.RelationshipUtils.getCombinedStatus(userId);

            return relationshipStatus;
        } catch (error) {
            console.error('UserCard: Error loading relationship data', error);
            return {
                isFollowing: false,
                friendshipStatus: 'none',
                isSubscribed: false
            };
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (!this.currentCard) return;

        this.currentCard.innerHTML = `
            <div class="user-card-content">
                <div class="user-card-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading user...</p>
                </div>
            </div>
        `;
    }

    /**
     * Show error state
     * @param {string} message
     */
    showErrorState(message) {
        if (!this.currentCard) return;

        this.currentCard.innerHTML = `
            <div class="user-card-content">
                <div class="user-card-error">
                    <p>❌ ${message}</p>
                    <button data-card-action="hideCard" class="btn btn-sm">Close</button>
                </div>
            </div>
        `;
    }

    /**
     * Render the card content with user data
     * @param {Object} user
     * @param {Object} relationship
     * @param {Object} context
     */
    renderCardContent(user, relationship, context) {
        if (!this.currentCard) return;

        const isAuthenticated = !!window.currentUser;
        const isCurrentUser = user.id === window.currentUser?.id;
        const userName = user.firstName || user.username || 'Unknown';
        const userInitial = userName[0].toUpperCase();

        // Extract block status
        const isBlocked = relationship.block?.isBlocked || false;
        const isBlockedBy = relationship.block?.isBlockedBy || false;

        // Map backend status to UI status
        // Backend returns: PENDING, ACCEPTED, REJECTED, BLOCKED
        // Frontend uses: none, request_sent, request_received, friends
        let friendStatus = 'none';
        const rawStatus = relationship.friend?.friendshipStatus;
        if (rawStatus === 'ACCEPTED') {
            friendStatus = 'friends';
        } else if (rawStatus === 'PENDING') {
            // Use requestSentByCurrentUser to determine direction
            friendStatus = relationship.friend?.requestSentByCurrentUser ? 'request_sent' : 'request_received';
        }

        this.currentCard.innerHTML = `
            <div class="user-card-content">
                <div class="user-card-header">
                    <div class="user-card-avatar">
                        ${user.avatar ?
                            `<img src="${user.avatar}" alt="Profile Picture" class="avatar-img">` :
                            `<div class="avatar-placeholder">${userInitial}</div>`
                        }
                    </div>
                    <div class="user-card-info">
                        <div class="user-card-name">
                            ${userName}
                            ${user.verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
                        </div>
                        <div class="user-card-username">@${user.username || 'unknown'}</div>
                        ${user.bio ? `<div class="user-card-bio">${user.bio.substring(0, 60)}${user.bio.length > 60 ? '...' : ''}</div>` : ''}
                    </div>
                </div>

                <div class="user-card-actions">
                    <button data-card-action="viewProfile" data-user-id="${user.id}" class="user-card-btn primary">
                        👤 View Profile
                    </button>

                    ${isCurrentUser ? `
                        <button data-card-action="editProfile" class="user-card-btn secondary">
                            ✏️ Edit Profile
                        </button>
                        <button data-card-action="viewSettings" class="user-card-btn outline">
                            ⚙️ Settings
                        </button>
                    ` : isAuthenticated ? (isBlockedBy ? `
                        <p class="blocked-notice">This user has blocked you</p>
                    ` : isBlocked ? `
                        <button data-card-action="toggleBlock" data-user-id="${user.id}" data-param1="true"
                                class="user-card-btn danger">
                            🚫 Unblock User
                        </button>
                    ` : `
                        <button data-card-action="toggleFollow" data-user-id="${user.id}" data-param1="${relationship.follow?.isFollowing || false}"
                                class="user-card-btn ${relationship.follow?.isFollowing ? 'secondary' : 'primary'}">
                            ${relationship.follow?.isFollowing ? '✓ Following' : '+ Follow'}
                        </button>

                        <button data-card-action="toggleFriend" data-user-id="${user.id}"
                                data-param1="${friendStatus}" data-param2="${isBlocked}"
                                class="user-card-btn ${relationship.friend?.isFriend ? 'success' : 'outline'}">
                            ${this.getFriendButtonText(friendStatus, isBlocked)}
                        </button>

                        ${friendStatus === 'request_received' ? `
                            <button data-card-action="declineFriend" data-user-id="${user.id}"
                                    class="user-card-btn outline">
                                ❌ Decline
                            </button>
                        ` : ''}

                        <button data-card-action="toggleSubscribe" data-user-id="${user.id}" data-param1="${relationship.subscription?.isSubscribed || false}"
                                class="user-card-btn ${relationship.subscription?.isSubscribed ? 'warning' : 'outline'}">
                            ${relationship.subscription?.isSubscribed ? '🔔 Subscribed' : '🔔 Subscribe'}
                        </button>

                        <button data-card-action="toggleBlock" data-user-id="${user.id}" data-param1="false"
                                class="user-card-btn outline-danger">
                            🚫 Block
                        </button>

                        ${context.postId ? `
                            <button data-card-action="reportPost" data-param1="${context.postId}" class="user-card-btn danger">
                                🚨 Report Post
                            </button>
                        ` : ''}
                    `) : `
                        <p class="login-prompt">
                            <a href="#" data-card-action="openAuthModal" data-param1="login">Log in</a> to interact with users
                        </p>
                    `}
                </div>
            </div>
        `;
    }

    /**
     * Get appropriate friend button text based on status
     * @param {string} status
     * @param {boolean} isBlocked - Whether we have blocked this user
     */
    getFriendButtonText(status, isBlocked = false) {
        if (isBlocked) return '🚫 Blocked';
        switch (status) {
            case 'none': return '👥 Add Friend';
            case 'request_sent': return '❌ Cancel Request';
            case 'request_received': return '✅ Accept Request';
            case 'friends': return '👥 Friends ✓';
            default: return '👥 Add Friend';
        }
    }

    /**
     * Handle view profile action
     * @param {string} userId
     */
    viewProfile(userId) {
        this.hideCard();
        if (window.showUserProfile) {
            window.showUserProfile(userId);
        } else {
            console.error('showUserProfile function not available');
        }
    }

    /**
     * Handle edit profile action for current user
     */
    editProfile() {
        this.hideCard();
        if (window.showUserProfile) {
            window.showUserProfile(window.currentUser?.id, { editMode: true });
        } else {
            console.error('showUserProfile function not available for edit mode');
        }
    }

    /**
     * Handle view settings action for current user
     */
    viewSettings() {
        this.hideCard();
        if (window.showAccountSettings) {
            window.showAccountSettings();
        } else {
            console.error('showAccountSettings function not available');
        }
    }

    /**
     * Handle follow toggle
     * @param {string} userId
     * @param {boolean} isCurrentlyFollowing
     */
    async toggleFollow(userId, isCurrentlyFollowing) {
        try {
            if (window.FollowUtils) {
                await window.FollowUtils.toggleFollow(userId, isCurrentlyFollowing);
                // Refresh the card to show updated status (preserve context for Report button)
                setTimeout(() => {
                    if (this.currentTrigger) {
                        this.showCard(this.currentTrigger, userId, this.currentContext);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('UserCard: Error toggling follow', error);
        }
    }

    /**
     * Handle friend toggle
     * @param {string} userId
     * @param {string} currentStatus
     * @param {boolean} isBlocked - Whether we have blocked this user
     */
    async toggleFriend(userId, currentStatus, isBlocked = false) {
        try {
            // Handle blocked state first
            if (isBlocked) {
                if (window.BlockUtils) {
                    await window.BlockUtils.unblockUser(userId);
                }
                // Refresh the card to show updated status
                setTimeout(() => {
                    if (this.currentTrigger) {
                        this.showCard(this.currentTrigger, userId, this.currentContext);
                    }
                }, 500);
                return;
            }

            if (window.FriendUtils) {
                switch (currentStatus) {
                    case 'none':
                        await window.FriendUtils.sendFriendRequest(userId);
                        break;
                    case 'request_sent':
                        await window.FriendUtils.cancelFriendRequest(userId);
                        break;
                    case 'request_received':
                        await window.FriendUtils.acceptFriendRequest(userId);
                        break;
                    case 'friends':
                        await window.FriendUtils.removeFriend(userId);
                        break;
                }

                // Refresh the card to show updated status (preserve context for Report button)
                setTimeout(() => {
                    if (this.currentTrigger) {
                        this.showCard(this.currentTrigger, userId, this.currentContext);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('UserCard: Error toggling friend', error);
        }
    }

    /**
     * Handle subscription toggle
     * @param {string} userId
     * @param {boolean} isCurrentlySubscribed
     */
    async toggleSubscribe(userId, isCurrentlySubscribed) {
        if (!window.SubscriptionUtils) {
            console.error('UserCard: SubscriptionUtils not available');
            return;
        }

        try {
            const result = await window.SubscriptionUtils.toggleSubscription(userId, isCurrentlySubscribed);

            if (result.success) {
                // Refresh the card to show updated subscription status
                this.hideCard();
                setTimeout(() => {
                    this.showCard(this.currentTrigger, userId, this.currentContext);
                }, 300);
            }
        } catch (error) {
            console.error('UserCard: Error toggling subscription', error);
            if (window.showNotification) {
                window.showNotification('Failed to update subscription', 'error');
            }
        }
    }

    /**
     * Handle block toggle
     * @param {string} userId
     * @param {boolean} isCurrentlyBlocked
     */
    async toggleBlock(userId, isCurrentlyBlocked) {
        if (!window.BlockUtils) {
            console.error('UserCard: BlockUtils not available');
            return;
        }

        try {
            if (isCurrentlyBlocked) {
                await window.BlockUtils.unblockUser(userId);
            } else {
                await window.BlockUtils.blockUser(userId);
            }

            // Refresh the card to show updated block status
            setTimeout(() => {
                if (this.currentTrigger) {
                    this.showCard(this.currentTrigger, userId, this.currentContext);
                }
            }, 500);
        } catch (error) {
            console.error('UserCard: Error toggling block', error);
            if (window.showNotification) {
                window.showNotification('Failed to update block status', 'error');
            }
        }
    }

    /**
     * Handle declining a friend request
     * @param {string} userId
     */
    async declineFriendRequest(userId) {
        try {
            if (window.FriendUtils) {
                await window.FriendUtils.rejectFriendRequest(userId);

                // Refresh the card to show updated status
                setTimeout(() => {
                    if (this.currentTrigger) {
                        this.showCard(this.currentTrigger, userId, this.currentContext);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('UserCard: Error declining friend request', error);
        }
    }

    /**
     * Handle report post action
     * @param {string} postId
     */
    reportPost(postId) {
        this.hideCard();
        if (window.contentReporting && window.contentReporting.reportContent) {
            window.contentReporting.reportContent('POST', postId);
        } else {
            console.error('Content reporting system not available');
        }
    }

    /**
     * Add event listeners for click outside and escape key
     */
    addEventListeners() {
        document.addEventListener('click', this.handleClickOutside, true);
        document.addEventListener('keydown', this.handleEscapeKey);
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        document.removeEventListener('click', this.handleClickOutside, true);
        document.removeEventListener('keydown', this.handleEscapeKey);
    }

    /**
     * Handle click outside card
     * @param {Event} event
     */
    handleClickOutside(event) {
        if (this.currentCard && !this.currentCard.contains(event.target) &&
            this.currentTrigger && !this.currentTrigger.contains(event.target)) {
            this.hideCard();
        }
    }

    /**
     * Handle escape key press
     * @param {Event} event
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape' && this.currentCard) {
            this.hideCard();
        }
    }

    /**
     * Initialize CSS styles
     */
    initializeStyles() {
        if (document.getElementById('userCardStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'userCardStyles';
        styles.textContent = `
            .user-card-popup {
                position: fixed;
                width: 320px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                border: 1px solid #e0e0e0;
                z-index: 10000;
                animation: userCardFadeIn 0.2s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .user-card-popup.mobile-mode {
                width: 90vw;
                max-width: 320px;
                position: fixed;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%);
            }

            .user-card-popup.mobile-mode::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: -1;
            }

            @keyframes userCardFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .user-card-content {
                padding: 16px;
            }

            .user-card-header {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
            }

            .user-card-avatar {
                flex-shrink: 0;
            }

            .user-card-avatar .avatar-img {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
            }

            .user-card-avatar .avatar-placeholder {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: #4b5c09;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 18px;
            }

            .user-card-info {
                flex: 1;
                min-width: 0;
            }

            .user-card-name {
                font-weight: 600;
                font-size: 16px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .user-card-username {
                color: #666;
                font-size: 14px;
                margin-top: 2px;
            }

            .user-card-bio {
                color: #555;
                font-size: 13px;
                margin-top: 4px;
                line-height: 1.3;
            }

            .verified-badge {
                color: #1da1f2;
                font-size: 14px;
            }

            .user-card-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .user-card-btn {
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid transparent;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                background: none;
            }

            .user-card-btn.primary {
                background: #4b5c09;
                color: white;
                border-color: #4b5c09;
            }

            .user-card-btn.primary:hover {
                background: #3a4507;
            }

            .user-card-btn.secondary {
                background: #6c757d;
                color: white;
                border-color: #6c757d;
            }

            .user-card-btn.secondary:hover {
                background: #545b62;
            }

            .user-card-btn.success {
                background: #28a745;
                color: white;
                border-color: #28a745;
            }

            .user-card-btn.success:hover {
                background: #218838;
            }

            .user-card-btn.warning {
                background: #ffc107;
                color: #212529;
                border-color: #ffc107;
            }

            .user-card-btn.warning:hover {
                background: #e0a800;
            }

            .user-card-btn.danger {
                background: #dc3545;
                color: white;
                border-color: #dc3545;
            }

            .user-card-btn.danger:hover {
                background: #c82333;
            }

            .user-card-btn.outline {
                background: transparent;
                color: #4b5c09;
                border-color: #4b5c09;
            }

            .user-card-btn.outline:hover {
                background: #4b5c09;
                color: white;
            }

            .user-card-btn.outline-danger {
                background: transparent;
                color: #dc3545;
                border-color: #dc3545;
            }

            .user-card-btn.outline-danger:hover {
                background: #dc3545;
                color: white;
            }

            .blocked-notice {
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                font-style: italic;
                margin: 10px 0;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
            }

            .user-card-loading {
                text-align: center;
                padding: 20px;
            }

            .user-card-loading .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #4b5c09;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .user-card-error {
                text-align: center;
                padding: 20px;
                color: #dc3545;
            }

            .login-prompt {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin: 0;
            }

            .login-prompt a {
                color: #4b5c09;
                text-decoration: none;
            }

            .login-prompt a:hover {
                text-decoration: underline;
            }

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .user-card-popup {
                    width: 90vw;
                    max-width: 320px;
                }

                .user-card-btn {
                    padding: 12px;
                    font-size: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Initialize global instance
const userCard = new UserCard();

// Global helper function for easy integration
function showUserCard(triggerElement, userId, context = {}) {
    return userCard.showCard(triggerElement, userId, context);
}

// ES6 Module Exports
export { UserCard, userCard, showUserCard };
export default userCard;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.UserCard = UserCard;
    window.userCard = userCard;
    window.showUserCard = showUserCard;
}