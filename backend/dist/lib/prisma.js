"use strict";
/**
 * Singleton Prisma Client
 * Created: August 24, 2025
 * Updated: December 2025 - Prisma 7 adapter pattern
 * Purpose: Prevent database connection pool exhaustion by sharing a single Prisma instance
 *
 * CRITICAL: This fixes the connection leak issue where 60+ files were each creating
 * their own PrismaClient instance, exhausting the database connection limit.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const environment_1 = require("../utils/environment");
// Configure connection URL with proper pooling
const connectionUrl = process.env.DATABASE_URL?.includes('connection_limit=')
    ? process.env.DATABASE_URL
    : `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=10&pool_timeout=20&connect_timeout=10`;
// Create PostgreSQL connection pool
const pool = new pg_1.Pool({
    connectionString: connectionUrl,
    max: 10, // Maximum connections in pool
    idleTimeoutMillis: 20000, // Close idle connections after 20s
    connectionTimeoutMillis: 10000, // Connection timeout 10s
});
// Create Prisma adapter for the pool
const adapter = new adapter_pg_1.PrismaPg(pool);
// Create singleton instance with adapter pattern (Prisma 7+)
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({
        adapter,
        log: (0, environment_1.getDatabaseLogLevel)(),
    });
};
// Global store for the singleton (using globalThis for Node.js)
const globalForPrisma = globalThis;
// Export the singleton instance
exports.prisma = globalForPrisma.prisma ?? prismaClientSingleton();
// In development, store on global to preserve across hot reloads
if (!(0, environment_1.isProduction)()) {
    globalForPrisma.prisma = exports.prisma;
}
// Graceful shutdown handling
async function cleanup() {
    // Import logger dynamically to avoid circular dependency
    const { logger } = await Promise.resolve().then(() => __importStar(require('../services/logger')));
    await exports.prisma.$disconnect();
    await pool.end();
    logger.info('Prisma client and connection pool disconnected');
}
// Register cleanup handlers
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
// Log connection info on startup using Pino structured logging
// Migration: Phase 3-4 Pino structured logging (2025-11-13)
// Import logger dynamically to avoid circular dependency
Promise.resolve().then(() => __importStar(require('../services/logger'))).then(({ logger }) => {
    logger.info({
        connectionLimit: 10,
        poolTimeout: 20,
        environment: (0, environment_1.getEnvironment)()
    }, '🔗 Prisma singleton initialized with connection pooling (Prisma 7 adapter)');
});
//# sourceMappingURL=prisma.js.map