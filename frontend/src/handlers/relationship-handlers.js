/**
 * Relationship Handlers Module - Phase 7 of ES6 Modularization
 * Extracted from index.html lines 4665-7350+
 * Handles friend relationships, following, and social connections
 *
 * Functions Extracted:
 * - toggleFollow(), followUser(), unfollowUser() [lines 4665-4720]
 * - addFriend() [line 5442]
 * - showFriendRequestsPanel(), displayFriendRequestsPanel() [lines 6762-6840]
 * - handleFriendRequestAction() [lines 6843-6865]
 * - createFriendStatusBadge(), addFriendStatusToPost() [lines 6873-6950]
 * - displayPostsWithFriendStatus() [lines 6978-7090]
 * - showFriendsList(), displayFriendsForMessaging() [lines 7109-7350]
 */

import { apiCall } from '../js/api-compatibility-shim.js';

export class RelationshipHandlers {
    constructor() {
        this.setupEventListeners();
        this.initializeFriendUtils();
    }

    /**
     * Initialize friend utilities for backward compatibility
     */
    initializeFriendUtils() {
        // Ensure FriendUtils is available globally
        if (typeof window !== 'undefined' && !window.FriendUtils) {
            window.FriendUtils = {
                acceptFriendRequest: (userId) => this.acceptFriendRequest(userId),
                rejectFriendRequest: (userId) => this.rejectFriendRequest(userId),
                sendFriendRequest: (userId) => this.sendFriendRequest(userId)
            };
        }
    }

    /**
     * Setup event listeners for relationship interactions
     */
    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const target = event.target;

            // Handle follow/unfollow buttons
            if (target.hasAttribute('data-follow-toggle')) {
                event.preventDefault();
                const userId = target.getAttribute('data-follow-toggle');
                this.toggleFollow(userId, target);
                return;
            }

            // Handle friend request actions
            if (target.hasAttribute('data-friend-action')) {
                event.preventDefault();
                const userId = target.getAttribute('data-user-id');
                const action = target.getAttribute('data-friend-action');
                this.handleFriendRequestAction(userId, action);
                return;
            }

            // Handle friend list actions
            if (target.hasAttribute('data-friends-action')) {
                event.preventDefault();
                const action = target.getAttribute('data-friends-action');
                if (action === 'show-requests') {
                    this.showFriendRequestsPanel();
                } else if (action === 'show-list') {
                    this.showFriendsList();
                }
                return;
            }
        });
    }

    /**
     * Toggle follow status for a user
     * Extracted from index.html line 4665
     */
    async toggleFollow(userId, buttonElement) {
        const isCurrentlyFollowing = buttonElement.dataset.following === 'true';

        if (isCurrentlyFollowing) {
            await this.unfollowUser(userId, buttonElement);
        } else {
            await this.followUser(userId, buttonElement);
        }
    }

    /**
     * Follow a user
     * Extracted from index.html line 4676
     */
    async followUser(userId, buttonElement) {
        try {
            const response = await apiCall(`/users/follow/${userId}`, {
                method: 'POST'
            });

            if (response.ok) {
                // Update button to show Following state
                if (buttonElement) {
                    buttonElement.textContent = 'Following';
                    buttonElement.style.background = '#666';
                    buttonElement.dataset.following = 'true';
                }
                // Refresh current view if it's profile or user search
                if (window.loadUserProfile) {
                    window.loadUserProfile();
                }
            } else {
                alert(response.data?.error || 'Failed to follow user');
            }
        } catch (error) {
            console.error('Failed to follow user:', error);
            alert('Error following user');
        }
    }

    /**
     * Unfollow a user
     * Extracted from index.html line 4700
     */
    async unfollowUser(userId, buttonElement) {
        try {
            const response = await apiCall(`/users/follow/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Update button back to Follow state
                if (buttonElement) {
                    buttonElement.textContent = 'Follow';
                    buttonElement.style.background = '#4b5c09';
                    buttonElement.dataset.following = 'false';
                }
                // Refresh current view
                if (window.loadUserProfile) {
                    window.loadUserProfile();
                }
            } else {
                alert(response.data?.error || 'Failed to unfollow user');
            }
        } catch (error) {
            console.error('Failed to unfollow user:', error);
            alert('Error unfollowing user');
        }
    }

    /**
     * Add friend (placeholder implementation)
     * Extracted from index.html line 5442
     */
    async addFriend(userId) {
        console.log('Adding friend:', userId);
        try {
            const response = await apiCall('/relationships/friend-request', {
                method: 'POST',
                data: { targetUserId: userId }
            });

            if (response.ok) {
                alert('Friend request sent!');
                // Refresh friend status if applicable
                this.refreshFriendStatus(userId);
            } else {
                alert(response.data?.error || 'Failed to send friend request');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            alert('Error sending friend request');
        }
    }

    /**
     * Show friend requests panel
     * Extracted from index.html line 6762
     */
    async showFriendRequestsPanel() {
        try {
            const response = await apiCall('/relationships/friend-requests/pending', {
                method: 'GET'
            });

            if (response.ok) {
                const requests = response.data.requests || [];
                this.displayFriendRequestsPanel(requests);
            } else {
                this.showToast('Failed to load friend requests');
            }
        } catch (error) {
            console.error('Error loading friend requests:', error);
            this.showToast('Error loading friend requests');
        }
    }

    /**
     * Display friend requests panel
     * Extracted from index.html line 6781
     */
    displayFriendRequestsPanel(requests) {
        const mainContent = document.getElementById('mainContent');
        if (!mainContent) return;

        let html = `
            <div class="friend-requests-panel" style="padding: 2rem; max-width: 600px; margin: 0 auto;">
                <div style="display: flex; align-items: center; margin-bottom: 2rem;">
                    <h2 style="margin: 0; flex: 1;">Friend Requests</h2>
                    <button data-nav-action="default-view" style="background: #666; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Back to Feed
                    </button>
                </div>
        `;

        if (requests.length === 0) {
            html += `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                    <h3>No Friend Requests</h3>
                    <p>You don't have any pending friend requests at the moment.</p>
                </div>
            `;
        } else {
            html += '<div class="friend-requests-list">';

            requests.forEach(request => {
                const user = request.user1Id === window.currentUser?.id ? request.user2 : request.user1;
                html += `
                    <div class="friend-request-item" style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem;">
                        <div class="user-avatar" style="width: 60px; height: 60px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold;">
                            ${user.firstName ? user.firstName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 1.1rem;">${user.firstName} ${user.lastName}</div>
                            <div style="color: #666; font-size: 0.9rem;">@${user.username}</div>
                            <div style="color: #999; font-size: 0.8rem; margin-top: 0.25rem;">
                                Sent ${this.getTimeAgo(new Date(request.createdAt))}
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button data-friend-action="accept" data-user-id="${user.id}" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                                Accept
                            </button>
                            <button data-friend-action="reject" data-user-id="${user.id}" style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                                Decline
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';
        mainContent.innerHTML = html;
    }

    /**
     * Handle friend request actions (accept/reject)
     * Extracted from index.html line 6843
     */
    async handleFriendRequestAction(userId, action) {
        // Find the button that was clicked and add loading state
        const button = document.querySelector(`[data-friend-action="${action}"][data-user-id="${userId}"]`);
        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = action === 'accept' ? 'Accepting...' : 'Declining...';
            button.style.opacity = '0.7';
        }

        try {
            let result;
            if (action === 'accept') {
                result = await this.acceptFriendRequest(userId);
            } else if (action === 'reject') {
                result = await this.rejectFriendRequest(userId);
            }

            if (result && result.success) {
                // Animate the request item removal
                const requestItem = button?.closest('.friend-request-item');
                if (requestItem) {
                    requestItem.style.transition = 'opacity 0.3s, transform 0.3s';
                    requestItem.style.opacity = '0';
                    requestItem.style.transform = 'translateX(100%)';
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Show success feedback
                this.showToast(action === 'accept' ? 'Friend request accepted' : 'Friend request declined');

                // Refresh the friend requests panel
                this.showFriendRequestsPanel();

                // Also refresh notifications to clear the friend request notification
                if (window.initializeNotifications) {
                    window.initializeNotifications();
                }
            }
        } catch (error) {
            console.error(`Error ${action}ing friend request:`, error);
            this.showToast(`Failed to ${action} friend request`);
            // Restore button state on error
            if (button) {
                button.disabled = false;
                button.textContent = button.dataset.originalText || (action === 'accept' ? 'Accept' : 'Decline');
                button.style.opacity = '1';
            }
        }
    }

    /**
     * Accept friend request
     */
    async acceptFriendRequest(userId) {
        try {
            const response = await apiCall(`/relationships/friend-request/${userId}/accept`, {
                method: 'POST'
            });
            return response.data;
        } catch (error) {
            console.error('Error accepting friend request:', error);
            throw error;
        }
    }

    /**
     * Reject friend request
     */
    async rejectFriendRequest(userId) {
        try {
            const response = await apiCall(`/relationships/friend-request/${userId}/reject`, {
                method: 'POST'
            });
            return response.data;
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            throw error;
        }
    }

    /**
     * Send friend request
     */
    async sendFriendRequest(userId) {
        try {
            const response = await apiCall('/relationships/friend-request', {
                method: 'POST',
                data: { targetUserId: userId }
            });
            return response.data;
        } catch (error) {
            console.error('Error sending friend request:', error);
            throw error;
        }
    }

    /**
     * Create friend status badge
     * Extracted from index.html line 6873
     */
    createFriendStatusBadge(userId, status, size = 'small') {
        if (!userId || userId === window.currentUser?.id) return '';

        const badgeStyles = {
            small: 'font-size: 0.7rem; padding: 0.15rem 0.4rem; margin-left: 0.25rem;',
            medium: 'font-size: 0.8rem; padding: 0.25rem 0.5rem; margin-left: 0.5rem;',
            large: 'font-size: 0.9rem; padding: 0.35rem 0.6rem; margin-left: 0.5rem;'
        };

        const statusConfig = {
            friends: {
                icon: '👥',
                text: 'Friend',
                color: '#4b5c09',
                bgColor: '#f0f8e0'
            },
            request_sent: {
                icon: '📤',
                text: 'Request Sent',
                color: '#ff8c00',
                bgColor: '#fff5e6'
            },
            request_received: {
                icon: '📥',
                text: 'Request Received',
                color: '#1976d2',
                bgColor: '#e3f2fd'
            },
            following: {
                icon: '👁️',
                text: 'Following',
                color: '#6c757d',
                bgColor: '#f8f9fa'
            }
        };

        const config = statusConfig[status];
        if (!config) return '';

        return `
            <span class="friend-status-badge" style="
                display: inline-flex;
                align-items: center;
                gap: 0.2rem;
                background: ${config.bgColor};
                color: ${config.color};
                border: 1px solid ${config.color}30;
                border-radius: 12px;
                ${badgeStyles[size]}
                font-weight: 500;
                white-space: nowrap;
            ">
                <span>${config.icon}</span>
                <span>${config.text}</span>
            </span>
        `;
    }

    /**
     * Add friend status to post
     * Extracted from index.html line 6944
     */
    addFriendStatusToPost(postElement, authorId) {
        if (!postElement || !authorId || authorId === window.currentUser?.id) return;

        const authorNameElement = postElement.querySelector('.post-author');
        if (authorNameElement && !authorNameElement.querySelector('.friend-status-badge')) {
            // Get friend status from data attribute or make API call
            const friendStatus = this.getFriendStatus(authorId);
            if (friendStatus) {
                const badge = this.createFriendStatusBadge(authorId, friendStatus, 'small');
                authorNameElement.insertAdjacentHTML('beforeend', badge);
            }
        }
    }

    /**
     * Show friends list for messaging
     * Extracted from index.html line 7109
     */
    async showFriendsList() {
        try {
            if (!window.currentUser?.id) {
                this.showToast('Please log in to view friends');
                return;
            }

            const response = await apiCall(`/relationships/${window.currentUser.id}/friends`, {
                method: 'GET'
            });

            if (response.ok) {
                const friends = response.data?.friends || [];
                this.displayFriendsForMessaging(friends);
            } else {
                this.showToast('Failed to load friends list');
            }
        } catch (error) {
            console.error('Error loading friends list:', error);
            this.showToast('Error loading friends list');
        }
    }

    /**
     * Show followers list for a user
     * Extracted from index.html line 4724
     */
    async showFollowersList(userId) {
        try {
            const response = await apiCall(`/users/${userId}/followers`);

            if (response.ok) {
                this.displayUsersList(response.data.followers, 'Followers');
            } else {
                alert('Failed to load followers');
            }
        } catch (error) {
            console.error('Failed to load followers:', error);
            alert('Error loading followers');
        }
    }

    /**
     * Show following list for a user
     * Extracted from index.html line 4739
     */
    async showFollowingList(userId) {
        try {
            const response = await apiCall(`/users/${userId}/following`);

            if (response.ok) {
                this.displayUsersList(response.data.following, 'Following');
            } else {
                alert('Failed to load following list');
            }
        } catch (error) {
            console.error('Failed to load following list:', error);
            alert('Error loading following list');
        }
    }

    /**
     * Display users list in modal
     * Extracted from index.html line 4754
     */
    displayUsersList(users, title) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1vh; padding: 1vh; min-height: 2vh;">
                    <h3 style="margin: 0;">${title}</h3>
                    <button data-modal-close-custom style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div>
                    ${users.length === 0 ?
                        `<p style="text-align: center; color: #666; padding: 2rem;">No ${title.toLowerCase()} yet</p>` :
                        users.map(user => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #eee;">
                                <div style="display: flex; align-items: center;">
                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; font-weight: bold;">
                                        ${user.firstName ? user.firstName.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div style="font-weight: 500;">${user.firstName} ${user.lastName}</div>
                                        <div style="color: #666; font-size: 0.9rem;">@${user.username}</div>
                                    </div>
                                </div>
                                <button data-profile-view="${user.id}" style="background: #4b5c09; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                                    View Profile
                                </button>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;

        // Add event delegation for modal interactions
        modal.addEventListener('click', (event) => {
            const target = event.target;

            // Close modal on background click or close button
            if (target === modal || target.hasAttribute('data-modal-close-custom')) {
                modal.remove();
                return;
            }

            // Handle profile view buttons
            if (target.hasAttribute('data-profile-view')) {
                const userId = target.getAttribute('data-profile-view');
                if (window.showProfile) {
                    window.showProfile(userId);
                }
                modal.remove();
                return;
            }
        });

        document.body.appendChild(modal);
    }

    /**
     * Display friends panel with search functionality
     * Redesigned to support direct friend access and user search
     * @param {Array} friends - List of friend objects
     */
    displayFriendsForMessaging(friends) {
        const messagesBody = document.getElementById('messagesBody');
        if (!messagesBody) return;

        let html = `
            <div style="padding: 1rem; border-bottom: 1px solid #eee; background: #f9f9f9;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">👥 Friends</h3>
                    <button data-friends-panel-action="show-conversations" style="background: #1976d2; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                        💬 Conversations
                    </button>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="friendSearchInput" placeholder="Search username to add friend..."
                           style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; outline: none;">
                    <button data-friends-panel-action="search-user" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                        Search
                    </button>
                </div>
                <div id="friendSearchResults" style="margin-top: 0.5rem;"></div>
            </div>
        `;

        html += `<div style="padding: 0.5rem 1rem; background: #f5f5f5; color: #666; font-size: 0.85rem; border-bottom: 1px solid #eee;">
            ${friends.length} friend${friends.length !== 1 ? 's' : ''}
        </div>`;

        if (friends.length === 0) {
            html += `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">👥</div>
                    <h4>No Friends Yet</h4>
                    <p>Search for users above to send friend requests!</p>
                </div>
            `;
        } else {
            html += '<div class="friends-list">';
            friends.forEach(friend => {
                html += `
                    <div class="friend-item" data-conversation-start="${friend.id}" data-username="${friend.username}" style="padding: 1rem; border-bottom: 1px solid #eee; cursor: pointer; display: flex; align-items: center; gap: 1rem; transition: background-color 0.2s;" data-hover-effect="list-item">
                        <div class="friend-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${friend.firstName ? friend.firstName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${friend.firstName || ''} ${friend.lastName || ''}</div>
                            <div style="color: #666; font-size: 0.9rem;">@${friend.username}</div>
                        </div>
                        <div style="color: #4b5c09; font-size: 1.2rem;" title="Message">💬</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        messagesBody.innerHTML = html;
        this.setupFriendsPanelEventListeners(messagesBody);
    }

    /**
     * Setup event listeners for the friends panel
     * @param {HTMLElement} container - The messages body container
     */
    setupFriendsPanelEventListeners(container) {
        // Remove old listeners by cloning
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);

        // Add event delegation
        newContainer.addEventListener('click', async (event) => {
            const target = event.target;

            // Handle conversation start (clicking on friend)
            const friendItem = target.closest('[data-conversation-start]');
            if (friendItem && !target.closest('[data-friends-panel-action]')) {
                const friendId = friendItem.getAttribute('data-conversation-start');
                const friendUsername = friendItem.getAttribute('data-username');
                if (window.startConversationWithUser) {
                    window.startConversationWithUser(friendId, friendUsername);
                }
                return;
            }

            // Handle panel actions
            const actionEl = target.closest('[data-friends-panel-action]');
            if (actionEl) {
                const action = actionEl.getAttribute('data-friends-panel-action');

                if (action === 'show-conversations') {
                    if (window.loadConversations) {
                        window.loadConversations();
                    }
                    return;
                }

                if (action === 'search-user') {
                    const input = newContainer.querySelector('#friendSearchInput');
                    if (input && input.value.trim()) {
                        await this.searchUserByName(input.value.trim());
                    }
                    return;
                }

                if (action === 'send-friend-request') {
                    const userId = actionEl.getAttribute('data-user-id');
                    if (userId) {
                        await this.sendFriendRequest(userId);
                        this.showToast('Friend request sent!');
                        // Clear search results
                        const resultsEl = newContainer.querySelector('#friendSearchResults');
                        if (resultsEl) resultsEl.innerHTML = '';
                    }
                    return;
                }
            }
        });

        // Handle Enter key in search input
        const searchInput = newContainer.querySelector('#friendSearchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', async (event) => {
                if (event.key === 'Enter' && searchInput.value.trim()) {
                    await this.searchUserByName(searchInput.value.trim());
                }
            });
        }
    }

    /**
     * Search for users by username
     * @param {string} query - The search query
     */
    async searchUserByName(query) {
        const resultsEl = document.querySelector('#friendSearchResults');
        if (!resultsEl) return;

        resultsEl.innerHTML = '<div style="color: #666; font-size: 0.9rem; padding: 0.5rem 0;">Searching...</div>';

        try {
            const response = await apiCall(`/search/unified?query=${encodeURIComponent(query)}&types=users&limit=5`);

            if (response.ok && response.data?.users?.length > 0) {
                const users = response.data.users.filter(u => u.id !== window.currentUser?.id);

                if (users.length === 0) {
                    resultsEl.innerHTML = '<div style="color: #666; font-size: 0.9rem; padding: 0.5rem 0;">No users found</div>';
                    return;
                }

                let html = '';
                users.forEach(user => {
                    html += `
                        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: white; border: 1px solid #eee; border-radius: 4px; margin-bottom: 0.5rem;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #4b5c09; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                                ${user.firstName ? user.firstName.charAt(0).toUpperCase() : user.username?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 500; font-size: 0.9rem;">${user.firstName || ''} ${user.lastName || ''}</div>
                                <div style="color: #666; font-size: 0.8rem;">@${user.username}</div>
                            </div>
                            <button data-friends-panel-action="send-friend-request" data-user-id="${user.id}"
                                    style="background: #4b5c09; color: white; border: none; padding: 0.35rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; white-space: nowrap;">
                                + Add
                            </button>
                        </div>
                    `;
                });
                resultsEl.innerHTML = html;
            } else {
                resultsEl.innerHTML = '<div style="color: #666; font-size: 0.9rem; padding: 0.5rem 0;">No users found</div>';
            }
        } catch (error) {
            console.error('Error searching users:', error);
            resultsEl.innerHTML = '<div style="color: #dc3545; font-size: 0.9rem; padding: 0.5rem 0;">Search failed</div>';
        }
    }

    /**
     * Get friend status for a user (helper method)
     */
    getFriendStatus(userId) {
        // This would typically fetch from cache or make API call
        // For now, return null to avoid unnecessary API calls
        return null;
    }

    /**
     * Refresh friend status for a user
     */
    refreshFriendStatus(userId) {
        // Placeholder for refreshing friend status after changes
        console.log('Refreshing friend status for user:', userId);
    }

    /**
     * Helper function to show toast messages
     */
    showToast(message) {
        if (window.showToast) {
            window.showToast(message);
        } else {
            alert(message); // Fallback
        }
    }

    /**
     * Helper function to get time ago string
     */
    getTimeAgo(date) {
        if (!date) return '';

        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }
}

// Create global instance
const relationshipHandlers = new RelationshipHandlers();

// Export functions for backward compatibility
export const toggleFollow = (userId, buttonElement) => relationshipHandlers.toggleFollow(userId, buttonElement);
export const followUser = (userId, buttonElement) => relationshipHandlers.followUser(userId, buttonElement);
export const unfollowUser = (userId, buttonElement) => relationshipHandlers.unfollowUser(userId, buttonElement);
export const addFriend = (userId) => relationshipHandlers.addFriend(userId);
export const showFriendRequestsPanel = () => relationshipHandlers.showFriendRequestsPanel();
export const displayFriendRequestsPanel = (requests) => relationshipHandlers.displayFriendRequestsPanel(requests);
export const handleFriendRequestAction = (userId, action) => relationshipHandlers.handleFriendRequestAction(userId, action);
export const createFriendStatusBadge = (userId, status, size) => relationshipHandlers.createFriendStatusBadge(userId, status, size);
export const addFriendStatusToPost = (postElement, authorId) => relationshipHandlers.addFriendStatusToPost(postElement, authorId);
export const showFriendsList = () => relationshipHandlers.showFriendsList();
export const displayFriendsForMessaging = (friends) => relationshipHandlers.displayFriendsForMessaging(friends);

// Hover effects event delegation for relationship handlers
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-hover-effect="list-item"]');
    if (target) target.style.backgroundColor = '#f8f9fa';
});

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-hover-effect="list-item"]');
    if (target) target.style.backgroundColor = 'white';
});

// Make functions globally available for backward compatibility
if (typeof window !== 'undefined') {
    window.toggleFollow = toggleFollow;
    window.followUser = followUser;
    window.unfollowUser = unfollowUser;
    window.addFriend = addFriend;
    window.showFriendRequestsPanel = showFriendRequestsPanel;
    window.displayFriendRequestsPanel = displayFriendRequestsPanel;
    window.handleFriendRequestAction = handleFriendRequestAction;
    window.createFriendStatusBadge = createFriendStatusBadge;
    window.addFriendStatusToPost = addFriendStatusToPost;
    window.showFriendsList = showFriendsList;
    window.displayFriendsForMessaging = displayFriendsForMessaging;
    window.relationshipHandlers = relationshipHandlers;
}