/**
 * Mute/Block Service Component
 * Handles muting and blocking users with duration options
 *
 * Features:
 * - Mute with duration: 24h, 7d, 30d, permanent
 * - Block (permanent until unblocked)
 * - Modal UI for mute duration selection
 * - API integration with backend endpoints
 */

import { apiCall } from '../js/api-compatibility-shim.js';

class MuteBlockService {
    constructor() {
        this.currentTarget = null;
        this.init();
    }

    init() {
        this.createMuteModal();
        this.setupEventListeners();
        this.addStyles();
    }

    createMuteModal() {
        const modalHtml = `
            <div id="muteUserModal" class="modal mute-modal" style="display: none;">
                <div class="modal-content mute-modal-content">
                    <div class="modal-header">
                        <h3>Mute User</h3>
                        <span class="close" data-mute-action="closeMuteModal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="mute-info">
                            <p>Muting <strong id="muteTargetName">@username</strong> will hide their posts from your feed.</p>
                            <p class="mute-note">They won't be notified and can still see your content.</p>
                        </div>

                        <div class="mute-duration-options">
                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="24h">
                                <span class="duration-label">
                                    <span class="duration-title">24 Hours</span>
                                    <span class="duration-desc">Take a short break</span>
                                </span>
                            </label>

                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="7d">
                                <span class="duration-label">
                                    <span class="duration-title">7 Days</span>
                                    <span class="duration-desc">A week-long pause</span>
                                </span>
                            </label>

                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="30d">
                                <span class="duration-label">
                                    <span class="duration-title">30 Days</span>
                                    <span class="duration-desc">A month without their posts</span>
                                </span>
                            </label>

                            <label class="duration-option">
                                <input type="radio" name="muteDuration" value="permanent" checked>
                                <span class="duration-label">
                                    <span class="duration-title">Until I Unmute</span>
                                    <span class="duration-desc">Mute indefinitely</span>
                                </span>
                            </label>
                        </div>

                        <div class="mute-actions">
                            <button class="btn btn-secondary" data-mute-action="closeMuteModal">Cancel</button>
                            <button class="btn btn-primary" data-mute-action="confirmMute">Mute User</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="blockConfirmModal" class="modal block-modal" style="display: none;">
                <div class="modal-content block-modal-content">
                    <div class="modal-header">
                        <h3>Block User</h3>
                        <span class="close" data-mute-action="closeBlockModal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="block-info">
                            <p>Are you sure you want to block <strong id="blockTargetName">@username</strong>?</p>
                            <div class="block-warning">
                                <strong>This will:</strong>
                                <ul>
                                    <li>Remove them from your followers/following</li>
                                    <li>Prevent them from seeing your posts</li>
                                    <li>Hide all their content from you</li>
                                    <li>Cancel any pending friend requests</li>
                                </ul>
                            </div>
                        </div>

                        <div class="block-actions">
                            <button class="btn btn-secondary" data-mute-action="closeBlockModal">Cancel</button>
                            <button class="btn btn-danger" data-mute-action="confirmBlock">Block User</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-mute-action]');
            if (!target) return;

            const action = target.dataset.muteAction;

            switch (action) {
                case 'closeMuteModal':
                    this.closeMuteModal();
                    break;
                case 'confirmMute':
                    this.confirmMute();
                    break;
                case 'closeBlockModal':
                    this.closeBlockModal();
                    break;
                case 'confirmBlock':
                    this.confirmBlock();
                    break;
                case 'muteUser':
                    const muteUserId = target.dataset.userId;
                    const muteUsername = target.dataset.username;
                    if (muteUserId) {
                        this.showMuteModal(muteUserId, muteUsername);
                    }
                    break;
                case 'blockUser':
                    const blockUserId = target.dataset.userId;
                    const blockUsername = target.dataset.username;
                    if (blockUserId) {
                        this.showBlockModal(blockUserId, blockUsername);
                    }
                    break;
                case 'unmuteUser':
                    const unmuteUserId = target.dataset.userId;
                    if (unmuteUserId) {
                        this.unmuteUser(unmuteUserId);
                    }
                    break;
                case 'unblockUser':
                    const unblockUserId = target.dataset.userId;
                    if (unblockUserId) {
                        this.unblockUser(unblockUserId);
                    }
                    break;
            }
        });

        // Close modals on click outside
        document.getElementById('muteUserModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'muteUserModal') {
                this.closeMuteModal();
            }
        });

        document.getElementById('blockConfirmModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'blockConfirmModal') {
                this.closeBlockModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMuteModal();
                this.closeBlockModal();
            }
        });
    }

    addStyles() {
        const styles = `
            <style id="mute-block-styles">
            .mute-modal .modal-content,
            .block-modal .modal-content {
                max-width: 450px;
                width: 90%;
                border-radius: 12px;
            }

            .mute-modal .modal-header,
            .block-modal .modal-header {
                padding: 1.25rem 1.5rem;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .mute-modal .modal-header h3,
            .block-modal .modal-header h3 {
                margin: 0;
                font-size: 1.25rem;
                color: #333;
            }

            .mute-modal .modal-body,
            .block-modal .modal-body {
                padding: 1.5rem;
            }

            .mute-info, .block-info {
                margin-bottom: 1.5rem;
            }

            .mute-info p, .block-info p {
                margin: 0 0 0.5rem 0;
                color: #333;
            }

            .mute-note {
                font-size: 0.875rem;
                color: #666;
            }

            .mute-duration-options {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                margin-bottom: 1.5rem;
            }

            .duration-option {
                display: flex;
                align-items: center;
                padding: 0.75rem 1rem;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .duration-option:hover {
                border-color: #4b5c09;
                background: #f9f9f6;
            }

            .duration-option input[type="radio"] {
                margin-right: 1rem;
                width: 18px;
                height: 18px;
                accent-color: #4b5c09;
            }

            .duration-option input[type="radio"]:checked + .duration-label {
                color: #4b5c09;
            }

            .duration-option:has(input:checked) {
                border-color: #4b5c09;
                background: #f0ede5;
            }

            .duration-label {
                display: flex;
                flex-direction: column;
            }

            .duration-title {
                font-weight: 600;
                color: #333;
            }

            .duration-desc {
                font-size: 0.8rem;
                color: #666;
            }

            .mute-actions, .block-actions {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }

            .block-warning {
                background: #fff3e0;
                border: 1px solid #ff9800;
                border-radius: 8px;
                padding: 1rem;
                margin-top: 1rem;
            }

            .block-warning strong {
                color: #e65100;
                display: block;
                margin-bottom: 0.5rem;
            }

            .block-warning ul {
                margin: 0;
                padding-left: 1.25rem;
                color: #666;
            }

            .block-warning li {
                margin-bottom: 0.25rem;
            }

            .btn-danger {
                background: #dc3545;
                color: white;
                border: none;
            }

            .btn-danger:hover {
                background: #c82333;
            }

            /* Menu option styles for post dropdown integration */
            .menu-option.mute-option .option-icon,
            .menu-option.block-option .option-icon {
                font-size: 1.25rem;
            }

            .menu-option.block-option.danger {
                color: #dc3545;
            }

            .menu-option.block-option.danger:hover {
                background: #fff5f5;
            }
            </style>
        `;

        if (!document.getElementById('mute-block-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }

    /**
     * Show mute modal with duration options
     */
    showMuteModal(userId, username) {
        this.currentTarget = { userId, username };

        const modal = document.getElementById('muteUserModal');
        const targetName = document.getElementById('muteTargetName');

        if (targetName) {
            targetName.textContent = username ? `@${username}` : 'this user';
        }

        // Reset to default selection
        const defaultRadio = modal?.querySelector('input[value="permanent"]');
        if (defaultRadio) {
            defaultRadio.checked = true;
        }

        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeMuteModal() {
        const modal = document.getElementById('muteUserModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Show block confirmation modal
     */
    showBlockModal(userId, username) {
        this.currentTarget = { userId, username };

        const modal = document.getElementById('blockConfirmModal');
        const targetName = document.getElementById('blockTargetName');

        if (targetName) {
            targetName.textContent = username ? `@${username}` : 'this user';
        }

        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeBlockModal() {
        const modal = document.getElementById('blockConfirmModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    /**
     * Confirm and execute mute action
     */
    async confirmMute() {
        if (!this.currentTarget?.userId) {
            console.error('No user selected for muting');
            return;
        }

        const selectedDuration = document.querySelector('input[name="muteDuration"]:checked')?.value;

        try {
            const confirmBtn = document.querySelector('[data-mute-action="confirmMute"]');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Muting...';
            }

            const response = await apiCall(`/relationships/mute/${this.currentTarget.userId}`, {
                method: 'POST',
                body: JSON.stringify({
                    duration: selectedDuration === 'permanent' ? null : selectedDuration
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok || response.success) {
                this.closeMuteModal();
                this.showToast(`@${this.currentTarget.username || 'User'} has been muted`);

                // Dispatch event for other components to react
                document.dispatchEvent(new CustomEvent('userMuted', {
                    detail: { userId: this.currentTarget.userId, username: this.currentTarget.username }
                }));
            } else {
                throw new Error(response.error || 'Failed to mute user');
            }
        } catch (error) {
            console.error('Error muting user:', error);
            this.showToast('Failed to mute user. Please try again.', 'error');
        } finally {
            const confirmBtn = document.querySelector('[data-mute-action="confirmMute"]');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Mute User';
            }
        }
    }

    /**
     * Confirm and execute block action
     */
    async confirmBlock() {
        if (!this.currentTarget?.userId) {
            console.error('No user selected for blocking');
            return;
        }

        try {
            const confirmBtn = document.querySelector('[data-mute-action="confirmBlock"]');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Blocking...';
            }

            const response = await apiCall(`/relationships/block/${this.currentTarget.userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok || response.success) {
                this.closeBlockModal();
                this.showToast(`@${this.currentTarget.username || 'User'} has been blocked`);

                // Dispatch event for other components to react
                document.dispatchEvent(new CustomEvent('userBlocked', {
                    detail: { userId: this.currentTarget.userId, username: this.currentTarget.username }
                }));
            } else {
                throw new Error(response.error || 'Failed to block user');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            this.showToast('Failed to block user. Please try again.', 'error');
        } finally {
            const confirmBtn = document.querySelector('[data-mute-action="confirmBlock"]');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Block User';
            }
        }
    }

    /**
     * Unmute a user
     */
    async unmuteUser(userId) {
        try {
            const response = await apiCall(`/relationships/mute/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok || response.success) {
                this.showToast('User has been unmuted');
                document.dispatchEvent(new CustomEvent('userUnmuted', { detail: { userId } }));
            } else {
                throw new Error(response.error || 'Failed to unmute user');
            }
        } catch (error) {
            console.error('Error unmuting user:', error);
            this.showToast('Failed to unmute user. Please try again.', 'error');
        }
    }

    /**
     * Unblock a user
     */
    async unblockUser(userId) {
        try {
            const response = await apiCall(`/relationships/block/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok || response.success) {
                this.showToast('User has been unblocked');
                document.dispatchEvent(new CustomEvent('userUnblocked', { detail: { userId } }));
            } else {
                throw new Error(response.error || 'Failed to unblock user');
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            this.showToast('Failed to unblock user. Please try again.', 'error');
        }
    }

    /**
     * Check if a user is muted
     */
    async isMuted(userId) {
        try {
            const response = await apiCall(`/relationships/mute-status/${userId}`, {
                method: 'GET'
            });
            return response?.data?.isMuted || response?.isMuted || false;
        } catch (error) {
            console.error('Error checking mute status:', error);
            return false;
        }
    }

    /**
     * Check if a user is blocked
     */
    async isBlocked(userId) {
        try {
            const response = await apiCall(`/relationships/block-status/${userId}`, {
                method: 'GET'
            });
            return response?.data?.isBlocked || response?.isBlocked || false;
        } catch (error) {
            console.error('Error checking block status:', error);
            return false;
        }
    }

    /**
     * Get list of muted users
     */
    async getMutedUsers() {
        try {
            const response = await apiCall('/relationships/muted', {
                method: 'GET'
            });
            return response?.data?.users || response?.users || [];
        } catch (error) {
            console.error('Error fetching muted users:', error);
            return [];
        }
    }

    /**
     * Get list of blocked users
     */
    async getBlockedUsers() {
        try {
            const response = await apiCall('/relationships/blocked', {
                method: 'GET'
            });
            return response?.data?.users || response?.users || [];
        } catch (error) {
            console.error('Error fetching blocked users:', error);
            return [];
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }

        // Fallback toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#dc3545' : '#4b5c09'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Render mute/block menu options HTML for post dropdown
     * Call this from PostComponent to add options to post menu
     */
    renderMenuOptions(userId, username, isOwnPost = false) {
        if (isOwnPost) return ''; // Don't show mute/block for own posts

        return `
            <hr class="menu-divider">
            <button class="menu-option mute-option" data-mute-action="muteUser" data-user-id="${userId}" data-username="${username}">
                <span class="option-icon">🔇</span>
                <div class="option-text">
                    <span class="option-title">Mute @${username}</span>
                    <span class="option-desc">Hide their posts from your feed</span>
                </div>
            </button>
            <button class="menu-option block-option danger" data-mute-action="blockUser" data-user-id="${userId}" data-username="${username}">
                <span class="option-icon">🚫</span>
                <div class="option-text">
                    <span class="option-title">Block @${username}</span>
                    <span class="option-desc">Prevent all interaction</span>
                </div>
            </button>
        `;
    }
}

// Initialize when DOM is ready
function initializeMuteBlockService() {
    if (document.body) {
        window.muteBlockService = new MuteBlockService();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            window.muteBlockService = new MuteBlockService();
        });
    }
}

initializeMuteBlockService();

// ES6 Module Exports
export { MuteBlockService, initializeMuteBlockService };
export default MuteBlockService;
