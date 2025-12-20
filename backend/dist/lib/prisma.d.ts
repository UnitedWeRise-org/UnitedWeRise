/**
 * Singleton Prisma Client
 * Created: August 24, 2025
 * Updated: December 2025 - Prisma 7 adapter pattern
 * Purpose: Prevent database connection pool exhaustion by sharing a single Prisma instance
 *
 * CRITICAL: This fixes the connection leak issue where 60+ files were each creating
 * their own PrismaClient instance, exhausting the database connection limit.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
export declare const prisma: PrismaClient<{
    adapter: PrismaPg;
    log: ("info" | "error" | "warn" | "query")[];
}, "info" | "error" | "warn" | "query", import("@prisma/client/runtime/client").DefaultArgs>;
//# sourceMappingURL=prisma.d.ts.map