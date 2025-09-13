/**
 * Relationship Utilities
 * 
 * Reusable client-side functions for managing follows and friendships
 * Can be used across different UI contexts: user profiles, post headers, user lists, etc.
 */

// API base URL helper
function getApiBase() {
    return (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' || 
            window.location.protocol === 'file:')
        ? 'http://localhost:3001/api' 
        : 'https://api.unitedwerise.org/api';
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
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${getApiBase()}/users/follow/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Update UI state
                this.updateFollowUI(userId, true);
                
                // Show success notification
                this.showNotification('Successfully followed user', 'success');
                
                if (onSuccess) onSuccess(userId, true);
                return { success: true, data };
            } else {
                throw new Error(data.error || 'Failed to follow user');
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
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${getApiBase()}/users/follow/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Update UI state
                this.updateFollowUI(userId, false);
                
                // Show success notification
                this.showNotification('Successfully unfollowed user', 'success');
                
                if (onSuccess) onSuccess(userId, false);
                return { success: true, data };
            } else {
                throw new Error(data.error || 'Failed to unfollow user');
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
            const token = getAuthToken();
            if (!token) {
                return { isFollowing: false };
            }

            const response = await fetch(`${getApiBase()}/users/follow-status/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
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
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${getApiBase()}/users/friend-request/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.updateFriendUI(userId, 'request_sent');
                this.showNotification('Friend request sent successfully', 'success');
                
                if (onSuccess) onSuccess(userId, 'request_sent');
                return { success: true, data };
            } else {
                throw new Error(data.error || 'Failed to send friend request');
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
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${getApiBase()}/users/friend-request/${userId}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.updateFriendUI(userId, 'friends');
                this.showNotification('Friend request accepted', 'success');
                
                if (onSuccess) onSuccess(userId, 'friends');
                return { success: true, data };
            } else {
                throw new Error(data.error || 'Failed to accept friend request');
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
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${getApiBase()}/users/friend-request/${userId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.updateFriendUI(userId, 'none');
                this.showNotification('Friend request rejected', 'info');
                
                if (onSuccess) onSuccess(userId, 'none');
                return { success: true, data };
            } else {
                throw new Error(data.error || 'Failed to reject friend request');
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

            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            const response = await fetch(`${getApiBase()}/users/friend/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.updateFriendUI(userId, 'none');
                this.showNotification('Friend removed successfully', 'info');
                
                if (onSuccess) onSuccess(userId, 'none');
                return { success: true, data };
            } else {
                throw new Error(data.error || 'Failed to remove friend');
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
            const token = getAuthToken();
            if (!token) {
                return { isFriend: false, friendshipStatus: 'none' };
            }

            const response = await fetch(`${getApiBase()}/users/friend-status/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
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
 * COMBINED UTILITIES
 */

class RelationshipUtils {
    /**
     * Get combined relationship status for comprehensive UI display
     * @param {string} userId - Target user ID
     */
    static async getCombinedStatus(userId) {
        const [followStatus, friendStatus] = await Promise.all([
            FollowUtils.getFollowStatus(userId),
            FriendUtils.getFriendStatus(userId)
        ]);

        return {
            follow: followStatus,
            friend: friendStatus,
            canMessage: friendStatus.isFriend,
            displayPriority: friendStatus.isFriend ? 'friend' : (followStatus.isFollowing ? 'following' : 'none')
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
        
        // Add friend button (priority over follow)
        const friendButton = FriendUtils.createFriendButton(userId, status.friend.friendshipStatus || 'none');
        container.appendChild(friendButton);
        
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
window.RelationshipUtils = RelationshipUtils;

// Example usage functions for easy integration
window.toggleUserFollow = (userId, isFollowing) => FollowUtils.toggleFollow(userId, isFollowing);
window.sendFriendRequest = (userId) => FriendUtils.sendFriendRequest(userId);
window.acceptFriendRequest = (userId) => FriendUtils.acceptFriendRequest(userId);
window.rejectFriendRequest = (userId) => FriendUtils.rejectFriendRequest(userId);

console.log('Relationship utilities loaded - FollowUtils, FriendUtils, RelationshipUtils available globally');