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
                        <h1>@${user.username}</h1>
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
            case 'demographics':
                return this.renderDemographicsTab();
            case 'political':
                return this.renderPoliticalTab();
            case 'settings':
                return this.renderSettingsTab();
            default:
                return this.renderPostsTab();
        }
    }

    renderPostsTab() {
        if (this.userPosts.length === 0) {
            return `
                <div class="tab-pane">
                    <div class="empty-state">
                        <h3>No posts yet</h3>
                        <p>Share your thoughts to get started!</p>
                        <div class="quick-post-composer">
                            <textarea id="quickPostContent" placeholder="What's on your mind?" rows="4"></textarea>
                            <div style="margin-top: 1rem;">
                                <button onclick="window.myProfile.submitQuickPost()" class="btn">Post</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        let postsHtml = `
            <div class="tab-pane">
                <div class="posts-header">
                    <h3>Your Posts (${this.userPosts.length})</h3>
                    <p>View and manage your posts, see engagement stats</p>
                </div>
                <div class="posts-grid">
        `;

        this.userPosts.forEach(post => {
            postsHtml += `
                <div class="post-card">
                    <div class="post-header">
                        <span class="post-date">${new Date(post.createdAt).toLocaleDateString()}</span>
                        <div class="post-menu">
                            <button onclick="window.myProfile.editPost('${post.id}')">Edit</button>
                            <button onclick="window.myProfile.deletePost('${post.id}')" class="delete-btn">Delete</button>
                        </div>
                    </div>
                    <div class="post-content">
                        ${post.content}
                    </div>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
                    <div class="post-stats">
                        <span>❤️ ${post.likesCount || 0} likes</span>
                        <span>💬 ${post.commentsCount || 0} comments</span>
                        ${post.isPolitical ? '<span class="political-tag">🗳️ Political</span>' : ''}
                    </div>
                </div>
            `;
        });

        postsHtml += `
                </div>
            </div>
        `;

        return postsHtml;
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

                    <div class="settings-group danger">
                        <h4>Danger Zone</h4>
                        <button onclick="window.myProfile.deactivateAccount()" class="btn-danger">Deactivate Account</button>
                    </div>
                </div>
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
        const contentArea = document.querySelector('.tab-content');
        if (contentArea) {
            contentArea.innerHTML = this.renderTabContent();
        }

        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="window.myProfile.switchTab('${tabName}')"]`).classList.add('active');
    }

    async uploadProfilePicture(input) {
        const file = input.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('photoType', 'profile');

        try {
            const response = await window.apiCall('/photos/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Reload profile to show new picture
                this.render('mainContent');
            } else {
                alert('Failed to upload profile picture');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading profile picture');
        }
    }

    // Method to submit a quick post from the profile
    async submitQuickPost() {
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
                // Re-render just the tab content
                const tabContent = document.querySelector('.tab-content');
                if (tabContent) {
                    tabContent.innerHTML = this.renderTabContent();
                }
            } else {
                alert('Failed to create post. Please try again.');
            }
        } catch (error) {
            console.error('Post creation error:', error);
            alert('Error creating post.');
        }
    }

    // Placeholder methods for edit functionality
    editDemographics() {
        alert('Demographics editing coming soon!');
    }

    editAddress() {
        alert('Address editing coming soon!');
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
        // Open verification modal if available
        if (window.verificationFlow) {
            window.verificationFlow.showModal();
        } else {
            alert('Phone verification coming soon!');
        }
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
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize global instance
window.myProfile = new MyProfile();