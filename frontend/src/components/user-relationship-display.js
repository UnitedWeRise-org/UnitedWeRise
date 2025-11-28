/**
 * @module components/user-relationship-display
 * @description Reusable component for displaying follow/friend status and controls
 * Can be used in user profiles, post headers, user lists, etc.
 * Migrated to ES6 modules: October 11, 2025 (Batch 5)
 */

class UserRelationshipDisplay {
    constructor(userId, containerElement, options = {}) {
        this.userId = userId;
        this.container = containerElement;
        this.options = {
            size: 'md', // 'sm', 'md', 'lg'
            showFollowButton: true,
            showFriendButton: true,
            showMessageButton: true,
            showCounts: true,
            inline: false, // horizontal layout vs vertical
            ...options
        };
        
        this.relationshipStatus = null;
        this.init();
    }

    async init() {
        try {
            // Load relationship status
            this.relationshipStatus = await RelationshipUtils.getCombinedStatus(this.userId);
            this.render();
            
            // Listen for relationship changes
            window.addEventListener('followStatusChanged', (e) => {
                if (e.detail.userId === this.userId) {
                    this.updateFollowStatus(e.detail.isFollowing);
                }
            });
            
            window.addEventListener('friendStatusChanged', (e) => {
                if (e.detail.userId === this.userId) {
                    this.updateFriendStatus(e.detail.status);
                }
            });
            
        } catch (error) {
            console.error('Failed to load relationship status:', error);
            this.renderError();
        }
    }

    render() {
        if (!this.relationshipStatus) {
            this.container.innerHTML = '<div class="relationship-loading">Loading...</div>';
            return;
        }

        const { follow, friend, canMessage } = this.relationshipStatus;
        const layoutClass = this.options.inline ? 'd-flex gap-2 align-items-center' : 'd-flex flex-column gap-2';
        
        let html = `<div class="user-relationship-display ${layoutClass}">`;
        
        // Friend status takes priority over follow
        if (this.options.showFriendButton && friend.friendshipStatus !== 'none') {
            html += this.renderFriendButton(friend);
        } else if (this.options.showFollowButton) {
            html += this.renderFollowButton(follow);
        }
        
        // Message button for friends
        if (this.options.showMessageButton && canMessage) {
            html += this.renderMessageButton();
        }
        
        // Relationship counts
        if (this.options.showCounts) {
            html += this.renderCounts();
        }
        
        html += '</div>';
        this.container.innerHTML = html;
    }

    renderFriendButton(friendStatus) {
        const { isFriend, friendshipStatus, requestSentByCurrentUser } = friendStatus;
        
        let buttonText, buttonClass, disabled = false, action = '';
        
        switch (friendshipStatus) {
            case 'ACCEPTED':
                buttonText = '👥 Friends';
                buttonClass = 'btn-success';
                action = 'removeFriend';
                break;
            case 'PENDING':
                if (requestSentByCurrentUser) {
                    buttonText = '⏳ Request Sent';
                    buttonClass = 'btn-outline-secondary';
                    disabled = true;
                } else {
                    buttonText = '✅ Accept Request';
                    buttonClass = 'btn-outline-success';
                    action = 'acceptFriend';
                }
                break;
            default:
                buttonText = '➕ Add Friend';
                buttonClass = 'btn-outline-primary';
                action = 'sendFriendRequest';
        }
        
        const sizeClass = this.options.size === 'sm' ? 'btn-sm' : this.options.size === 'lg' ? 'btn-lg' : '';
        
        return `
            <button class="btn ${buttonClass} ${sizeClass} friend-btn"
                    data-user-id="${this.userId}"
                    data-relationship-action="friend"
                    data-friend-action="${action}"
                    ${disabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
        `;
    }

    renderFollowButton(followStatus) {
        const { isFollowing } = followStatus;
        const buttonText = isFollowing ? '👤 Following' : '👤 Follow';
        const buttonClass = isFollowing ? 'btn-secondary' : 'btn-primary';
        const sizeClass = this.options.size === 'sm' ? 'btn-sm' : this.options.size === 'lg' ? 'btn-lg' : '';
        
        return `
            <button class="btn ${buttonClass} ${sizeClass} follow-btn"
                    data-user-id="${this.userId}"
                    data-relationship-action="follow"
                    data-is-following="${isFollowing}">
                ${buttonText}
            </button>
        `;
    }

    renderMessageButton() {
        const sizeClass = this.options.size === 'sm' ? 'btn-sm' : this.options.size === 'lg' ? 'btn-lg' : '';
        
        return `
            <button class="btn btn-outline-primary ${sizeClass} message-btn"
                    data-user-id="${this.userId}"
                    data-relationship-action="message">
                💬 Message
            </button>
        `;
    }

    renderCounts() {
        // This would be populated from user data if available
        return `
            <div class="relationship-counts small text-muted">
                <span class="followers-count" data-follower-count="${this.userId}">
                    <i class="fas fa-users"></i> ${this.relationshipStatus.followerCount || 0} followers
                </span>
            </div>
        `;
    }

    renderError() {
        this.container.innerHTML = `
            <div class="relationship-error text-muted small">
                <i class="fas fa-exclamation-triangle"></i> Unable to load relationship status
            </div>
        `;
    }

    updateFollowStatus(isFollowing) {
        if (this.relationshipStatus) {
            this.relationshipStatus.follow.isFollowing = isFollowing;
            this.render();
        }
    }

    updateFriendStatus(status) {
        if (this.relationshipStatus) {
            this.relationshipStatus.friend.friendshipStatus = status;
            this.relationshipStatus.friend.isFriend = (status === 'ACCEPTED');
            this.relationshipStatus.canMessage = (status === 'ACCEPTED');
            this.render();
        }
    }

    destroy() {
        // Clean up event listeners if needed
        this.container.innerHTML = '';
    }
}

// Global action handlers
async function handleFollowAction(userId, currentlyFollowing) {
    try {
        await FollowUtils.toggleFollow(userId, currentlyFollowing);
    } catch (error) {
        console.error('Follow action failed:', error);
    }
}

async function handleFriendAction(userId, action) {
    try {
        switch (action) {
            case 'sendFriendRequest':
                await FriendUtils.sendFriendRequest(userId);
                break;
            case 'acceptFriend':
                await FriendUtils.acceptFriendRequest(userId);
                break;
            case 'removeFriend':
                await FriendUtils.removeFriend(userId);
                break;
        }
    } catch (error) {
        console.error('Friend action failed:', error);
    }
}

function openMessageDialog(userId) {
    // TODO: Implement message dialog
    console.log('Opening message dialog for user:', userId);
    window.dispatchEvent(new CustomEvent('openMessage', { detail: { userId } }));
}

/**
 * Setup event delegation for relationship actions
 */
function setupRelationshipEventDelegation() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-relationship-action]');
        if (!target) return;

        const action = target.dataset.relationshipAction;
        const userId = target.dataset.userId;

        if (!userId) return;

        switch (action) {
            case 'friend':
                const friendAction = target.dataset.friendAction;
                if (friendAction) handleFriendAction(userId, friendAction);
                break;
            case 'follow':
                const isFollowing = target.dataset.isFollowing === 'true';
                handleFollowAction(userId, isFollowing);
                break;
            case 'message':
                openMessageDialog(userId);
                break;
        }
    });
}

// Initialize event delegation
setupRelationshipEventDelegation();

// Utility function to quickly add relationship display to any element
function addRelationshipDisplay(userId, containerElement, options = {}) {
    return new UserRelationshipDisplay(userId, containerElement, options);
}

// ES6 Module Exports
export {
    UserRelationshipDisplay,
    handleFollowAction,
    handleFriendAction,
    openMessageDialog,
    addRelationshipDisplay
};
export default UserRelationshipDisplay;

// Maintain backward compatibility during transition
if (typeof window !== 'undefined') {
    window.UserRelationshipDisplay = UserRelationshipDisplay;
    window.handleFollowAction = handleFollowAction;
    window.handleFriendAction = handleFriendAction;
    window.openMessageDialog = openMessageDialog;
    window.addRelationshipDisplay = addRelationshipDisplay;
}