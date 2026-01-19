/**
 * Audit Logging Service
 *
 * Centralized audit logging for all administrative actions.
 * Tracks who did what, when, and to whom for accountability and compliance.
 * These logs persist indefinitely and can be queried via admin dashboard.
 */
import { Prisma } from '@prisma/client';
/** Parameters for logging an admin action */
interface AuditLogParams {
    /** Admin action performed (e.g., "USER_SUSPENDED", "REPORT_RESOLVED") */
    action: string;
    /** ID of the admin who performed the action */
    adminId: string;
    /** Type of target entity (e.g., "user", "post", "report") */
    targetType?: string;
    /** ID of the target entity */
    targetId?: string;
    /** Additional details about the action */
    details?: Record<string, unknown>;
    /** IP address of the admin */
    ipAddress?: string;
    /** User agent of the admin's browser */
    userAgent?: string;
}
/** Options for querying audit logs */
interface GetAuditLogsOptions {
    /** Filter by admin ID */
    adminId?: string;
    /** Filter by action type */
    action?: string;
    /** Filter by target type */
    targetType?: string;
    /** Filter by target ID */
    targetId?: string;
    /** Filter logs after this date */
    startDate?: Date;
    /** Filter logs before this date */
    endDate?: Date;
    /** Number of logs to return (default: 50) */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
}
/** Audit action type constants */
export declare const AUDIT_ACTIONS: {
    readonly USER_SUSPENDED: "USER_SUSPENDED";
    readonly USER_UNSUSPENDED: "USER_UNSUSPENDED";
    readonly USER_ROLE_CHANGED: "USER_ROLE_CHANGED";
    readonly USER_DELETED: "USER_DELETED";
    readonly USER_PASSWORD_RESET: "USER_PASSWORD_RESET";
    readonly ACCOUNTS_MERGED: "ACCOUNTS_MERGED";
    readonly POST_DELETED: "POST_DELETED";
    readonly COMMENT_DELETED: "COMMENT_DELETED";
    readonly MESSAGE_DELETED: "MESSAGE_DELETED";
    readonly CONTENT_FLAG_RESOLVED: "CONTENT_FLAG_RESOLVED";
    readonly REPORT_REVIEWED: "REPORT_REVIEWED";
    readonly REPORT_RESOLVED: "REPORT_RESOLVED";
    readonly REPORT_DISMISSED: "REPORT_DISMISSED";
    readonly REPORT_ESCALATED: "REPORT_ESCALATED";
    readonly REPORT_BULK_ACTION: "REPORT_BULK_ACTION";
    readonly CANDIDATE_APPROVED: "CANDIDATE_APPROVED";
    readonly CANDIDATE_REJECTED: "CANDIDATE_REJECTED";
    readonly CANDIDATE_WAIVER_ISSUED: "CANDIDATE_WAIVER_ISSUED";
    readonly CANDIDATE_PROFILE_UPDATED: "CANDIDATE_PROFILE_UPDATED";
    readonly CONFIG_UPDATED: "CONFIG_UPDATED";
    readonly MAINTENANCE_MODE_TOGGLED: "MAINTENANCE_MODE_TOGGLED";
    readonly ERROR_RESOLVED: "ERROR_RESOLVED";
    readonly ERROR_REPORT_GENERATED: "ERROR_REPORT_GENERATED";
    readonly ANALYTICS_REPORT_GENERATED: "ANALYTICS_REPORT_GENERATED";
    readonly ANALYTICS_EXPORTED: "ANALYTICS_EXPORTED";
    readonly AI_ANALYSIS_TRIGGERED: "AI_ANALYSIS_TRIGGERED";
    readonly AI_REPORT_GENERATED: "AI_REPORT_GENERATED";
    readonly MOTD_CREATED: "MOTD_CREATED";
    readonly MOTD_UPDATED: "MOTD_UPDATED";
    readonly MOTD_DELETED: "MOTD_DELETED";
    readonly MOTD_TOGGLED: "MOTD_TOGGLED";
    readonly ORG_VERIFICATION_APPROVED: "ORG_VERIFICATION_APPROVED";
    readonly ORG_VERIFICATION_DENIED: "ORG_VERIFICATION_DENIED";
    readonly ADMIN_ORG_MEMBER_ADDED: "ADMIN_ORG_MEMBER_ADDED";
    readonly ADMIN_ORG_MEMBER_REMOVED: "ADMIN_ORG_MEMBER_REMOVED";
    readonly ADMIN_ORG_HEADSHIP_TRANSFERRED: "ADMIN_ORG_HEADSHIP_TRANSFERRED";
    readonly ADMIN_ORG_DEACTIVATED: "ADMIN_ORG_DEACTIVATED";
    readonly ADMIN_ORG_REACTIVATED: "ADMIN_ORG_REACTIVATED";
};
export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
export declare class AuditService {
    /**
     * Log an admin action to the audit log
     * @returns The audit log record ID, or null if logging failed
     */
    static log(params: AuditLogParams): Promise<string | null>;
    /**
     * Get audit logs with optional filters
     */
    static getLogs(options?: GetAuditLogsOptions): Promise<{
        logs: ({
            admin: {
                id: string;
                username: string;
                avatar: string;
                isAdmin: boolean;
                isSuperAdmin: boolean;
                displayName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            details: Prisma.JsonValue | null;
            action: string;
            ipAddress: string | null;
            userAgent: string | null;
            targetType: string | null;
            targetId: string | null;
            adminId: string;
        })[];
        total: number;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    /**
     * Get a single audit log entry by ID
     */
    static getLog(logId: string): Promise<{
        admin: {
            id: string;
            username: string;
            avatar: string;
            displayName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        details: Prisma.JsonValue | null;
        action: string;
        ipAddress: string | null;
        userAgent: string | null;
        targetType: string | null;
        targetId: string | null;
        adminId: string;
    }>;
    /**
     * Get audit log counts grouped by action (for analytics)
     */
    static getActionCounts(since?: Date): Promise<{
        action: string;
        count: number;
    }[]>;
    /**
     * Get audit logs for a specific target (e.g., all actions on a user)
     */
    static getLogsForTarget(targetType: string, targetId: string, limit?: number): Promise<({
        admin: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        details: Prisma.JsonValue | null;
        action: string;
        ipAddress: string | null;
        userAgent: string | null;
        targetType: string | null;
        targetId: string | null;
        adminId: string;
    })[]>;
    /**
     * Get recent activity by a specific admin
     */
    static getAdminActivity(adminId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        details: Prisma.JsonValue | null;
        action: string;
        ipAddress: string | null;
        userAgent: string | null;
        targetType: string | null;
        targetId: string | null;
        adminId: string;
    }[]>;
    /**
     * Get audit statistics for a time period
     */
    static getStats(startDate: Date, endDate: Date): Promise<{
        totalActions: number;
        actionsByType: {
            action: string;
            count: number;
        }[];
        topAdmins: {
            admin: {
                id: string;
                username: string;
                displayName: string;
            } | {
                id: string;
                username: string;
            };
            count: number;
        }[];
    }>;
}
export {};
//# sourceMappingURL=auditService.d.ts.map