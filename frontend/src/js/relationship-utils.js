/**
 * Relationship Utilities
 *
 * Reusable client-side functions for managing follows and friendships
 * Can be used across different UI contexts: user profiles, post headers, user lists, etc.
 */

import { getApiBaseUrl } from '../utils/environment.js';

// API base URL helper
function getApiBase() {
    // Use centralized environment detection
    return getApiBaseUrl();
}

// Get auth token - legacy function for backwards compatibility
// NOTE: Authentication now handled by httpOnly cookies via apiCall()
function getAuthToken() {
    // This function is deprecated but kept for legacy compatibility
    // New code should use apiCall() which handles cookie authentication
    return null; // Force use of cookie-based auth
}

/**
 * FOLLOW SYSTEM - Reusable Functions
 */

class FollowUtils {
    /**
     * Follow a user
     * @param {string} userId - ID of user to follow
     * @param {Function} onSuccess - Callback on success (userId, isFollowing) 
     * @param {Function} onError - Callback on error (error)
     */
    static async followUser(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/users/follow/${userId}`, {
                method: 'POST'
            });

            if (response.ok) {
                // Update UI state
                this.updateFollowUI(userId, true);

                // Show success notification
                this.showNotification('Successfully followed user', 'success');

                if (onSuccess) onSuccess(userId, true);
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to follow user');
            }

        } catch (error) {
            console.error('Follow user error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unfollow a user
     * @param {string} userId - ID of user to unfollow
     * @param {Function} onSuccess - Callback on success (userId, isFollowing)
     * @param {Function} onError - Callback on error (error)
     */
    static async unfollowUser(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/users/follow/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Update UI state
                this.updateFollowUI(userId, false);

                // Show success notification
                this.showNotification('Successfully unfollowed user', 'success');

                if (onSuccess) onSuccess(userId, false);
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to unfollow user');
            }

        } catch (error) {
            console.error('Unfollow user error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Toggle follow status (follow if not following, unfollow if following)
     * @param {string} userId - ID of user
     * @param {boolean} currentlyFollowing - Current follow status
     * @param {Function} onSuccess - Callback on success (userId, newFollowStatus)
     * @param {Function} onError - Callback on error (error)
     */
    static async toggleFollow(userId, currentlyFollowing, onSuccess = null, onError = null) {
        if (currentlyFollowing) {
            return await this.unfollowUser(userId, onSuccess, onError);
        } else {
            return await this.followUser(userId, onSuccess, onError);
        }
    }

    /**
     * Get follow status between current user and target user
     * @param {string} userId - ID of target user
     */
    static async getFollowStatus(userId) {
        try {
            const response = await apiCall(`/users/follow-status/${userId}`);

            if (response.ok) {
                return response.data;
            } else {
                return { isFollowing: false };
            }

        } catch (error) {
            console.error('Get follow status error:', error);
            return { isFollowing: false };
        }
    }

    /**
     * Update all follow buttons in the UI for a specific user
     * @param {string} userId - User ID
     * @param {boolean} isFollowing - New follow status
     */
    static updateFollowUI(userId, isFollowing) {
        // Update all follow buttons for this user across the page
        const followButtons = document.querySelectorAll(`[data-follow-user="${userId}"]`);
        
        followButtons.forEach(button => {
            button.setAttribute('data-following', isFollowing.toString());
            
            if (isFollowing) {
                button.textContent = 'Following';
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
                button.title = 'Click to unfollow';
            } else {
                button.textContent = 'Follow';
                button.classList.remove('btn-secondary');
                button.classList.add('btn-primary');
                button.title = 'Click to follow';
            }
        });

        // Update follower counts if displayed
        const followerCounts = document.querySelectorAll(`[data-follower-count="${userId}"]`);
        followerCounts.forEach(element => {
            const currentCount = parseInt(element.textContent) || 0;
            const newCount = isFollowing ? currentCount + 1 : Math.max(0, currentCount - 1);
            element.textContent = newCount;
        });

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('followStatusChanged', {
            detail: { userId, isFollowing }
        }));
    }

    /**
     * Create a reusable follow button
     * @param {string} userId - User ID
     * @param {boolean} isFollowing - Current follow status
     * @param {string} size - Button size ('sm', 'md', 'lg')
     * @returns {HTMLElement} Follow button element
     */
    static createFollowButton(userId, isFollowing = false, size = 'md') {
        const button = document.createElement('button');
        
        // Set base classes
        const sizeClasses = {
            'sm': 'btn-sm',
            'md': '',
            'lg': 'btn-lg'
        };
        
        button.className = `btn ${sizeClasses[size]} ${isFollowing ? 'btn-secondary' : 'btn-primary'}`;
        button.setAttribute('data-follow-user', userId);
        button.setAttribute('data-following', isFollowing.toString());
        button.textContent = isFollowing ? 'Following' : 'Follow';
        button.title = isFollowing ? 'Click to unfollow' : 'Click to follow';
        
        // Add click handler
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentlyFollowing = button.getAttribute('data-following') === 'true';
            
            // Disable button during request
            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = 'Loading...';
            
            try {
                await this.toggleFollow(userId, currentlyFollowing);
            } finally {
                // Re-enable button
                button.disabled = false;
                // Text will be updated by updateFollowUI
            }
        });
        
        return button;
    }

    /**
     * Show notification message
     */
    static showNotification(message, type = 'info') {
        // Try to use existing notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback to simple alert
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

/**
 * FRIEND SYSTEM - Reusable Functions
 */

class FriendUtils {
    /**
     * Send friend request
     * @param {string} userId - ID of user to send request to
     * @param {Function} onSuccess - Callback on success
     * @param {Function} onError - Callback on error
     */
    static async sendFriendRequest(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/relationships/friend-request/${userId}`, {
                method: 'POST'
            });

            if (response.ok) {
                this.updateFriendUI(userId, 'request_sent');
                this.showNotification('Friend request sent successfully', 'success');

                if (onSuccess) onSuccess(userId, 'request_sent');
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to send friend request');
            }

        } catch (error) {
            console.error('Send friend request error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Accept friend request
     * @param {string} userId - ID of user who sent the request
     * @param {Function} onSuccess - Callback on success
     * @param {Function} onError - Callback on error
     */
    static async acceptFriendRequest(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/relationships/friend-request/${userId}/accept`, {
                method: 'POST'
            });

            if (response.ok) {
                this.updateFriendUI(userId, 'friends');
                this.showNotification('Friend request accepted', 'success');

                if (onSuccess) onSuccess(userId, 'friends');
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to accept friend request');
            }

        } catch (error) {
            console.error('Accept friend request error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reject friend request
     * @param {string} userId - ID of user who sent the request
     * @param {Function} onSuccess - Callback on success
     * @param {Function} onError - Callback on error
     */
    static async rejectFriendRequest(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/relationships/friend-request/${userId}/reject`, {
                method: 'POST'
            });

            if (response.ok) {
                this.updateFriendUI(userId, 'none');
                this.showNotification('Friend request rejected', 'info');

                if (onSuccess) onSuccess(userId, 'none');
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to reject friend request');
            }

        } catch (error) {
            console.error('Reject friend request error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove friend (unfriend)
     * @param {string} userId - ID of friend to remove
     * @param {Function} onSuccess - Callback on success
     * @param {Function} onError - Callback on error
     */
    static async removeFriend(userId, onSuccess = null, onError = null) {
        try {
            const confirmed = confirm('Are you sure you want to remove this friend?');
            if (!confirmed) return { success: false, cancelled: true };

            const response = await apiCall(`/relationships/friend/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.updateFriendUI(userId, 'none');
                this.showNotification('Friend removed successfully', 'info');

                if (onSuccess) onSuccess(userId, 'none');
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to remove friend');
            }

        } catch (error) {
            console.error('Remove friend error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get friend status with another user
     * @param {string} userId - ID of target user
     */
    static async getFriendStatus(userId) {
        try {
            const response = await apiCall(`/users/friend-status/${userId}`);

            if (response.ok) {
                return response.data;
            } else {
                return { isFriend: false, friendshipStatus: 'none' };
            }

        } catch (error) {
            console.error('Get friend status error:', error);
            return { isFriend: false, friendshipStatus: 'none' };
        }
    }

    /**
     * Update friend-related UI elements
     * @param {string} userId - User ID
     * @param {string} status - Friend status ('none', 'request_sent', 'request_received', 'friends')
     */
    static updateFriendUI(userId, status) {
        const friendButtons = document.querySelectorAll(`[data-friend-user="${userId}"]`);
        
        friendButtons.forEach(button => {
            button.setAttribute('data-friend-status', status);
            
            switch (status) {
                case 'none':
                    button.textContent = 'Add Friend';
                    button.className = 'btn btn-outline-primary btn-sm';
                    button.title = 'Send friend request';
                    break;
                case 'request_sent':
                    button.textContent = 'Request Sent';
                    button.className = 'btn btn-outline-secondary btn-sm';
                    button.disabled = true;
                    button.title = 'Friend request pending';
                    break;
                case 'request_received':
                    button.textContent = 'Accept Request';
                    button.className = 'btn btn-outline-success btn-sm';
                    button.title = 'Accept friend request';
                    break;
                case 'friends':
                    button.textContent = 'Friends';
                    button.className = 'btn btn-success btn-sm';
                    button.title = 'Remove friend';
                    break;
            }
        });

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('friendStatusChanged', {
            detail: { userId, status }
        }));
    }

    /**
     * Create a reusable friend button
     * @param {string} userId - User ID
     * @param {string} status - Friend status
     * @returns {HTMLElement} Friend button element
     */
    static createFriendButton(userId, status = 'none') {
        const button = document.createElement('button');
        button.setAttribute('data-friend-user', userId);
        button.setAttribute('data-friend-status', status);
        
        // Set initial state
        this.updateFriendUI(userId, status);
        
        // Add click handler
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentStatus = button.getAttribute('data-friend-status');
            
            // Disable button during request
            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = 'Loading...';
            
            try {
                switch (currentStatus) {
                    case 'none':
                        await this.sendFriendRequest(userId);
                        break;
                    case 'request_received':
                        await this.acceptFriendRequest(userId);
                        break;
                    case 'friends':
                        await this.removeFriend(userId);
                        break;
                    // request_sent is disabled, no action
                }
            } finally {
                // Re-enable button (unless it should stay disabled)
                if (button.getAttribute('data-friend-status') !== 'request_sent') {
                    button.disabled = false;
                }
            }
        });
        
        return button;
    }

    /**
     * Show notification message
     */
    static showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

/**
 * SUBSCRIPTION SYSTEM - Reusable Functions
 */

class SubscriptionUtils {
    /**
     * Subscribe to a user (high-priority follow for algorithmic boost)
     * @param {string} userId - ID of user to subscribe to
     * @param {Function} onSuccess - Callback on success (userId, isSubscribed)
     * @param {Function} onError - Callback on error (error)
     */
    static async subscribeToUser(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/relationships/subscribe/${userId}`, {
                method: 'POST'
            });

            if (response.ok) {
                // Update UI state
                this.updateSubscriptionUI(userId, true);

                // Show success notification
                this.showNotification('Successfully subscribed to user', 'success');

                if (onSuccess) onSuccess(userId, true);
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to subscribe to user');
            }

        } catch (error) {
            // Check if subscription system is not yet deployed
            if (error.message?.includes('404')) {
                this.showNotification('Subscription feature is being deployed. Please try again in a few minutes.', 'info');
            } else {
                console.error('Subscribe to user error:', error);
                this.showNotification(error.message, 'error');
            }
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Unsubscribe from a user
     * @param {string} userId - ID of user to unsubscribe from
     * @param {Function} onSuccess - Callback on success (userId, isSubscribed)
     * @param {Function} onError - Callback on error (error)
     */
    static async unsubscribeFromUser(userId, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/relationships/subscribe/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Update UI state
                this.updateSubscriptionUI(userId, false);

                // Show success notification
                this.showNotification('Successfully unsubscribed from user', 'success');

                if (onSuccess) onSuccess(userId, false);
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to unsubscribe from user');
            }

        } catch (error) {
            // Check if subscription system is not yet deployed
            if (error.message?.includes('404')) {
                this.showNotification('Subscription feature is being deployed. Please try again in a few minutes.', 'info');
            } else {
                console.error('Unsubscribe from user error:', error);
                this.showNotification(error.message, 'error');
            }
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Toggle subscription status (subscribe if not subscribed, unsubscribe if subscribed)
     * @param {string} userId - ID of user
     * @param {boolean} currentlySubscribed - Current subscription status
     * @param {Function} onSuccess - Callback on success (userId, newSubscriptionStatus)
     * @param {Function} onError - Callback on error (error)
     */
    static async toggleSubscription(userId, currentlySubscribed, onSuccess = null, onError = null) {
        if (currentlySubscribed) {
            return await this.unsubscribeFromUser(userId, onSuccess, onError);
        } else {
            return await this.subscribeToUser(userId, onSuccess, onError);
        }
    }

    /**
     * Get subscription status between current user and target user
     * @param {string} userId - ID of target user
     * @returns {Object} { isSubscribed: boolean, subscribedAt?: Date, notifyOnNewPosts: boolean }
     */
    static async getSubscriptionStatus(userId) {
        try {
            const response = await apiCall(`/relationships/subscription-status/${userId}`);

            if (response.ok) {
                return {
                    isSubscribed: response.data?.isSubscribed || false,
                    subscribedAt: response.data?.subscribedAt,
                    notifyOnNewPosts: response.data?.notifyOnNewPosts || false
                };
            } else {
                return { isSubscribed: false, notifyOnNewPosts: false };
            }

        } catch (error) {
            // Only log non-404 errors to reduce console noise during development
            if (!error.message?.includes('404')) {
                console.error('Get subscription status error:', error);
            }
            return { isSubscribed: false, notifyOnNewPosts: false };
        }
    }

    /**
     * Update notification preference for a subscription
     * @param {string} userId - ID of subscribed user
     * @param {boolean} enabled - Whether to enable notifications
     * @param {Function} onSuccess - Callback on success
     * @param {Function} onError - Callback on error
     */
    static async updateNotificationPreference(userId, enabled, onSuccess = null, onError = null) {
        try {
            const response = await apiCall(`/relationships/subscribe/${userId}/notifications`, {
                method: 'PUT',
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                // Update UI state
                this.updateNotificationToggleUI(userId, enabled);

                // Show success notification
                this.showNotification(
                    enabled ? 'You will be notified when this user posts' : 'Post notifications disabled',
                    'success'
                );

                if (onSuccess) onSuccess(userId, enabled);
                return { success: true, data: response.data };
            } else {
                throw new Error(response.data?.error || 'Failed to update notification preference');
            }

        } catch (error) {
            console.error('Update notification preference error:', error);
            this.showNotification(error.message, 'error');
            if (onError) onError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update notification toggle UI elements
     * @param {string} userId - User ID
     * @param {boolean} notifyEnabled - New notification state
     */
    static updateNotificationToggleUI(userId, notifyEnabled) {
        // Update all notification toggles for this subscription
        const toggles = document.querySelectorAll(`[data-subscription-notify="${userId}"]`);

        toggles.forEach(toggle => {
            toggle.setAttribute('data-notify-enabled', notifyEnabled.toString());

            // Update icon (bell)
            if (notifyEnabled) {
                toggle.innerHTML = '🔔';
                toggle.title = 'Notifications ON - Click to disable';
                toggle.classList.add('notify-active');
            } else {
                toggle.innerHTML = '🔕';
                toggle.title = 'Notifications OFF - Click to enable';
                toggle.classList.remove('notify-active');
            }
        });

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('subscriptionNotifyChanged', {
            detail: { userId, notifyEnabled }
        }));
    }

    /**
     * Update all subscription buttons in the UI for a specific user
     * @param {string} userId - User ID
     * @param {boolean} isSubscribed - New subscription status
     */
    static updateSubscriptionUI(userId, isSubscribed) {
        // Update all subscription buttons for this user across the page
        const subscriptionButtons = document.querySelectorAll(`[data-subscribe-user="${userId}"]`);

        subscriptionButtons.forEach(button => {
            button.setAttribute('data-subscribed', isSubscribed.toString());

            if (isSubscribed) {
                button.textContent = 'Subscribed';
                button.classList.remove('btn-outline-warning');
                button.classList.add('btn-warning');
                button.title = 'Click to unsubscribe (removes priority boost)';
            } else {
                button.textContent = 'Subscribe';
                button.classList.remove('btn-warning');
                button.classList.add('btn-outline-warning');
                button.title = 'Subscribe for priority in your feed';
            }
        });

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('subscriptionStatusChanged', {
            detail: { userId, isSubscribed }
        }));
    }

    /**
     * Create a reusable subscription button
     * @param {string} userId - User ID
     * @param {boolean} isSubscribed - Current subscription status
     * @param {string} size - Button size ('sm', 'md', 'lg')
     * @returns {HTMLElement} Subscription button element
     */
    static createSubscriptionButton(userId, isSubscribed = false, size = 'md') {
        const button = document.createElement('button');

        // Set base classes
        const sizeClasses = {
            'sm': 'btn-sm',
            'md': '',
            'lg': 'btn-lg'
        };

        button.className = `btn ${sizeClasses[size]} ${isSubscribed ? 'btn-warning' : 'btn-outline-warning'}`;
        button.setAttribute('data-subscribe-user', userId);
        button.setAttribute('data-subscribed', isSubscribed.toString());
        button.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
        button.title = isSubscribed ? 'Click to unsubscribe (removes priority boost)' : 'Subscribe for priority in your feed';

        // Add click handler
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const currentlySubscribed = button.getAttribute('data-subscribed') === 'true';

            // Disable button during request
            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = 'Loading...';

            try {
                await this.toggleSubscription(userId, currentlySubscribed);
            } finally {
                // Re-enable button
                button.disabled = false;
                // Text will be updated by updateSubscriptionUI
            }
        });

        return button;
    }

    /**
     * Create a notification toggle button for a subscription
     * @param {string} userId - User ID
     * @param {boolean} notifyEnabled - Current notification state
     * @returns {HTMLElement} Notification toggle button
     */
    static createNotificationToggle(userId, notifyEnabled = false) {
        const toggle = document.createElement('button');
        toggle.className = 'btn btn-sm subscription-notify-toggle';
        toggle.setAttribute('data-subscription-notify', userId);
        toggle.setAttribute('data-notify-enabled', notifyEnabled.toString());
        toggle.innerHTML = notifyEnabled ? '🔔' : '🔕';
        toggle.title = notifyEnabled ? 'Notifications ON - Click to disable' : 'Notifications OFF - Click to enable';

        if (notifyEnabled) {
            toggle.classList.add('notify-active');
        }

        // Style the button
        toggle.style.cssText = `
            padding: 4px 8px;
            margin-left: 4px;
            font-size: 14px;
            background: ${notifyEnabled ? '#ffc107' : '#e9ecef'};
            border: 1px solid ${notifyEnabled ? '#ffc107' : '#ced4da'};
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        `;

        // Add click handler
        toggle.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const currentlyEnabled = toggle.getAttribute('data-notify-enabled') === 'true';

            // Disable button during request
            toggle.disabled = true;
            toggle.innerHTML = '⏳';

            try {
                await this.updateNotificationPreference(userId, !currentlyEnabled);
            } finally {
                toggle.disabled = false;
                // UI will be updated by updateNotificationToggleUI
            }
        });

        return toggle;
    }

    /**
     * Create subscription button with integrated notification toggle
     * @param {string} userId - User ID
     * @param {boolean} isSubscribed - Current subscription status
     * @param {boolean} notifyEnabled - Current notification status
     * @param {string} size - Button size
     * @returns {HTMLElement} Container with subscription button and notification toggle
     */
    static createSubscriptionButtonWithNotify(userId, isSubscribed = false, notifyEnabled = false, size = 'md') {
        const container = document.createElement('div');
        container.className = 'subscription-container';
        container.style.cssText = 'display: inline-flex; align-items: center; gap: 4px;';

        // Add subscription button
        const subButton = this.createSubscriptionButton(userId, isSubscribed, size);
        container.appendChild(subButton);

        // Add notification toggle (only visible when subscribed)
        const notifyToggle = this.createNotificationToggle(userId, notifyEnabled);
        notifyToggle.style.display = isSubscribed ? 'inline-block' : 'none';
        container.appendChild(notifyToggle);

        // Listen for subscription changes to show/hide notification toggle
        window.addEventListener('subscriptionStatusChanged', (e) => {
            if (e.detail.userId === userId) {
                notifyToggle.style.display = e.detail.isSubscribed ? 'inline-block' : 'none';
            }
        });

        return container;
    }

    /**
     * Show notification message
     */
    static showNotification(message, type = 'info') {
        // Try to use existing notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback to simple alert
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

/**
 * COMBINED UTILITIES
 */

class RelationshipUtils {
    /**
     * Get combined relationship status for comprehensive UI display
     * @param {string} userId - Target user ID
     */
    static async getCombinedStatus(userId) {
        const [followStatus, friendStatus, subscriptionStatus] = await Promise.all([
            FollowUtils.getFollowStatus(userId),
            FriendUtils.getFriendStatus(userId),
            SubscriptionUtils.getSubscriptionStatus(userId)
        ]);

        return {
            follow: followStatus,
            friend: friendStatus,
            subscription: subscriptionStatus,
            canMessage: friendStatus.isFriend,
            displayPriority: friendStatus.isFriend ? 'friend' : (subscriptionStatus.isSubscribed ? 'subscribed' : (followStatus.isFollowing ? 'following' : 'none'))
        };
    }

    /**
     * Create a combined relationship button container
     * @param {string} userId - User ID
     * @param {Object} status - Combined status object
     * @returns {HTMLElement} Container with relationship buttons
     */
    static createRelationshipButtons(userId, status) {
        const container = document.createElement('div');
        container.className = 'relationship-buttons d-flex gap-2';

        // Add friend button (highest priority)
        const friendButton = FriendUtils.createFriendButton(userId, status.friend.friendshipStatus || 'none');
        container.appendChild(friendButton);

        // Add subscription button if following but not friends
        if (!status.friend.isFriend && status.follow.isFollowing) {
            const subscriptionButton = SubscriptionUtils.createSubscriptionButton(userId, status.subscription.isSubscribed, 'sm');
            container.appendChild(subscriptionButton);
        }

        // Add follow button if not friends
        if (!status.friend.isFriend) {
            const followButton = FollowUtils.createFollowButton(userId, status.follow.isFollowing, 'sm');
            container.appendChild(followButton);
        }

        // Add message button if friends
        if (status.friend.isFriend) {
            const messageButton = document.createElement('button');
            messageButton.className = 'btn btn-outline-primary btn-sm';
            messageButton.textContent = 'Message';
            messageButton.title = 'Send private message';
            messageButton.addEventListener('click', () => {
                // TODO: Open message interface
                window.dispatchEvent(new CustomEvent('openMessage', { detail: { userId } }));
            });
            container.appendChild(messageButton);
        }

        return container;
    }
}

// Make classes globally available
window.FollowUtils = FollowUtils;
window.FriendUtils = FriendUtils;
window.SubscriptionUtils = SubscriptionUtils;
window.RelationshipUtils = RelationshipUtils;

// Example usage functions for easy integration
window.toggleUserFollow = (userId, isFollowing) => FollowUtils.toggleFollow(userId, isFollowing);
window.sendFriendRequest = (userId) => FriendUtils.sendFriendRequest(userId);
window.acceptFriendRequest = (userId) => FriendUtils.acceptFriendRequest(userId);
window.rejectFriendRequest = (userId) => FriendUtils.rejectFriendRequest(userId);
window.toggleUserSubscription = (userId, isSubscribed) => SubscriptionUtils.toggleSubscription(userId, isSubscribed);
window.subscribeToUser = (userId) => SubscriptionUtils.subscribeToUser(userId);
window.unsubscribeFromUser = (userId) => SubscriptionUtils.unsubscribeFromUser(userId);
window.updateSubscriptionNotifications = (userId, enabled) => SubscriptionUtils.updateNotificationPreference(userId, enabled);

// ES6 Module Exports
export { FollowUtils, FriendUtils, SubscriptionUtils, RelationshipUtils };