/**
 * Organization Service
 *
 * Handles organization CRUD, membership management, roles, and capabilities.
 * Core business logic for the organization system.
 *
 * @module services/organizationService
 */

import {
  Organization,
  OrganizationMember,
  OrganizationRole,
  OrgCapability,
  MembershipStatus,
  JurisdictionType,
  VotingThresholdType,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

// Types for API requests

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
}

/**
 * Standard user select fields for API responses
 */
const USER_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  avatar: true,
} as const;

/**
 * Organization Service Class
 */
export class OrganizationService {
  /**
   * ORGANIZATION CRUD
   */

  /**
   * Create a new organization
   * The creating user automatically becomes the organization head
   */
  async createOrganization(userId: string, data: CreateOrganizationRequest): Promise<Organization> {
    // Check if user already heads an organization
    const existingHeadship = await prisma.organization.findFirst({
      where: { headUserId: userId, isActive: true },
      select: { id: true, name: true },
    });

    if (existingHeadship) {
      throw new Error(`You are already the head of "${existingHeadship.name}". Users can only head one organization.`);
    }

    // Validate slug uniqueness
    const existingSlug = await prisma.organization.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });

    if (existingSlug) {
      throw new Error('An organization with this slug already exists');
    }

    // If parent is specified, verify it exists
    if (data.parentId) {
      const parent = await prisma.organization.findUnique({
        where: { id: data.parentId },
        select: { id: true, isActive: true },
      });

      if (!parent) {
        throw new Error('Parent organization not found');
      }

      if (!parent.isActive) {
        throw new Error('Cannot create sub-organization under an inactive organization');
      }
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        avatar: data.avatar,
        website: data.website,
        headUserId: userId,
        parentId: data.parentId,
        jurisdictionType: data.jurisdictionType,
        jurisdictionValue: data.jurisdictionValue,
        h3Cells: data.h3Cells || [],
        endorsementsEnabled: data.endorsementsEnabled ?? false,
        votingThresholdType: data.votingThresholdType ?? VotingThresholdType.SIMPLE_MAJORITY,
        votingThresholdValue: data.votingThresholdValue,
        votingQuorumPercent: data.votingQuorumPercent ?? 0,
      },
      include: {
        head: {
          select: USER_SELECT,
        },
        _count: {
          select: {
            members: true,
            children: true,
          },
        },
      },
    });

    logger.info({ organizationId: organization.id, userId }, 'Organization created');

    return organization;
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string, includeDetails = false): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        head: {
          select: USER_SELECT,
        },
        parent: includeDetails
          ? {
              select: {
                id: true,
                name: true,
                slug: true,
                avatar: true,
              },
            }
          : false,
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            children: { where: { isActive: true } },
            posts: true,
            events: true,
          },
        },
      },
    });
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        head: {
          select: USER_SELECT,
        },
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
            children: { where: { isActive: true } },
          },
        },
      },
    });
  }

  /**
   * Update organization settings
   */
  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationRequest
  ): Promise<Organization> {
    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        head: {
          select: USER_SELECT,
        },
      },
    });
  }

  /**
   * List organizations with filtering and pagination
   */
  async listOrganizations(options: ListOrganizationsOptions = {}): Promise<{
    organizations: Organization[];
    total: number;
  }> {
    const { limit = 20, offset = 0, search, jurisdictionType, isVerified, includeInactive = false } = options;

    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(jurisdictionType ? { jurisdictionType } : {}),
      ...(isVerified !== undefined ? { isVerified } : {}),
    };

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          head: {
            select: USER_SELECT,
          },
          _count: {
            select: {
              members: { where: { status: MembershipStatus.ACTIVE } },
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return { organizations, total };
  }

  /**
   * Deactivate (soft delete) an organization
   */
  async deactivateOrganization(organizationId: string): Promise<Organization> {
    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * MEMBERSHIP MANAGEMENT
   */

  /**
   * Request to join an organization
   */
  async requestMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember> {
    // Check if already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (existing) {
      if (existing.status === MembershipStatus.ACTIVE) {
        throw new Error('You are already a member of this organization');
      }
      if (existing.status === MembershipStatus.PENDING) {
        throw new Error('You already have a pending membership request');
      }
      if (existing.status === MembershipStatus.SUSPENDED) {
        throw new Error('Your membership has been suspended');
      }
    }

    // If there's an old REMOVED record, update it to PENDING
    if (existing && existing.status === MembershipStatus.REMOVED) {
      return prisma.organizationMember.update({
        where: { id: existing.id },
        data: {
          status: MembershipStatus.PENDING,
          roleId: null,
          joinedAt: null,
          invitedBy: null,
          updatedAt: new Date(),
        },
        include: {
          user: { select: USER_SELECT },
          organization: { select: { id: true, name: true, slug: true } },
        },
      });
    }

    return prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        status: MembershipStatus.PENDING,
      },
      include: {
        user: { select: USER_SELECT },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Invite a user to join an organization
   */
  async inviteMember(
    organizationId: string,
    targetUserId: string,
    invitedBy: string
  ): Promise<OrganizationMember> {
    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if already a member
    const existing = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: targetUserId },
      },
    });

    if (existing) {
      if (existing.status === MembershipStatus.ACTIVE) {
        throw new Error('User is already a member of this organization');
      }
      if (existing.status === MembershipStatus.PENDING) {
        throw new Error('User already has a pending membership');
      }
    }

    // Create or update membership
    if (existing && existing.status === MembershipStatus.REMOVED) {
      return prisma.organizationMember.update({
        where: { id: existing.id },
        data: {
          status: MembershipStatus.PENDING,
          invitedBy,
          updatedAt: new Date(),
        },
        include: {
          user: { select: USER_SELECT },
          organization: { select: { id: true, name: true, slug: true } },
        },
      });
    }

    return prisma.organizationMember.create({
      data: {
        organizationId,
        userId: targetUserId,
        status: MembershipStatus.PENDING,
        invitedBy,
      },
      include: {
        user: { select: USER_SELECT },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Approve a membership request
   */
  async approveMembership(membershipId: string): Promise<OrganizationMember> {
    const membership = await prisma.organizationMember.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.status !== MembershipStatus.PENDING) {
      throw new Error('Membership is not pending approval');
    }

    return prisma.organizationMember.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        user: { select: USER_SELECT },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Deny/remove a membership
   */
  async removeMembership(membershipId: string): Promise<OrganizationMember> {
    const membership = await prisma.organizationMember.findUnique({
      where: { id: membershipId },
      include: {
        organization: { select: { headUserId: true } },
      },
    });

    if (!membership) {
      throw new Error('Membership not found');
    }

    // Cannot remove the organization head
    if (membership.userId === membership.organization.headUserId) {
      throw new Error('Cannot remove the organization head from membership');
    }

    return prisma.organizationMember.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.REMOVED,
        roleId: null, // Remove role assignment
        updatedAt: new Date(),
      },
    });
  }

  /**
   * List organization members
   */
  async listMembers(
    organizationId: string,
    options: { status?: MembershipStatus; limit?: number; offset?: number } = {}
  ): Promise<{ members: OrganizationMember[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    const where = {
      organizationId,
      ...(status ? { status } : {}),
    };

    const [members, total] = await Promise.all([
      prisma.organizationMember.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: USER_SELECT },
          role: {
            select: {
              id: true,
              name: true,
              capabilities: true,
            },
          },
        },
      }),
      prisma.organizationMember.count({ where }),
    ]);

    return { members, total };
  }

  /**
   * ROLE MANAGEMENT
   */

  /**
   * Create a new role
   */
  async createRole(
    organizationId: string,
    data: CreateRoleRequest
  ): Promise<OrganizationRole> {
    // Check for duplicate role name
    const existing = await prisma.organizationRole.findUnique({
      where: {
        organizationId_name: { organizationId, name: data.name },
      },
    });

    if (existing) {
      throw new Error('A role with this name already exists in this organization');
    }

    return prisma.organizationRole.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        capabilities: data.capabilities,
        maxHolders: data.maxHolders ?? 1,
      },
    });
  }

  /**
   * Update a role
   */
  async updateRole(
    roleId: string,
    data: Partial<CreateRoleRequest>
  ): Promise<OrganizationRole> {
    return prisma.organizationRole.update({
      where: { id: roleId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.capabilities !== undefined ? { capabilities: data.capabilities } : {}),
        ...(data.maxHolders !== undefined ? { maxHolders: data.maxHolders } : {}),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a role (removes role assignment from all members)
   */
  async deleteRole(roleId: string): Promise<void> {
    await prisma.$transaction([
      // Remove role from all members
      prisma.organizationMember.updateMany({
        where: { roleId },
        data: { roleId: null },
      }),
      // Delete the role
      prisma.organizationRole.delete({
        where: { id: roleId },
      }),
    ]);
  }

  /**
   * List roles in an organization
   */
  async listRoles(organizationId: string): Promise<OrganizationRole[]> {
    return prisma.organizationRole.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
          },
        },
      },
    });
  }

  /**
   * Assign a role to a member
   */
  async assignRole(membershipId: string, roleId: string): Promise<OrganizationMember> {
    const membership = await prisma.organizationMember.findUnique({
      where: { id: membershipId },
      include: { organization: true },
    });

    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new Error('Can only assign roles to active members');
    }

    const role = await prisma.organizationRole.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
          },
        },
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.organizationId !== membership.organizationId) {
      throw new Error('Role does not belong to this organization');
    }

    // Check max holders
    if (role._count.members >= role.maxHolders) {
      throw new Error(`This role can only be held by ${role.maxHolders} member(s)`);
    }

    return prisma.organizationMember.update({
      where: { id: membershipId },
      data: {
        roleId,
        updatedAt: new Date(),
      },
      include: {
        user: { select: USER_SELECT },
        role: {
          select: {
            id: true,
            name: true,
            capabilities: true,
          },
        },
      },
    });
  }

  /**
   * Remove role from a member
   */
  async removeRole(membershipId: string): Promise<OrganizationMember> {
    return prisma.organizationMember.update({
      where: { id: membershipId },
      data: {
        roleId: null,
        updatedAt: new Date(),
      },
      include: {
        user: { select: USER_SELECT },
      },
    });
  }

  /**
   * HEADSHIP MANAGEMENT
   */

  /**
   * Transfer organization headship to another member
   */
  async transferHeadship(
    organizationId: string,
    newHeadUserId: string
  ): Promise<Organization> {
    // Verify new head is an active member
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: newHeadUserId },
      },
    });

    if (!membership) {
      throw new Error('New head must be a member of the organization');
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new Error('New head must have active membership');
    }

    // Check if new head already leads another organization
    const existingHeadship = await prisma.organization.findFirst({
      where: {
        headUserId: newHeadUserId,
        isActive: true,
        id: { not: organizationId },
      },
      select: { id: true, name: true },
    });

    if (existingHeadship) {
      throw new Error(`User already heads "${existingHeadship.name}". Users can only head one organization.`);
    }

    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        headUserId: newHeadUserId,
        updatedAt: new Date(),
      },
      include: {
        head: {
          select: USER_SELECT,
        },
      },
    });
  }

  /**
   * ORGANIZATION FOLLOWING
   */

  /**
   * Follow an organization
   */
  async followOrganization(organizationId: string, userId: string): Promise<void> {
    await prisma.organizationFollow.upsert({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      create: {
        organizationId,
        userId,
      },
      update: {}, // No-op if already following
    });
  }

  /**
   * Unfollow an organization
   */
  async unfollowOrganization(organizationId: string, userId: string): Promise<void> {
    await prisma.organizationFollow.deleteMany({
      where: { organizationId, userId },
    });
  }

  /**
   * Check if user follows an organization
   */
  async isFollowing(organizationId: string, userId: string): Promise<boolean> {
    const follow = await prisma.organizationFollow.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
    return !!follow;
  }

  /**
   * Get follower count for an organization
   */
  async getFollowerCount(organizationId: string): Promise<number> {
    return prisma.organizationFollow.count({
      where: { organizationId },
    });
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Generate a URL-safe slug from organization name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Check if a slug is available
   */
  async isSlugAvailable(slug: string, excludeOrgId?: string): Promise<boolean> {
    const existing = await prisma.organization.findFirst({
      where: {
        slug,
        ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  /**
   * Get user's membership in an organization
   */
  async getUserMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMember | null> {
    return prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            capabilities: true,
          },
        },
      },
    });
  }

  /**
   * Get all organizations a user is a member of
   */
  async getUserOrganizations(
    userId: string,
    options: { status?: MembershipStatus } = {}
  ): Promise<OrganizationMember[]> {
    return prisma.organizationMember.findMany({
      where: {
        userId,
        ...(options.status ? { status: options.status } : {}),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true,
            description: true,
            isVerified: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            capabilities: true,
          },
        },
      },
      orderBy: {
        organization: { name: 'asc' },
      },
    });
  }

  /**
   * Get organization the user is head of (if any)
   */
  async getUserHeadedOrganization(userId: string): Promise<Organization | null> {
    return prisma.organization.findFirst({
      where: {
        headUserId: userId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            members: { where: { status: MembershipStatus.ACTIVE } },
          },
        },
      },
    });
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();
