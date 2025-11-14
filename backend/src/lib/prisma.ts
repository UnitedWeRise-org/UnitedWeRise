/**
 * Singleton Prisma Client
 * Created: August 24, 2025
 * Purpose: Prevent database connection pool exhaustion by sharing a single Prisma instance
 * 
 * CRITICAL: This fixes the connection leak issue where 60+ files were each creating
 * their own PrismaClient instance, exhausting the database connection limit.
 */

import { PrismaClient } from '@prisma/client';
import { getDatabaseLogLevel, getEnvironment, isProduction } from '../utils/environment';

// Configure connection URL with proper pooling before creating client
const connectionUrl = process.env.DATABASE_URL?.includes('connection_limit=') 
  ? process.env.DATABASE_URL 
  : `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes('?') ? '&' : '?'}connection_limit=10&pool_timeout=20&connect_timeout=10`;

// Create singleton instance with proper configuration
const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: connectionUrl
      }
    },
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
  const { logger } = require('../services/logger');

  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
}

// Register cleanup handlers
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Log connection info on startup using Pino structured logging
// Migration: Phase 3-4 Pino structured logging (2025-11-13)
// Import logger dynamically to avoid circular dependency
const { logger } = require('../services/logger');
logger.info({
  connectionLimit: 10,
  poolTimeout: 20,
  environment: getEnvironment()
}, '🔗 Prisma singleton initialized with connection pooling');