"use strict";
/**
 * Organization Service
 *
 * Handles organization CRUD, membership management, roles, and capabilities.
 * Core business logic for the organization system.
 *
 * @module services/organizationService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationService = exports.OrganizationService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
/**
 * Standard user select fields for API responses
 */
const USER_SELECT = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    avatar: true,
};
/**
 * Organization Service Class
 */
class OrganizationService {
    /**
     * ORGANIZATION CRUD
     */
    /**
     * Create a new organization
     * The creating user automatically becomes the organization head
     */
    async createOrganization(userId, data) {
        // Check if user already heads an organization
        const existingHeadship = await prisma_1.prisma.organization.findFirst({
            where: { headUserId: userId, isActive: true },
            select: { id: true, name: true },
        });
        if (existingHeadship) {
            throw new Error(`You are already the head of "${existingHeadship.name}". Users can only head one organization.`);
        }
        // Validate slug uniqueness
        const existingSlug = await prisma_1.prisma.organization.findUnique({
            where: { slug: data.slug },
            select: { id: true },
        });
        if (existingSlug) {
            throw new Error('An organization with this slug already exists');
        }
        // If parent is specified, verify it exists
        if (data.parentId) {
            const parent = await prisma_1.prisma.organization.findUnique({
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
        const organization = await prisma_1.prisma.organization.create({
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
                votingThresholdType: data.votingThresholdType ?? client_1.VotingThresholdType.SIMPLE_MAJORITY,
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
        logger_1.logger.info({ organizationId: organization.id, userId }, 'Organization created');
        return organization;
    }
    /**
     * Get organization by ID
     */
    async getOrganization(organizationId, includeDetails = false) {
        return prisma_1.prisma.organization.findUnique({
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
                        members: { where: { status: client_1.MembershipStatus.ACTIVE } },
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
    async getOrganizationBySlug(slug) {
        return prisma_1.prisma.organization.findUnique({
            where: { slug },
            include: {
                head: {
                    select: USER_SELECT,
                },
                _count: {
                    select: {
                        members: { where: { status: client_1.MembershipStatus.ACTIVE } },
                        children: { where: { isActive: true } },
                    },
                },
            },
        });
    }
    /**
     * Update organization settings
     */
    async updateOrganization(organizationId, data) {
        return prisma_1.prisma.organization.update({
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
    async listOrganizations(options = {}) {
        const { limit = 20, offset = 0, search, jurisdictionType, isVerified, includeInactive = false } = options;
        const where = {
            ...(includeInactive ? {} : { isActive: true }),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(jurisdictionType ? { jurisdictionType } : {}),
            ...(isVerified !== undefined ? { isVerified } : {}),
        };
        const [organizations, total] = await Promise.all([
            prisma_1.prisma.organization.findMany({
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
                            members: { where: { status: client_1.MembershipStatus.ACTIVE } },
                        },
                    },
                },
            }),
            prisma_1.prisma.organization.count({ where }),
        ]);
        return { organizations, total };
    }
    /**
     * Deactivate (soft delete) an organization
     */
    async deactivateOrganization(organizationId) {
        return prisma_1.prisma.organization.update({
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
    async requestMembership(organizationId, userId) {
        // Check if already a member
        const existing = await prisma_1.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: { organizationId, userId },
            },
        });
        if (existing) {
            if (existing.status === client_1.MembershipStatus.ACTIVE) {
                throw new Error('You are already a member of this organization');
            }
            if (existing.status === client_1.MembershipStatus.PENDING) {
                throw new Error('You already have a pending membership request');
            }
            if (existing.status === client_1.MembershipStatus.SUSPENDED) {
                throw new Error('Your membership has been suspended');
            }
        }
        // If there's an old REMOVED record, update it to PENDING
        if (existing && existing.status === client_1.MembershipStatus.REMOVED) {
            return prisma_1.prisma.organizationMember.update({
                where: { id: existing.id },
                data: {
                    status: client_1.MembershipStatus.PENDING,
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
        return prisma_1.prisma.organizationMember.create({
            data: {
                organizationId,
                userId,
                status: client_1.MembershipStatus.PENDING,
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
    async inviteMember(organizationId, targetUserId, invitedBy) {
        // Check if target user exists
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });
        if (!targetUser) {
            throw new Error('User not found');
        }
        // Check if already a member
        const existing = await prisma_1.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: { organizationId, userId: targetUserId },
            },
        });
        if (existing) {
            if (existing.status === client_1.MembershipStatus.ACTIVE) {
                throw new Error('User is already a member of this organization');
            }
            if (existing.status === client_1.MembershipStatus.PENDING) {
                throw new Error('User already has a pending membership');
            }
        }
        // Create or update membership
        if (existing && existing.status === client_1.MembershipStatus.REMOVED) {
            return prisma_1.prisma.organizationMember.update({
                where: { id: existing.id },
                data: {
                    status: client_1.MembershipStatus.PENDING,
                    invitedBy,
                    updatedAt: new Date(),
                },
                include: {
                    user: { select: USER_SELECT },
                    organization: { select: { id: true, name: true, slug: true } },
                },
            });
        }
        return prisma_1.prisma.organizationMember.create({
            data: {
                organizationId,
                userId: targetUserId,
                status: client_1.MembershipStatus.PENDING,
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
    async approveMembership(membershipId) {
        const membership = await prisma_1.prisma.organizationMember.findUnique({
            where: { id: membershipId },
        });
        if (!membership) {
            throw new Error('Membership not found');
        }
        if (membership.status !== client_1.MembershipStatus.PENDING) {
            throw new Error('Membership is not pending approval');
        }
        return prisma_1.prisma.organizationMember.update({
            where: { id: membershipId },
            data: {
                status: client_1.MembershipStatus.ACTIVE,
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
    async removeMembership(membershipId) {
        const membership = await prisma_1.prisma.organizationMember.findUnique({
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
        return prisma_1.prisma.organizationMember.update({
            where: { id: membershipId },
            data: {
                status: client_1.MembershipStatus.REMOVED,
                roleId: null, // Remove role assignment
                updatedAt: new Date(),
            },
        });
    }
    /**
     * List organization members
     */
    async listMembers(organizationId, options = {}) {
        const { status, limit = 50, offset = 0 } = options;
        const where = {
            organizationId,
            ...(status ? { status } : {}),
        };
        const [members, total] = await Promise.all([
            prisma_1.prisma.organizationMember.findMany({
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
            prisma_1.prisma.organizationMember.count({ where }),
        ]);
        return { members, total };
    }
    /**
     * ROLE MANAGEMENT
     */
    /**
     * Create a new role
     */
    async createRole(organizationId, data) {
        // Check for duplicate role name
        const existing = await prisma_1.prisma.organizationRole.findUnique({
            where: {
                organizationId_name: { organizationId, name: data.name },
            },
        });
        if (existing) {
            throw new Error('A role with this name already exists in this organization');
        }
        return prisma_1.prisma.organizationRole.create({
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
    async updateRole(roleId, data) {
        return prisma_1.prisma.organizationRole.update({
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
    async deleteRole(roleId) {
        await prisma_1.prisma.$transaction([
            // Remove role from all members
            prisma_1.prisma.organizationMember.updateMany({
                where: { roleId },
                data: { roleId: null },
            }),
            // Delete the role
            prisma_1.prisma.organizationRole.delete({
                where: { id: roleId },
            }),
        ]);
    }
    /**
     * List roles in an organization
     */
    async listRoles(organizationId) {
        return prisma_1.prisma.organizationRole.findMany({
            where: { organizationId },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: {
                        members: { where: { status: client_1.MembershipStatus.ACTIVE } },
                    },
                },
            },
        });
    }
    /**
     * Assign a role to a member
     */
    async assignRole(membershipId, roleId) {
        const membership = await prisma_1.prisma.organizationMember.findUnique({
            where: { id: membershipId },
            include: { organization: true },
        });
        if (!membership) {
            throw new Error('Membership not found');
        }
        if (membership.status !== client_1.MembershipStatus.ACTIVE) {
            throw new Error('Can only assign roles to active members');
        }
        const role = await prisma_1.prisma.organizationRole.findUnique({
            where: { id: roleId },
            include: {
                _count: {
                    select: {
                        members: { where: { status: client_1.MembershipStatus.ACTIVE } },
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
        return prisma_1.prisma.organizationMember.update({
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
    async removeRole(membershipId) {
        return prisma_1.prisma.organizationMember.update({
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
    async transferHeadship(organizationId, newHeadUserId) {
        // Verify new head is an active member
        const membership = await prisma_1.prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: { organizationId, userId: newHeadUserId },
            },
        });
        if (!membership) {
            throw new Error('New head must be a member of the organization');
        }
        if (membership.status !== client_1.MembershipStatus.ACTIVE) {
            throw new Error('New head must have active membership');
        }
        // Check if new head already leads another organization
        const existingHeadship = await prisma_1.prisma.organization.findFirst({
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
        return prisma_1.prisma.organization.update({
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
    async followOrganization(organizationId, userId) {
        await prisma_1.prisma.organizationFollow.upsert({
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
    async unfollowOrganization(organizationId, userId) {
        await prisma_1.prisma.organizationFollow.deleteMany({
            where: { organizationId, userId },
        });
    }
    /**
     * Check if user follows an organization
     */
    async isFollowing(organizationId, userId) {
        const follow = await prisma_1.prisma.organizationFollow.findUnique({
            where: {
                organizationId_userId: { organizationId, userId },
            },
        });
        return !!follow;
    }
    /**
     * Get follower count for an organization
     */
    async getFollowerCount(organizationId) {
        return prisma_1.prisma.organizationFollow.count({
            where: { organizationId },
        });
    }
    /**
     * UTILITY METHODS
     */
    /**
     * Generate a URL-safe slug from organization name
     */
    generateSlug(name) {
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
    async isSlugAvailable(slug, excludeOrgId) {
        const existing = await prisma_1.prisma.organization.findFirst({
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
    async getUserMembership(organizationId, userId) {
        return prisma_1.prisma.organizationMember.findUnique({
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
    async getUserOrganizations(userId, options = {}) {
        return prisma_1.prisma.organizationMember.findMany({
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
    async getUserHeadedOrganization(userId) {
        return prisma_1.prisma.organization.findFirst({
            where: {
                headUserId: userId,
                isActive: true,
            },
            include: {
                _count: {
                    select: {
                        members: { where: { status: client_1.MembershipStatus.ACTIVE } },
                    },
                },
            },
        });
    }
}
exports.OrganizationService = OrganizationService;
// Export singleton instance
exports.organizationService = new OrganizationService();
//# sourceMappingURL=organizationService.js.map