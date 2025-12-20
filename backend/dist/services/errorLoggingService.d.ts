/**
 * Error Logging Service
 *
 * Centralized error logging to database for persistence and queryability.
 * Unlike container logs that roll over, these errors persist indefinitely
 * and can be queried via SQL or admin dashboard.
 */
import { Prisma } from '@prisma/client';
interface ErrorLogParams {
    service: string;
    operation: string;
    error: unknown;
    userId?: string;
    requestId?: string;
    additionalContext?: Record<string, unknown>;
}
interface GetErrorsOptions {
    service?: string;
    limit?: number;
    unresolvedOnly?: boolean;
}
export declare class ErrorLoggingService {
    /**
     * Log an error to the database
     * @returns The error record ID, or null if database logging failed
     */
    static logError(params: ErrorLogParams): Promise<string | null>;
    /**
     * Get recent errors, optionally filtered by service
     */
    static getRecentErrors(options?: GetErrorsOptions): Promise<({
        user: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        service: string;
        requestId: string | null;
        userId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        details: Prisma.JsonValue | null;
        resolved: boolean;
        resolution: string | null;
        message: string;
        operation: string;
        errorType: string;
        stack: string | null;
    })[]>;
    /**
     * Get a single error by ID
     */
    static getError(errorId: string): Promise<{
        user: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        service: string;
        requestId: string | null;
        userId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        details: Prisma.JsonValue | null;
        resolved: boolean;
        resolution: string | null;
        message: string;
        operation: string;
        errorType: string;
        stack: string | null;
    }>;
    /**
     * Mark an error as resolved with optional resolution notes
     */
    static markResolved(errorId: string, resolution?: string): Promise<{
        service: string;
        requestId: string | null;
        userId: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        details: Prisma.JsonValue | null;
        resolved: boolean;
        resolution: string | null;
        message: string;
        operation: string;
        errorType: string;
        stack: string | null;
    }>;
    /**
     * Get error counts grouped by service (for monitoring dashboard)
     */
    static getErrorCounts(since?: Date): Promise<{
        service: string;
        count: number;
    }[]>;
    /**
     * Delete old resolved errors (for maintenance)
     * @param olderThan Delete errors older than this date
     */
    static cleanupOldErrors(olderThan: Date): Promise<number>;
}
export {};
//# sourceMappingURL=errorLoggingService.d.ts.map