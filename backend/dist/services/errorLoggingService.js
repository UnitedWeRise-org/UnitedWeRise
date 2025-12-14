"use strict";
/**
 * Error Logging Service
 *
 * Centralized error logging to database for persistence and queryability.
 * Unlike container logs that roll over, these errors persist indefinitely
 * and can be queried via SQL or admin dashboard.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLoggingService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
class ErrorLoggingService {
    /**
     * Log an error to the database
     * @returns The error record ID, or null if database logging failed
     */
    static async logError(params) {
        const { service, operation, error, userId, requestId, additionalContext } = params;
        const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        // Extract additional properties from Azure/API errors
        // These error objects often have status, code, body, or response properties
        const details = {
            ...additionalContext,
            status: error?.status,
            statusCode: error?.statusCode,
            code: error?.code,
            body: error?.error || error?.body,
            response: error?.response?.data,
            cause: error?.cause,
        };
        // Remove undefined values for cleaner JSON
        Object.keys(details).forEach(key => {
            if (details[key] === undefined) {
                delete details[key];
            }
        });
        try {
            const record = await prisma_1.prisma.applicationError.create({
                data: {
                    service,
                    operation,
                    errorType,
                    message,
                    details: Object.keys(details).length > 0 ? details : undefined,
                    stack,
                    userId,
                    requestId,
                }
            });
            logger_1.logger.error({
                errorId: record.id,
                service,
                operation,
                errorType,
                message,
                userId,
                requestId,
            }, `Error logged: ${service}/${operation}`);
            return record.id;
        }
        catch (dbError) {
            // If database logging fails, at least log to console
            // This prevents error logging from breaking the main flow
            logger_1.logger.error({ error, dbError, service, operation }, 'Failed to log error to database');
            return null;
        }
    }
    /**
     * Get recent errors, optionally filtered by service
     */
    static async getRecentErrors(options = {}) {
        const { service, limit = 50, unresolvedOnly = false } = options;
        return prisma_1.prisma.applicationError.findMany({
            where: {
                ...(service && { service }),
                ...(unresolvedOnly && { resolved: false }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: { select: { id: true, username: true, displayName: true } }
            }
        });
    }
    /**
     * Get a single error by ID
     */
    static async getError(errorId) {
        return prisma_1.prisma.applicationError.findUnique({
            where: { id: errorId },
            include: {
                user: { select: { id: true, username: true, displayName: true } }
            }
        });
    }
    /**
     * Mark an error as resolved with optional resolution notes
     */
    static async markResolved(errorId, resolution) {
        return prisma_1.prisma.applicationError.update({
            where: { id: errorId },
            data: { resolved: true, resolution }
        });
    }
    /**
     * Get error counts grouped by service (for monitoring dashboard)
     */
    static async getErrorCounts(since) {
        const whereClause = since ? { createdAt: { gte: since } } : {};
        const counts = await prisma_1.prisma.applicationError.groupBy({
            by: ['service'],
            where: whereClause,
            _count: { id: true }
        });
        return counts.map(c => ({
            service: c.service,
            count: c._count.id
        }));
    }
    /**
     * Delete old resolved errors (for maintenance)
     * @param olderThan Delete errors older than this date
     */
    static async cleanupOldErrors(olderThan) {
        const result = await prisma_1.prisma.applicationError.deleteMany({
            where: {
                resolved: true,
                createdAt: { lt: olderThan }
            }
        });
        logger_1.logger.info({ deletedCount: result.count }, 'Cleaned up old resolved errors');
        return result.count;
    }
}
exports.ErrorLoggingService = ErrorLoggingService;
//# sourceMappingURL=errorLoggingService.js.map