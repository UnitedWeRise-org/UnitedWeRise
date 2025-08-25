"use strict";
/**
 * Singleton Prisma Client
 * Created: August 24, 2025
 * Purpose: Prevent database connection pool exhaustion by sharing a single Prisma instance
 *
 * CRITICAL: This fixes the connection leak issue where 60+ files were each creating
 * their own PrismaClient instance, exhausting the database connection limit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Configure connection URL with proper pooling before creating client
const connectionUrl = process.env.DATABASE_URL?.includes('connection_limit=')
    ? process.env.DATABASE_URL
    : `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=10&pool_timeout=20&connect_timeout=10`;
// Create singleton instance with proper configuration
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({
        datasources: {
            db: {
                url: connectionUrl
            }
        },
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['warn', 'error'],
    });
};
// Global store for the singleton (using globalThis for Node.js)
const globalForPrisma = globalThis;
// Export the singleton instance
exports.prisma = globalForPrisma.prisma ?? prismaClientSingleton();
// In development, store on global to preserve across hot reloads
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
// Graceful shutdown handling
async function cleanup() {
    await exports.prisma.$disconnect();
    console.log('Prisma client disconnected');
}
// Register cleanup handlers
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
// Log connection info on startup
console.log('🔗 Prisma singleton initialized with connection pooling:', {
    connectionLimit: 10,
    poolTimeout: 20,
    environment: process.env.NODE_ENV || 'development'
});
//# sourceMappingURL=prisma.js.map