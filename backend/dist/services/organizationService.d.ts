/**
 * Organization Service
 *
 * Handles organization CRUD, membership management, roles, and capabilities.
 * Core business logic for the organization system.
 *
 * @module services/organizationService
 */
import { Organization, OrganizationMember, OrganizationRole, OrgCapability, MembershipStatus, JurisdictionType, VotingThresholdType } from '@prisma/client';
/**
 * Request interface for creating an organization
 */
interface CreateOrganizationRequest {
    name: string;
    slug: string;
    description?: string;
    avatar?: string;
    website?: string;
    jurisdictionType?: JurisdictionType;
    jurisdictionValue?: string;
    h3Cells?: string[];
    endorsementsEnabled?: boolean;
    votingThresholdType?: VotingThresholdType;
    votingThresholdValue?: number;
    votingQuorumPercent?: number;
    parentId?: string;
}
/**
 * Request interface for updating an organization
 */
interface UpdateOrganizationRequest {
    name?: string;
    description?: string;
    avatar?: string;
    website?: string;
    jurisdictionType?: JurisdictionType;
    jurisdictionValue?: string;
    h3Cells?: string[];
    endorsementsEnabled?: boolean;
    votingThresholdType?: VotingThresholdType;
    votingThresholdValue?: number;
    votingQuorumPercent?: number;
}
/**
 * Request interface for creating a role
 */
interface CreateRoleRequest {
    name: string;
    description?: string;
    capabilities: OrgCapability[];
    maxHolders?: number;
}
/**
 * Options for listing organizations
 */
interface ListOrganizationsOptions {
    limit?: number;
    offset?: number;
    search?: string;
    jurisdictionType?: JurisdictionType;
    isVerified?: boolean;
    includeInactive?: boolean;
    sort?: 'newest' | 'members' | 'alphabetical' | 'verified';
}
/**
 * Organization Service Class
 */
export declare class OrganizationService {
    /**
     * ORGANIZATION CRUD
     */
    /**
     * Create a new organization
     * The creating user automatically becomes the organization head
     */
    createOrganization(userId: string, data: CreateOrganizationRequest): Promise<Organization>;
    /**
     * Get organization by ID
     */
    getOrganization(organizationId: string, includeDetails?: boolean): Promise<Organization | null>;
    /**
     * Get organization by slug
     */
    getOrganizationBySlug(slug: string): Promise<Organization | null>;
    /**
     * Update organization settings
     */
    updateOrganization(organizationId: string, data: UpdateOrganizationRequest): Promise<Organization>;
    /**
     * List organizations with filtering and pagination
     */
    listOrganizations(options?: ListOrganizationsOptions): Promise<{
        organizations: Organization[];
        total: number;
    }>;
    /**
     * Deactivate (soft delete) an organization
     */
    deactivateOrganization(organizationId: string): Promise<Organization>;
    /**
     * MEMBERSHIP MANAGEMENT
     */
    /**
     * Request to join an organization
     */
    requestMembership(organizationId: string, userId: string): Promise<OrganizationMember>;
    /**
     * Invite a user to join an organization
     */
    inviteMember(organizationId: string, targetUserId: string, invitedBy: string): Promise<OrganizationMember>;
    /**
     * Approve a membership request
     */
    approveMembership(membershipId: string): Promise<OrganizationMember>;
    /**
     * Deny/remove a membership
     */
    removeMembership(membershipId: string): Promise<OrganizationMember>;
    /**
     * List organization members
     */
    listMembers(organizationId: string, options?: {
        status?: MembershipStatus;
        limit?: number;
        offset?: number;
    }): Promise<{
        members: OrganizationMember[];
        total: number;
    }>;
    /**
     * ROLE MANAGEMENT
     */
    /**
     * Create a new role
     */
    createRole(organizationId: string, data: CreateRoleRequest): Promise<OrganizationRole>;
    /**
     * Update a role
     */
    updateRole(roleId: string, data: Partial<CreateRoleRequest>): Promise<OrganizationRole>;
    /**
     * Delete a role (removes role assignment from all members)
     */
    deleteRole(roleId: string): Promise<void>;
    /**
     * List roles in an organization
     */
    listRoles(organizationId: string): Promise<OrganizationRole[]>;
    /**
     * Assign a role to a member
     */
    assignRole(membershipId: string, roleId: string): Promise<OrganizationMember>;
    /**
     * Remove role from a member
     */
    removeRole(membershipId: string): Promise<OrganizationMember>;
    /**
     * HEADSHIP MANAGEMENT
     */
    /**
     * Transfer organization headship to another member
     */
    transferHeadship(organizationId: string, newHeadUserId: string): Promise<Organization>;
    /**
     * ORGANIZATION FOLLOWING
     */
    /**
     * Follow an organization
     */
    followOrganization(organizationId: string, userId: string): Promise<void>;
    /**
     * Unfollow an organization
     */
    unfollowOrganization(organizationId: string, userId: string): Promise<void>;
    /**
     * Check if user follows an organization
     */
    isFollowing(organizationId: string, userId: string): Promise<boolean>;
    /**
     * Get follower count for an organization
     */
    getFollowerCount(organizationId: string): Promise<number>;
    /**
     * UTILITY METHODS
     */
    /**
     * Generate a URL-safe slug from organization name
     */
    generateSlug(name: string): string;
    /**
     * Check if a slug is available
     */
    isSlugAvailable(slug: string, excludeOrgId?: string): Promise<boolean>;
    /**
     * Get user's membership in an organization
     */
    getUserMembership(organizationId: string, userId: string): Promise<OrganizationMember | null>;
    /**
     * Get all organizations a user is a member of
     */
    getUserOrganizations(userId: string, options?: {
        status?: MembershipStatus;
    }): Promise<OrganizationMember[]>;
    /**
     * Get organization the user is head of (if any)
     */
    getUserHeadedOrganization(userId: string): Promise<Organization | null>;
}
export declare const organizationService: OrganizationService;
export {};
//# sourceMappingURL=organizationService.d.ts.map