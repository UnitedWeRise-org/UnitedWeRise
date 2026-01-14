"use strict";
/**
 * @fileoverview Organization Authorization Middleware
 *
 * Provides capability-based authorization for organization actions.
 * Checks if authenticated user has required capability within an organization.
 *
 * @module middleware/orgAuth
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOrgHead = exports.requireOrgMembership = exports.requireOrgCapability = void 0;
exports.hasOrgCapability = hasOrgCapability;
const prisma_1 = require("../lib/prisma");
const client_1 = require("@prisma/client");
const logger_1 = require("../services/logger");
/**
 * Get the organization ID from the request
 * Checks route params, query, and body in that order
 */
function getOrganizationId(req) {
    return (req.params.organizationId ||
        req.params.orgId ||
        req.params.id ||
        req.query.organizationId ||
        req.body?.organizationId);
}
/**
 * Creates middleware that requires specific capability(ies) within an organization
 *
 * @param requiredCapabilities - Single capability or array of capabilities (user needs at least one)
 * @returns Express middleware function
 *
 * @example
 * // Require single capability
 * router.post('/orgs/:orgId/invite', requireAuth, requireOrgCapability('INVITE_MEMBERS'), inviteHandler);
 *
 * @example
 * // Require any of multiple capabilities
 * router.delete('/orgs/:orgId/members/:userId', requireAuth, requireOrgCapability(['REMOVE_MEMBERS', 'MANAGE_ORG_SETTINGS']), removeHandler);
 */
const requireOrgCapability = (requiredCapabilities) => {
    const capabilities = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                logger_1.logger.warn({ path: req.path }, 'ORG_AUTH: No authenticated user');
                return res.status(401).json({ error: 'Authentication required' });
            }
            const organizationId = getOrganizationId(req);
            if (!organizationId) {
                logger_1.logger.warn({ path: req.path, userId }, 'ORG_AUTH: No organization ID provided');
                return res.status(400).json({ error: 'Organization ID required' });
            }
            // Fetch organization and check if user is head
            const organization = await prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    id: true,
                    headUserId: true,
                    isActive: true,
                },
            });
            if (!organization) {
                logger_1.logger.warn({ organizationId, userId }, 'ORG_AUTH: Organization not found');
                return res.status(404).json({ error: 'Organization not found' });
            }
            if (!organization.isActive) {
                logger_1.logger.warn({ organizationId, userId }, 'ORG_AUTH: Organization is inactive');
                return res.status(403).json({ error: 'Organization is inactive' });
            }
            // Head has all capabilities
            if (organization.headUserId === userId) {
                req.orgContext = {
                    organizationId,
                    isHead: true,
                    capabilities: Object.values(client_1.OrgCapability),
                };
                return next();
            }
            // Check membership and role capabilities
            const membership = await prisma_1.prisma.organizationMember.findUnique({
                where: {
                    organizationId_userId: {
                        organizationId,
                        userId,
                    },
                },
                select: {
                    id: true,
                    roleId: true,
                    status: true,
                    role: {
                        select: {
                            capabilities: true,
                        },
                    },
                },
            });
            if (!membership) {
                logger_1.logger.info({ organizationId, userId, requiredCapabilities: capabilities }, 'ORG_AUTH: User not a member');
                return res.status(403).json({ error: 'Not a member of this organization' });
            }
            if (membership.status !== client_1.MembershipStatus.ACTIVE) {
                logger_1.logger.info({ organizationId, userId, status: membership.status }, 'ORG_AUTH: Membership not active');
                return res.status(403).json({ error: 'Membership is not active' });
            }
            // Get capabilities from role (empty array if no role assigned)
            const userCapabilities = membership.role?.capabilities || [];
            // Check if user has at least one of the required capabilities
            const hasCapability = capabilities.some(cap => userCapabilities.includes(cap));
            if (!hasCapability) {
                logger_1.logger.info({
                    organizationId,
                    userId,
                    requiredCapabilities: capabilities,
                    userCapabilities,
                }, 'ORG_AUTH: Missing required capability');
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: capabilities,
                });
            }
            // Set organization context for downstream handlers
            req.orgContext = {
                organizationId,
                isHead: false,
                membership: {
                    id: membership.id,
                    roleId: membership.roleId,
                    status: membership.status,
                },
                capabilities: userCapabilities,
            };
            next();
        }
        catch (error) {
            logger_1.logger.error({ error, path: req.path }, 'ORG_AUTH: Error checking capability');
            return res.status(500).json({ error: 'Authorization check failed' });
        }
    };
};
exports.requireOrgCapability = requireOrgCapability;
/**
 * Creates middleware that requires membership in an organization (any status)
 * Use this for read-only access that any member can perform
 *
 * @param requireActive - If true, requires ACTIVE membership status (default: true)
 * @returns Express middleware function
 *
 * @example
 * router.get('/orgs/:orgId/discussions', requireAuth, requireOrgMembership(), listDiscussions);
 */
const requireOrgMembership = (requireActive = true) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const organizationId = getOrganizationId(req);
            if (!organizationId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }
            // Check if org exists and if user is head
            const organization = await prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { id: true, headUserId: true, isActive: true },
            });
            if (!organization) {
                return res.status(404).json({ error: 'Organization not found' });
            }
            if (!organization.isActive) {
                return res.status(403).json({ error: 'Organization is inactive' });
            }
            // Head is always a member
            if (organization.headUserId === userId) {
                req.orgContext = {
                    organizationId,
                    isHead: true,
                    capabilities: Object.values(client_1.OrgCapability),
                };
                return next();
            }
            // Check membership
            const membership = await prisma_1.prisma.organizationMember.findUnique({
                where: {
                    organizationId_userId: {
                        organizationId,
                        userId,
                    },
                },
                select: {
                    id: true,
                    roleId: true,
                    status: true,
                    role: {
                        select: {
                            capabilities: true,
                        },
                    },
                },
            });
            if (!membership) {
                return res.status(403).json({ error: 'Not a member of this organization' });
            }
            if (requireActive && membership.status !== client_1.MembershipStatus.ACTIVE) {
                return res.status(403).json({ error: 'Membership is not active' });
            }
            req.orgContext = {
                organizationId,
                isHead: false,
                membership: {
                    id: membership.id,
                    roleId: membership.roleId,
                    status: membership.status,
                },
                capabilities: membership.role?.capabilities || [],
            };
            next();
        }
        catch (error) {
            logger_1.logger.error({ error, path: req.path }, 'ORG_AUTH: Error checking membership');
            return res.status(500).json({ error: 'Authorization check failed' });
        }
    };
};
exports.requireOrgMembership = requireOrgMembership;
/**
 * Creates middleware that requires user to be the organization head
 * Use this for head-only operations like transferring headship or dissolving org
 *
 * @returns Express middleware function
 *
 * @example
 * router.post('/orgs/:orgId/transfer-headship', requireAuth, requireOrgHead(), transferHeadship);
 */
const requireOrgHead = () => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const organizationId = getOrganizationId(req);
            if (!organizationId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }
            const organization = await prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { id: true, headUserId: true, isActive: true },
            });
            if (!organization) {
                return res.status(404).json({ error: 'Organization not found' });
            }
            if (!organization.isActive) {
                return res.status(403).json({ error: 'Organization is inactive' });
            }
            if (organization.headUserId !== userId) {
                logger_1.logger.info({ organizationId, userId }, 'ORG_AUTH: User is not organization head');
                return res.status(403).json({ error: 'Only organization head can perform this action' });
            }
            req.orgContext = {
                organizationId,
                isHead: true,
                capabilities: Object.values(client_1.OrgCapability),
            };
            next();
        }
        catch (error) {
            logger_1.logger.error({ error, path: req.path }, 'ORG_AUTH: Error checking head status');
            return res.status(500).json({ error: 'Authorization check failed' });
        }
    };
};
exports.requireOrgHead = requireOrgHead;
/**
 * Helper function to check if user has a capability (for use in route handlers)
 *
 * @param req - The request object with orgContext
 * @param capability - The capability to check
 * @returns Boolean indicating if user has the capability
 */
function hasOrgCapability(req, capability) {
    if (!req.orgContext)
        return false;
    if (req.orgContext.isHead)
        return true;
    return req.orgContext.capabilities.includes(capability);
}
//# sourceMappingURL=orgAuth.js.map