/**
 * @fileoverview Organization Routes
 *
 * Handles organization CRUD, membership, roles, and following.
 * Uses capability-based authorization via orgAuth middleware.
 *
 * @module routes/organizations
 */

import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  requireOrgCapability,
  requireOrgMembership,
  requireOrgHead,
  OrgAuthRequest,
} from '../middleware/orgAuth';
import { organizationService } from '../services/organizationService';
import { OrgCapability, MembershipStatus } from '@prisma/client';
import { logger } from '../services/logger';
import { createNotification } from './notifications';

const router = express.Router();

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
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, slug, description, avatar, website, jurisdictionType, jurisdictionValue, h3Cells, parentId } =
      req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        error: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
    }

    const organization = await organizationService.createOrganization(userId, {
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

    logger.info({ organizationId: organization.id, userId }, 'Organization created');

    res.status(201).json({
      success: true,
      organization,
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to create organization');

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
 *     description: List organizations with optional filtering and pagination
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
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', async (req, res) => {
  try {
    const { limit, offset, search, jurisdictionType, isVerified } = req.query;

    const result = await organizationService.listOrganizations({
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      search: search as string,
      jurisdictionType: jurisdictionType as any,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      organizations: result.organizations,
      total: result.total,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list organizations');
    res.status(500).json({ error: 'Failed to list organizations' });
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
    const organization = await organizationService.getOrganization(req.params.id, true);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    logger.error({ error, organizationId: req.params.id }, 'Failed to get organization');
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
    const organization = await organizationService.getOrganizationBySlug(req.params.slug);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Failed to get organization by slug');
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
router.patch(
  '/:organizationId',
  requireAuth,
  requireOrgCapability(OrgCapability.MANAGE_ORG_SETTINGS),
  async (req: OrgAuthRequest, res) => {
    try {
      const organizationId = req.params.organizationId;
      const {
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
      } = req.body;

      const organization = await organizationService.updateOrganization(organizationId, {
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
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to update organization');
      res.status(500).json({ error: error.message || 'Failed to update organization' });
    }
  }
);

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
router.delete(
  '/:organizationId',
  requireAuth,
  requireOrgHead(),
  async (req: OrgAuthRequest, res) => {
    try {
      const organization = await organizationService.deactivateOrganization(req.params.organizationId);

      logger.info({ organizationId: organization.id }, 'Organization deactivated');

      res.json({
        success: true,
        message: 'Organization deactivated',
      });
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to deactivate organization');
      res.status(500).json({ error: error.message || 'Failed to deactivate organization' });
    }
  }
);

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
router.post(
  '/:organizationId/transfer-headship',
  requireAuth,
  requireOrgHead(),
  async (req: OrgAuthRequest, res) => {
    try {
      const { newHeadUserId } = req.body;

      if (!newHeadUserId) {
        return res.status(400).json({ error: 'newHeadUserId is required' });
      }

      const organization = await organizationService.transferHeadship(
        req.params.organizationId,
        newHeadUserId
      );

      logger.info({
        organizationId: organization.id,
        oldHead: req.user!.id,
        newHead: newHeadUserId,
      }, 'Organization headship transferred');

      res.json({
        success: true,
        organization,
      });
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to transfer headship');
      res.status(400).json({ error: error.message || 'Failed to transfer headship' });
    }
  }
);

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
router.post('/:organizationId/join', requireAuth, async (req: AuthRequest, res) => {
  try {
    const membership = await organizationService.requestMembership(
      req.params.organizationId,
      req.user!.id
    );

    // TODO: Send notification to org admins

    res.status(201).json({
      success: true,
      membership,
      message: 'Join request submitted',
    });
  } catch (error: any) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to request membership');
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
router.post('/:organizationId/leave', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.params.organizationId;

    // Get membership
    const membership = await organizationService.getUserMembership(organizationId, userId);

    if (!membership) {
      return res.status(400).json({ error: 'Not a member of this organization' });
    }

    await organizationService.removeMembership(membership.id);

    res.json({
      success: true,
      message: 'Left organization',
    });
  } catch (error: any) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to leave organization');
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
router.post(
  '/:organizationId/invite',
  requireAuth,
  requireOrgCapability(OrgCapability.INVITE_MEMBERS),
  async (req: OrgAuthRequest, res) => {
    try {
      const { userId: targetUserId } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const membership = await organizationService.inviteMember(
        req.params.organizationId,
        targetUserId,
        req.user!.id
      );

      // TODO: Send notification to invited user

      res.status(201).json({
        success: true,
        membership,
        message: 'Invitation sent',
      });
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to invite member');
      res.status(400).json({ error: error.message || 'Failed to invite member' });
    }
  }
);

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

    const result = await organizationService.listMembers(req.params.organizationId, {
      status: status as MembershipStatus,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      members: result.members,
      total: result.total,
    });
  } catch (error) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list members');
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
router.post(
  '/:organizationId/members/:membershipId/approve',
  requireAuth,
  requireOrgCapability(OrgCapability.APPROVE_APPLICATIONS),
  async (req: OrgAuthRequest, res) => {
    try {
      const membership = await organizationService.approveMembership(req.params.membershipId);

      // TODO: Send notification to approved member

      res.json({
        success: true,
        membership,
        message: 'Membership approved',
      });
    } catch (error: any) {
      logger.error({ error, membershipId: req.params.membershipId }, 'Failed to approve membership');
      res.status(400).json({ error: error.message || 'Failed to approve membership' });
    }
  }
);

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
router.delete(
  '/:organizationId/members/:membershipId',
  requireAuth,
  requireOrgCapability(OrgCapability.REMOVE_MEMBERS),
  async (req: OrgAuthRequest, res) => {
    try {
      await organizationService.removeMembership(req.params.membershipId);

      res.json({
        success: true,
        message: 'Member removed',
      });
    } catch (error: any) {
      logger.error({ error, membershipId: req.params.membershipId }, 'Failed to remove member');
      res.status(400).json({ error: error.message || 'Failed to remove member' });
    }
  }
);

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
router.post(
  '/:organizationId/roles',
  requireAuth,
  requireOrgCapability(OrgCapability.CREATE_ROLES),
  async (req: OrgAuthRequest, res) => {
    try {
      const { name, description, capabilities, maxHolders } = req.body;

      if (!name || !capabilities || !Array.isArray(capabilities)) {
        return res.status(400).json({ error: 'name and capabilities array are required' });
      }

      const role = await organizationService.createRole(req.params.organizationId, {
        name,
        description,
        capabilities,
        maxHolders,
      });

      res.status(201).json({
        success: true,
        role,
      });
    } catch (error: any) {
      logger.error({ error, organizationId: req.params.organizationId }, 'Failed to create role');
      res.status(400).json({ error: error.message || 'Failed to create role' });
    }
  }
);

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
    const roles = await organizationService.listRoles(req.params.organizationId);

    res.json({
      success: true,
      roles,
    });
  } catch (error) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to list roles');
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
router.patch(
  '/:organizationId/roles/:roleId',
  requireAuth,
  requireOrgCapability(OrgCapability.CREATE_ROLES),
  async (req: OrgAuthRequest, res) => {
    try {
      const { name, description, capabilities, maxHolders } = req.body;

      const role = await organizationService.updateRole(req.params.roleId, {
        name,
        description,
        capabilities,
        maxHolders,
      });

      res.json({
        success: true,
        role,
      });
    } catch (error: any) {
      logger.error({ error, roleId: req.params.roleId }, 'Failed to update role');
      res.status(400).json({ error: error.message || 'Failed to update role' });
    }
  }
);

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
router.delete(
  '/:organizationId/roles/:roleId',
  requireAuth,
  requireOrgCapability(OrgCapability.CREATE_ROLES),
  async (req: OrgAuthRequest, res) => {
    try {
      await organizationService.deleteRole(req.params.roleId);

      res.json({
        success: true,
        message: 'Role deleted',
      });
    } catch (error: any) {
      logger.error({ error, roleId: req.params.roleId }, 'Failed to delete role');
      res.status(400).json({ error: error.message || 'Failed to delete role' });
    }
  }
);

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
router.post(
  '/:organizationId/members/:membershipId/role',
  requireAuth,
  requireOrgCapability(OrgCapability.ASSIGN_ROLES),
  async (req: OrgAuthRequest, res) => {
    try {
      const { roleId } = req.body;

      if (!roleId) {
        return res.status(400).json({ error: 'roleId is required' });
      }

      const membership = await organizationService.assignRole(req.params.membershipId, roleId);

      res.json({
        success: true,
        membership,
      });
    } catch (error: any) {
      logger.error({ error, membershipId: req.params.membershipId }, 'Failed to assign role');
      res.status(400).json({ error: error.message || 'Failed to assign role' });
    }
  }
);

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
router.delete(
  '/:organizationId/members/:membershipId/role',
  requireAuth,
  requireOrgCapability(OrgCapability.ASSIGN_ROLES),
  async (req: OrgAuthRequest, res) => {
    try {
      const membership = await organizationService.removeRole(req.params.membershipId);

      res.json({
        success: true,
        membership,
      });
    } catch (error: any) {
      logger.error({ error, membershipId: req.params.membershipId }, 'Failed to remove role');
      res.status(400).json({ error: error.message || 'Failed to remove role' });
    }
  }
);

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
router.post('/:organizationId/follow', requireAuth, async (req: AuthRequest, res) => {
  try {
    await organizationService.followOrganization(req.params.organizationId, req.user!.id);

    res.json({
      success: true,
      message: 'Now following organization',
    });
  } catch (error) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to follow organization');
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
router.post('/:organizationId/unfollow', requireAuth, async (req: AuthRequest, res) => {
  try {
    await organizationService.unfollowOrganization(req.params.organizationId, req.user!.id);

    res.json({
      success: true,
      message: 'Unfollowed organization',
    });
  } catch (error) {
    logger.error({ error, organizationId: req.params.organizationId }, 'Failed to unfollow organization');
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
router.get('/me/memberships', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;

    const memberships = await organizationService.getUserOrganizations(req.user!.id, {
      status: status as MembershipStatus,
    });

    res.json({
      success: true,
      memberships,
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to get user memberships');
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
router.get('/me/headed', requireAuth, async (req: AuthRequest, res) => {
  try {
    const organization = await organizationService.getUserHeadedOrganization(req.user!.id);

    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, 'Failed to get headed organization');
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
    const available = await organizationService.isSlugAvailable(req.params.slug);

    res.json({
      success: true,
      available,
    });
  } catch (error) {
    logger.error({ error, slug: req.params.slug }, 'Failed to check slug availability');
    res.status(500).json({ error: 'Failed to check slug availability' });
  }
});

export default router;
