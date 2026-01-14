/**
 * @fileoverview Organization Authorization Middleware
 *
 * Provides capability-based authorization for organization actions.
 * Checks if authenticated user has required capability within an organization.
 *
 * @module middleware/orgAuth
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { OrgCapability, MembershipStatus } from '@prisma/client';
/**
 * Extended request interface with organization context
 */
export interface OrgAuthRequest extends AuthRequest {
    /** Organization context for the current request */
    orgContext?: {
        /** Organization ID */
        organizationId: string;
        /** Whether user is the organization head */
        isHead: boolean;
        /** User's membership record (if member) */
        membership?: {
            id: string;
            roleId: string | null;
            status: MembershipStatus;
        };
        /** Capabilities the user has in this organization */
        capabilities: OrgCapability[];
    };
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
export declare const requireOrgCapability: (requiredCapabilities: OrgCapability | OrgCapability[]) => (req: OrgAuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
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
export declare const requireOrgMembership: (requireActive?: boolean) => (req: OrgAuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Creates middleware that requires user to be the organization head
 * Use this for head-only operations like transferring headship or dissolving org
 *
 * @returns Express middleware function
 *
 * @example
 * router.post('/orgs/:orgId/transfer-headship', requireAuth, requireOrgHead(), transferHeadship);
 */
export declare const requireOrgHead: () => (req: OrgAuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
/**
 * Helper function to check if user has a capability (for use in route handlers)
 *
 * @param req - The request object with orgContext
 * @param capability - The capability to check
 * @returns Boolean indicating if user has the capability
 */
export declare function hasOrgCapability(req: OrgAuthRequest, capability: OrgCapability): boolean;
//# sourceMappingURL=orgAuth.d.ts.map