/**
 * Organizations API Client
 * Wraps apiClient calls for organization-related endpoints
 *
 * @module features/organizations/organizations-api
 */

import { apiClient } from '../../core/api/client.js';

/**
 * Organizations API wrapper
 * All methods return data directly from apiClient.call()
 */
export const organizationsApi = {
    // ==================== Organization CRUD ====================

    /**
     * List organizations with optional filters
     * @param {Object} params - Query parameters
     * @param {string} [params.search] - Search by name
     * @param {string} [params.type] - Filter by org type
     * @param {string} [params.jurisdictionType] - Filter by jurisdiction type
     * @param {boolean} [params.isVerified] - Filter by verification status
     * @param {number} [params.page] - Page number (default: 1)
     * @param {number} [params.limit] - Items per page (default: 20)
     * @returns {Promise<{organizations: Array, pagination: Object}>}
     */
    async list(params = {}) {
        return apiClient.call('/organizations', { params });
    },

    /**
     * Get organization by ID
     * @param {string} id - Organization UUID
     * @returns {Promise<Object>} Organization data
     */
    async getById(id) {
        return apiClient.call(`/organizations/${id}`);
    },

    /**
     * Get organization by slug
     * @param {string} slug - Organization slug
     * @returns {Promise<Object>} Organization data
     */
    async getBySlug(slug) {
        return apiClient.call(`/organizations/slug/${slug}`);
    },

    /**
     * Find nearby organizations by coordinates
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {number} [radiusKm=50] - Search radius in kilometers
     * @returns {Promise<{organizations: Array}>}
     */
    async getNearby(latitude, longitude, radiusKm = 50) {
        return apiClient.call('/organizations/nearby', {
            params: { latitude, longitude, radiusKm }
        });
    },

    /**
     * Check if slug is available
     * @param {string} slug - Proposed slug
     * @returns {Promise<{available: boolean}>}
     */
    async checkSlugAvailable(slug) {
        return apiClient.call(`/organizations/slug-available/${slug}`);
    },

    /**
     * Create a new organization (user becomes head)
     * @param {Object} data - Organization data
     * @param {string} data.name - Organization name
     * @param {string} data.slug - URL slug
     * @param {string} data.type - Organization type
     * @param {string} [data.description] - Description
     * @param {string} [data.jurisdictionType] - Jurisdiction type
     * @param {string} [data.jurisdictionState] - State (for STATE jurisdiction)
     * @returns {Promise<Object>} Created organization
     */
    async create(data) {
        return apiClient.call('/organizations', {
            method: 'POST',
            body: data
        });
    },

    /**
     * Update organization settings
     * @param {string} orgId - Organization ID
     * @param {Object} data - Fields to update
     * @returns {Promise<Object>} Updated organization
     */
    async update(orgId, data) {
        return apiClient.call(`/organizations/${orgId}`, {
            method: 'PATCH',
            body: data
        });
    },

    // ==================== Membership ====================

    /**
     * Get user's organization memberships
     * @returns {Promise<{memberships: Array}>}
     */
    async getMyMemberships() {
        return apiClient.call('/organizations/me/memberships');
    },

    /**
     * Get organization user heads (if any)
     * @returns {Promise<Object|null>} Organization or null
     */
    async getMyHeadedOrg() {
        return apiClient.call('/organizations/me/headed');
    },

    /**
     * Request to join an organization
     * @param {string} orgId - Organization ID
     * @param {string} [message] - Optional message to org admins
     * @returns {Promise<Object>} Membership request
     */
    async requestJoin(orgId, message) {
        return apiClient.call(`/organizations/${orgId}/join`, {
            method: 'POST',
            body: message ? { message } : {}
        });
    },

    /**
     * Leave an organization
     * @param {string} orgId - Organization ID
     * @returns {Promise<void>}
     */
    async leave(orgId) {
        return apiClient.call(`/organizations/${orgId}/leave`, {
            method: 'POST'
        });
    },

    /**
     * Get organization members
     * @param {string} orgId - Organization ID
     * @param {Object} [params] - Query parameters
     * @param {string} [params.status] - Filter by status (PENDING, ACTIVE, etc.)
     * @param {string} [params.roleId] - Filter by role
     * @returns {Promise<{members: Array}>}
     */
    async getMembers(orgId, params = {}) {
        return apiClient.call(`/organizations/${orgId}/members`, { params });
    },

    /**
     * Approve a pending membership request
     * @param {string} orgId - Organization ID
     * @param {string} membershipId - Membership ID
     * @returns {Promise<Object>} Updated membership
     */
    async approveMember(orgId, membershipId) {
        return apiClient.call(`/organizations/${orgId}/members/${membershipId}/approve`, {
            method: 'POST'
        });
    },

    /**
     * Remove a member from organization
     * @param {string} orgId - Organization ID
     * @param {string} membershipId - Membership ID
     * @returns {Promise<void>}
     */
    async removeMember(orgId, membershipId) {
        return apiClient.call(`/organizations/${orgId}/members/${membershipId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Invite a user to the organization
     * @param {string} orgId - Organization ID
     * @param {string} userId - User ID to invite
     * @param {string} [roleId] - Optional role to assign
     * @returns {Promise<Object>} Invitation
     */
    async inviteMember(orgId, userId, roleId) {
        return apiClient.call(`/organizations/${orgId}/invite`, {
            method: 'POST',
            body: { userId, roleId }
        });
    },

    // ==================== Following ====================

    /**
     * Follow an organization
     * @param {string} orgId - Organization ID
     * @returns {Promise<Object>} Follow record
     */
    async follow(orgId) {
        return apiClient.call(`/organizations/${orgId}/follow`, {
            method: 'POST'
        });
    },

    /**
     * Unfollow an organization
     * @param {string} orgId - Organization ID
     * @returns {Promise<void>}
     */
    async unfollow(orgId) {
        return apiClient.call(`/organizations/${orgId}/unfollow`, {
            method: 'POST'
        });
    },

    // ==================== Roles ====================

    /**
     * Get organization roles
     * @param {string} orgId - Organization ID
     * @returns {Promise<{roles: Array}>}
     */
    async getRoles(orgId) {
        return apiClient.call(`/organizations/${orgId}/roles`);
    },

    /**
     * Create a new role
     * @param {string} orgId - Organization ID
     * @param {Object} data - Role data
     * @param {string} data.name - Role name
     * @param {Array<string>} data.capabilities - Role capabilities
     * @param {number} [data.maxHolders] - Maximum role holders
     * @returns {Promise<Object>} Created role
     */
    async createRole(orgId, data) {
        return apiClient.call(`/organizations/${orgId}/roles`, {
            method: 'POST',
            body: data
        });
    },

    /**
     * Update a role
     * @param {string} orgId - Organization ID
     * @param {string} roleId - Role ID
     * @param {Object} data - Fields to update
     * @param {string} [data.name] - Role name
     * @param {string} [data.description] - Role description
     * @param {Array<string>} [data.capabilities] - Role capabilities
     * @param {number} [data.maxHolders] - Maximum role holders
     * @returns {Promise<Object>} Updated role
     */
    async updateRole(orgId, roleId, data) {
        return apiClient.call(`/organizations/${orgId}/roles/${roleId}`, {
            method: 'PATCH',
            body: data
        });
    },

    /**
     * Delete a role
     * @param {string} orgId - Organization ID
     * @param {string} roleId - Role ID
     * @returns {Promise<void>}
     */
    async deleteRole(orgId, roleId) {
        return apiClient.call(`/organizations/${orgId}/roles/${roleId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Assign role to member
     * @param {string} orgId - Organization ID
     * @param {string} membershipId - Membership ID
     * @param {string} roleId - Role ID
     * @returns {Promise<Object>} Updated membership
     */
    async assignRole(orgId, membershipId, roleId) {
        return apiClient.call(`/organizations/${orgId}/members/${membershipId}/role`, {
            method: 'POST',
            body: { roleId }
        });
    },

    /**
     * Remove role from member
     * @param {string} orgId - Organization ID
     * @param {string} membershipId - Membership ID
     * @returns {Promise<Object>} Updated membership
     */
    async removeRole(orgId, membershipId) {
        return apiClient.call(`/organizations/${orgId}/members/${membershipId}/role`, {
            method: 'DELETE'
        });
    },

    // ==================== Verification ====================

    /**
     * Request organization verification
     * @param {string} orgId - Organization ID
     * @param {Object} data - Verification request data
     * @param {string} data.contactEmail - Contact email
     * @param {string} [data.supportingInfo] - Supporting information
     * @returns {Promise<Object>} Verification request
     */
    async requestVerification(orgId, data) {
        return apiClient.call(`/organizations/${orgId}/verification`, {
            method: 'POST',
            body: data
        });
    },

    /**
     * Get organization verification status
     * @param {string} orgId - Organization ID
     * @returns {Promise<Object>} Verification status
     */
    async getVerificationStatus(orgId) {
        return apiClient.call(`/organizations/${orgId}/verification`);
    }
};

export default organizationsApi;
