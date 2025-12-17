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
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getDatabaseLogLevel, getEnvironment, isProduction } from '../utils/environment';

// Configure connection URL with proper pooling
const connectionUrl = process.env.DATABASE_URL?.includes('connection_limit=')
  ? process.env.DATABASE_URL
  : `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=10&pool_timeout=20&connect_timeout=10`;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: connectionUrl,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 20000, // Close idle connections after 20s
  connectionTimeoutMillis: 10000, // Connection timeout 10s
});

// Create Prisma adapter for the pool
const adapter = new PrismaPg(pool);

// Create singleton instance with adapter pattern (Prisma 7+)
const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
    log: getDatabaseLogLevel(),
  });
};

// Type for the singleton
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// Global store for the singleton (using globalThis for Node.js)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Export the singleton instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// In development, store on global to preserve across hot reloads
if (!isProduction()) {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown handling
async function cleanup() {
  // Import logger dynamically to avoid circular dependency
  const { logger } = await import('../services/logger');

  await prisma.$disconnect();
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
import('../services/logger').then(({ logger }) => {
  logger.info({
    connectionLimit: 10,
    poolTimeout: 20,
    environment: getEnvironment()
  }, '🔗 Prisma singleton initialized with connection pooling (Prisma 7 adapter)');
});
