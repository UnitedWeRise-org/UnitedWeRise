"use strict";
/**
 * Audit Logging Service
 *
 * Centralized audit logging for all administrative actions.
 * Tracks who did what, when, and to whom for accountability and compliance.
 * These logs persist indefinitely and can be queried via admin dashboard.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = exports.AUDIT_ACTIONS = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
/** Audit action type constants */
exports.AUDIT_ACTIONS = {
    // User management
    USER_SUSPENDED: 'USER_SUSPENDED',
    USER_UNSUSPENDED: 'USER_UNSUSPENDED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
    USER_DELETED: 'USER_DELETED',
    USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
    ACCOUNTS_MERGED: 'ACCOUNTS_MERGED',
    // Content moderation
    POST_DELETED: 'POST_DELETED',
    COMMENT_DELETED: 'COMMENT_DELETED',
    MESSAGE_DELETED: 'MESSAGE_DELETED',
    CONTENT_FLAG_RESOLVED: 'CONTENT_FLAG_RESOLVED',
    // Report management
    REPORT_REVIEWED: 'REPORT_REVIEWED',
    REPORT_RESOLVED: 'REPORT_RESOLVED',
    REPORT_DISMISSED: 'REPORT_DISMISSED',
    REPORT_ESCALATED: 'REPORT_ESCALATED',
    REPORT_BULK_ACTION: 'REPORT_BULK_ACTION',
    // Candidate management
    CANDIDATE_APPROVED: 'CANDIDATE_APPROVED',
    CANDIDATE_REJECTED: 'CANDIDATE_REJECTED',
    CANDIDATE_WAIVER_ISSUED: 'CANDIDATE_WAIVER_ISSUED',
    CANDIDATE_PROFILE_UPDATED: 'CANDIDATE_PROFILE_UPDATED',
    // System configuration
    CONFIG_UPDATED: 'CONFIG_UPDATED',
    MAINTENANCE_MODE_TOGGLED: 'MAINTENANCE_MODE_TOGGLED',
    // Error management
    ERROR_RESOLVED: 'ERROR_RESOLVED',
    ERROR_REPORT_GENERATED: 'ERROR_REPORT_GENERATED',
    // Analytics
    ANALYTICS_REPORT_GENERATED: 'ANALYTICS_REPORT_GENERATED',
    ANALYTICS_EXPORTED: 'ANALYTICS_EXPORTED',
    // AI Insights
    AI_ANALYSIS_TRIGGERED: 'AI_ANALYSIS_TRIGGERED',
    AI_REPORT_GENERATED: 'AI_REPORT_GENERATED',
    // MOTD
    MOTD_CREATED: 'MOTD_CREATED',
    MOTD_UPDATED: 'MOTD_UPDATED',
    MOTD_DELETED: 'MOTD_DELETED',
    MOTD_TOGGLED: 'MOTD_TOGGLED',
    // Organization verification
    ORG_VERIFICATION_APPROVED: 'ORG_VERIFICATION_APPROVED',
    ORG_VERIFICATION_DENIED: 'ORG_VERIFICATION_DENIED',
    // Organization management (super-admin)
    ADMIN_ORG_MEMBER_ADDED: 'ADMIN_ORG_MEMBER_ADDED',
    ADMIN_ORG_MEMBER_REMOVED: 'ADMIN_ORG_MEMBER_REMOVED',
    ADMIN_ORG_HEADSHIP_TRANSFERRED: 'ADMIN_ORG_HEADSHIP_TRANSFERRED',
    ADMIN_ORG_DEACTIVATED: 'ADMIN_ORG_DEACTIVATED',
    ADMIN_ORG_REACTIVATED: 'ADMIN_ORG_REACTIVATED',
};
class AuditService {
    /**
     * Log an admin action to the audit log
     * @returns The audit log record ID, or null if logging failed
     */
    static async log(params) {
        const { action, adminId, targetType, targetId, details, ipAddress, userAgent } = params;
        try {
            const record = await prisma_1.prisma.auditLog.create({
                data: {
                    action,
                    adminId,
                    targetType,
                    targetId,
                    details: details ? details : undefined,
                    ipAddress,
                    userAgent,
                }
            });
            logger_1.logger.info({
                auditId: record.id,
                action,
                adminId,
                targetType,
                targetId,
            }, `Audit log: ${action}`);
            return record.id;
        }
        catch (error) {
            // If audit logging fails, log to console but don't break the main flow
            logger_1.logger.error({ error, action, adminId, targetType, targetId }, 'Failed to create audit log');
            return null;
        }
    }
    /**
     * Get audit logs with optional filters
     */
    static async getLogs(options = {}) {
        const { adminId, action, targetType, targetId, startDate, endDate, limit = 50, offset = 0 } = options;
        const where = {};
        if (adminId)
            where.adminId = adminId;
        if (action)
            where.action = action;
        if (targetType)
            where.targetType = targetType;
        if (targetId)
            where.targetId = targetId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const [logs, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    admin: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatar: true,
                            isAdmin: true,
                            isSuperAdmin: true,
                        }
                    }
                }
            }),
            prisma_1.prisma.auditLog.count({ where })
        ]);
        return {
            logs,
            total,
            pagination: {
                page: Math.floor(offset / limit) + 1,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * Get a single audit log entry by ID
     */
    static async getLog(logId) {
        return prisma_1.prisma.auditLog.findUnique({
            where: { id: logId },
            include: {
                admin: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatar: true,
                    }
                }
            }
        });
    }
    /**
     * Get audit log counts grouped by action (for analytics)
     */
    static async getActionCounts(since) {
        const whereClause = since ? { createdAt: { gte: since } } : {};
        const counts = await prisma_1.prisma.auditLog.groupBy({
            by: ['action'],
            where: whereClause,
            _count: { id: true }
        });
        return counts.map(c => ({
            action: c.action,
            count: c._count.id
        }));
    }
    /**
     * Get audit logs for a specific target (e.g., all actions on a user)
     */
    static async getLogsForTarget(targetType, targetId, limit = 20) {
        return prisma_1.prisma.auditLog.findMany({
            where: { targetType, targetId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                admin: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    }
                }
            }
        });
    }
    /**
     * Get recent activity by a specific admin
     */
    static async getAdminActivity(adminId, limit = 50) {
        return prisma_1.prisma.auditLog.findMany({
            where: { adminId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    /**
     * Get audit statistics for a time period
     */
    static async getStats(startDate, endDate) {
        const [totalActions, actionsByType, topAdmins] = await Promise.all([
            prisma_1.prisma.auditLog.count({
                where: { createdAt: { gte: startDate, lte: endDate } }
            }),
            prisma_1.prisma.auditLog.groupBy({
                by: ['action'],
                where: { createdAt: { gte: startDate, lte: endDate } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            }),
            prisma_1.prisma.auditLog.groupBy({
                by: ['adminId'],
                where: { createdAt: { gte: startDate, lte: endDate } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 5
            })
        ]);
        // Get admin details for top admins
        const adminIds = topAdmins.map(a => a.adminId);
        const admins = await prisma_1.prisma.user.findMany({
            where: { id: { in: adminIds } },
            select: { id: true, username: true, displayName: true }
        });
        const adminMap = new Map(admins.map(a => [a.id, a]));
        return {
            totalActions,
            actionsByType: actionsByType.map(a => ({
                action: a.action,
                count: a._count.id
            })),
            topAdmins: topAdmins.map(a => ({
                admin: adminMap.get(a.adminId) || { id: a.adminId, username: 'Unknown' },
                count: a._count.id
            }))
        };
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map