/**
 * My Profile Component
 * Created: August 10, 2025
 * Purpose: Display user profile in main content area with tabs for different sections
 * Author: Claude Code Assistant
 */

class MyProfile {
    constructor() {
        this.currentTab = 'posts'; // Default to posts tab
        this.userPosts = [];
        this.userProfile = null;
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
                this.userPosts = postsResponse.ok ? (postsResponse.data.posts || []) : [];
                this.renderProfile(container);
            } else {
                this.renderError(container, 'Unable to load your profile');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
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
                this.userPosts = postsResponse.ok ? (postsResponse.data.posts || []) : [];
                this.renderProfile(container);
            } else {
                this.renderError(container, 'Unable to refresh your profile');
            }
        } catch (error) {
            console.error('Error refreshing profile:', error);
            this.renderError(container, 'Network error refreshing profile');
        }
    }

    renderProfile(container) {
        const user = this.userProfile;
        
        container.innerHTML = `
            <div class="my-profile">
                <!-- Profile Header -->
                <div class="profile-header">
                    <div class="profile-picture-container">
                        <div class="profile-picture">
                            ${user.avatar ? 
                                `<img src="${user.avatar}" alt="Profile Picture" onclick="this.parentNode.parentNode.querySelector('.profile-upload').click()">` : 
                                `<div class="profile-placeholder" onclick="this.parentNode.parentNode.querySelector('.profile-upload').click()">
                                    <span style="font-size: 3rem;">👤</span>
                                    <p>Click to upload photo</p>
                                </div>`
                            }
                            <input type="file" class="profile-upload" accept="image/*" style="display: none;" onchange="window.myProfile.uploadProfilePicture(this)">
                        </div>
                        ${user.avatar ? '<button class="change-photo-btn" onclick="this.parentNode.querySelector(\'.profile-upload\').click()">Change Photo</button>' : ''}
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
                    <button class="tab-button ${this.currentTab === 'posts' ? 'active' : ''}" onclick="window.myProfile.switchTab('posts')">
                        My Posts
                    </button>
                    <button class="tab-button ${this.currentTab === 'photos' ? 'active' : ''}" onclick="window.myProfile.switchTab('photos')">
                        Photos
                    </button>
                    <button class="tab-button ${this.currentTab === 'demographics' ? 'active' : ''}" onclick="window.myProfile.switchTab('demographics')">
                        Demographics
                    </button>
                    <button class="tab-button ${this.currentTab === 'political' ? 'active' : ''}" onclick="window.myProfile.switchTab('political')">
                        Political Profile
                    </button>
                    <button class="tab-button ${this.currentTab === 'settings' ? 'active' : ''}" onclick="window.myProfile.switchTab('settings')">
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
    }

    renderTabContent() {
        switch (this.currentTab) {
            case 'posts':
                return this.renderPostsTab();
            case 'photos':
                return this.renderPhotosTab();
            case 'demographics':
                return this.renderDemographicsTab();
            case 'political':
                return this.renderPoliticalTab();
            case 'settings':
                // Load TOTP status when settings tab is rendered
                setTimeout(() => this.loadTOTPStatus(), 100);
                return this.renderSettingsTab();
            default:
                return this.renderPostsTab();
        }
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
                            <button onclick="window.myProfile.submitQuickPost()" class="btn">Create Post</button>
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
                        <button onclick="window.myProfile.editPost('${post.id}')">Edit</button>
                        <button onclick="window.myProfile.deletePost('${post.id}')" class="delete-btn">Delete</button>
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
                        <button onclick="window.myProfile.editDemographics()" class="edit-btn">Edit</button>
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
                        <button onclick="window.myProfile.editAddress()" class="edit-btn">Edit</button>
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
                        <button onclick="window.myProfile.editPolitical()" class="edit-btn">Edit</button>
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
                                ${!user.emailVerified ? '<button onclick="window.myProfile.resendEmailVerification()" class="verify-btn">Verify Email</button>' : ''}
                            </div>
                            <div class="verification-item">
                                <span>Phone ${user.phoneVerified ? '✅' : '❌'}</span>
                                ${!user.phoneVerified ? '<button onclick="window.myProfile.verifyPhone()" class="verify-btn">Verify Phone</button>' : ''}
                            </div>
                        </div>
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
                        <button onclick="window.myProfile.changePassword()" class="btn">Change Password</button>
                        <div class="totp-section">
                            <div id="totpStatus" class="totp-status">
                                <div class="loading">Loading 2FA status...</div>
                            </div>
                            <div id="totpControls" class="totp-controls" style="display: none;">
                                <!-- TOTP controls will be populated here -->
                            </div>
                        </div>
                        <button onclick="window.myProfile.downloadData()" class="btn">Download My Data</button>
                    </div>

                    <div class="settings-group">
                        <h4>Privacy</h4>
                        <label class="setting-item">
                            <input type="checkbox" ${this.userProfile.isProfilePublic ? 'checked' : ''} 
                                   onchange="window.myProfile.toggleProfileVisibility(this.checked)">
                            <span>Make my profile public</span>
                        </label>
                    </div>

                    <div class="settings-group">
                        <h4>Photo Tagging Privacy</h4>
                        <div class="photo-privacy-settings">
                            <label class="setting-item">
                                <input type="checkbox" 
                                       id="photoTaggingEnabled"
                                       ${this.userProfile.photoTaggingEnabled !== false ? 'checked' : ''} 
                                       onchange="window.myProfile.updateTaggingPreference('photoTaggingEnabled', this.checked)">
                                <span>Allow people to tag me in photos</span>
                            </label>
                            
                            <div class="sub-settings ${this.userProfile.photoTaggingEnabled === false ? 'disabled' : ''}">
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="requireTagApproval"
                                           ${this.userProfile.requireTagApproval ? 'checked' : ''} 
                                           onchange="window.myProfile.updateTaggingPreference('requireTagApproval', this.checked)"
                                           ${this.userProfile.photoTaggingEnabled === false ? 'disabled' : ''}>
                                    <span>Require my approval before tags appear</span>
                                </label>
                                
                                <label class="setting-item">
                                    <input type="checkbox" 
                                           id="allowTagsByFriendsOnly"
                                           ${this.userProfile.allowTagsByFriendsOnly ? 'checked' : ''} 
                                           onchange="window.myProfile.updateTaggingPreference('allowTagsByFriendsOnly', this.checked)"
                                           ${this.userProfile.photoTaggingEnabled === false ? 'disabled' : ''}>
                                    <span>Only allow friends to tag me</span>
                                </label>
                            </div>
                            
                            <div class="pending-tags-section" id="pendingTagsSection">
                                <button onclick="window.myProfile.viewPendingTags()" class="btn-secondary">
                                    View Pending Tags <span class="badge" id="pendingTagsCount"></span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="settings-group danger">
                        <h4>Danger Zone</h4>
                        <button onclick="window.myProfile.deactivateAccount()" class="btn-danger">Deactivate Account</button>
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
                            <button onclick="window.myProfile.uploadPhotos()" class="btn">
                                📷 Upload Photos
                            </button>
                            <button onclick="window.myProfile.createGallery()" class="btn-secondary">
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
                       style="display: none;" onchange="window.myProfile.handleBulkUpload(this)">
            </div>
        `;
    }

    renderError(container, message) {
        container.innerHTML = `
            <div class="error-state">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="window.myProfile.render('mainContent')" class="btn">Try Again</button>
            </div>
        `;
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Load pending tags count when switching to settings tab
        if (tabName === 'settings') {
            setTimeout(() => this.updatePendingTagsCount(), 100);
        }
        const contentArea = document.querySelector('.tab-content');
        if (contentArea) {
            contentArea.innerHTML = this.renderTabContent();
        }

        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="window.myProfile.switchTab('${tabName}')"]`).classList.add('active');

        // Load data for specific tabs
        if (tabName === 'photos') {
            setTimeout(() => this.loadPhotoGalleries(), 100);
        }
    }

    async uploadProfilePicture(input) {
        const file = input.files[0];
        if (!file) return;

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
                // Profile picture uploaded successfully, reload profile with fresh data
                console.log('✅ Profile picture uploaded:', response.data.photos[0].url);
                
                // Force fresh profile data by bypassing cache
                this.refreshProfile('mainContent');
            } else {
                const errorMsg = response.data?.message || 'Failed to upload profile picture';
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Upload error:', error);
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
                console.log('Post creation was not successful');
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
                    console.error('Post creation failed:', response);
                    const errorMsg = response.error || response.message || 'Failed to create post';
                    alert(`Failed to create post: ${errorMsg}. Please try again.`);
                }
            } catch (error) {
                console.error('Post creation error:', error);
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
                        <button onclick="window.myProfile.saveAddress()" class="btn" style="background: #4b5c09;">Save Address</button>
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
                        console.log('✅ Profile address autocomplete initialized using new PlaceAutocompleteElement');
                    } else {
                        // Fallback to legacy if global function not available
                        console.log('⚠️ Global initAutocomplete not found, using legacy implementation');
                        this.initLegacyProfileAutocomplete();
                    }
                } catch (error) {
                    console.error('Error initializing profile autocomplete:', error);
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
        
        console.log('✅ Legacy profile autocomplete initialized');
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
            console.error('Error saving address:', error);
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
            console.error('Email verification error:', error);
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
            const response = await window.apiCall('/totp/status');
            if (response.ok) {
                this.renderTOTPControls(response.data);
            } else {
                this.renderTOTPError('Failed to load 2FA status');
            }
        } catch (error) {
            console.error('Error loading TOTP status:', error);
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
                    <button onclick="window.myProfile.regenerateBackupCodes()" class="btn-secondary">
                        Generate New Backup Codes
                    </button>
                    <button onclick="window.myProfile.disableTOTP()" class="btn-danger">
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
                    <button onclick="window.myProfile.setupTOTP()" class="btn">
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
                    <button onclick="window.myProfile.loadTOTPStatus()" class="btn-small">Retry</button>
                </div>
            `;
        }
    }

    async setupTOTP() {
        console.log('🔒 Starting TOTP setup...');
        try {
            const response = await window.apiCall('/totp/setup', { method: 'POST' });
            console.log('🔒 TOTP setup API response:', response);
            if (response.ok) {
                console.log('🔒 API success, showing modal with data:', response.data);
                this.showTOTPSetupModal(response.data);
            } else {
                console.error('🔒 TOTP setup failed:', response);
                alert('Failed to setup 2FA. Please try again.');
            }
        } catch (error) {
            console.error('Error setting up TOTP:', error);
            alert('Network error setting up 2FA. Please try again.');
        }
    }

    showTOTPSetupModal(setupData) {
        console.log('🔒 Creating TOTP setup modal with data:', setupData);
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        console.log('🔒 Modal element created, adding to DOM...');
        modal.innerHTML = `
            <div class="modal totp-setup-modal">
                <div class="modal-header">
                    <h3>Setup Two-Factor Authentication</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="setup-step">
                        <h4>Step 1: Scan QR Code</h4>
                        <p>Use Google Authenticator, Authy, or similar app to scan this QR code:</p>
                        <div class="qr-code-container">
                            <img src="${setupData.qrCode}" alt="QR Code" class="qr-code">
                        </div>
                        <p class="manual-code">
                            <small>Manual entry code: <code>${setupData.secret}</code></small>
                        </p>
                    </div>
                    
                    <div class="setup-step">
                        <h4>Step 2: Enter Verification Code</h4>
                        <p>Enter the 6-digit code from your authenticator app:</p>
                        <input type="text" id="totpVerificationCode" placeholder="000000" maxlength="6" 
                               class="totp-input" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                        <div class="modal-actions">
                            <button onclick="window.myProfile.verifyTOTPSetup()" class="btn">
                                Verify & Enable 2FA
                            </button>
                            <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Force modal styles to ensure visibility
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '99999';
        
        console.log('🔒 Modal added to DOM with forced styles, focusing input...');
        document.getElementById('totpVerificationCode').focus();
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
                this.showBackupCodesModal(response.data.backupCodes);
                document.querySelector('.modal-overlay').remove();
                this.loadTOTPStatus(); // Refresh status
            } else {
                alert(response.data?.error || 'Invalid verification code. Please try again.');
            }
        } catch (error) {
            console.error('Error verifying TOTP setup:', error);
            alert('Network error. Please try again.');
        }
    }

    showBackupCodesModal(backupCodes) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal backup-codes-modal">
                <div class="modal-header">
                    <h3>🔑 Backup Codes</h3>
                </div>
                <div class="modal-body">
                    <div class="backup-codes-info">
                        <p><strong>Important:</strong> Save these backup codes in a secure location. Each code can only be used once if you lose access to your authenticator app.</p>
                    </div>
                    <div class="backup-codes-list">
                        ${backupCodes.map(code => `<div class="backup-code">${code}</div>`).join('')}
                    </div>
                    <div class="modal-actions">
                        <button onclick="window.myProfile.downloadBackupCodes(${JSON.stringify(backupCodes).replace(/"/g, '&quot;')})" class="btn">
                            📄 Download Codes
                        </button>
                        <button onclick="window.myProfile.copyBackupCodes(${JSON.stringify(backupCodes).replace(/"/g, '&quot;')})" class="btn-secondary">
                            📋 Copy to Clipboard
                        </button>
                        <button onclick="this.closest('.modal-overlay').remove()" class="btn">
                            I've Saved My Codes
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Force modal styles to ensure visibility
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '99999';
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
            console.error('Error regenerating backup codes:', error);
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
            console.error('Error disabling TOTP:', error);
            alert('Network error. Please try again.');
        }
    }

    // Photo Gallery Methods
    
    async loadPhotoGalleries(bypassCache = false) {
        if (this.currentTab !== 'photos') return;
        
        try {
            const response = await window.apiCall('/photos/galleries', { bypassCache });
            
            console.log('📡 Raw galleries API response:', response);
            
            if (response.ok && response.data) {
                console.log('📡 Galleries API data:', response.data);
                this.updateStorageDisplay(response.data);
                this.updateGalleriesDisplay(response.data.galleries);
            } else {
                document.getElementById('photoGalleries').innerHTML = 
                    '<div class="error-message">Failed to load photo galleries</div>';
            }
        } catch (error) {
            console.error('Error loading galleries:', error);
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
        console.log('🖼️ Gallery data received:', galleries);
        if (galleries && galleries.length > 0) {
            console.log('🖼️ First gallery photos:', galleries[0].photos);
            console.log('🖼️ Sample photo URLs:', galleries[0].photos?.[0]?.url, galleries[0].photos?.[0]?.thumbnailUrl);
        }

        if (!galleries || galleries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Photos Yet</h3>
                    <p>Start building your photo gallery by uploading your first photos!</p>
                    <button onclick="window.myProfile.uploadPhotos()" class="btn">Upload Photos</button>
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
                                <button onclick="window.myProfile.setAsProfilePicture('${photo.id}')" class="photo-action">
                                    👤 Set as Profile
                                </button>
                                <button onclick="window.myProfile.movePhoto('${photo.id}')" class="photo-action">
                                    📁 Move
                                </button>
                                <button onclick="window.myProfile.deletePhoto('${photo.id}')" class="photo-action delete">
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
            console.error('Bulk upload error:', error);
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
            console.error('Error setting profile picture:', error);
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
            console.error('Error moving photo:', error);
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
            console.error('Error deleting photo:', error);
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
            console.error('Error updating tagging preference:', error);
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
            console.error('Error loading pending tags:', error);
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
                                    <button class="approve-btn" onclick="window.myProfile.respondToTag('${tag.id}', true)">
                                        ✓ Approve
                                    </button>
                                    <button class="decline-btn" onclick="window.myProfile.respondToTag('${tag.id}', false)">
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
            console.error('Error responding to tag:', error);
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
            console.error('Error updating pending tags count:', error);
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
}

// Initialize global instance
window.myProfile = new MyProfile();