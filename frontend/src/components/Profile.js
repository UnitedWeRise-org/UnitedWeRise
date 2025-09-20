/**
 * Profile Component
 * Created: August 10, 2025
 * Purpose: Display user profiles in main content area with tabs for different sections
 * Author: Claude Code Assistant
 */

class Profile {
    constructor() {
        this.currentTab = 'activity'; // Default to activity tab
        this.userPosts = [];
        this.userActivities = [];
        this.activityFilters = {
            POST_CREATED: true,
            POST_EDITED: true,
            POST_DELETED: true,
            COMMENT_CREATED: true,
            COMMENT_EDITED: true,
            COMMENT_DELETED: true,
            LIKE_ADDED: true,
            LIKE_REMOVED: true,
            FOLLOW_ADDED: true,
            FOLLOW_REMOVED: true
        };
        this.activitySearchQuery = '';
        this.activityOffset = 0;
        this.activityLimit = 20;
        this.userProfile = null;
        this.editingPositionId = null; // Track which position is being edited
        
        // Setup WebSocket event handlers
        this.setupWebSocketHandlers();
    }

    /**
     * Setup WebSocket event handlers for candidate messaging
     */
    setupWebSocketHandlers() {
        if (!window.unifiedMessaging) {
            adminDebugWarn('MyProfile', 'WebSocket client not available');
            return;
        }
        
        // Handle incoming admin-candidate messages (when admin sends to candidate)
        window.unifiedMessaging.onMessage('ADMIN_CANDIDATE', (messageData) => {
            adminDebugSensitive('MyProfile', 'Candidate received admin message', messageData);
            adminDebugSensitive('MyProfile', 'Message details', {
                senderId: messageData.senderId,
                recipientId: messageData.recipientId,
                conversationId: messageData.conversationId,
                content: messageData.content
            });
            
            // Only display messages FROM admin (not our own messages as candidate)
            const currentUser = window.currentUser;
            const myUserId = currentUser?.id;
            const myCandidateId = currentUser?.candidateProfile?.id;
            
            adminDebugLog('MyProfile', 'User check', {
                myUserId,
                myCandidateId,
                messageSenderId: messageData.senderId,
                isOwnMessage: messageData.senderId === myUserId || messageData.senderId === myCandidateId
            });
            
            // Skip only if this is a message we sent AS A CANDIDATE
            // Allow admin messages even if admin is the same user account
            // Admin messages will have senderId as the admin's user ID
            // Candidate messages will have senderId as the candidate's user ID
            // Since we're receiving ADMIN_CANDIDATE messages here, check the conversation direction
            if (messageData.recipientId === 'admin' && messageData.senderId === myUserId) {
                // This is our own message sent TO admin as a candidate
                adminDebugLog('📤 Skipping own candidate→admin message (handled by MESSAGE_SENT)');
                return;
            }
            
            // Check if we're currently viewing the admin messages tab
            if (this.currentTab === 'messages') {
                this.addMessageToDisplay(messageData);
            }
            
            // Update unread badge
            this.updateUnreadBadge();
        });
        
        // Handle message sent confirmations (when candidate sends to admin)
        window.unifiedMessaging.onMessage('MESSAGE_SENT', (messageData) => {
            adminDebugLog('✅ Candidate message sent confirmation:', messageData);
            
            // Add sent message to display if we're viewing messages tab
            if (this.currentTab === 'messages' && messageData.type === 'ADMIN_CANDIDATE') {
                // Get current user info
                const currentUser = window.currentUser;
                const candidateId = currentUser?.candidateProfile?.id;
                
                if (candidateId) {
                    this.addMessageToDisplay({
                        id: messageData.messageId || Date.now(),
                        senderId: candidateId,
                        content: messageData.content,
                        createdAt: messageData.timestamp || new Date().toISOString(),
                        isFromAdmin: false
                    });
                }
            }
        });
    }

    /**
     * Add a message to the current messages display
     */
    addMessageToDisplay(messageData) {
        const container = document.getElementById('candidateMessagesContainer');
        if (!container) {
            adminDebugWarn('❌ candidateMessagesContainer not found');
            return;
        }
        
        adminDebugLog('📝 Adding message to display:', messageData);
        
        // Determine if message is from admin
        const currentUser = window.currentUser;
        const myUserId = currentUser?.id;
        
        // Check various ways the message might indicate it's from admin
        const isFromAdmin = messageData.isFromAdmin !== undefined 
            ? messageData.isFromAdmin 
            : (messageData.senderId === 'admin' || (messageData.senderId && messageData.senderId !== myUserId));
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `candidate-message ${isFromAdmin ? 'from-admin' : 'from-candidate'}`;
        
        const time = new Date(messageData.createdAt || messageData.timestamp || Date.now()).toLocaleString();
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${isFromAdmin ? 'Admin' : 'You'}:</strong>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${messageData.content}</div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        adminDebugLog('✅ Message added to display as', isFromAdmin ? 'from-admin' : 'from-candidate');
    }

    async render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>Loading Your Profile...</h2>
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            // Load user profile and posts in parallel
            const [profileResponse, postsResponse] = await Promise.all([
                window.apiCall('/users/profile'),
                window.apiCall('/posts/me')
            ]);

            if (profileResponse.ok) {
                this.userProfile = profileResponse.data.user;
                adminDebugLog('🔍 Profile: User data loaded:', this.userProfile);
                adminDebugLog('🔍 Profile: candidateProfile:', this.userProfile?.candidateProfile);
                this.userPosts = postsResponse.ok ? (postsResponse.data.posts || []) : [];
                this.renderProfile(container);
            } else {
                this.renderError(container, 'Unable to load your profile');
            }
        } catch (error) {
            adminDebugError('Error loading profile:', error);
            this.renderError(container, 'Network error loading profile');
        }
    }

    // Method to refresh profile with fresh data (bypassing cache)
    async refreshProfile(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>Refreshing Your Profile...</h2>
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            // Load user profile and posts with bypassed cache
            const [profileResponse, postsResponse] = await Promise.all([
                window.apiCall('/users/profile', { bypassCache: true }),
                window.apiCall('/posts/me', { bypassCache: true })
            ]);

            if (profileResponse.ok) {
                this.userProfile = profileResponse.data.user;
                adminDebugLog('🔍 Profile: User data loaded:', this.userProfile);
                adminDebugLog('🔍 Profile: candidateProfile:', this.userProfile?.candidateProfile);
                this.userPosts = postsResponse.ok ? (postsResponse.data.posts || []) : [];
                this.renderProfile(container);
            } else {
                this.renderError(container, 'Unable to refresh your profile');
            }
        } catch (error) {
            adminDebugError('Error refreshing profile:', error);
            this.renderError(container, 'Network error refreshing profile');
        }
    }

    renderProfile(container) {
        const user = this.userProfile;

        // === COMPREHENSIVE AVATAR DEBUGGING ===
        // Admin debug (requires verification)
        adminDebugLog('ProfileAvatar', '=== PROFILE AVATAR DIAGNOSTIC START ===');
        adminDebugLog('ProfileAvatar', 'renderProfile user object', user);
        adminDebugLog('ProfileAvatar', 'user.avatar value', user?.avatar);
        adminDebugLog('ProfileAvatar', 'user.avatar type', typeof user?.avatar);
        adminDebugLog('ProfileAvatar', 'window.currentUser', window.currentUser);
        adminDebugLog('ProfileAvatar', 'window.currentUser.avatar', window.currentUser?.avatar);
        adminDebugLog('ProfileAvatar', 'window.currentUser.avatar type', typeof window.currentUser?.avatar);

        // Fallback to global user state if profile doesn't have avatar
        const avatarUrl = user?.avatar || window.currentUser?.avatar;
        adminDebugLog('ProfileAvatar', 'FINAL avatar URL to display', avatarUrl);
        adminDebugLog('ProfileAvatar', 'Will show image?', !!avatarUrl);
        adminDebugLog('ProfileAvatar', '=== PROFILE AVATAR DIAGNOSTIC END ===');

        container.innerHTML = `
            <div class="my-profile">
                <!-- Profile Header -->
                <div class="profile-header">
                    <div class="profile-picture-container">
                        <div class="profile-picture">
                            ${avatarUrl ?
                                `<img src="${avatarUrl}" alt="Profile Picture" onclick="this.parentNode.parentNode.querySelector('.profile-upload').click()">` :
                                `<div class="profile-placeholder" onclick="this.parentNode.parentNode.querySelector('.profile-upload').click()">
                                    <span style="font-size: 3rem;">👤</span>
                                    <p>Click to upload photo</p>
                                </div>`
                            }
                            <input type="file" class="profile-upload" accept="image/*" style="display: none;" onchange="window.profile.uploadProfilePicture(this)">
                        </div>
                        ${avatarUrl ? '<button class="change-photo-btn" onclick="this.parentNode.querySelector(\'.profile-upload\').click()">Change Photo</button>' : ''}
                    </div>
                    
                    <div class="profile-info">
                        <h1 class="profile-name">@${user.username}</h1>
                        <p class="full-name">${user.firstName || ''} ${user.lastName || ''}</p>
                        ${user.bio ? `<p class="bio">"${user.bio}"</p>` : '<p class="bio-placeholder">Add a bio to tell others about yourself</p>'}
                        
                        <div class="profile-stats">
                            <div class="stat">
                                <strong>${this.userPosts.length}</strong>
                                <span>Posts</span>
                            </div>
                            <div class="stat">
                                <strong>${user.followersCount || 0}</strong>
                                <span>Followers</span>
                            </div>
                            <div class="stat">
                                <strong>${user.followingCount || 0}</strong>
                                <span>Following</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="profile-tabs">
                    <button class="tab-button ${this.currentTab === 'activity' ? 'active' : ''}" onclick="window.profile.switchTab('activity')">
                        My Activity
                    </button>
                    <button class="tab-button ${this.currentTab === 'photos' ? 'active' : ''}" onclick="window.profile.switchTab('photos')">
                        Photos
                    </button>
                    <button class="tab-button ${this.currentTab === 'demographics' ? 'active' : ''}" onclick="window.profile.switchTab('demographics')">
                        Demographics
                    </button>
                    <button class="tab-button ${this.currentTab === 'political' ? 'active' : ''}" onclick="window.profile.switchTab('political')">
                        Political Profile
                    </button>
                    ${user.candidateProfile ? `
                        <!-- Policy Platform moved to Candidate Dashboard -->
                        <button class="tab-button ${this.currentTab === 'messages' ? 'active' : ''}" onclick="window.profile.switchTab('messages')" id="messagesTab">
                            💬 Admin Messages
                            <span id="unreadBadge" style="display: none; background: #dc3545; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.75rem; margin-left: 0.5rem;">0</span>
                        </button>
                    ` : ''}
                    <button class="tab-button ${this.currentTab === 'settings' ? 'active' : ''}" onclick="window.profile.switchTab('settings')">
                        Settings
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="tab-content">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;

        this.addStyles();


        // Load data for the initial tab if needed
        if (this.currentTab === 'activity') {
            adminDebugLog('📊 Initial render with activity tab, loading activities...');
            setTimeout(() => this.loadUserActivities(), 100);
        } else if (this.currentTab === 'photos') {
            adminDebugLog('📸 Initial render with photos tab, loading galleries...');
            setTimeout(() => this.loadPhotoGalleries(), 100);
        } else if (this.currentTab === 'messages') {
            setTimeout(() => {
                this.loadCandidateMessages();
                this.setupMessageForm();
            }, 100);
        } else if (this.currentTab === 'settings') {
            setTimeout(() => this.updatePendingTagsCount(), 100);
        }
    }

    renderTabContent() {
        switch (this.currentTab) {
            case 'activity':
                return this.renderActivityTab();
            case 'posts':
                return this.renderPostsTab();
            case 'photos':
                return this.renderPhotosTab();
            case 'demographics':
                return this.renderDemographicsTab();
            case 'political':
                return this.renderPoliticalTab();
            case 'messages':
                return this.renderMessagesTab();
            case 'settings':
                // Load TOTP status when settings tab is rendered
                setTimeout(() => this.loadTOTPStatus(), 100);
                return this.renderSettingsTab();
            default:
                return this.renderActivityTab();
        }
    }

    renderActivityTab() {
        const enabledTypes = Object.keys(this.activityFilters)
            .filter(type => this.activityFilters[type]);

        let activityHtml = `
            <div class="tab-pane">
                <!-- Activity Filters -->
                <div class="activity-filters" style="margin-bottom: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                    <div class="filter-checkboxes" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.POST_CREATED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('POST_CREATED', this.checked)">
                            📝 Posts Created
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.POST_EDITED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('POST_EDITED', this.checked)">
                            ✏️ Posts Edited
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.POST_DELETED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('POST_DELETED', this.checked)">
                            🗑️ Posts Deleted
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.COMMENT_CREATED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('COMMENT_CREATED', this.checked)">
                            💬 Comments
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.COMMENT_EDITED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('COMMENT_EDITED', this.checked)">
                            ✏️ Comments Edited
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.COMMENT_DELETED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('COMMENT_DELETED', this.checked)">
                            🗑️ Comments Deleted
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.LIKE_ADDED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('LIKE_ADDED', this.checked)">
                            ❤️ Likes
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" ${this.activityFilters.FOLLOW_ADDED ? 'checked' : ''}
                                   onchange="window.profile.toggleActivityFilter('FOLLOW_ADDED', this.checked)">
                            👥 Follows
                        </label>
                    </div>

                    <!-- Search Box -->
                    <div class="activity-search" style="margin-top: 1rem;">
                        <input type="search" id="activitySearch" placeholder="Search your activity..."
                               value="${this.activitySearchQuery}"
                               autocomplete="off" autocapitalize="off" spellcheck="false"
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;"
                               onkeyup="if(event.key==='Enter') window.profile.searchActivities(this.value)"
                               oninput="window.profile.activitySearchQuery = this.value">
                        <button onclick="window.profile.searchActivities(document.getElementById('activitySearch').value)"
                                style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #4b5c09; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Search
                        </button>
                    </div>
                </div>

                <!-- Activity Feed -->
                <div class="activity-feed" id="activityFeed">
                    ${this.userActivities.length === 0 ? this.renderEmptyActivityState() : this.renderActivityList()}
                </div>

                <!-- Load More Button -->
                <div class="load-more-container" style="text-align: center; margin-top: 2rem;">
                    <button onclick="window.profile.loadMoreActivities()"
                            class="btn btn-secondary" id="loadMoreActivities"
                            style="display: ${this.userActivities.length >= this.activityLimit ? 'inline-block' : 'none'}">
                        Load More Activity
                    </button>
                </div>
            </div>
        `;

        return activityHtml;
    }

    renderPostsTab() {
        // Always show the post composer at the top
        let postsHtml = `
            <div class="tab-pane">
                <!-- Sticky post composer wrapper -->
                <div class="sticky-composer-wrapper" id="stickyComposerWrapper">
                    <div class="quick-post-composer">
                        <textarea id="quickPostContent" placeholder="What's on your mind?" rows="4"></textarea>
                        <div style="margin-top: 1rem;">
                            <button onclick="window.profile.submitQuickPost()" class="btn">Create Post</button>
                        </div>
                    </div>
                </div>
                
                ${this.userPosts.length === 0 ? `
                    <div class="empty-state" style="margin-top: 2rem;">
                        <h3>No posts yet</h3>
                        <p>Share your thoughts above to get started!</p>
                    </div>
                ` : `
                    <div class="posts-header" style="margin-top: 2rem; text-align: center; max-width: 600px; margin-left: auto; margin-right: auto;">
                        <h3>Your Posts (${this.userPosts.length})</h3>
                        <p>View and manage your posts, see engagement stats</p>
                    </div>
                    <div class="posts-list">
                `}
        `;

        // Use the standardized post component for consistency
        this.userPosts.forEach(post => {
            // Add isOwner flag for menu options
            post.isOwner = true;
            postsHtml += window.postComponent ? 
                window.postComponent.renderPost(post, { 
                    showAuthor: false, // Don't show author in own profile
                    showTimestamp: true 
                }) :
                this.renderFallbackPost(post);
        });

        if (this.userPosts.length > 0) {
            postsHtml += `
                    </div>
                `;
        }
        
        postsHtml += `
            </div>
        `;

        // After rendering, set up sticky behavior
        setTimeout(() => this.setupStickyComposer(), 100);
        
        return postsHtml;
    }
    
    /**
     * Fallback post renderer in case PostComponent isn't loaded
     */
    renderFallbackPost(post) {
        const timeAgo = this.getTimeAgo(new Date(post.createdAt));
        return `
            <div class="post-card">
                <div class="post-header">
                    <span class="post-date">${timeAgo}</span>
                    <div class="post-menu">
                        <button onclick="window.profile.editPost('${post.id}')">Edit</button>
                        <button onclick="window.profile.deletePost('${post.id}')" class="delete-btn">Delete</button>
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
                <div class="post-stats">
                    <span>❤️ ${post.likesCount || 0} likes</span>
                    <span>💬 ${post.commentsCount || 0} comments</span>
                    ${post.isPolitical ? '<span class="political-tag">🗳️ Political</span>' : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        return 'just now';
    }
    
    setupStickyComposer() {
        // Now work with the profile container's scroll since it's the scrolling element
        const profileContainer = document.querySelector('.my-profile');
        const composer = document.getElementById('stickyComposerWrapper');
        
        if (!profileContainer || !composer) {
            // Try again after a short delay as the profile might still be rendering
            setTimeout(() => this.setupStickyComposer(), 100);
            return;
        }
        
        // Remove any existing scroll listeners to avoid duplicates
        const existingListener = profileContainer._stickyScrollListener;
        if (existingListener) {
            profileContainer.removeEventListener('scroll', existingListener);
        }
        
        // Get initial position
        const composerRect = composer.getBoundingClientRect();
        const profileRect = profileContainer.getBoundingClientRect();
        const initialOffset = composerRect.top - profileRect.top;
        
        const scrollListener = () => {
            const scrollTop = profileContainer.scrollTop;
            
            // When scrolled past initial position, add sticky class
            if (scrollTop > initialOffset + 50) {
                if (!composer.classList.contains('sticky')) {
                    composer.classList.add('sticky');
                }
            } else {
                // Remove sticky when scrolled back to top
                if (composer.classList.contains('sticky')) {
                    composer.classList.remove('sticky');
                }
            }
        };
        
        // Store reference to listener for cleanup
        profileContainer._stickyScrollListener = scrollListener;
        profileContainer.addEventListener('scroll', scrollListener);
    }

    renderDemographicsTab() {
        const user = this.userProfile;
        return `
            <div class="tab-pane">
                <div class="demographics-section">
                    <div class="section-header">
                        <h3>Personal Information</h3>
                        <button onclick="window.profile.editDemographics()" class="edit-btn">Edit</button>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>First Name</label>
                            <span>${user.firstName || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>Last Name</label>
                            <span>${user.lastName || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <span>${user.email}</span>
                        </div>
                        <div class="info-item">
                            <label>Phone</label>
                            <span>${user.phoneNumber || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>Website</label>
                            <span>${user.website || 'Not set'}</span>
                        </div>
                        <div class="info-item full-width">
                            <label>Bio</label>
                            <span>${user.bio || 'Not set'}</span>
                        </div>
                    </div>
                </div>

                <div class="demographics-section">
                    <div class="section-header">
                        <h3>Address</h3>
                        <button onclick="window.profile.editAddress()" class="edit-btn">Edit</button>
                    </div>
                    <div class="info-grid">
                        <div class="info-item full-width">
                            <label>Street Address</label>
                            <span>${user.streetAddress || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>City</label>
                            <span>${user.city || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>State</label>
                            <span>${user.state || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>ZIP Code</label>
                            <span>${user.zipCode || 'Not set'}</span>
                        </div>
                    </div>
                    ${!user.streetAddress ? '<p class="help-text">📍 Add your address to find your elected officials</p>' : ''}
                </div>
            </div>
        `;
    }

    renderPoliticalTab() {
        const user = this.userProfile;
        const profileTypes = {
            'CITIZEN': 'Citizen',
            'CANDIDATE': 'Candidate',
            'ELECTED_OFFICIAL': 'Elected Official',
            'POLITICAL_ORG': 'Political Organization'
        };

        return `
            <div class="tab-pane">
                <div class="political-section">
                    <div class="section-header">
                        <h3>Political Profile</h3>
                        <button onclick="window.profile.editPolitical()" class="edit-btn">Edit</button>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Profile Type</label>
                            <span>${profileTypes[user.politicalProfileType] || 'Citizen'}</span>
                        </div>
                        <div class="info-item">
                            <label>Political Party</label>
                            <span>${user.politicalParty || 'Not set'}</span>
                        </div>
                        ${user.office ? `
                        <div class="info-item">
                            <label>Office</label>
                            <span>${user.office}</span>
                        </div>` : ''}
                        ${user.campaignWebsite ? `
                        <div class="info-item">
                            <label>Campaign Website</label>
                            <span><a href="${user.campaignWebsite}" target="_blank">${user.campaignWebsite}</a></span>
                        </div>` : ''}
                    </div>

                    <div class="verification-status">
                        <h4>Verification Status</h4>
                        <div class="status-indicator ${user.verificationStatus?.toLowerCase() || 'pending'}">
                            ${user.verificationStatus === 'APPROVED' ? '✅ Verified' : 
                              user.verificationStatus === 'PENDING' ? '⏳ Pending Review' : 
                              '❌ Not Verified'}
                        </div>
                        ${user.verificationStatus !== 'APPROVED' && user.politicalProfileType !== 'CITIZEN' ? 
                          '<p class="help-text">Upload verification documents to get verified</p>' : ''}
                    </div>

                    <div class="account-verification">
                        <h4>Account Verification</h4>
                        <div class="verification-items">
                            <div class="verification-item">
                                <span>Email ${user.emailVerified ? '✅' : '❌'}</span>
                                ${!user.emailVerified ? '<button onclick="window.profile.resendEmailVerification()" class="verify-btn">Verify Email</button>' : ''}
                            </div>
                            <div class="verification-item">
                                <span>Phone ${user.phoneVerified ? '✅' : '❌'}</span>
                                ${!user.phoneVerified ? '<button onclick="window.profile.verifyPhone()" class="verify-btn">Verify Phone</button>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMessagesTab() {
        return `
            <div class="tab-pane">
                <div class="messaging-section">
                    <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #ddd;">
                        <h3 style="margin: 0;">💬 Messages with Site Admins</h3>
                        <button onclick="window.profile.refreshMessages()" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Refresh</button>
                    </div>
                    
                    <div id="candidateMessagesContainer" style="height: 400px; overflow-y: auto; padding: 1rem; background: #fafafa;">
                        <div style="text-align: center; color: #666; margin: 2rem 0;">
                            <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                            Loading messages...
                        </div>
                    </div>
                    
                    <div style="padding: 1rem; border-top: 1px solid #ddd; background: white;">
                        <form id="candidateMessageForm" style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <div style="display: flex; gap: 0.5rem;">
                                <textarea id="candidateMessageContent" placeholder="Type your message to site admins..." required 
                                    style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical; min-height: 80px; font-family: inherit;"></textarea>
                                <button type="submit" style="background: #4b5c09; color: white; padding: 0.75rem 1rem; border: none; border-radius: 4px; cursor: pointer; height: fit-content; min-width: 80px;">Send</button>
                            </div>
                            <small style="color: #666; font-size: 0.875rem;">
                                💡 Use this to report issues, ask for help, or communicate directly with site administrators.
                            </small>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    renderSettingsTab() {
        return `
            <div class="tab-pane">
                <div class="settings-section">
                    <div class="section-header">
                        <h3>Account Settings</h3>
                    </div>
                    
                    <div class="settings-group">
                        <h4>Security</h4>
                        <button onclick="window.profile.changePassword()" class="btn">Change Password</button>
                        <div class="totp-section">
                            <div id="totpStatus" class="totp-status">
                                <div class="loading">Loading 2FA status...</div>
                            </div>
                            <div id="totpControls" class="totp-controls" style="display: none;">
                                <!-- TOTP controls will be populated here -->
                            </div>
                        </div>
                        <button onclick="window.profile.downloadData()" class="btn">Download My Data</button>
                    </div>

                    <div class="settings-group">
                        <h4>Privacy</h4>
                        <label class="setting-item">
                            <input type="checkbox" ${this.userProfile.isProfilePublic ? 'checked' : ''} 
                                   onchange="window.profile.toggleProfileVisibility(this.checked)">
                            <span>Make my profile public</span>
                        </label>
                    </div>

                    <div class="settings-group">
                        <h4>Notification Preferences</h4>
                        <p class="setting-description">Control how you receive notifications and which types of notifications to receive.</p>
                        
                        <div class="notification-settings">
                            <h5>Browser Notifications</h5>
                            <label class="setting-item">
                                <input type="checkbox" 
                                       id="browserNotificationsEnabled"
                                       ${this.getNotificationPreference('browserNotifications') ? 'checked' : ''} 
                                       onchange="window.profile.updateNotificationPreference('browserNotifications', this.checked)">
                                <span>Enable browser notifications</span>
                            </label>
                            
                            <div class="sub-settings ${!this.getNotificationPreference('browserNotifications') ? 'disabled' : ''}">
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="browserNotifyNewMessages"
                                           ${this.getNotificationPreference('browserNotifyNewMessages') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('browserNotifyNewMessages', this.checked)"
                                           ${!this.getNotificationPreference('browserNotifications') ? 'disabled' : ''}>
                                    <span>New messages</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="browserNotifyLikes"
                                           ${this.getNotificationPreference('browserNotifyLikes') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('browserNotifyLikes', this.checked)"
                                           ${!this.getNotificationPreference('browserNotifications') ? 'disabled' : ''}>
                                    <span>Likes and reactions</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="browserNotifyComments"
                                           ${this.getNotificationPreference('browserNotifyComments') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('browserNotifyComments', this.checked)"
                                           ${!this.getNotificationPreference('browserNotifications') ? 'disabled' : ''}>
                                    <span>Comments on my posts</span>
                                </label>
                            </div>
                            
                            <h5>Email Notifications</h5>
                            <label class="setting-item">
                                <input type="checkbox" 
                                       id="emailNotificationsEnabled"
                                       ${this.getNotificationPreference('emailNotifications') ? 'checked' : ''} 
                                       onchange="window.profile.updateNotificationPreference('emailNotifications', this.checked)">
                                <span>Enable email notifications</span>
                            </label>
                            
                            <div class="sub-settings ${!this.getNotificationPreference('emailNotifications') ? 'disabled' : ''}">
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="emailNotifyImportantMessages"
                                           ${this.getNotificationPreference('emailNotifyImportantMessages') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('emailNotifyImportantMessages', this.checked)"
                                           ${!this.getNotificationPreference('emailNotifications') ? 'disabled' : ''}>
                                    <span>Important messages and replies</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="emailNotifyWeeklyDigest"
                                           ${this.getNotificationPreference('emailNotifyWeeklyDigest') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('emailNotifyWeeklyDigest', this.checked)"
                                           ${!this.getNotificationPreference('emailNotifications') ? 'disabled' : ''}>
                                    <span>Weekly activity digest</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="emailNotifySecurityAlerts"
                                           ${this.getNotificationPreference('emailNotifySecurityAlerts') !== false ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('emailNotifySecurityAlerts', this.checked)"
                                           ${!this.getNotificationPreference('emailNotifications') ? 'disabled' : ''}>
                                    <span>Security alerts (recommended)</span>
                                </label>
                            </div>
                            
                            <h5>Candidate-Specific Notifications</h5>
                            <div id="candidateNotificationSettings" style="display: none;">
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="candidateInboxNotifications"
                                           ${this.getNotificationPreference('candidateInboxNotifications') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('candidateInboxNotifications', this.checked)">
                                    <span>Constituent messages (candidate inbox)</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="candidateElectionReminders"
                                           ${this.getNotificationPreference('candidateElectionReminders') ? 'checked' : ''} 
                                           onchange="window.profile.updateNotificationPreference('candidateElectionReminders', this.checked)">
                                    <span>Filing deadlines and election reminders</span>
                                </label>
                            </div>
                            
                            <div class="notification-controls">
                                <button onclick="window.profile.requestNotificationPermission()" class="btn-secondary">
                                    🔔 Grant Browser Permission
                                </button>
                                <button onclick="window.profile.testNotification()" class="btn-secondary">
                                    📨 Test Notification
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h4>Photo Tagging Privacy</h4>
                        <div class="photo-privacy-settings">
                            <label class="setting-item">
                                <input type="checkbox" 
                                       id="photoTaggingEnabled"
                                       ${this.userProfile.photoTaggingEnabled !== false ? 'checked' : ''} 
                                       onchange="window.profile.updateTaggingPreference('photoTaggingEnabled', this.checked)">
                                <span>Allow people to tag me in photos</span>
                            </label>
                            
                            <div class="sub-settings ${this.userProfile.photoTaggingEnabled === false ? 'disabled' : ''}">
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="requireTagApproval"
                                           ${this.userProfile.requireTagApproval ? 'checked' : ''} 
                                           onchange="window.profile.updateTaggingPreference('requireTagApproval', this.checked)"
                                           ${this.userProfile.photoTaggingEnabled === false ? 'disabled' : ''}>
                                    <span>Require my approval before tags appear</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="allowTagsByFriendsOnly"
                                           ${this.userProfile.allowTagsByFriendsOnly ? 'checked' : ''} 
                                           onchange="window.profile.updateTaggingPreference('allowTagsByFriendsOnly', this.checked)"
                                           ${this.userProfile.photoTaggingEnabled === false ? 'disabled' : ''}>
                                    <span>Only allow friends to tag me</span>
                                </label>
                            </div>
                            
                            <div class="pending-tags-section" id="pendingTagsSection">
                                <button onclick="window.profile.viewPendingTags()" class="btn-secondary">
                                    View Pending Tags <span class="badge" id="pendingTagsCount"></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="settings-group danger">
                        <h4>Danger Zone</h4>
                        <button onclick="window.profile.deactivateAccount()" class="btn-danger">Deactivate Account</button>
                    </div>
                </div>
            </div>
        `;
    }


    renderPhotosTab() {
        return `
            <div class="tab-pane">
                <div class="photos-section">
                    <div class="section-header">
                        <h3>Photo Gallery</h3>
                        <div class="photo-actions">
                            <button onclick="window.profile.uploadPhotos()" class="btn">
                                📷 Upload Photos
                            </button>
                            <button onclick="window.profile.createGallery()" class="btn-secondary">
                                📁 New Gallery
                            </button>
                        </div>
                    </div>
                    
                    <!-- Storage Usage -->
                    <div class="storage-info" id="storageInfo">
                        <div class="storage-bar">
                            <div class="storage-used" style="width: 0%"></div>
                        </div>
                        <span class="storage-text">Loading storage info...</span>
                    </div>

                    <!-- Photo Galleries -->
                    <div class="photo-galleries" id="photoGalleries">
                        <div class="loading-spinner">Loading photos...</div>
                    </div>
                </div>

                <!-- Hidden upload input -->
                <input type="file" id="bulkPhotoUpload" multiple accept="image/*,image/gif" 
                       style="display: none;" onchange="window.profile.handleBulkUpload(this)">
            </div>
        `;
    }

    renderError(container, message) {
        container.innerHTML = `
            <div class="error-state">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="window.profile.render('mainContent')" class="btn">Try Again</button>
            </div>
        `;
    }


    async uploadProfilePicture(input) {
        const file = input.files[0];
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be smaller than 10MB');
            return;
        }

        const formData = new FormData();
        formData.append('photos', file); // Backend expects 'photos' array
        formData.append('photoType', 'AVATAR'); // Must match PhotoType enum
        formData.append('purpose', 'PERSONAL'); // Required field

        try {
            const response = await window.apiCall('/photos/upload', {
                method: 'POST',
                body: formData,
                skipContentType: true // Let browser set multipart boundary
            });

            if (response.ok && response.data.photos && response.data.photos.length > 0) {
                const uploadedPhoto = response.data.photos[0];

                // Update global user state immediately with new avatar
                if (window.currentUser) {
                    window.currentUser.avatar = uploadedPhoto.url;
                }

                // Small delay to ensure database update propagates, then refresh
                setTimeout(() => {
                    this.refreshProfile('mainContent');
                }, 500);
            } else {
                const errorMsg = response.data?.message || 'Failed to upload profile picture';
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert('Error uploading profile picture. Please try again.');
        }
    }

    // Method to submit a quick post from the profile - NOW USES REUSABLE FUNCTION
    async submitQuickPost() {
        // Use the reusable posting function from index.html
        if (window.createPostFromTextarea) {
            const success = await window.createPostFromTextarea('quickPostContent', (newPost) => {
                // Success callback - add the new post to our list
                if (newPost) {
                    this.userPosts.unshift(newPost);
                    // Smooth insertion without full re-render
                    this.insertNewPostSmoothly(newPost);
                }
            }, { refreshFeed: false, clearMedia: true });
            
            if (!success) {
                adminDebugLog('Post creation was not successful');
            }
        } else {
            // Fallback to old method if reusable function not available
            const textarea = document.getElementById('quickPostContent');
            if (!textarea || !textarea.value.trim()) {
                alert('Please enter some content for your post');
                return;
            }

            const content = textarea.value.trim();
            
            try {
                const response = await window.apiCall('/posts', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        content: content
                    })
                });

                if (response.ok) {
                    // Clear the textarea
                    textarea.value = '';
                    // Add the new post to the userPosts array
                    const newPost = response.data.post;
                    this.userPosts.unshift(newPost);
                    
                    // Smooth insertion without full re-render
                    this.insertNewPostSmoothly(newPost);
                } else {
                    adminDebugError('Post creation failed:', response);
                    const errorMsg = response.error || response.message || 'Failed to create post';
                    alert(`Failed to create post: ${errorMsg}. Please try again.`);
                }
            } catch (error) {
                adminDebugError('Post creation error:', error);
                if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                    alert('Network error: Cannot connect to server. Please check if the backend server is running on localhost:3001');
                } else {
                    alert(`Error creating post: ${error.message}`);
                }
            }
        }
    }

    /**
     * Smoothly insert a new post without re-rendering the entire view
     */
    insertNewPostSmoothly(newPost) {
        // Find the posts container
        const postsGrid = document.querySelector('.posts-grid');
        const emptyState = document.querySelector('.empty-state');
        const postsHeader = document.querySelector('.posts-header');
        
        // If this is the first post, we need to replace empty state with posts grid
        if (emptyState) {
            emptyState.style.opacity = '0';
            setTimeout(() => {
                emptyState.style.display = 'none';
                
                // Create posts header and list
                const headerHtml = `
                    <div class="posts-header" style="margin-top: 2rem; text-align: center; max-width: 600px; margin-left: auto; margin-right: auto;">
                        <h3>Your Posts (${this.userPosts.length})</h3>
                        <p>View and manage your posts, see engagement stats</p>
                    </div>
                    <div class="posts-list"></div>
                `;
                
                emptyState.insertAdjacentHTML('afterend', headerHtml);
                
                // Now insert the post
                setTimeout(() => {
                    this.insertPostIntoGrid(newPost);
                }, 100);
            }, 300);
            return;
        }
        
        // Update post count in header
        if (postsHeader) {
            const countElement = postsHeader.querySelector('h3');
            if (countElement) {
                countElement.textContent = `Your Posts (${this.userPosts.length})`;
            }
        }
        
        // Insert into existing grid
        this.insertPostIntoGrid(newPost);
    }
    
    /**
     * Insert a post into the posts grid with smooth animation
     */
    insertPostIntoGrid(newPost) {
        const postsGrid = document.querySelector('.posts-list');
        if (!postsGrid) return;
        
        // Add isOwner flag for menu options
        newPost.isOwner = true;
        
        // Create the post HTML
        const postHtml = window.postComponent ? 
            window.postComponent.renderPost(newPost, { 
                showAuthor: false,
                showTimestamp: true 
            }) :
            this.renderFallbackPost(newPost);
        
        // Create a container for the new post
        const postContainer = document.createElement('div');
        postContainer.innerHTML = postHtml;
        postContainer.style.opacity = '0';
        postContainer.style.transform = 'translateY(-20px)';
        postContainer.style.transition = 'all 0.5s ease';
        
        // Insert at the beginning of the grid
        postsGrid.insertBefore(postContainer, postsGrid.firstChild);
        
        // Trigger smooth fade-in
        setTimeout(() => {
            postContainer.style.opacity = '1';
            postContainer.style.transform = 'translateY(0)';
        }, 50);
    }

    // Placeholder methods for edit functionality
    editDemographics() {
        alert('Demographics editing coming soon!');
    }

    editAddress() {
        const user = this.userProfile;
        
        // Create modal for address editing
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Edit Address</h2>
                    <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="editStreetAddress">Street Address</label>
                        <input type="text" id="editStreetAddress" value="${user.streetAddress || ''}" placeholder="123 Main St">
                    </div>
                    <div class="form-group">
                        <label for="editCity">City</label>
                        <input type="text" id="editCity" value="${user.city || ''}" placeholder="City">
                    </div>
                    <div class="form-group">
                        <label for="editState">State</label>
                        <input type="text" id="editState" value="${user.state || ''}" placeholder="State (e.g., CA)" maxlength="2">
                    </div>
                    <div class="form-group">
                        <label for="editZipCode">ZIP Code</label>
                        <input type="text" id="editZipCode" value="${user.zipCode || ''}" placeholder="12345" maxlength="5">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="window.profile.saveAddress()" class="btn" style="background: #4b5c09;">Save Address</button>
                        <button onclick="this.closest('.modal').remove()" class="btn" style="background: #666;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // If Google Maps is available, initialize autocomplete using new API
        if (window.google && window.google.maps) {
            setTimeout(async () => {
                try {
                    // Use the updated global autocomplete function
                    if (window.initAutocomplete) {
                        await window.initAutocomplete('editStreetAddress', 'profileAddress');
                        adminDebugLog('✅ Profile address autocomplete initialized using new PlaceAutocompleteElement');
                    } else {
                        // Fallback to legacy if global function not available
                        adminDebugLog('⚠️ Global initAutocomplete not found, using legacy implementation');
                        this.initLegacyProfileAutocomplete();
                    }
                } catch (error) {
                    adminDebugError('Error initializing profile autocomplete:', error);
                    this.initLegacyProfileAutocomplete();
                }
            }, 100);
        }
    }
    
    // Legacy fallback method for MyProfile autocomplete
    initLegacyProfileAutocomplete() {
        const input = document.getElementById('editStreetAddress');
        if (!input) return;
        
        const autocomplete = new google.maps.places.Autocomplete(input, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'address_components']
        });
        
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.address_components) {
                place.address_components.forEach(component => {
                    const types = component.types;
                    if (types.includes('locality')) {
                        document.getElementById('editCity').value = component.long_name;
                    }
                    if (types.includes('administrative_area_level_1')) {
                        document.getElementById('editState').value = component.short_name;
                    }
                    if (types.includes('postal_code')) {
                        document.getElementById('editZipCode').value = component.long_name;
                    }
                });
            }
        });
        
        adminDebugLog('✅ Legacy profile autocomplete initialized');
    }
    
    async saveAddress() {
        const streetAddress = document.getElementById('editStreetAddress').value;
        const city = document.getElementById('editCity').value;
        const state = document.getElementById('editState').value;
        const zipCode = document.getElementById('editZipCode').value;
        
        try {
            const response = await window.apiCall('/political/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    streetAddress,
                    city,
                    state,
                    zipCode
                })
            });
            
            if (response.ok) {
                // Update local profile data
                this.userProfile.streetAddress = streetAddress;
                this.userProfile.city = city;
                this.userProfile.state = state;
                this.userProfile.zipCode = zipCode;
                
                // Close modal and refresh view
                document.querySelector('.modal').remove();
                this.switchTab('demographics');
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4b5c09; color: white; padding: 15px; border-radius: 4px; z-index: 10000;';
                successMsg.textContent = '✓ Address updated successfully!';
                document.body.appendChild(successMsg);
                setTimeout(() => successMsg.remove(), 3000);
            } else {
                alert('Failed to save address. Please try again.');
            }
        } catch (error) {
            adminDebugError('Error saving address:', error);
            alert('Error saving address. Please try again.');
        }
    }

    editPolitical() {
        alert('Political profile editing coming soon!');
    }

    editPost(postId) {
        alert(`Edit post ${postId} - coming soon!`);
    }

    deletePost(postId) {
        if (confirm('Are you sure you want to delete this post?')) {
            alert(`Delete post ${postId} - coming soon!`);
        }
    }

    // Verification methods
    async resendEmailVerification() {
        try {
            const response = await window.apiCall('/verification/email/send', {
                method: 'POST'
            });
            
            if (response.ok) {
                alert('Verification email sent! Please check your inbox.');
            } else {
                alert('Failed to send verification email. Please try again.');
            }
        } catch (error) {
            adminDebugError('Email verification error:', error);
            alert('Error sending verification email.');
        }
    }

    async verifyPhone() {
        alert('📱 Phone verification is not yet fully implemented.\n\nThis feature will be available in a future update when SMS costs can be supported.');
    }

    // Settings methods
    changePassword() {
        alert('Password change coming soon!');
    }

    downloadData() {
        alert('Data download coming soon!');
    }

    toggleProfileVisibility(isPublic) {
        alert(`Profile visibility: ${isPublic ? 'Public' : 'Private'} - coming soon!`);
    }

    deactivateAccount() {
        if (confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
            alert('Account deactivation coming soon!');
        }
    }

    // TOTP (Two-Factor Authentication) Methods
    async loadTOTPStatus() {
        try {
            adminDebugLog('🔒 Loading TOTP status...');
            const response = await window.apiCall('/totp/status');
            adminDebugLog('🔒 TOTP status API response:', response);
            if (response.ok) {
                // Extract nested data like other endpoints
                const statusData = response.data?.data || response.data;
                adminDebugLog('🔒 Extracted TOTP status:', statusData);
                this.renderTOTPControls(statusData);
            } else {
                adminDebugError('🔒 TOTP status failed:', response);
                this.renderTOTPError('Failed to load 2FA status');
            }
        } catch (error) {
            adminDebugError('Error loading TOTP status:', error);
            this.renderTOTPError('Network error loading 2FA status');
        }
    }

    renderTOTPControls(status) {
        const totpStatus = document.getElementById('totpStatus');
        const totpControls = document.getElementById('totpControls');
        
        if (!totpStatus || !totpControls) return;

        if (status.enabled) {
            totpStatus.innerHTML = `
                <div class="totp-enabled">
                    <span class="totp-icon">🔒</span>
                    <span>Two-Factor Authentication is <strong>enabled</strong></span>
                    <span class="totp-date">Setup: ${new Date(status.setupAt).toLocaleDateString()}</span>
                </div>
            `;
            
            totpControls.innerHTML = `
                <div class="totp-actions">
                    <button onclick="window.profile.regenerateBackupCodes()" class="btn-secondary">
                        Generate New Backup Codes
                    </button>
                    <button onclick="window.profile.disableTOTP()" class="btn-danger">
                        Disable 2FA
                    </button>
                    <div class="backup-codes-info">
                        <small>Backup codes remaining: ${status.backupCodesRemaining}</small>
                    </div>
                </div>
            `;
        } else {
            totpStatus.innerHTML = `
                <div class="totp-disabled">
                    <span class="totp-icon">🔓</span>
                    <span>Two-Factor Authentication is <strong>disabled</strong></span>
                </div>
            `;
            
            totpControls.innerHTML = `
                <div class="totp-actions">
                    <button onclick="window.profile.setupTOTP()" class="btn">
                        🔒 Enable Two-Factor Authentication
                    </button>
                    <div class="totp-info">
                        <small>Use Google Authenticator, Authy, or similar apps</small>
                    </div>
                </div>
            `;
        }
        
        totpControls.style.display = 'block';
    }

    renderTOTPError(message) {
        const totpStatus = document.getElementById('totpStatus');
        if (totpStatus) {
            totpStatus.innerHTML = `
                <div class="totp-error">
                    <span class="totp-icon">⚠️</span>
                    <span>${message}</span>
                    <button onclick="window.profile.loadTOTPStatus()" class="btn-small">Retry</button>
                </div>
            `;
        }
    }

    async setupTOTP() {
        adminDebugLog('🔒 Starting TOTP setup... [MyProfile.js v1.3.1]');
        try {
            const response = await window.apiCall('/totp/setup', { method: 'POST' });
            adminDebugLog('🔒 TOTP setup API response:', response);
            if (response.ok) {
                adminDebugLog('🔒 API success, showing modal with data:', response.data);
                // Extract the actual data from the nested response
                const totpData = response.data?.data || response.data;
                adminDebugLog('🔒 Extracted TOTP data:', totpData);
                this.showTOTPSetupModal(totpData);
            } else {
                adminDebugError('🔒 TOTP setup failed:', response);
                adminDebugError('🔒 Setup error details:', response.data);
                const errorMsg = response.data?.error || response.data?.message || 'Failed to setup 2FA. Please try again.';
                alert(`Setup failed: ${errorMsg}`);
            }
        } catch (error) {
            adminDebugError('Error setting up TOTP:', error);
            alert('Network error setting up 2FA. Please try again.');
        }
    }

    // Test function to create a simple visible modal
    testModal() {
        adminDebugLog('🧪 Creating test modal...');
        const testModal = document.createElement('div');
        testModal.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 300px !important;
            height: 200px !important;
            background: red !important;
            border: 5px solid yellow !important;
            z-index: 999999 !important;
            color: white !important;
            text-align: center !important;
            padding: 20px !important;
            font-size: 20px !important;
        `;
        testModal.innerHTML = 'TEST MODAL - Click to close';
        testModal.onclick = () => testModal.remove();
        document.body.appendChild(testModal);
        adminDebugLog('🧪 Test modal added');
        return testModal;
    }

    showTOTPSetupModal(setupData) {
        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('TOTPSetup', 'Starting TOTP setup modal', {
                version: 'MyProfile.js v1.1.3',
                hasSetupData: !!setupData
            });
        }
        // Only show TOTP secrets to admin users for security
        if (typeof adminDebugSensitive !== 'undefined') {
            adminDebugSensitive('TOTPSetup', 'TOTP configuration data', {
                hasQrCode: !!setupData?.qrCode,
                hasSecret: !!setupData?.secret,
                secretLength: setupData?.secret?.length || 0
            });
        }
        
        // Remove any existing modals first
        const existingModals = document.querySelectorAll('.modal-overlay, .totp-modal-simple');
        existingModals.forEach(modal => modal.remove());
        
        // Create simple modal similar to working test modal
        const modal = document.createElement('div');
        modal.className = 'totp-modal-simple';
        modal.id = 'totp-setup-modal';
        adminDebugLog('🔒 Modal element created, using simplified approach...');
        
        // Use inline styles like the working test modal
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
            font-family: Arial, sans-serif !important;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">Setup Two-Factor Authentication</h3>
                    <button onclick="this.closest('.totp-modal-simple').remove()" 
                            style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                <div style="margin-bottom: 25px;">
                    <h4 style="color: #333; margin-bottom: 10px;">Step 1: Scan QR Code</h4>
                    <p style="color: #666; margin-bottom: 15px;">Use Google Authenticator, Authy, or similar app:</p>
                    <div style="text-align: center; margin: 15px 0;">
                        <img src="${setupData.qrCode}" alt="QR Code" style="max-width: 200px; border: 1px solid #ddd;">
                    </div>
                    <p style="font-size: 12px; color: #888; text-align: center;">
                        Manual code: <code style="background: #f0f0f0; padding: 2px 4px;">${setupData.secret}</code>
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #333; margin-bottom: 10px;">Step 2: Enter Verification Code</h4>
                    <p style="color: #666; margin-bottom: 10px;">Enter the 6-digit code:</p>
                    <input type="text" id="totpVerificationCode" placeholder="000000" maxlength="6" 
                           style="width: 100%; padding: 10px; font-size: 18px; text-align: center; border: 2px solid #ddd; border-radius: 5px; margin-bottom: 15px;"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                    <div style="text-align: center;">
                        <button onclick="window.profile.verifyTOTPSetup()" 
                                style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">
                            Verify & Enable 2FA
                        </button>
                        <button onclick="this.closest('.totp-modal-simple').remove()" 
                                style="background: #ccc; color: #333; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        adminDebugLog('🔒 Simple modal added to DOM');
        
        // Focus input after a brief delay
        setTimeout(() => {
            const input = document.getElementById('totpVerificationCode');
            if (input) {
                input.focus();
                adminDebugLog('🔒 Input focused');
            }
        }, 100);
    }

    async verifyTOTPSetup() {
        const code = document.getElementById('totpVerificationCode').value;
        if (!code || code.length !== 6) {
            alert('Please enter a 6-digit verification code');
            return;
        }

        try {
            const response = await window.apiCall('/totp/verify-setup', {
                method: 'POST',
                body: JSON.stringify({ token: code })
            });

            if (response.ok) {
                // Extract nested response data, same as setup
                const verifyData = response.data?.data || response.data;
                adminDebugLog('🔒 TOTP verify response data:', verifyData);
                this.showBackupCodesModal(verifyData?.backupCodes);
                document.querySelector('.totp-modal-simple').remove(); // Use correct selector
                this.loadTOTPStatus(); // Refresh status
            } else {
                adminDebugError('🔒 TOTP verify failed:', response);
                alert(response.data?.error || 'Invalid verification code. Please try again.');
            }
        } catch (error) {
            adminDebugError('Error verifying TOTP setup:', error);
            alert('Network error. Please try again.');
        }
    }

    showBackupCodesModal(backupCodes) {
        adminDebugLog('🔒 Showing backup codes modal with:', backupCodes);
        
        // Handle undefined or empty backup codes
        if (!backupCodes || !Array.isArray(backupCodes) || backupCodes.length === 0) {
            alert('2FA has been enabled successfully! However, backup codes were not generated. You can generate them later in your settings.');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'totp-modal-simple'; // Use same class as setup modal
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
            font-family: Arial, sans-serif !important;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">🔑 Backup Codes</h3>
                    <button onclick="this.closest('.totp-modal-simple').remove()" 
                            style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: #666; margin-bottom: 15px;"><strong>Important:</strong> Save these backup codes in a secure location. Each code can only be used once if you lose access to your authenticator app.</p>
                    <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; font-family: monospace;">
                        ${backupCodes.map(code => `<div style="padding: 3px 0; font-size: 14px;">${code}</div>`).join('')}
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="window.profile.copyBackupCodes(${JSON.stringify(backupCodes).replace(/"/g, '&quot;')})" 
                                style="background: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin-right: 10px; cursor: pointer;">
                            📋 Copy to Clipboard
                        </button>
                        <button onclick="this.closest('.totp-modal-simple').remove()" 
                                style="background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                            I've Saved My Codes
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    downloadBackupCodes(codes) {
        const content = `UnitedWeRise Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Each code can only be used once. Store these securely.\n\n${codes.join('\n')}\n\nIf you lose access to your authenticator app, you can use these codes to regain access to your account.`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'unitedwerise-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    copyBackupCodes(codes) {
        const text = codes.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            alert('Backup codes copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy codes. Please manually copy them.');
        });
    }

    async regenerateBackupCodes() {
        if (!confirm('Generate new backup codes? This will invalidate all existing backup codes.')) {
            return;
        }

        const token = prompt('Enter your 2FA code to confirm:');
        if (!token) return;

        try {
            const response = await window.apiCall('/totp/regenerate-backup-codes', {
                method: 'POST',
                body: JSON.stringify({ token })
            });

            if (response.ok) {
                this.showBackupCodesModal(response.data.backupCodes);
                this.loadTOTPStatus(); // Refresh status
            } else {
                alert(response.data?.error || 'Failed to regenerate backup codes');
            }
        } catch (error) {
            adminDebugError('Error regenerating backup codes:', error);
            alert('Network error. Please try again.');
        }
    }

    async disableTOTP() {
        if (!confirm('Disable Two-Factor Authentication? This will make your account less secure.')) {
            return;
        }

        const password = prompt('Enter your password to confirm:');
        if (!password) return;

        try {
            const response = await window.apiCall('/totp/disable', {
                method: 'POST',
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                alert('Two-Factor Authentication has been disabled.');
                this.loadTOTPStatus(); // Refresh status
            } else {
                alert(response.data?.error || 'Failed to disable 2FA');
            }
        } catch (error) {
            adminDebugError('Error disabling TOTP:', error);
            alert('Network error. Please try again.');
        }
    }

    // Photo Gallery Methods
    
    async loadPhotoGalleries(bypassCache = false) {
        adminDebugLog('📸 loadPhotoGalleries called, currentTab:', this.currentTab);
        if (this.currentTab !== 'photos') {
            adminDebugLog('📸 Not on photos tab, returning early');
            return;
        }
        
        adminDebugLog('📸 Making API call to /photos/galleries...');
        try {
            const response = await window.apiCall('/photos/galleries', { bypassCache });
            
            adminDebugLog('📡 Raw galleries API response:', response);
            
            if (response.ok && response.data) {
                adminDebugLog('📡 Galleries API data:', response.data);
                this.updateStorageDisplay(response.data);
                this.updateGalleriesDisplay(response.data.galleries);
            } else {
                document.getElementById('photoGalleries').innerHTML = 
                    '<div class="error-message">Failed to load photo galleries</div>';
            }
        } catch (error) {
            adminDebugError('Error loading galleries:', error);
            document.getElementById('photoGalleries').innerHTML = 
                '<div class="error-message">Error loading photo galleries</div>';
        }
    }

    updateStorageDisplay(data) {
        const storageInfo = document.getElementById('storageInfo');
        if (!storageInfo) return;

        const usedMB = Math.round(data.totalStorageUsed / 1024 / 1024);
        const limitMB = Math.round(data.storageLimit / 1024 / 1024);
        const percentage = Math.round((data.totalStorageUsed / data.storageLimit) * 100);

        storageInfo.innerHTML = `
            <div class="storage-bar">
                <div class="storage-used" style="width: ${percentage}%"></div>
            </div>
            <span class="storage-text">${usedMB}MB / ${limitMB}MB used (${percentage}%)</span>
        `;
    }

    updateGalleriesDisplay(galleries) {
        const container = document.getElementById('photoGalleries');
        if (!container) return;

        // Debug logging to see what gallery data we're getting
        adminDebugLog('🖼️ Gallery data received:', galleries);
        if (galleries && galleries.length > 0) {
            adminDebugLog('🖼️ First gallery photos:', galleries[0].photos);
            adminDebugLog('🖼️ Sample photo URLs:', galleries[0].photos?.[0]?.url, galleries[0].photos?.[0]?.thumbnailUrl);
        }

        if (!galleries || galleries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Photos Yet</h3>
                    <p>Start building your photo gallery by uploading your first photos!</p>
                    <button onclick="window.profile.uploadPhotos()" class="btn">Upload Photos</button>
                </div>
            `;
            return;
        }

        container.innerHTML = galleries.map(gallery => `
            <div class="gallery-section">
                <div class="gallery-header">
                    <h4>${gallery.name}</h4>
                    <span class="gallery-stats">${gallery.photoCount} photos • ${Math.round(gallery.totalSize / 1024 / 1024)}MB</span>
                </div>
                <div class="photo-grid">
                    ${gallery.photos.map(photo => `
                        <div class="photo-item" data-photo-id="${photo.id}">
                            <img src="${photo.thumbnailUrl || photo.url}" alt="${photo.caption || photo.filename}">
                            ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
                            <div class="photo-overlay">
                                <button onclick="window.profile.setAsProfilePicture('${photo.id}')" class="photo-action">
                                    👤 Set as Profile
                                </button>
                                <button onclick="window.profile.movePhoto('${photo.id}')" class="photo-action">
                                    📁 Move
                                </button>
                                <button onclick="window.profile.deletePhoto('${photo.id}')" class="photo-action delete">
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    uploadPhotos() {
        document.getElementById('bulkPhotoUpload').click();
    }

    async handleBulkUpload(input) {
        const files = Array.from(input.files);
        if (files.length === 0) return;

        // Validate files
        const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
        if (invalidFiles.length > 0) {
            alert(`Invalid files detected: ${invalidFiles.map(f => f.name).join(', ')}\nOnly image files are allowed.`);
            return;
        }

        // Check individual file sizes
        const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}\nEach file must be under 10MB.`);
            return;
        }

        const gallery = prompt('Enter gallery name (or leave empty for "My Photos"):') || 'My Photos';
        const caption = prompt('Add a caption (optional, max 200 characters):') || '';

        const formData = new FormData();
        files.forEach(file => formData.append('photos', file));
        formData.append('photoType', 'GALLERY');
        formData.append('purpose', 'PERSONAL');
        formData.append('gallery', gallery);
        if (caption.trim()) {
            formData.append('caption', caption.substring(0, 200));
        }

        try {
            const response = await window.apiCall('/photos/upload', {
                method: 'POST',
                body: formData,
                skipContentType: true // Let browser set multipart boundary
            });

            if (response.ok) {
                alert(`Successfully uploaded ${files.length} photo(s) to "${gallery}"`);
                
                // Force fresh gallery data by bypassing cache
                this.loadPhotoGalleries(true); // Reload galleries with fresh data
            } else {
                const errorMsg = response.data?.message || 'Failed to upload photos';
                alert(`Upload failed: ${errorMsg}`);
            }
        } catch (error) {
            adminDebugError('Bulk upload error:', error);
            alert('Error uploading photos. Please try again.');
        }
        
        // Clear input
        input.value = '';
    }

    async setAsProfilePicture(photoId) {
        try {
            const response = await window.apiCall(`/photos/${photoId}/set-profile`, {
                method: 'POST'
            });

            if (response.ok) {
                alert('Profile picture updated successfully!');
                this.render('mainContent'); // Reload entire profile to show new avatar
            } else {
                alert('Failed to set profile picture');
            }
        } catch (error) {
            adminDebugError('Error setting profile picture:', error);
            alert('Error updating profile picture');
        }
    }

    async movePhoto(photoId) {
        const newGallery = prompt('Enter new gallery name:');
        if (!newGallery) return;

        try {
            const response = await window.apiCall(`/photos/${photoId}/gallery`, {
                method: 'PUT',
                body: { gallery: newGallery }
            });

            if (response.ok) {
                this.loadPhotoGalleries(); // Reload galleries
            } else {
                alert('Failed to move photo');
            }
        } catch (error) {
            adminDebugError('Error moving photo:', error);
            alert('Error moving photo');
        }
    }

    async deletePhoto(photoId) {
        if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await window.apiCall(`/photos/${photoId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadPhotoGalleries(); // Reload galleries
            } else {
                alert('Failed to delete photo');
            }
        } catch (error) {
            adminDebugError('Error deleting photo:', error);
            alert('Error deleting photo');
        }
    }

    createGallery() {
        const galleryName = prompt('Enter gallery name:');
        if (!galleryName) return;

        alert(`Gallery creation for "${galleryName}" - next upload will use this gallery name`);
    }

    addStyles() {
        if (document.getElementById('myProfileStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'myProfileStyles';
        styles.textContent = `
            .my-profile {
                max-width: 1000px;
                margin: 0 auto;
                padding: 2rem;
                background: white;
                min-height: calc(100vh - 7.5vh);
                overflow-y: auto;
                max-height: calc(100vh - 7.5vh);
                /* Hide scrollbar */
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE and Edge */
            }
            
            .my-profile::-webkit-scrollbar {
                display: none; /* Chrome, Safari, Opera */
            }

            .profile-header {
                display: flex;
                gap: 2rem;
                margin-bottom: 2rem;
                padding-bottom: 2rem;
                border-bottom: 2px solid #eee;
                align-items: flex-start;
            }

            .profile-picture-container {
                position: relative;
            }

            .profile-picture {
                width: 150px;
                height: 150px;
                border-radius: 50%;
                overflow: hidden;
                border: 4px solid #4b5c09;
                cursor: pointer;
                transition: transform 0.2s;
            }

            .profile-picture:hover {
                transform: scale(1.05);
            }

            .profile-picture img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .profile-placeholder {
                width: 100%;
                height: 100%;
                background: #f5f5f5;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #333;
            }

            .profile-placeholder p {
                margin: 0.5rem 0 0 0;
                font-size: 0.8rem;
            }

            .change-photo-btn {
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                background: #4b5c09;
                color: white;
                border: none;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.8rem;
                cursor: pointer;
            }

            .profile-info h1 {
                margin: 0 0 0.5rem 0;
                color: #4b5c09;
                font-size: 2rem;
            }

            .full-name {
                font-size: 1.2rem;
                color: #333;
                margin: 0 0 1rem 0;
            }

            .bio {
                font-style: italic;
                margin-bottom: 1.5rem;
                color: #333;
            }

            .bio-placeholder {
                color: #999;
                font-style: italic;
                margin-bottom: 1.5rem;
            }

            .profile-stats {
                display: flex;
                gap: 2rem;
            }

            .stat {
                text-align: center;
            }

            .stat strong {
                display: block;
                font-size: 1.5rem;
                color: #4b5c09;
            }

            .stat span {
                color: #333;
                font-size: 0.9rem;
            }

            .profile-tabs {
                display: flex;
                border-bottom: 2px solid #eee;
                margin-bottom: 2rem;
            }

            .tab-button {
                padding: 1rem 2rem;
                border: none;
                background: none;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                transition: all 0.2s;
                font-size: 1rem;
            }

            .tab-button:hover {
                background: #f5f5f5;
            }

            .tab-button.active {
                border-bottom-color: #4b5c09;
                color: #4b5c09;
                font-weight: bold;
            }

            .tab-pane {
                animation: fadeIn 0.3s;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }

            .section-header h3 {
                margin: 0;
                color: #4b5c09;
            }

            .edit-btn {
                background: #4b5c09;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .info-item {
                display: flex;
                flex-direction: column;
            }

            .info-item.full-width {
                grid-column: 1 / -1;
            }

            .info-item label {
                font-weight: bold;
                color: #4b5c09;
                margin-bottom: 0.25rem;
                font-size: 0.9rem;
            }

            .info-item span {
                color: #333;
                padding: 0.5rem 0;
            }

            .help-text {
                color: #555;
                font-style: italic;
                margin-top: 1rem;
            }

            .posts-header {
                margin-bottom: 2rem;
            }

            .posts-header h3 {
                margin: 0 0 0.5rem 0;
                color: #4b5c09;
            }

            .posts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1.5rem;
            }

            .post-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 1rem;
                background: white;
                transition: box-shadow 0.2s;
            }

            .post-card:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .post-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                font-size: 0.9rem;
                color: #555;
            }

            .post-menu button {
                background: none;
                border: none;
                cursor: pointer;
                color: #555;
                margin-left: 0.5rem;
            }

            .delete-btn {
                color: #d32f2f !important;
            }

            .post-content {
                margin-bottom: 1rem;
                line-height: 1.5;
            }

            .post-image {
                width: 100%;
                border-radius: 4px;
                margin-bottom: 1rem;
            }

            .post-stats {
                display: flex;
                gap: 1rem;
                font-size: 0.9rem;
                color: #555;
            }

            .political-tag {
                color: #4b5c09 !important;
                font-weight: bold;
            }

            .empty-state {
                text-align: center;
                padding: 3rem;
                color: #555;
            }

            .empty-state h3 {
                margin-bottom: 1rem;
            }

            .quick-post-composer {
                max-width: 500px;
                margin: 2rem auto 0;
            }

            .quick-post-composer textarea {
                width: 100%;
                padding: 1rem;
                border: 2px solid #eee;
                border-radius: 8px;
                font-size: 1rem;
                font-family: inherit;
                resize: vertical;
                transition: border-color 0.2s;
            }

            .quick-post-composer textarea:focus {
                outline: none;
                border-color: #4b5c09;
            }

            .btn {
                background: #4b5c09;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1rem;
            }

            .btn:hover {
                background: #3d4a08;
            }

            .error-state {
                text-align: center;
                padding: 3rem;
                color: #d32f2f;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #4b5c09;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 1rem auto;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Photo Gallery Styles */
            .photos-section {
                max-width: 1000px;
                margin: 0 auto;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding-bottom: 1rem;
                border-bottom: 2px solid #eee;
            }

            .photo-actions {
                display: flex;
                gap: 1rem;
            }

            .btn-secondary {
                background: #f5f5f5;
                color: #333;
                border: 2px solid #ddd;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 1rem;
            }

            .btn-secondary:hover {
                background: #eee;
                border-color: #ccc;
            }

            .storage-info {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 2rem;
            }

            .storage-bar {
                width: 100%;
                height: 10px;
                background: #e0e0e0;
                border-radius: 5px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }

            .storage-used {
                height: 100%;
                background: linear-gradient(90deg, #4b5c09, #6b7d0a);
                transition: width 0.3s ease;
            }

            .storage-text {
                font-size: 0.9rem;
                color: #555;
            }

            .gallery-section {
                margin-bottom: 3rem;
            }

            .gallery-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #ddd;
            }

            .gallery-header h4 {
                margin: 0;
                color: #4b5c09;
                font-size: 1.3rem;
            }

            .gallery-stats {
                font-size: 0.9rem;
                color: #666;
            }

            .photo-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
            }

            .photo-item {
                position: relative;
                aspect-ratio: 1;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s;
            }

            .photo-item:hover {
                transform: scale(1.02);
            }

            .photo-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .photo-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 0.5rem;
                opacity: 0;
                transition: opacity 0.2s;
            }

            .photo-item:hover .photo-overlay {
                opacity: 1;
            }

            .photo-action {
                background: rgba(255,255,255,0.9);
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8rem;
                transition: background 0.2s;
            }

            .photo-action:hover {
                background: white;
            }

            .photo-action.delete:hover {
                background: #d32f2f;
                color: white;
            }

            .empty-state {
                text-align: center;
                padding: 3rem;
                color: #666;
            }

            .empty-state h3 {
                color: #4b5c09;
                margin-bottom: 1rem;
            }

            .error-message {
                text-align: center;
                padding: 2rem;
                color: #d32f2f;
                background: #ffeaea;
                border-radius: 8px;
                margin: 1rem 0;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .my-profile {
                    padding: 1rem;
                }
                
                .profile-header {
                    flex-direction: column;
                    text-align: center;
                    gap: 1rem;
                }
                
                .info-grid {
                    grid-template-columns: 1fr;
                }
                
                .posts-grid {
                    grid-template-columns: 1fr;
                }
                
                .profile-tabs {
                    overflow-x: auto;
                }
                
                .tab-button {
                    flex-shrink: 0;
                    padding: 0.75rem 1rem;
                }
            }

            /* Photo Tagging Privacy Settings */
            .photo-privacy-settings {
                margin-top: 1rem;
            }

            .sub-settings {
                margin-left: 2rem;
                padding-left: 1rem;
                border-left: 2px solid #e0e0e0;
                margin-top: 0.5rem;
                transition: opacity 0.3s;
            }

            .sub-settings.disabled {
                opacity: 0.5;
                pointer-events: none;
            }

            .setting-item {
                display: flex;
                align-items: center;
                margin: 0.75rem 0;
                cursor: pointer;
                transition: background 0.2s;
                padding: 0.5rem;
                border-radius: 4px;
            }

            .setting-item:hover {
                background: #f5f5f5;
            }

            .setting-item input[type="checkbox"] {
                margin-right: 0.75rem;
                width: 18px;
                height: 18px;
                cursor: pointer;
            }

            .setting-item span {
                font-size: 0.95rem;
                color: #333;
            }

            .pending-tags-section {
                margin-top: 1.5rem;
                padding-top: 1rem;
                border-top: 1px solid #e0e0e0;
            }

            .badge {
                background: #e67e22;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.8rem;
                margin-left: 0.5rem;
                display: inline-block;
                min-width: 20px;
                text-align: center;
            }

            .badge:empty {
                display: none;
            }

            /* Pending Tags Modal */
            .pending-tags-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                z-index: 10001;
            }

            .pending-tags-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .pending-tags-body {
                padding: 1rem;
            }

            .pending-tag-item {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .pending-tag-photo {
                width: 80px;
                height: 80px;
                border-radius: 4px;
                object-fit: cover;
            }

            .pending-tag-info {
                flex: 1;
            }

            .pending-tag-actions {
                display: flex;
                gap: 0.5rem;
            }

            .approve-btn {
                background: #27ae60;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
            }

            .decline-btn {
                background: #e74c3c;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
            }

            /* Policy Platform Styles */
            .policy-platform-section {
                padding: 0;
            }

            .policy-platform-section .section-description {
                color: #666;
                font-size: 0.95rem;
                margin-bottom: 2rem;
                line-height: 1.5;
            }

            .policy-composer {
                background: #f8f9fa;
                padding: 2rem;
                border-radius: 8px;
                margin-bottom: 2rem;
            }

            .policy-composer .form-group {
                margin-bottom: 1.5rem;
            }

            .policy-composer label {
                display: block;
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: #333;
            }

            .policy-composer input[type="text"],
            .policy-composer textarea,
            .policy-composer select {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.95rem;
                font-family: inherit;
            }

            .policy-composer textarea {
                resize: vertical;
            }

            .policy-composer .form-actions {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .policy-composer .publish-section {
                padding: 1rem;
                background: #e8f5e8;
                border-radius: 4px;
                border: 1px solid #c3e6c3;
            }

            .policy-composer .checkbox-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 500;
                cursor: pointer;
            }

            .policy-composer .buttons {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }

            .policy-positions-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .policy-position-card {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1.5rem;
                transition: box-shadow 0.2s;
            }

            .policy-position-card:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .position-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .position-category {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .category-icon {
                font-size: 1.2rem;
            }

            .category-name {
                font-weight: 600;
                color: #4b5c09;
            }

            .position-meta {
                display: flex;
                gap: 1rem;
                align-items: center;
                font-size: 0.85rem;
            }

            .position-priority {
                color: #666;
            }

            .status-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .status-badge.published {
                background: #d4edda;
                color: #155724;
            }

            .status-badge.draft {
                background: #fff3cd;
                color: #856404;
            }

            .position-title {
                color: #333;
                margin: 0 0 0.5rem 0;
                font-size: 1.2rem;
                line-height: 1.3;
            }

            .position-stance {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.75rem;
                font-weight: 600;
            }

            .position-summary {
                color: #555;
                line-height: 1.5;
                margin-bottom: 1rem;
            }

            .position-details {
                border-top: 1px solid #eee;
                padding-top: 1rem;
                margin-top: 1rem;
            }

            .position-details h5 {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 0.95rem;
            }

            .position-details p {
                color: #555;
                line-height: 1.5;
                margin-bottom: 1rem;
            }

            .position-details ul {
                margin: 0 0 1rem 0;
                padding-left: 1.5rem;
            }

            .position-details li {
                color: #555;
                line-height: 1.5;
                margin-bottom: 0.25rem;
            }

            .position-details a {
                color: #4b5c09;
                text-decoration: none;
            }

            .position-details a:hover {
                text-decoration: underline;
            }

            .position-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
                flex-wrap: wrap;
            }

            .empty-state,
            .error-message {
                text-align: center;
                padding: 3rem 2rem;
                color: #666;
            }

            .empty-icon,
            .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                display: block;
            }

            .empty-state h4 {
                color: #333;
                margin-bottom: 0.5rem;
            }

            .loading-message {
                text-align: center;
                padding: 2rem;
                color: #666;
                font-style: italic;
            }

            /* Mobile responsiveness for policy platform */
            @media (max-width: 768px) {
                .policy-composer {
                    padding: 1rem;
                }

                .position-header {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .position-meta {
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: flex-start;
                }

                .position-actions {
                    flex-direction: column;
                }

                .policy-composer .buttons {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Update photo tagging preferences
     */
    async updateTaggingPreference(preference, value) {
        try {
            // If disabling tagging entirely, also disable sub-settings
            if (preference === 'photoTaggingEnabled' && !value) {
                document.querySelectorAll('.sub-settings input').forEach(input => {
                    input.disabled = true;
                });
                document.querySelector('.sub-settings').classList.add('disabled');
            } else if (preference === 'photoTaggingEnabled' && value) {
                document.querySelectorAll('.sub-settings input').forEach(input => {
                    input.disabled = false;
                });
                document.querySelector('.sub-settings').classList.remove('disabled');
            }

            const response = await window.apiCall('/photo-tags/preferences', {
                method: 'PUT',
                body: JSON.stringify({ [preference]: value })
            });

            if (response.ok) {
                // Update local profile
                this.userProfile[preference] = value;
                
                // Show success feedback
                const message = preference === 'photoTaggingEnabled' 
                    ? (value ? 'Photo tagging enabled' : 'Photo tagging disabled')
                    : 'Preference updated successfully';
                
                if (window.postComponent && window.postComponent.showToast) {
                    window.postComponent.showToast(message);
                } else {
                    this.showToast(message);
                }
            } else {
                throw new Error(response.error || 'Failed to update preference');
            }
        } catch (error) {
            adminDebugError('Error updating tagging preference:', error);
            alert('Failed to update preference. Please try again.');
            
            // Revert checkbox state
            document.getElementById(preference).checked = !value;
        }
    }

    /**
     * View and manage pending photo tags
     */
    async viewPendingTags() {
        try {
            const response = await window.apiCall('/photo-tags/pending');
            
            if (response.ok) {
                const pendingTags = response.data.pendingTags || [];
                this.showPendingTagsModal(pendingTags);
            } else {
                alert('Failed to load pending tags');
            }
        } catch (error) {
            adminDebugError('Error loading pending tags:', error);
            alert('Error loading pending tags. Please try again.');
        }
    }

    /**
     * Show modal with pending tags
     */
    showPendingTagsModal(pendingTags) {
        // Remove any existing modal
        const existingModal = document.getElementById('pendingTagsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'pendingTagsModal';
        modalOverlay.innerHTML = `
            <div class="pending-tags-modal">
                <div class="pending-tags-header">
                    <h3>Pending Photo Tags (${pendingTags.length})</h3>
                    <button onclick="document.getElementById('pendingTagsModal').remove()" class="close-btn">&times;</button>
                </div>
                <div class="pending-tags-body">
                    ${pendingTags.length === 0 ? 
                        '<p>No pending tags to review</p>' :
                        pendingTags.map(tag => `
                            <div class="pending-tag-item" data-tag-id="${tag.id}">
                                <img src="${tag.photo.thumbnailUrl || tag.photo.url}" 
                                     alt="Tagged photo" 
                                     class="pending-tag-photo">
                                <div class="pending-tag-info">
                                    <strong>${tag.taggedBy.firstName || tag.taggedBy.username}</strong> tagged you
                                    ${tag.photo.caption ? `<p>"${tag.photo.caption}"</p>` : ''}
                                    <small>${this.getTimeAgo(new Date(tag.createdAt))}</small>
                                </div>
                                <div class="pending-tag-actions">
                                    <button class="approve-btn" onclick="window.profile.respondToTag('${tag.id}', true)">
                                        ✓ Approve
                                    </button>
                                    <button class="decline-btn" onclick="window.profile.respondToTag('${tag.id}', false)">
                                        ✗ Decline
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;

        // Add click handler to close modal when clicking overlay
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        };

        document.body.appendChild(modalOverlay);
    }

    /**
     * Respond to a pending tag
     */
    async respondToTag(tagId, approve) {
        try {
            const response = await window.apiCall(`/photo-tags/${tagId}/respond`, {
                method: 'POST',
                body: JSON.stringify({ approve })
            });

            if (response.ok) {
                // Remove the tag item from modal
                const tagItem = document.querySelector(`[data-tag-id="${tagId}"]`);
                if (tagItem) {
                    tagItem.style.transition = 'opacity 0.3s, transform 0.3s';
                    tagItem.style.opacity = '0';
                    tagItem.style.transform = 'translateX(20px)';
                    setTimeout(() => tagItem.remove(), 300);
                }

                // Update pending count
                this.updatePendingTagsCount();

                const message = approve ? 'Tag approved' : 'Tag declined';
                if (window.postComponent && window.postComponent.showToast) {
                    window.postComponent.showToast(message);
                } else {
                    this.showToast(message);
                }
            } else {
                throw new Error(response.error || 'Failed to respond to tag');
            }
        } catch (error) {
            adminDebugError('Error responding to tag:', error);
            alert('Failed to respond to tag. Please try again.');
        }
    }

    /**
     * Update pending tags count badge
     */
    async updatePendingTagsCount() {
        try {
            const response = await window.apiCall('/photo-tags/pending');
            
            if (response.ok) {
                const count = response.data.count || 0;
                const badge = document.getElementById('pendingTagsCount');
                if (badge) {
                    badge.textContent = count > 0 ? count : '';
                }
            }
        } catch (error) {
            adminDebugError('Error updating pending tags count:', error);
        }
    }

    /**
     * Load messages from admin for candidate users
     */
    async loadCandidateMessages() {
        try {
            const response = await window.apiCall('/candidate/admin-messages');
            
            if (response.ok && response.data) {
                // Handle the API response structure: { success: true, data: { candidate, messages, unreadAdminCount } }
                const responseData = response.data.data || response.data;
                adminDebugLog('Candidate messages API response:', responseData);
                
                // Extract messages array from nested structure
                let messages = [];
                if (Array.isArray(responseData)) {
                    messages = responseData;
                } else if (responseData.messages && Array.isArray(responseData.messages)) {
                    messages = responseData.messages;
                } else if (responseData.data && Array.isArray(responseData.data)) {
                    messages = responseData.data;
                }
                
                this.displayCandidateMessages(messages);
                // Update unread badge
                await this.updateUnreadBadge();
            } else {
                throw new Error(response.message || 'Failed to load messages');
            }
        } catch (error) {
            adminDebugError('Error loading candidate messages:', error);
            const container = document.getElementById('candidateMessagesContainer');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; color: #dc3545; margin: 2rem 0;">
                        <p>❌ Error loading messages</p>
                        <p style="font-size: 0.875rem;">${error.message}</p>
                        <button onclick="window.profile.loadCandidateMessages()" style="background: #4b5c09; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">Try Again</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Display candidate messages in the UI
     */
    displayCandidateMessages(messages) {
        const container = document.getElementById('candidateMessagesContainer');
        if (!container) return;

        // Ensure messages is an array
        if (!Array.isArray(messages)) {
            adminDebugError('Messages is not an array:', messages);
            messages = [];
        }

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; margin: 2rem 0;">
                    <p>💬 No messages yet</p>
                    <p style="font-size: 0.875rem;">When admins send you messages, they'll appear here.</p>
                </div>
            `;
            return;
        }

        // Sort messages by creation date (oldest first)
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        let messagesHtml = '';
        messages.forEach(message => {
            const isFromAdmin = message.isFromAdmin;
            const timestamp = new Date(message.createdAt).toLocaleString();
            
            const priorityBadge = message.priority !== 'NORMAL' ? 
                `<span style="font-size: 0.75rem; padding: 0.125rem 0.25rem; border-radius: 3px; background: ${message.priority === 'URGENT' ? '#dc3545' : '#ffc107'}; color: ${message.priority === 'URGENT' ? 'white' : 'black'};">${message.priority}</span>` : '';
                
            const typeBadge = message.messageType !== 'GENERAL' ?
                `<span style="font-size: 0.75rem; padding: 0.125rem 0.25rem; border-radius: 3px; background: #6c757d; color: white; margin-left: 0.25rem;">${message.messageType.replace('_', ' ')}</span>` : '';

            messagesHtml += `
                <div style="margin-bottom: 1rem; padding: 0.75rem; border-radius: 8px; max-width: 80%; 
                    ${isFromAdmin 
                        ? 'margin-right: auto; background: #e3f2fd; border-left: 4px solid #2196f3;' 
                        : 'margin-left: auto; background: #4b5c09; color: white; border-left: 4px solid #2196f3;'}">
                    <div style="font-size: 0.875rem; margin-bottom: 0.5rem; ${isFromAdmin ? 'color: #555;' : 'color: #fff; opacity: 0.9;'}">
                        <strong>${isFromAdmin ? '👨‍💼 Admin' : '🗳️ You'}</strong>
                        <span style="margin-left: 0.5rem; font-size: 0.75rem;">${timestamp}</span>
                        ${priorityBadge}${typeBadge}
                    </div>
                    <div style="white-space: pre-wrap; line-height: 1.4;">${message.content}</div>
                </div>
            `;
        });

        container.innerHTML = messagesHtml;
        // Scroll to bottom to show latest messages
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Setup message form event handling
     */
    setupMessageForm() {
        const form = document.getElementById('candidateMessageForm');
        if (!form) return;

        // Remove existing listeners
        form.removeEventListener('submit', this.handleMessageSubmit);
        
        // Add new listener
        this.handleMessageSubmit = this.handleMessageSubmit.bind(this);
        form.addEventListener('submit', this.handleMessageSubmit);
    }

    /**
     * Handle message form submission
     */
    async handleMessageSubmit(e) {
        e.preventDefault();
        
        const contentInput = document.getElementById('candidateMessageContent');
        const content = contentInput.value.trim();
        
        if (!content) {
            alert('Please enter a message');
            return;
        }

        // Disable form during submission
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            let messageSent = false;
            
            // Debug WebSocket availability
            adminDebugLog('🔍 WebSocket Debug Info:');
            adminDebugLog('  - window.unifiedMessaging exists:', !!window.unifiedMessaging);
            adminDebugLog('  - isWebSocketConnected:', window.unifiedMessaging?.isWebSocketConnected?.());
            adminDebugLog('  - isConnected:', window.unifiedMessaging?.isConnected);
            
            // Try WebSocket first if available and connected
            if (window.unifiedMessaging && window.unifiedMessaging.isWebSocketConnected()) {
                adminDebugLog('📤 Attempting to send candidate message via WebSocket');
                try {
                    const success = window.unifiedMessaging.sendMessage(
                        'ADMIN_CANDIDATE',
                        'admin', // recipient is admin
                        content
                    );
                    
                    if (success) {
                        adminDebugLog('✅ WebSocket message sent successfully');
                        messageSent = true;
                        // Clear form
                        contentInput.value = '';
                        
                        // Immediately add the message to display (don't wait for WebSocket confirmation)
                        const currentUser = window.currentUser;
                        this.addMessageToDisplay({
                            id: Date.now().toString(),
                            senderId: currentUser?.id,
                            content: content,
                            createdAt: new Date().toISOString(),
                            isFromAdmin: false
                        });
                        
                        this.showToast('Message sent successfully!');
                    } else {
                        adminDebugWarn('⚠️ WebSocket send returned false, falling back to REST API');
                    }
                } catch (wsError) {
                    adminDebugError('❌ WebSocket send error:', wsError);
                    adminDebugLog('🔄 Falling back to REST API due to WebSocket error');
                }
            } else {
                adminDebugLog('🔌 WebSocket not available or not connected, using REST API');
            }
            
            // Use REST API if WebSocket failed or unavailable
            if (!messageSent) {
                adminDebugLog('📤 Sending candidate message via REST API');
                const response = await window.apiCall('/unified-messages/send', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: 'ADMIN_CANDIDATE',
                        recipientId: 'admin',
                        content
                    })
                });

                if (response.ok) {
                    adminDebugLog('✅ REST API message sent successfully');
                    // Clear form
                    contentInput.value = '';
                    
                    // Reload messages to show the new one
                    await this.loadCandidateMessages();
                    
                    this.showToast('Message sent successfully!');
                    messageSent = true;
                } else {
                    throw new Error(response.data?.error || 'Failed to send message');
                }
            }
            
            if (!messageSent) {
                throw new Error('Failed to send message via both WebSocket and REST API');
            }
        } catch (error) {
            adminDebugError('Error sending message:', error);
            alert('Error sending message: ' + error.message);
        } finally {
            // Re-enable form
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    /**
     * Refresh messages manually
     */
    async refreshMessages() {
        await this.loadCandidateMessages();
        this.showToast('Messages refreshed');
    }

    /**
     * Update unread messages badge
     */
    async updateUnreadBadge() {
        try {
            const response = await window.apiCall('/candidate/admin-messages/unread-count');
            
            if (response.ok && response.data) {
                const unreadCount = response.data.unreadCount || 0;
                const badge = document.getElementById('unreadBadge');
                
                if (badge) {
                    if (unreadCount > 0) {
                        badge.style.display = 'inline-block';
                        badge.textContent = unreadCount;
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            adminDebugError('Error updating unread badge:', error);
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Policy Platform Management Methods

    /**
     * Set up policy position form handling
     */

    // Notification preference methods
    getNotificationPreference(key) {
        const prefs = this.userProfile?.notificationPreferences || {};
        
        // Default values for different notification types
        const defaults = {
            browserNotifications: true,
            browserNotifyNewMessages: true,
            browserNotifyLikes: false,
            browserNotifyComments: true,
            emailNotifications: true,
            emailNotifyImportantMessages: true,
            emailNotifyWeeklyDigest: false,
            emailNotifySecurityAlerts: true,
            candidateInboxNotifications: true,
            candidateElectionReminders: true
        };
        
        return prefs[key] !== undefined ? prefs[key] : defaults[key];
    }

    async updateNotificationPreference(key, value) {
        try {
            const response = await window.apiCall('/user/notification-preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    [key]: value
                })
            });

            if (response.ok && response.data?.success) {
                // Update local user profile
                if (!this.userProfile.notificationPreferences) {
                    this.userProfile.notificationPreferences = {};
                }
                this.userProfile.notificationPreferences[key] = value;

                // Handle special cases
                if (key === 'browserNotifications' && value) {
                    // Request permission when enabling browser notifications
                    this.requestNotificationPermission();
                } else if (key === 'browserNotifications' && !value) {
                    // Disable all browser notification sub-options
                    this.updateNotificationPreference('browserNotifyNewMessages', false);
                    this.updateNotificationPreference('browserNotifyLikes', false);
                    this.updateNotificationPreference('browserNotifyComments', false);
                } else if (key === 'emailNotifications' && !value) {
                    // Disable all email notification sub-options (except security alerts)
                    this.updateNotificationPreference('emailNotifyImportantMessages', false);
                    this.updateNotificationPreference('emailNotifyWeeklyDigest', false);
                }

                // Re-render the settings tab to update UI
                this.switchTab('settings');

                this.showToast('Notification preferences updated');
            } else {
                throw new Error(response.data?.error || 'Failed to update notification preferences');
            }
        } catch (error) {
            adminDebugError('Error updating notification preferences:', error);
            this.showToast('Failed to update notification preferences', 5000);
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Browser notifications are not supported', 3000);
            return;
        }

        if (Notification.permission === 'granted') {
            this.showToast('Browser notifications are already enabled', 3000);
            return;
        }

        if (Notification.permission === 'denied') {
            this.showToast('Browser notifications are blocked. Please enable them in your browser settings.', 5000);
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.showToast('Browser notifications enabled!', 3000);
                // Update the browser notifications preference
                this.updateNotificationPreference('browserNotifications', true);
            } else {
                this.showToast('Browser notifications were denied', 3000);
                // Disable browser notifications preference
                this.updateNotificationPreference('browserNotifications', false);
            }
        } catch (error) {
            adminDebugError('Error requesting notification permission:', error);
            this.showToast('Failed to request notification permission', 3000);
        }
    }

    testNotification() {
        if (!this.getNotificationPreference('browserNotifications')) {
            this.showToast('Browser notifications are disabled. Enable them to test.', 3000);
            return;
        }

        if (Notification.permission !== 'granted') {
            this.showToast('Browser permission not granted. Click "Grant Browser Permission" first.', 5000);
            return;
        }

        // Test notification
        new Notification('United We Rise - Test Notification', {
            body: 'This is a test notification. Your notifications are working correctly!',
            icon: '/UWR Logo on Circle.png',
            badge: '/UWR Logo on Circle.png'
        });

        this.showToast('Test notification sent!', 3000);
    }

    // Check if user is a candidate and show candidate-specific notification settings
    async checkCandidateNotificationSettings() {
        try {
            const response = await window.apiCall('/candidate-policy-platform/candidate/status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok && response.data?.success) {
                // User is a candidate, show candidate notification settings
                const candidateSettings = document.getElementById('candidateNotificationSettings');
                if (candidateSettings) {
                    candidateSettings.style.display = 'block';
                }
            }
        } catch (error) {
            // User is not a candidate or error occurred, keep candidate settings hidden
            adminDebugLog('User is not a candidate or error checking status');
        }
    }

    // Enhanced switchTab with photo gallery support and candidate settings
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Load data for specific tabs
        if (tabName === 'settings') {
            setTimeout(() => {
                this.updatePendingTagsCount();
                this.checkCandidateNotificationSettings();
            }, 100);
        } else if (tabName === 'photos') {
            adminDebugLog('📸 Photos tab selected, loading galleries...');
            setTimeout(() => {
                adminDebugLog('📸 Calling loadPhotoGalleries...');
                this.loadPhotoGalleries();
            }, 100);
        } else if (tabName === 'messages') {
            setTimeout(() => {
                this.loadCandidateMessages();
                this.setupMessageForm();
            }, 100);
        }
        
        const contentArea = document.querySelector('.tab-content');
        if (contentArea) {
            contentArea.innerHTML = this.renderTabContent();
        }

        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`[onclick*="'${tabName}'"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Activity Feed Methods

    async loadUserActivities(reset = false) {
        if (reset) {
            this.activityOffset = 0;
            this.userActivities = [];
        }

        try {
            const enabledTypes = Object.keys(this.activityFilters)
                .filter(type => this.activityFilters[type]);

            const params = new URLSearchParams({
                offset: this.activityOffset.toString(),
                limit: this.activityLimit.toString()
            });

            if (enabledTypes.length > 0) {
                params.append('types', enabledTypes.join(','));
            }

            if (this.activitySearchQuery) {
                params.append('search', this.activitySearchQuery);
            }

            const response = await window.apiCall(`/users/activity/me?${params}`);

            if (response.ok && response.data.success) {
                const newActivities = response.data.data.activities;

                if (reset) {
                    this.userActivities = newActivities;
                } else {
                    this.userActivities = [...this.userActivities, ...newActivities];
                }

                this.activityOffset += newActivities.length;

                // Update the activity feed display
                this.updateActivityDisplay();

                adminDebugLog('Activity', `Loaded ${newActivities.length} activities, total: ${this.userActivities.length}`);
            } else {
                throw new Error(response.data?.error || 'Failed to load activities');
            }
        } catch (error) {
            adminDebugError('Error loading user activities:', error);
            // Show error in the activity feed
            const activityFeed = document.getElementById('activityFeed');
            if (activityFeed) {
                activityFeed.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 2rem; color: #dc3545;">
                        <h3>Unable to load activities</h3>
                        <p>${error.message}</p>
                        <button onclick="window.profile.loadUserActivities(true)" class="btn">Try Again</button>
                    </div>
                `;
            }
        }
    }

    updateActivityDisplay() {
        const activityFeed = document.getElementById('activityFeed');
        if (activityFeed) {
            activityFeed.innerHTML = this.userActivities.length === 0 ?
                this.renderEmptyActivityState() :
                this.renderActivityList();
        }

        // Update load more button
        const loadMoreBtn = document.getElementById('loadMoreActivities');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.userActivities.length >= this.activityLimit ? 'inline-block' : 'none';
        }
    }

    renderEmptyActivityState() {
        return `
            <div class="empty-state" style="text-align: center; padding: 3rem; color: #666;">
                <h3>No activity yet</h3>
                <p>Your posts, comments, likes, and follows will appear here.</p>
                <p style="font-size: 0.9em; margin-top: 1rem;">
                    Try adjusting the filters above or create some content to see your activity feed!
                </p>
            </div>
        `;
    }

    renderActivityList() {
        return this.userActivities.map(activity => this.renderActivityItem(activity)).join('');
    }

    renderActivityItem(activity) {
        const timeAgo = this.formatTimeAgo(new Date(activity.createdAt));
        const metadata = activity.metadata || {};

        switch (activity.activityType) {
            case 'POST_CREATED':
                return `
                    <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem;">
                        <div class="activity-icon" style="font-size: 1.5rem;">📝</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Created a post
                            </div>
                            <div class="activity-preview" style="color: #666; font-size: 0.9em; line-height: 1.4;">
                                "${metadata.contentPreview || 'Content preview not available'}"
                            </div>
                            <div class="activity-time" style="color: #999; font-size: 0.8em; margin-top: 0.5rem;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            case 'POST_EDITED':
                return `
                    <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem;">
                        <div class="activity-icon" style="font-size: 1.5rem;">✏️</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Edited a post
                                ${metadata.editReason ? `<span style="color: #666; font-weight: normal;"> - ${metadata.editReason}</span>` : ''}
                            </div>
                            <div class="activity-preview" style="color: #666; font-size: 0.9em; line-height: 1.4;">
                                "${metadata.contentPreview || 'Content preview not available'}"
                            </div>
                            <div class="activity-time" style="color: #999; font-size: 0.8em; margin-top: 0.5rem;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            case 'POST_DELETED':
                return `
                    <div class="activity-item deleted" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem; background: #f8f9fa;">
                        <div class="activity-icon" style="font-size: 1.5rem;">🗑️</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Deleted a post
                                ${metadata.deletedReason ? `<span style="color: #666; font-weight: normal;"> - ${metadata.deletedReason}</span>` : ''}
                            </div>
                            <div class="activity-preview" style="color: #666; font-size: 0.9em; line-height: 1.4;">
                                "${metadata.contentPreview || 'Content preview not available'}"
                            </div>
                            <button onclick="window.profile.viewDeletedContent('post', '${activity.targetId}')"
                                    style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; font-size: 0.8em; cursor: pointer;">
                                View Deleted Content
                            </button>
                            <div class="activity-time" style="color: #999; font-size: 0.8em; margin-top: 0.5rem;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            case 'COMMENT_CREATED':
                return `
                    <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem;">
                        <div class="activity-icon" style="font-size: 1.5rem;">💬</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Commented ${metadata.postTitle ? `on "${metadata.postTitle.substring(0, 50)}..."` : 'on a post'}
                            </div>
                            <div class="activity-preview" style="color: #666; font-size: 0.9em; line-height: 1.4;">
                                "${metadata.contentPreview || 'Comment preview not available'}"
                            </div>
                            <div class="activity-time" style="color: #999; font-size: 0.8em; margin-top: 0.5rem;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            case 'COMMENT_DELETED':
                return `
                    <div class="activity-item deleted" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem; background: #f8f9fa;">
                        <div class="activity-icon" style="font-size: 1.5rem;">🗑️</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Deleted a comment
                            </div>
                            <div class="activity-preview" style="color: #666; font-size: 0.9em; line-height: 1.4;">
                                "${metadata.contentPreview || 'Comment preview not available'}"
                            </div>
                            <button onclick="window.profile.viewDeletedContent('comment', '${activity.targetId}')"
                                    style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #6c757d; color: white; border: none; border-radius: 4px; font-size: 0.8em; cursor: pointer;">
                                View Deleted Comment
                            </button>
                            <div class="activity-time" style="color: #999; font-size: 0.8em; margin-top: 0.5rem;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            case 'LIKE_ADDED':
                return `
                    <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem;">
                        <div class="activity-icon" style="font-size: 1.5rem;">❤️</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Liked ${metadata.postTitle ? `"${metadata.postTitle.substring(0, 50)}..."` : 'a post'}
                            </div>
                            <div class="activity-time" style="color: #999; font-size: 0.8em;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            case 'FOLLOW_ADDED':
                return `
                    <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem;">
                        <div class="activity-icon" style="font-size: 1.5rem;">👥</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                Followed @${metadata.targetUsername || 'user'}
                            </div>
                            <div class="activity-time" style="color: #999; font-size: 0.8em;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;

            default:
                return `
                    <div class="activity-item" style="padding: 1rem; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 1rem;">
                        <div class="activity-icon" style="font-size: 1.5rem;">📊</div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-action" style="font-weight: 500; margin-bottom: 0.5rem;">
                                ${activity.activityType.replace(/_/g, ' ').toLowerCase()}
                            </div>
                            <div class="activity-time" style="color: #999; font-size: 0.8em;">
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                `;
        }
    }

    toggleActivityFilter(type, enabled) {
        this.activityFilters[type] = enabled;
        // Reload activities with new filters
        this.loadUserActivities(true);
    }

    searchActivities(query) {
        this.activitySearchQuery = query;
        this.loadUserActivities(true);
    }

    loadMoreActivities() {
        this.loadUserActivities(false);
    }

    viewDeletedContent(type, targetId) {
        // For now, just show an alert - in the future this could open a modal
        alert(`Viewing deleted ${type} content: ${targetId}\n\nThis feature will show the full deleted content in a modal.`);
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 2592000) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Initialize global instance
window.profile = new Profile();

// Log that Profile component is loaded
if (typeof adminDebugLog === 'function') {
    adminDebugLog('Profile', '✅ Profile component loaded and initialized');
} else {
    console.log('✅ Profile component loaded and initialized');
}

// Profile integration functions for modular system
function showProfile() {
    if (!window.currentUser) {
        document.getElementById('mainContent').innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2>Please log in to view your profile</h2>
                <button onclick="openAuthModal('login')" class="btn">Log In</button>
            </div>
        `;
        return;
    }

    // Hide all panels and show profile in main content
    const profilePanel = document.getElementById('profilePanel');
    const messagesContainer = document.getElementById('messagesContainer');

    if (profilePanel) profilePanel.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';

    window.profile.render('mainContent');
}

function toggleProfile() {
    if (!window.currentUser) {
        showProfile(); // Will show login prompt
        return;
    }

    const profilePanel = document.getElementById('profilePanel');

    if (profilePanel && profilePanel.style.display === 'block') {
        profilePanel.style.display = 'none';
    } else {
        showProfile();
    }
}

// Export functions for global use and module system
if (typeof window !== 'undefined') {
    window.showProfile = showProfile;
    window.toggleProfile = toggleProfile;
}