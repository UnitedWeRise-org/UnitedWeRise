/**
 * UsersController - Handles admin dashboard users section
 * Extracted from admin-dashboard.html user management functionality
 *
 * Enterprise-grade modular architecture for UnitedWeRise admin system
 * Sprint 2.1 - Priority Controllers Implementation
 */

class UsersController {
    constructor() {
        this.sectionId = 'users';
        this.isInitialized = false;
        this.currentUsers = [];
        this.searchQuery = '';

        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
        this.mergeAccounts = this.mergeAccounts.bind(this);
        this.changeUserRole = this.changeUserRole.bind(this);
        this.displayUsersTable = this.displayUsersTable.bind(this);
        this.showUserProfile = this.showUserProfile.bind(this);
        this.closeUserProfile = this.closeUserProfile.bind(this);
    }

    /**
     * Initialize the users controller
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Override AdminState display methods for users
            if (window.AdminState) {
                window.AdminState.displayUsersData = this.displayUsersData.bind(this);
            }

            // Set up event listeners
            await this.setupEventListeners();

            // Load initial data
            await this.loadData();

            this.isInitialized = true;

            await adminDebugLog('UsersController', 'Controller initialized successfully');
        } catch (error) {
            console.error('Error initializing UsersController:', error);
            await adminDebugError('UsersController', 'Initialization failed', error);
        }
    }

    /**
     * Set up event listeners for users section
     */
    async setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        const searchBtn = document.querySelector('#users button[onclick="searchUsers()"]');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                // Debounce search
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleSearch();
                }, 300);
            });
        }

        if (searchBtn) {
            searchBtn.removeAttribute('onclick');
            searchBtn.addEventListener('click', this.handleSearch);
        }

        // Account merge functionality
        const mergeBtn = document.querySelector('#users button[onclick="mergeAccounts()"]');
        if (mergeBtn) {
            mergeBtn.removeAttribute('onclick');
            mergeBtn.addEventListener('click', this.mergeAccounts);
        }

        await adminDebugLog('UsersController', 'Event listeners set up successfully');
    }

    /**
     * Load users data
     * Extracted from loadUsersData function
     */
    async loadData(useCache = true) {
        try {
            if (window.AdminState) {
                const data = await window.AdminState.loadUsersData({}, useCache);
                this.displayUsersData(data);
                return data;
            } else {
                // Fallback to direct API call
                return await this.loadDataFallback();
            }
        } catch (error) {
            console.error('Error loading users data:', error);
            this.showError('Failed to load users data');
            throw error;
        }
    }

    /**
     * Fallback data loading without AdminState
     */
    async loadDataFallback() {
        try {
            const response = await window.AdminAPI.getUsers();
            this.displayUsersData(response);
            return response;
        } catch (error) {
            console.error('Fallback users data loading failed:', error);
            throw error;
        }
    }

    /**
     * Handle user search
     * Extracted from searchUsers function
     */
    async handleSearch() {
        try {
            const searchQuery = document.getElementById('userSearch')?.value || this.searchQuery;

            if (!searchQuery.trim()) {
                // Load all users if search is empty
                await this.loadData(false);
                return;
            }

            // Filter current users by search query
            const filteredUsers = this.currentUsers.filter(user =>
                user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
            );

            this.displayUsersTable(filteredUsers);

            await adminDebugLog('UsersController', 'User search completed', {
                query: searchQuery,
                resultsCount: filteredUsers.length
            });

        } catch (error) {
            console.error('Error searching users:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    /**
     * Delete user with TOTP verification
     * Extracted from deleteUser function
     */
    async deleteUser(userId, username, impact) {
        try {
            // Show impact confirmation first
            const impactDetails = `This will affect:
• ${impact.posts} posts
• ${impact.comments} comments
• ${impact.followers} followers
• All associated user data`;

            if (!confirm(`⚠️ DELETE USER ACCOUNT\n\nUser: @${username}\nID: ${userId}\n\n${impactDetails}\n\nThis action requires TOTP verification. Continue?`)) {
                return;
            }

            // Request TOTP confirmation (requires global function)
            const { totpToken } = await requestTOTPConfirmation(
                `Delete user account @${username}`,
                { additionalInfo: impactDetails }
            );

            // Get deletion type preference
            let deletionType = 'soft'; // Default to safer option
            const deleteChoice = prompt('Choose deletion type:\n\n1 = Soft Delete (preserve data, mark as deleted) [RECOMMENDED]\n2 = Hard Delete (permanent removal)\n\nEnter 1 or 2:');

            if (deleteChoice === '2') {
                if (confirm('⚠️ HARD DELETE WARNING ⚠️\n\nThis will PERMANENTLY remove all user data and cannot be undone.\n\nAre you absolutely sure?')) {
                    deletionType = 'hard';
                } else {
                    alert('Operation cancelled.');
                    return;
                }
            } else if (deleteChoice !== '1' && deleteChoice !== null) {
                alert('Invalid choice. Operation cancelled.');
                return;
            } else if (deleteChoice === null) {
                return; // User clicked Cancel
            }

            // Get deletion reason
            const reason = prompt('Enter reason for deletion (required, 10-500 characters):');
            if (!reason || reason.trim().length < 10) {
                alert('Deletion reason is required and must be at least 10 characters.');
                return;
            }

            // Perform deletion
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                body: JSON.stringify({
                    totpToken,
                    deletionType,
                    reason: reason.trim(),
                    adminUserId: window.adminAuth.getCurrentUser()?.id
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ User @${username} ${deletionType} deleted successfully.\n\nAudit ID: ${data.auditId}`);

                // Refresh users data
                await this.loadData(false);

                await adminDebugLog('UsersController', 'User deleted successfully', {
                    userId,
                    username,
                    deletionType,
                    auditId: data.auditId
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }

        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`❌ Failed to delete user: ${error.message}`);
            await adminDebugError('UsersController', 'User deletion failed', error);
        }
    }

    /**
     * Change user role (admin/moderator/user)
     * Extracted from changeUserRole function
     */
    async changeUserRole(userId, username, currentRole) {
        try {
            const roles = ['user', 'moderator', 'admin', 'super-admin'];
            const currentIndex = roles.indexOf(currentRole);
            const nextRole = roles[(currentIndex + 1) % roles.length];

            const roleEmojis = { user: '👤', moderator: '🛡️', admin: '👑', 'super-admin': '⚡' };

            if (!confirm(`Change role for @${username}?\n\n${roleEmojis[currentRole]} ${currentRole} → ${roleEmojis[nextRole]} ${nextRole}\n\nThis action requires TOTP verification.`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                `Change user role for @${username} to ${nextRole}`
            );

            const isAdmin = nextRole === 'admin' || nextRole === 'super-admin';
            const isModerator = nextRole === 'moderator' || nextRole === 'admin' || nextRole === 'super-admin';
            const isSuperAdmin = nextRole === 'super-admin';

            const response = await window.AdminAPI.updateUserRole(userId, isAdmin, isModerator, isSuperAdmin);

            if (response.success) {
                alert(`✅ Role updated: @${username} is now ${roleEmojis[nextRole]} ${nextRole}`);

                // Refresh users data
                await this.loadData(false);

                await adminDebugLog('UsersController', 'User role changed successfully', {
                    userId,
                    username,
                    oldRole: currentRole,
                    newRole: nextRole
                });
            } else {
                throw new Error(response.error || 'Failed to update user role');
            }

        } catch (error) {
            console.error('Error changing user role:', error);
            alert(`❌ Failed to change user role: ${error.message}`);
            await adminDebugError('UsersController', 'Role change failed', error);
        }
    }

    /**
     * Merge user accounts
     * Extracted from mergeAccounts function
     */
    async mergeAccounts() {
        try {
            const primaryAccountId = document.getElementById('primaryAccountId')?.value?.trim();
            const duplicateAccountId = document.getElementById('duplicateAccountId')?.value?.trim();
            const statusElement = document.getElementById('mergeStatus');

            if (!primaryAccountId || !duplicateAccountId) {
                this.showMergeStatus('❌ Please enter both account IDs', 'error');
                return;
            }

            if (primaryAccountId === duplicateAccountId) {
                this.showMergeStatus('❌ Account IDs cannot be the same', 'error');
                return;
            }

            // Validate CUID format
            const cuidPattern = /^c[a-z0-9]{24}$/;
            if (!cuidPattern.test(primaryAccountId) || !cuidPattern.test(duplicateAccountId)) {
                this.showMergeStatus('❌ Invalid Account ID format. Must be CUID format (starts with "c", 25 characters total)', 'error');
                return;
            }

            if (!confirm(`🔄 MERGE ACCOUNTS\n\nPrimary (keep): ${primaryAccountId}\nDuplicate (delete): ${duplicateAccountId}\n\nThis will:\n• Move all data from duplicate to primary account\n• Delete the duplicate account\n• This action CANNOT be undone\n\nContinue?`)) {
                return;
            }

            this.showMergeStatus('🔄 Processing merge request...', 'info');

            const response = await window.AdminAPI.mergeAccounts(primaryAccountId, duplicateAccountId);

            if (response.success) {
                this.showMergeStatus(`✅ Accounts merged successfully! Audit ID: ${response.auditId}`, 'success');

                // Clear the form
                document.getElementById('primaryAccountId').value = '';
                document.getElementById('duplicateAccountId').value = '';

                // Refresh users data
                await this.loadData(false);

                await adminDebugLog('UsersController', 'Account merge completed', {
                    primaryAccountId,
                    duplicateAccountId,
                    auditId: response.auditId
                });
            } else {
                throw new Error(response.error || 'Failed to merge accounts');
            }

        } catch (error) {
            console.error('Error merging accounts:', error);
            this.showMergeStatus(`❌ Merge failed: ${error.message}`, 'error');
            await adminDebugError('UsersController', 'Account merge failed', error);
        }
    }

    /**
     * Show merge status message
     */
    showMergeStatus(message, type) {
        const statusElement = document.getElementById('mergeStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `merge-status ${type}`;
            statusElement.style.color = type === 'error' ? '#d32f2f' : type === 'success' ? '#388e3c' : '#1976d2';
        }
    }

    /**
     * Display users data in the UI
     */
    async displayUsersData(data) {
        try {
            if (!data || !data.users) {
                console.warn('No users data available');
                return;
            }

            this.currentUsers = data.users;
            this.displayUsersTable(data.users);

            await adminDebugLog('UsersController', 'Users data displayed', {
                userCount: data.users.length,
                totalUsers: data.total
            });

        } catch (error) {
            console.error('Error displaying users data:', error);
            await adminDebugError('UsersController', 'Failed to display users data', error);
        }
    }

    /**
     * Display users table
     * Extracted from displayUsersTable function (assuming it exists)
     */
    async displayUsersTable(users) {
        try {
            const container = document.getElementById('usersTable');
            if (!container) {
                console.warn('Users table container not found');
                return;
            }

            if (!users || users.length === 0) {
                container.innerHTML = '<div class="no-data">No users found</div>';
                return;
            }

            const tableHtml = `
                <div class="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Posts</th>
                                <th>Followers</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => this.renderUserRow(user)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHtml;

        } catch (error) {
            console.error('Error displaying users table:', error);
            await adminDebugError('UsersController', 'Failed to display users table', error);
        }
    }

    /**
     * Render individual user row
     */
    renderUserRow(user) {
        // Role hierarchy: Super-Admin > Admin > Moderator > User
        const roleIcon = user.isSuperAdmin ? '⚡' : user.isAdmin ? '👑' : user.isModerator ? '🛡️' : '👤';
        const roleText = user.isSuperAdmin ? 'Super-Admin' : user.isAdmin ? 'Admin' : user.isModerator ? 'Moderator' : 'User';
        const currentRole = user.isSuperAdmin ? 'super-admin' : user.isAdmin ? 'admin' : user.isModerator ? 'moderator' : 'user';

        return `
            <tr data-user-id="${user.id}" onclick="window.usersController.showUserProfile('${user.id}')" style="cursor: pointer;" title="Click to view full profile">
                <td>
                    <div class="user-info">
                        <strong>@${user.username || 'N/A'}</strong>
                        <br><small>${user.firstName || ''} ${user.lastName || ''}</small>
                    </div>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td>
                    <span class="role-badge ${currentRole}">
                        ${roleIcon} ${roleText}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                </td>
                <td>${user.stats?.posts || 0}</td>
                <td>${user.stats?.followers || 0}</td>
                <td class="actions">
                    <button onclick="event.stopPropagation(); window.usersController.showUserProfile('${user.id}')"
                            class="action-btn profile-btn" title="View Full Profile">
                        👤 Profile
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('UsersController Error:', message);

        const container = document.getElementById('usersTable');
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    /**
     * Show comprehensive user profile modal (ported from monolithic admin-dashboard.html)
     */
    async showUserProfile(userId) {
        try {
            await adminDebugLog('UsersController', `Loading user details for: ${userId}`);

            // Fetch user details using admin API call
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/users/${userId}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const data = await response.json();
            const user = data.user;

            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 1000;
                display: flex; align-items: center; justify-content: center;
            `;

            // Close modal when clicking outside the content
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });

            // Helper function to format role display
            const getRoleDisplay = (user) => {
                if (user.isSuperAdmin) return '⚡ Super-Admin';
                if (user.isAdmin) return '👑 Admin';
                if (user.isModerator) return '🛡️ Moderator';
                return '👤 User';
            };

            // Helper function to get status color and text
            const getStatusDisplay = (user) => {
                if (user.isSuspended) return { color: '#e74c3c', text: '🚫 Suspended', icon: '🚫' };
                if (!user.emailVerified) return { color: '#f39c12', text: '⚠️ Unverified', icon: '⚠️' };
                return { color: '#27ae60', text: '✅ Active', icon: '✅' };
            };

            const status = getStatusDisplay(user);
            const activity = data.activity || {};
            const moderation = data.moderation || {};

            modal.innerHTML = `
                <div style="background: white; border-radius: 12px; max-width: 900px; max-height: 95vh; overflow-y: auto; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
                    <button onclick="this.closest('.modal').remove()" style="position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.1); border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; color: #666; z-index: 10;">&times;</button>

                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px 12px 0 0;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.1);">
                                ${user.avatar && user.avatar.startsWith('http')
                                    ? `<img src="${user.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`
                                    : `<span style="font-size: 3rem;">${user.avatar || '👤'}</span>`}
                            </div>
                            <div>
                                <h1 style="margin: 0; font-size: 1.8rem;">${user.displayName || user.firstName + ' ' + user.lastName || user.username}</h1>
                                <p style="margin: 0.25rem 0; opacity: 0.9;">@${user.username}</p>
                                <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                                    <span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">${getRoleDisplay(user)}</span>
                                    <span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">${status.icon} ${status.text}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="padding: 2rem;">
                        <!-- Quick Stats -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                            <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #3498db;">${user.stats?.posts || 0}</div>
                                <div style="font-size: 0.85rem; color: #7f8c8d;">Posts</div>
                            </div>
                            <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #9b59b6;">${user.stats?.comments || 0}</div>
                                <div style="font-size: 0.85rem; color: #7f8c8d;">Comments</div>
                            </div>
                            <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #e67e22;">${user.stats?.followers || 0}</div>
                                <div style="font-size: 0.85rem; color: #7f8c8d;">Followers</div>
                            </div>
                            <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">${user.stats?.following || 0}</div>
                                <div style="font-size: 0.85rem; color: #7f8c8d;">Following</div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                            <!-- Account Information -->
                            <div>
                                <h3 style="margin-bottom: 1rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem;">📋 Account Information</h3>
                                <div style="space-y: 0.75rem;">
                                    <div style="margin-bottom: 0.75rem;"><strong>User ID:</strong> <code style="background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">${user.id}</code></div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Email:</strong> ${user.email && user.email.startsWith('http') ? '<em>OAuth Profile URL (check OAuth Providers below)</em>' : user.email}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Phone:</strong> ${user.phoneNumber || 'Not provided'} ${user.phoneVerified ? '✅' : '❌'}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Location:</strong> ${user.city || 'Unknown'}, ${user.state || 'Unknown'}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Created:</strong> ${new Date(user.createdAt).toLocaleString()}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Last Seen:</strong> ${user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'Never'}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Reputation:</strong> ${user.reputationScore || 'Not scored'}</div>
                                </div>
                            </div>

                            <!-- Security Information -->
                            <div>
                                <h3 style="margin-bottom: 1rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem;">🔒 Security Information</h3>
                                <div style="space-y: 0.75rem;">
                                    <div style="margin-bottom: 0.75rem;"><strong>Email Verified:</strong> ${user.emailVerified ? '✅ Yes' : '❌ No'}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>2FA Enabled:</strong> ${user.totpEnabled ? '✅ Yes' : '❌ No'}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Risk Score:</strong> <span style="color: ${user.riskScore > 50 ? '#e74c3c' : '#27ae60'}">${user.riskScore || 0}</span></div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Login Attempts:</strong> ${user.loginAttempts || 0}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Last Login:</strong> ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</div>
                                    <div style="margin-bottom: 0.75rem;"><strong>Password Changed:</strong> ${user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleString() : 'Unknown'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- OAuth Providers -->
                        ${user.oauthProviders && user.oauthProviders.length > 0 ? `
                            <div style="margin-top: 2rem;">
                                <h3 style="margin-bottom: 1rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem;">🔐 OAuth Providers</h3>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                                    ${user.oauthProviders.map(provider => `
                                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem;">
                                            <strong style="color: #3498db;">${provider.provider}</strong><br>
                                            <small style="color: #7f8c8d;">Email: ${provider.email}</small><br>
                                            <small style="color: #7f8c8d;">Linked: ${new Date(provider.createdAt).toLocaleDateString()}</small>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Recent Activity -->
                        ${activity.recentPosts && activity.recentPosts.length > 0 ? `
                            <div style="margin-top: 2rem;">
                                <h3 style="margin-bottom: 1rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem;">📝 Recent Posts</h3>
                                <div style="max-height: 200px; overflow-y: auto;">
                                    ${activity.recentPosts.map(post => `
                                        <div style="border-left: 3px solid #3498db; padding: 0.75rem; margin-bottom: 1rem; background: #f8f9fa;">
                                            <div style="font-size: 0.9rem; margin-bottom: 0.5rem;">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</div>
                                            <div style="font-size: 0.8rem; color: #7f8c8d;">${new Date(post.createdAt).toLocaleString()} • ${post.likesCount} likes • ${post.commentsCount} comments</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Moderation History -->
                        ${(moderation.warnings && moderation.warnings.length > 0) || (moderation.suspensions && moderation.suspensions.length > 0) ? `
                            <div style="margin-top: 2rem;">
                                <h3 style="margin-bottom: 1rem; color: #2c3e50; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.5rem;">⚖️ Moderation History</h3>

                                ${moderation.warnings && moderation.warnings.length > 0 ? `
                                    <h4 style="color: #f39c12; margin-bottom: 0.5rem;">⚠️ Warnings (${moderation.warnings.length})</h4>
                                    <div style="max-height: 150px; overflow-y: auto; margin-bottom: 1rem;">
                                        ${moderation.warnings.map(warning => `
                                            <div style="border-left: 3px solid #f39c12; padding: 0.75rem; margin-bottom: 0.5rem; background: #fef9e7;">
                                                <div style="font-size: 0.9rem; margin-bottom: 0.25rem;">${warning.reason}</div>
                                                <div style="font-size: 0.8rem; color: #7f8c8d;">By ${warning.moderator?.username || 'System'} on ${new Date(warning.createdAt).toLocaleString()}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}

                                ${moderation.suspensions && moderation.suspensions.length > 0 ? `
                                    <h4 style="color: #e74c3c; margin-bottom: 0.5rem;">🚫 Suspensions (${moderation.suspensions.length})</h4>
                                    <div style="max-height: 150px; overflow-y: auto;">
                                        ${moderation.suspensions.map(suspension => `
                                            <div style="border-left: 3px solid #e74c3c; padding: 0.75rem; margin-bottom: 0.5rem; background: #fdf2f2;">
                                                <div style="font-size: 0.9rem; margin-bottom: 0.25rem;">${suspension.reason}</div>
                                                <div style="font-size: 0.8rem; color: #7f8c8d;">
                                                    ${suspension.type} suspension by ${suspension.moderator?.username || 'System'}<br>
                                                    ${new Date(suspension.createdAt).toLocaleString()} - ${suspension.endsAt ? new Date(suspension.endsAt).toLocaleString() : 'Permanent'}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        <!-- Admin Actions -->
                        <div style="margin-top: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                            <h3 style="margin: 0 0 1rem 0; color: #2c3e50;">🛠️ Admin Actions</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">

                                ${!user.isSuspended ? `
                                    <button onclick="window.usersController.suspendUser('${user.id}', '${user.username}')" class="nav-button" style="background: #f39c12; white-space: nowrap;">
                                        🚫 Suspend User
                                    </button>
                                ` : `
                                    <button onclick="window.usersController.unsuspendUser('${user.id}', '${user.username}')" class="nav-button" style="background: #27ae60; white-space: nowrap;">
                                        ✅ Unsuspend User
                                    </button>
                                `}

                                <button onclick="window.usersController.changeUserRole('${user.id}', '${user.username}', '${user.isSuperAdmin ? 'super-admin' : user.isAdmin ? 'admin' : user.isModerator ? 'moderator' : 'user'}')" class="nav-button" style="background: #9b59b6; white-space: nowrap;">
                                    👑 Change Role
                                </button>

                                <button onclick="window.usersController.resetUserPassword('${user.id}', '${user.username}')" class="nav-button" style="background: #3498db; white-space: nowrap;">
                                    🔑 Reset Password
                                </button>

                                ${!user.emailVerified ? `
                                    <button onclick="window.usersController.resendEmailVerification('${user.id}', '${user.username}')" class="nav-button" style="background: #17a2b8; white-space: nowrap;">
                                        📧 Resend Verification
                                    </button>
                                ` : ''}

                                <button onclick="window.usersController.deleteUser('${user.id}', '${user.username}', {posts: ${user.stats?.posts || 0}, comments: ${user.stats?.comments || 0}, followers: ${user.stats?.followers || 0}})" class="nav-button" style="background: #e74c3c; white-space: nowrap;">
                                    🗑️ Delete Account
                                </button>
                            </div>
                        </div>

                        <!-- Close Button -->
                        <div style="text-align: center; margin-top: 2rem;">
                            <button onclick="this.closest('.modal').remove()" class="nav-button" style="background: #95a5a6; padding: 0.75rem 2rem;">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            `;

            modal.className = 'modal';
            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error viewing user:', error);
            await adminDebugError('UsersController', 'Failed to load user details', error);
            alert('Failed to load user details');
        }
    }

    /**
     * Close user profile modal
     */
    closeUserProfile() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Suspend user (ported from monolithic version)
     */
    async suspendUser(userId, username) {
        // TODO: Implement suspend functionality
        alert(`Suspend user functionality for ${username} (${userId}) needs to be implemented`);
    }

    /**
     * Unsuspend user (ported from monolithic version)
     */
    async unsuspendUser(userId, username) {
        // TODO: Implement unsuspend functionality
        alert(`Unsuspend user functionality for ${username} (${userId}) needs to be implemented`);
    }

    /**
     * Reset user password (ported from monolithic version)
     */
    async resetUserPassword(userId, username) {
        // TODO: Implement password reset functionality
        alert(`Reset password functionality for ${username} (${userId}) needs to be implemented`);
    }

    /**
     * Resend email verification for user
     */
    async resendEmailVerification(userId, username) {
        try {
            // Show confirmation dialog
            if (!confirm(`🔄 RESEND EMAIL VERIFICATION\n\nUser: @${username}\nID: ${userId}\n\nThis will send a new verification email to the user's registered email address.\n\nContinue?`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                `Resend email verification for @${username}`
            );

            // Make API call to resend verification
            const response = await window.AdminAPI.call(`${window.AdminAPI.BACKEND_URL}/api/admin/users/${userId}/resend-verification`, {
                method: 'POST',
                body: JSON.stringify({ totpToken })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Verification email resent successfully!\n\n• Sent to: ${data.message.split(' to ')[1]}\n• Expires in: ${data.expiresIn}\n• Sent at: ${new Date(data.sentAt).toLocaleString()}`);

                await adminDebugLog('UsersController', 'Email verification resent', {
                    userId,
                    username,
                    sentAt: data.sentAt
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to resend verification email');
            }

        } catch (error) {
            console.error('Error resending email verification:', error);
            alert(`❌ Failed to resend verification email: ${error.message}`);
            await adminDebugError('UsersController', 'Resend verification failed', error);
        }
    }

    /**
     * Cleanup method for proper module shutdown
     */
    destroy() {
        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Remove event listeners
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.removeEventListener('input', this.handleSearch);
        }

        // Clear data
        this.currentUsers = [];
        this.isInitialized = false;

        console.log('UsersController destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UsersController;
} else {
    window.UsersController = UsersController;
}

// Auto-initialize if dependencies are available
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
    setTimeout(() => {
        if (window.AdminAPI && window.AdminState) {
            window.usersController = new UsersController();
        }
    }, 100);
} else if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AdminAPI && window.AdminState) {
                window.usersController = new UsersController();
            }
        }, 100);
    });
}