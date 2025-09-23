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
            this.setupEventListeners();

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
    setupEventListeners() {
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
            const roles = ['user', 'moderator', 'admin'];
            const currentIndex = roles.indexOf(currentRole);
            const nextRole = roles[(currentIndex + 1) % roles.length];

            const roleEmojis = { user: '👤', moderator: '🛡️', admin: '👑' };

            if (!confirm(`Change role for @${username}?\n\n${roleEmojis[currentRole]} ${currentRole} → ${roleEmojis[nextRole]} ${nextRole}\n\nThis action requires TOTP verification.`)) {
                return;
            }

            // Request TOTP confirmation
            const { totpToken } = await requestTOTPConfirmation(
                `Change user role for @${username} to ${nextRole}`
            );

            const isAdmin = nextRole === 'admin';
            const isModerator = nextRole === 'moderator';

            const response = await window.AdminAPI.updateUserRole(userId, isAdmin, isModerator);

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
    displayUsersData(data) {
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
    displayUsersTable(users) {
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
        const roleIcon = user.isAdmin ? '👑' : user.isModerator ? '🛡️' : '👤';
        const roleText = user.isAdmin ? 'Admin' : user.isModerator ? 'Moderator' : 'User';
        const currentRole = user.isAdmin ? 'admin' : user.isModerator ? 'moderator' : 'user';

        return `
            <tr data-user-id="${user.id}">
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
                    <button onclick="window.usersController.changeUserRole('${user.id}', '${user.username}', '${currentRole}')"
                            class="action-btn role-btn" title="Change Role">
                        🔄 Role
                    </button>
                    <button onclick="window.usersController.deleteUser('${user.id}', '${user.username}', {posts: ${user.stats?.posts || 0}, comments: ${user.stats?.comments || 0}, followers: ${user.stats?.followers || 0}})"
                            class="action-btn delete-btn" title="Delete User">
                        🗑️ Delete
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