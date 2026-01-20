"use strict";
/**
 * @fileoverview Organization Routes
 *
 * Handles organization CRUD, membership, roles, and following.
 * Uses capability-based authorization via orgAuth middleware.
 *
 * @module routes/organizations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const orgAuth_1 = require("../middleware/orgAuth");
const organizationService_1 = require("../services/organizationService");
const jurisdictionService_1 = require("../services/jurisdictionService");
const client_1 = require("@prisma/client");
const logger_1 = require("../services/logger");
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   - name: Organizations
 *     description: Organization management endpoints
 *   - name: Organization Membership
 *     description: Organization membership management
 *   - name: Organization Roles
 *     description: Organization role management
 */
/**
 * @swagger
 * /api/organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     description: Creates a new organization. The authenticated user becomes the organization head. Users can only head one organization.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Organization display name
 *               slug:
 *                 type: string
 *                 pattern: ^[a-z0-9-]+$
 *                 description: URL-friendly unique identifier
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Organization description
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 description: Avatar/logo URL
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Organization website
 *               jurisdictionType:
 *                 type: string
 *                 enum: [NATIONAL, STATE, COUNTY, CITY, CUSTOM]
 *               jurisdictionValue:
 *                 type: string
 *                 description: Jurisdiction identifier (e.g., "TX", "Travis County, TX")
 *               parentId:
 *                 type: string
 *                 description: Parent organization ID for sub-organizations
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Invalid input or slug already exists
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: User already heads an organization
 */
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, slug, description, avatar, website, jurisdictionType, jurisdictionValue, h3Cells, parentId } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(slug)) {
            return res.status(400).json({
                error: 'Slug must contain only lowercase letters, numbers, and hyphens',
            });
        }
        const organization = await organizationService_1.organizationService.createOrganization(userId, {
            name,
            slug,
            description,
            avatar,
            website,
            jurisdictionType,
            jurisdictionValue,
            h3Cells,
            parentId,
        });
        logger_1.logger.info({ organizationId: organization.id, userId }, 'Organization created');
        res.status(201).json({
            success: true,
            organization,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to create organization');
        if (error.message.includes('already')) {
            return res.status(409).json({ error: error.message });
        }
        res.status(400).json({ error: error.message || 'Failed to create organization' });
    }
});
/**
 * @swagger
 * /api/organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List organizations
 *     description: List organizations with optional filtering, sorting, and pagination
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *       - in: query
 *         name: jurisdictionType
 *         schema:
 *           type: string
 *           enum: [NATIONAL, STATE, COUNTY, CITY, CUSTOM]
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, members, alphabetical, verified]
 *           default: newest
 *         description: Sort order for results
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', async (req, res) => {
    try {
        const { limit, offset, search, jurisdictionType, isVerified, sort } = req.query;
        // Validate sort option
        const validSorts = ['newest', 'members', 'alphabetical', 'verified'];
        const sortOption = validSorts.includes(sort) ? sort : 'newest';
        const result = await organizationService_1.organizationService.listOrganizations({
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
            search: search,
            jurisdictionType: jurisdictionType,
            isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
            sort: sortOption,
        });
        res.json({
            success: true,
            organizations: result.organizations,
            total: result.total,
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to list organizations');
        res.status(500).json({ error: 'Failed to list organizations' });
    }
});
/**
 * @swagger
 * /api/organizations/nearby:
 *   get:
 *     tags: [Organizations]
 *     summary: Find organizations near a location
 *     description: Returns organizations with jurisdiction covering the specified coordinates
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: rings
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Number of H3 rings to search (default 3)
 *     responses:
 *       200:
 *         description: List of nearby organizations
 *       400:
 *         description: Invalid coordinates
 */
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, rings } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({ error: 'Coordinates out of range' });
        }
        const organizations = await jurisdictionService_1.jurisdictionService.findNearbyOrganizations(latitude, longitude, rings ? parseInt(rings) : 3);
        res.json({
            success: true,
            organizations,
            count: organizations.length,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to find nearby organizations');
        res.status(500).json({ error: 'Failed to find nearby organizations' });
    }
});
/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Organization not found
 */
router.get('/:id', async (req, res) => {
    try {
        const organization = await organizationService_1.organizationService.getOrganization(req.params.id, true);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json({
            success: true,
            organization,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.id }, 'Failed to get organization');
        res.status(500).json({ error: 'Failed to get organization' });
    }
});
/**
 * @swagger
 * /api/organizations/slug/{slug}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Organization not found
 */
router.get('/slug/:slug', async (req, res) => {
    try {
        const organization = await organizationService_1.organizationService.getOrganizationBySlug(req.params.slug);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        res.json({
            success: true,
            organization,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, slug: req.params.slug }, 'Failed to get organization by slug');
        res.status(500).json({ error: 'Failed to get organization' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization settings
 *     description: Requires MANAGE_ORG_SETTINGS capability or being the organization head
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *               website:
 *                 type: string
 *               endorsementsEnabled:
 *                 type: boolean
 *               votingThresholdType:
 *                 type: string
 *                 enum: [SIMPLE_MAJORITY, TWO_THIRDS, THREE_QUARTERS, UNANIMOUS, PERCENTAGE]
 *               votingQuorumPercent:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Organization updated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Organization not found
 */
router.patch('/:organizationId', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.MANAGE_ORG_SETTINGS), async (req, res) => {
    try {
        const organizationId = req.params.organizationId;
        const { name, description, avatar, website, jurisdictionType, jurisdictionValue, h3Cells, endorsementsEnabled, votingThresholdType, votingThresholdValue, votingQuorumPercent, } = req.body;
        const organization = await organizationService_1.organizationService.updateOrganization(organizationId, {
            name,
            description,
            avatar,
            website,
            jurisdictionType,
            jurisdictionValue,
            h3Cells,
            endorsementsEnabled,
            votingThresholdType,
            votingThresholdValue,
            votingQuorumPercent,
        });
        res.json({
            success: true,
            organization,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to update organization');
        res.status(500).json({ error: error.message || 'Failed to update organization' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Deactivate organization
 *     description: Soft deletes the organization. Requires DISSOLVE_ORG capability (head only).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization deactivated
 *       403:
 *         description: Only head can dissolve organization
 */
router.delete('/:organizationId', auth_1.requireAuth, (0, orgAuth_1.requireOrgHead)(), async (req, res) => {
    try {
        const organization = await organizationService_1.organizationService.deactivateOrganization(req.params.organizationId);
        logger_1.logger.info({ organizationId: organization.id }, 'Organization deactivated');
        res.json({
            success: true,
            message: 'Organization deactivated',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to deactivate organization');
        res.status(500).json({ error: error.message || 'Failed to deactivate organization' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/transfer-headship:
 *   post:
 *     tags: [Organizations]
 *     summary: Transfer organization headship
 *     description: Transfer head role to another active member. Only current head can do this.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newHeadUserId
 *             properties:
 *               newHeadUserId:
 *                 type: string
 *                 description: User ID of the new head
 *     responses:
 *       200:
 *         description: Headship transferred
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Only current head can transfer headship
 */
router.post('/:organizationId/transfer-headship', auth_1.requireAuth, (0, orgAuth_1.requireOrgHead)(), async (req, res) => {
    try {
        const { newHeadUserId } = req.body;
        if (!newHeadUserId) {
            return res.status(400).json({ error: 'newHeadUserId is required' });
        }
        const organization = await organizationService_1.organizationService.transferHeadship(req.params.organizationId, newHeadUserId);
        logger_1.logger.info({
            organizationId: organization.id,
            oldHead: req.user.id,
            newHead: newHeadUserId,
        }, 'Organization headship transferred');
        res.json({
            success: true,
            organization,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to transfer headship');
        res.status(400).json({ error: error.message || 'Failed to transfer headship' });
    }
});
// ===============================
// MEMBERSHIP ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/organizations/{organizationId}/join:
 *   post:
 *     tags: [Organization Membership]
 *     summary: Request to join an organization
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Join request submitted
 *       400:
 *         description: Already a member or pending
 */
router.post('/:organizationId/join', auth_1.requireAuth, async (req, res) => {
    try {
        const membership = await organizationService_1.organizationService.requestMembership(req.params.organizationId, req.user.id);
        // Send notification to org head about new join request
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: req.params.organizationId },
            select: { headUserId: true, name: true },
        });
        if (org) {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'ORG_APPLICATION_RECEIVED',
                    senderId: req.user.id,
                    receiverId: org.headUserId,
                    message: `${req.user.username} has requested to join "${org.name}"`,
                },
            });
        }
        res.status(201).json({
            success: true,
            membership,
            message: 'Join request submitted',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to request membership');
        res.status(400).json({ error: error.message || 'Failed to request membership' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/leave:
 *   post:
 *     tags: [Organization Membership]
 *     summary: Leave an organization
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Left organization
 *       400:
 *         description: Cannot leave (head cannot leave)
 */
router.post('/:organizationId/leave', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const organizationId = req.params.organizationId;
        // Get membership
        const membership = await organizationService_1.organizationService.getUserMembership(organizationId, userId);
        if (!membership) {
            return res.status(400).json({ error: 'Not a member of this organization' });
        }
        await organizationService_1.organizationService.removeMembership(membership.id);
        res.json({
            success: true,
            message: 'Left organization',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to leave organization');
        res.status(400).json({ error: error.message || 'Failed to leave organization' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/invite:
 *   post:
 *     tags: [Organization Membership]
 *     summary: Invite a user to join
 *     description: Requires INVITE_MEMBERS capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent
 */
router.post('/:organizationId/invite', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.INVITE_MEMBERS), async (req, res) => {
    try {
        const { userId: targetUserId } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const membership = await organizationService_1.organizationService.inviteMember(req.params.organizationId, targetUserId, req.user.id);
        // Send notification to invited user
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: req.params.organizationId },
            select: { name: true },
        });
        await prisma_1.prisma.notification.create({
            data: {
                type: 'ORG_INVITE',
                senderId: req.user.id,
                receiverId: targetUserId,
                message: `You've been invited to join "${org?.name || 'an organization'}"`,
            },
        });
        res.status(201).json({
            success: true,
            membership,
            message: 'Invitation sent',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to invite member');
        res.status(400).json({ error: error.message || 'Failed to invite member' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/members:
 *   get:
 *     tags: [Organization Membership]
 *     summary: List organization members
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, SUSPENDED, REMOVED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of members
 */
router.get('/:organizationId/members', async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const result = await organizationService_1.organizationService.listMembers(req.params.organizationId, {
            status: status,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
        res.json({
            success: true,
            members: result.members,
            total: result.total,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list members');
        res.status(500).json({ error: 'Failed to list members' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/members/{membershipId}/approve:
 *   post:
 *     tags: [Organization Membership]
 *     summary: Approve a membership request
 *     description: Requires APPROVE_APPLICATIONS capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Membership approved
 */
router.post('/:organizationId/members/:membershipId/approve', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.APPROVE_APPLICATIONS), async (req, res) => {
    try {
        const membership = await organizationService_1.organizationService.approveMembership(req.params.membershipId);
        // Send notification to approved member
        await prisma_1.prisma.notification.create({
            data: {
                type: 'ORG_APPLICATION_APPROVED',
                senderId: req.user.id,
                receiverId: membership.userId,
                message: `Your request to join "${membership.organization?.name || 'the organization'}" has been approved!`,
            },
        });
        res.json({
            success: true,
            membership,
            message: 'Membership approved',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, membershipId: req.params.membershipId }, 'Failed to approve membership');
        res.status(400).json({ error: error.message || 'Failed to approve membership' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/members/{membershipId}:
 *   delete:
 *     tags: [Organization Membership]
 *     summary: Remove a member
 *     description: Requires REMOVE_MEMBERS capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:organizationId/members/:membershipId', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.REMOVE_MEMBERS), async (req, res) => {
    try {
        // Get membership info before removal for notification
        const membershipInfo = await prisma_1.prisma.organizationMember.findUnique({
            where: { id: req.params.membershipId },
            include: {
                organization: { select: { name: true } },
            },
        });
        await organizationService_1.organizationService.removeMembership(req.params.membershipId);
        // Send notification to removed member
        if (membershipInfo) {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'ORG_APPLICATION_DENIED',
                    senderId: req.user.id,
                    receiverId: membershipInfo.userId,
                    message: `You have been removed from "${membershipInfo.organization.name}"`,
                },
            });
        }
        res.json({
            success: true,
            message: 'Member removed',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, membershipId: req.params.membershipId }, 'Failed to remove member');
        res.status(400).json({ error: error.message || 'Failed to remove member' });
    }
});
// ===============================
// ROLE ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/organizations/{organizationId}/roles:
 *   post:
 *     tags: [Organization Roles]
 *     summary: Create a new role
 *     description: Requires CREATE_ROLES capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - capabilities
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxHolders:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Role created
 */
router.post('/:organizationId/roles', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.CREATE_ROLES), async (req, res) => {
    try {
        const { name, description, capabilities, maxHolders } = req.body;
        if (!name || !capabilities || !Array.isArray(capabilities)) {
            return res.status(400).json({ error: 'name and capabilities array are required' });
        }
        const role = await organizationService_1.organizationService.createRole(req.params.organizationId, {
            name,
            description,
            capabilities,
            maxHolders,
        });
        res.status(201).json({
            success: true,
            role,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to create role');
        res.status(400).json({ error: error.message || 'Failed to create role' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/roles:
 *   get:
 *     tags: [Organization Roles]
 *     summary: List organization roles
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/:organizationId/roles', async (req, res) => {
    try {
        const roles = await organizationService_1.organizationService.listRoles(req.params.organizationId);
        res.json({
            success: true,
            roles,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list roles');
        res.status(500).json({ error: 'Failed to list roles' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/roles/{roleId}:
 *   patch:
 *     tags: [Organization Roles]
 *     summary: Update a role
 *     description: Requires CREATE_ROLES capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxHolders:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch('/:organizationId/roles/:roleId', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.CREATE_ROLES), async (req, res) => {
    try {
        const { name, description, capabilities, maxHolders } = req.body;
        const role = await organizationService_1.organizationService.updateRole(req.params.roleId, {
            name,
            description,
            capabilities,
            maxHolders,
        });
        res.json({
            success: true,
            role,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, roleId: req.params.roleId }, 'Failed to update role');
        res.status(400).json({ error: error.message || 'Failed to update role' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/roles/{roleId}:
 *   delete:
 *     tags: [Organization Roles]
 *     summary: Delete a role
 *     description: Requires CREATE_ROLES capability. Removes role from all members.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted
 */
router.delete('/:organizationId/roles/:roleId', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.CREATE_ROLES), async (req, res) => {
    try {
        await organizationService_1.organizationService.deleteRole(req.params.roleId);
        res.json({
            success: true,
            message: 'Role deleted',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, roleId: req.params.roleId }, 'Failed to delete role');
        res.status(400).json({ error: error.message || 'Failed to delete role' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/members/{membershipId}/role:
 *   post:
 *     tags: [Organization Roles]
 *     summary: Assign a role to a member
 *     description: Requires ASSIGN_ROLES capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role assigned
 */
router.post('/:organizationId/members/:membershipId/role', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.ASSIGN_ROLES), async (req, res) => {
    try {
        const { roleId } = req.body;
        if (!roleId) {
            return res.status(400).json({ error: 'roleId is required' });
        }
        const membership = await organizationService_1.organizationService.assignRole(req.params.membershipId, roleId);
        // Send notification to member about role assignment
        const roleInfo = await prisma_1.prisma.organizationRole.findUnique({
            where: { id: roleId },
            include: { organization: { select: { name: true } } },
        });
        if (membership && roleInfo) {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'ORG_ROLE_ASSIGNED',
                    senderId: req.user.id,
                    receiverId: membership.userId,
                    message: `You've been assigned the "${roleInfo.name}" role in "${roleInfo.organization.name}"`,
                },
            });
        }
        res.json({
            success: true,
            membership,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, membershipId: req.params.membershipId }, 'Failed to assign role');
        res.status(400).json({ error: error.message || 'Failed to assign role' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/members/{membershipId}/role:
 *   delete:
 *     tags: [Organization Roles]
 *     summary: Remove role from a member
 *     description: Requires ASSIGN_ROLES capability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role removed
 */
router.delete('/:organizationId/members/:membershipId/role', auth_1.requireAuth, (0, orgAuth_1.requireOrgCapability)(client_1.OrgCapability.ASSIGN_ROLES), async (req, res) => {
    try {
        // Get current role info before removal for notification
        const currentMembership = await prisma_1.prisma.organizationMember.findUnique({
            where: { id: req.params.membershipId },
            include: {
                role: { select: { name: true } },
                organization: { select: { name: true } },
            },
        });
        const membership = await organizationService_1.organizationService.removeRole(req.params.membershipId);
        // Send notification about role removal
        if (currentMembership?.role) {
            await prisma_1.prisma.notification.create({
                data: {
                    type: 'ORG_ROLE_REMOVED',
                    senderId: req.user.id,
                    receiverId: membership.userId,
                    message: `Your "${currentMembership.role.name}" role in "${currentMembership.organization.name}" has been removed`,
                },
            });
        }
        res.json({
            success: true,
            membership,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, membershipId: req.params.membershipId }, 'Failed to remove role');
        res.status(400).json({ error: error.message || 'Failed to remove role' });
    }
});
// ===============================
// FOLLOWING ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/organizations/{organizationId}/follow:
 *   post:
 *     tags: [Organizations]
 *     summary: Follow an organization
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Now following organization
 */
router.post('/:organizationId/follow', auth_1.requireAuth, async (req, res) => {
    try {
        await organizationService_1.organizationService.followOrganization(req.params.organizationId, req.user.id);
        res.json({
            success: true,
            message: 'Now following organization',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to follow organization');
        res.status(500).json({ error: 'Failed to follow organization' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/unfollow:
 *   post:
 *     tags: [Organizations]
 *     summary: Unfollow an organization
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unfollowed organization
 */
router.post('/:organizationId/unfollow', auth_1.requireAuth, async (req, res) => {
    try {
        await organizationService_1.organizationService.unfollowOrganization(req.params.organizationId, req.user.id);
        res.json({
            success: true,
            message: 'Unfollowed organization',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to unfollow organization');
        res.status(500).json({ error: 'Failed to unfollow organization' });
    }
});
// ===============================
// USER-CENTRIC ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/organizations/me/memberships:
 *   get:
 *     tags: [Organizations]
 *     summary: Get current user's organization memberships
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, SUSPENDED]
 *     responses:
 *       200:
 *         description: User's memberships
 */
router.get('/me/memberships', auth_1.requireAuth, async (req, res) => {
    try {
        const { status } = req.query;
        const memberships = await organizationService_1.organizationService.getUserOrganizations(req.user.id, {
            status: status,
        });
        res.json({
            success: true,
            memberships,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get user memberships');
        res.status(500).json({ error: 'Failed to get memberships' });
    }
});
/**
 * @swagger
 * /api/organizations/me/headed:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization the current user heads (if any)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Organization or null
 */
router.get('/me/headed', auth_1.requireAuth, async (req, res) => {
    try {
        const organization = await organizationService_1.organizationService.getUserHeadedOrganization(req.user.id);
        res.json({
            success: true,
            organization,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get headed organization');
        res.status(500).json({ error: 'Failed to get headed organization' });
    }
});
/**
 * @swagger
 * /api/organizations/slug-available/{slug}:
 *   get:
 *     tags: [Organizations]
 *     summary: Check if a slug is available
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Slug availability status
 */
router.get('/slug-available/:slug', async (req, res) => {
    try {
        const available = await organizationService_1.organizationService.isSlugAvailable(req.params.slug);
        res.json({
            success: true,
            available,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, slug: req.params.slug }, 'Failed to check slug availability');
        res.status(500).json({ error: 'Failed to check slug availability' });
    }
});
// ===============================
// VERIFICATION ENDPOINTS
// ===============================
/**
 * @swagger
 * /api/organizations/{organizationId}/verification:
 *   post:
 *     tags: [Organization Verification]
 *     summary: Request organization verification
 *     description: Organization head can request verification. Requires supporting documents.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orgType
 *               - statement
 *             properties:
 *               orgType:
 *                 type: string
 *                 enum: [POLITICAL_PARTY, ADVOCACY_ORG, LABOR_UNION, COMMUNITY_ORG, GOVERNMENT_OFFICE, CAMPAIGN, PAC_SUPERPAC, OTHER]
 *               statement:
 *                 type: string
 *                 description: Explanation of why the organization should be verified
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs to supporting documents
 *     responses:
 *       201:
 *         description: Verification request submitted
 *       400:
 *         description: Invalid request or verification already pending
 *       403:
 *         description: Only organization head can request verification
 */
router.post('/:organizationId/verification', auth_1.requireAuth, (0, orgAuth_1.requireOrgHead)(), async (req, res) => {
    try {
        const { orgType, statement, documents } = req.body;
        if (!orgType || !statement) {
            return res.status(400).json({ error: 'Organization type and statement are required' });
        }
        // Check if org already has pending or approved verification
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: req.params.organizationId },
            select: { verificationStatus: true, isVerified: true },
        });
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (org.isVerified) {
            return res.status(400).json({ error: 'Organization is already verified' });
        }
        if (org.verificationStatus === 'PENDING') {
            return res.status(400).json({ error: 'Verification request already pending' });
        }
        // Create verification request
        const verificationRequest = await prisma_1.prisma.organizationVerificationRequest.create({
            data: {
                organizationId: req.params.organizationId,
                orgType: orgType,
                statement,
                documents: documents || [],
                status: 'PENDING',
            },
        });
        // Update organization status
        await prisma_1.prisma.organization.update({
            where: { id: req.params.organizationId },
            data: {
                verificationStatus: 'PENDING',
                verificationDocuments: documents || [],
            },
        });
        res.status(201).json({
            success: true,
            verificationRequest,
            message: 'Verification request submitted. An admin will review your request.',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to submit verification request');
        res.status(400).json({ error: error.message || 'Failed to submit verification request' });
    }
});
/**
 * @swagger
 * /api/organizations/{organizationId}/verification:
 *   get:
 *     tags: [Organization Verification]
 *     summary: Get verification status
 *     description: Get the current verification status and history for an organization
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification status
 */
router.get('/:organizationId/verification', async (req, res) => {
    try {
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: req.params.organizationId },
            select: {
                isVerified: true,
                verificationStatus: true,
                verifiedAt: true,
            },
        });
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        // Get the most recent verification request
        const latestRequest = await prisma_1.prisma.organizationVerificationRequest.findFirst({
            where: { organizationId: req.params.organizationId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orgType: true,
                status: true,
                createdAt: true,
                reviewedAt: true,
                denialReason: true,
            },
        });
        res.json({
            success: true,
            isVerified: org.isVerified,
            verificationStatus: org.verificationStatus,
            verifiedAt: org.verifiedAt,
            latestRequest,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to get verification status');
        res.status(500).json({ error: 'Failed to get verification status' });
    }
});
// ==================== Activity Feed ====================
/**
 * @swagger
 * /organizations/{organizationId}/public-activity:
 *   get:
 *     summary: Get organization public activity feed
 *     description: Returns public activity feed including PUBLIC posts, upcoming events, and published endorsements. No authentication required.
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Public activity feed items
 *       404:
 *         description: Organization not found
 */
router.get('/:organizationId/public-activity', async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { limit = '10' } = req.query;
        const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 10));
        // Verify organization exists
        const org = await prisma_1.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, isActive: true }
        });
        if (!org || !org.isActive) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        const activityItems = [];
        // Fetch PUBLIC posts
        const posts = await prisma_1.prisma.post.findMany({
            where: {
                organizationId,
                isDeleted: false,
                audience: 'PUBLIC'
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        avatar: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        avatar: true
                    }
                },
                photos: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limitNum
        });
        posts.forEach(post => {
            activityItems.push({
                type: 'post',
                timestamp: post.createdAt.toISOString(),
                data: post
            });
        });
        // Fetch upcoming events
        const now = new Date();
        const events = await prisma_1.prisma.civicEvent.findMany({
            where: {
                organizationId,
                status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
                scheduledDate: { gte: now }
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        avatar: true
                    }
                },
                _count: {
                    select: {
                        rsvps: true
                    }
                }
            },
            orderBy: { scheduledDate: 'asc' },
            take: 5
        });
        events.forEach(event => {
            activityItems.push({
                type: 'event',
                timestamp: event.createdAt.toISOString(),
                data: event
            });
        });
        // Fetch published endorsements
        const endorsements = await prisma_1.prisma.organizationEndorsement.findMany({
            where: {
                organizationId,
                isActive: true
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        avatar: true
                    }
                },
                candidate: {
                    select: {
                        id: true,
                        name: true,
                        office: true,
                        party: true
                    }
                }
            },
            orderBy: { publishedAt: 'desc' },
            take: 5
        });
        endorsements.forEach(endorsement => {
            activityItems.push({
                type: 'endorsement',
                timestamp: endorsement.publishedAt.toISOString(),
                data: endorsement
            });
        });
        // Sort all items by timestamp (newest first)
        activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Limit to requested amount
        const limitedItems = activityItems.slice(0, limitNum);
        res.json({
            items: limitedItems,
            total: activityItems.length
        });
    }
    catch (error) {
        console.error('Error fetching public activity:', error);
        res.status(500).json({ error: 'Failed to fetch public activity' });
    }
});
/**
 * @swagger
 * /organizations/{organizationId}/activity:
 *   get:
 *     summary: Get organization activity feed
 *     description: Returns combined activity feed including posts, events, endorsements, and member milestones
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, posts, events, endorsements]
 *         description: Filter by activity type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Activity feed items
 *       403:
 *         description: Not a member of this organization
 */
router.get('/:organizationId/activity', auth_1.requireAuth, (0, orgAuth_1.requireOrgMembership)(), async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { type = 'all', page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const activityItems = [];
        // Fetch posts if type is 'all' or 'posts'
        if (type === 'all' || type === 'posts') {
            const posts = await prisma_1.prisma.post.findMany({
                where: {
                    organizationId,
                    isDeleted: false
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    },
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            avatar: true
                        }
                    },
                    photos: true,
                    _count: {
                        select: {
                            likes: true,
                            comments: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: type === 'posts' ? limitNum : 10
            });
            posts.forEach(post => {
                activityItems.push({
                    type: 'post',
                    timestamp: post.createdAt.toISOString(),
                    data: post
                });
            });
        }
        // Fetch events if type is 'all' or 'events'
        if (type === 'all' || type === 'events') {
            const events = await prisma_1.prisma.civicEvent.findMany({
                where: {
                    organizationId,
                    status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] }
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    },
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            avatar: true
                        }
                    },
                    _count: {
                        select: {
                            rsvps: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: type === 'events' ? limitNum : 10
            });
            events.forEach(event => {
                activityItems.push({
                    type: 'event',
                    timestamp: event.createdAt.toISOString(),
                    data: event
                });
            });
        }
        // Fetch endorsements if type is 'all' or 'endorsements'
        if (type === 'all' || type === 'endorsements') {
            const endorsements = await prisma_1.prisma.organizationEndorsement.findMany({
                where: {
                    organizationId,
                    isActive: true
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            avatar: true
                        }
                    },
                    candidate: {
                        select: {
                            id: true,
                            name: true,
                            office: true,
                            party: true
                        }
                    }
                },
                orderBy: { publishedAt: 'desc' },
                take: type === 'endorsements' ? limitNum : 10
            });
            endorsements.forEach(endorsement => {
                activityItems.push({
                    type: 'endorsement',
                    timestamp: endorsement.publishedAt.toISOString(),
                    data: endorsement
                });
            });
        }
        // Fetch member milestones (recent joins) if type is 'all'
        if (type === 'all') {
            const recentMembers = await prisma_1.prisma.organizationMember.findMany({
                where: {
                    organizationId,
                    status: 'ACTIVE'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            avatar: true
                        }
                    }
                },
                orderBy: { joinedAt: 'desc' },
                take: 5
            });
            // Group recent joins into milestone
            if (recentMembers.length > 0) {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const recentJoins = recentMembers.filter(m => m.joinedAt && new Date(m.joinedAt) > oneWeekAgo);
                if (recentJoins.length > 0) {
                    activityItems.push({
                        type: 'member_milestone',
                        timestamp: recentJoins[0].joinedAt?.toISOString() || new Date().toISOString(),
                        data: {
                            type: 'join',
                            count: recentJoins.length,
                            users: recentJoins.slice(0, 3).map(m => ({
                                id: m.user.id,
                                displayName: m.user.firstName && m.user.lastName
                                    ? `${m.user.firstName} ${m.user.lastName}`
                                    : m.user.username
                            }))
                        }
                    });
                }
            }
        }
        // Sort all items by timestamp (newest first)
        activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Paginate if filtering by specific type
        const paginatedItems = type !== 'all'
            ? activityItems.slice(skip, skip + limitNum)
            : activityItems.slice(0, limitNum);
        const hasMore = type !== 'all'
            ? activityItems.length > skip + limitNum
            : activityItems.length > limitNum;
        res.json({
            items: paginatedItems,
            hasMore,
            page: pageNum,
            totalItems: activityItems.length
        });
    }
    catch (error) {
        logger_1.logger.error({ error, organizationId: req.params.organizationId }, 'Failed to get organization activity');
        res.status(500).json({ error: 'Failed to get activity feed' });
    }
});
exports.default = router;
//# sourceMappingURL=organizations.js.map