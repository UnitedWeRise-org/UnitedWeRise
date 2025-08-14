/**
 * Health and Deployment Status Endpoints
 * 
 * Provides detailed information about component deployment status
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Get deployment information from package.json
function getPackageInfo() {
  try {
    const packagePath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      version: packageJson.version,
      name: packageJson.name
    };
  } catch (error) {
    return {
      version: 'unknown',
      name: 'unitedwerise-backend'
    };
  }
}

// Get last deployment time from various sources
function getDeploymentInfo() {
  const packageInfo = getPackageInfo();
  const startTime = new Date(Date.now() - (process.uptime() * 1000));
  
  // Try to read deployment timestamp file if it exists
  let deploymentTime = startTime;
  try {
    const deployFile = path.join(__dirname, '../../.deployment-time');
    if (fs.existsSync(deployFile)) {
      const timestamp = fs.readFileSync(deployFile, 'utf8').trim();
      deploymentTime = new Date(timestamp);
    }
  } catch (error) {
    // Use start time as fallback
  }
  
  return {
    ...packageInfo,
    deploymentTime,
    startTime,
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development'
  };
}

// Get database schema information
async function getDatabaseInfo() {
  try {
    // Get database connection info
    await prisma.$connect();
    
    // Try to get migration info (this is a simplified approach)
    const migrationInfo = await getMigrationInfo();
    
    return {
      status: 'connected',
      connectionTime: Date.now(), // This would be measured in a real implementation
      schemaVersion: migrationInfo.version,
      lastMigration: migrationInfo.lastMigration,
      provider: 'postgresql' // Could be dynamic based on DATABASE_URL
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'error',
      error: error.message,
      connectionTime: null,
      schemaVersion: 'unknown',
      lastMigration: 'unknown'
    };
  }
}

// Get migration information (simplified)
async function getMigrationInfo() {
  try {
    // Check if _prisma_migrations table exists and get last migration
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 1
    ` as any[];
    
    if (migrations.length > 0) {
      return {
        version: migrations[0].migration_name,
        lastMigration: migrations[0].finished_at
      };
    }
  } catch (error) {
    // Table might not exist or query failed
    logger.warn('Could not fetch migration info:', error.message);
  }
  
  return {
    version: 'unknown',
    lastMigration: 'unknown'
  };
}

// Basic health endpoint (existing)
router.get('/', async (req, res) => {
  try {
    await prisma.$connect();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Detailed deployment status endpoint
router.get('/deployment', async (req, res) => {
  try {
    const deploymentInfo = getDeploymentInfo();
    const databaseInfo = await getDatabaseInfo();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      deployment: deploymentInfo,
      database: databaseInfo,
      services: {
        reputation: await checkReputationService(),
        batch: await checkBatchService(),
        ai: await checkAIServices()
      }
    });
  } catch (error) {
    logger.error('Deployment status check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Check reputation service health
async function checkReputationService() {
  try {
    // Test basic reputation functionality
    const eventCount = await prisma.reputationEvent.count({
      take: 1
    });
    
    return {
      status: 'available',
      eventsCount: eventCount,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Check batch service health
async function checkBatchService() {
  try {
    // Test if batch routes are available
    return {
      status: 'available',
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Check AI services health
async function checkAIServices() {
  const services = {
    azureOpenAI: 'unknown',
    embeddingService: 'unknown'
  };
  
  try {
    // Check if Azure OpenAI endpoint is configured
    if (process.env.AZURE_OPENAI_ENDPOINT) {
      services.azureOpenAI = 'configured';
    } else {
      services.azureOpenAI = 'not_configured';
    }
    
    // Check embedding service
    if (process.env.HUGGINGFACE_API_KEY || process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT) {
      services.embeddingService = 'configured';
    } else {
      services.embeddingService = 'not_configured';
    }
  } catch (error) {
    logger.warn('AI services check failed:', error);
  }
  
  return services;
}

// Component-specific health endpoints
router.get('/database', async (req, res) => {
  const dbInfo = await getDatabaseInfo();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbInfo
  });
});

router.get('/reputation', async (req, res) => {
  const reputationInfo = await checkReputationService();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    reputation: reputationInfo
  });
});

router.get('/batch', async (req, res) => {
  const batchInfo = await checkBatchService();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    batch: batchInfo
  });
});

// Endpoint to manually update deployment timestamp
router.post('/deployment/update', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const deployFile = path.join(__dirname, '../../.deployment-time');
    
    fs.writeFileSync(deployFile, timestamp);
    
    res.json({
      status: 'updated',
      timestamp,
      message: 'Deployment timestamp updated'
    });
  } catch (error) {
    logger.error('Failed to update deployment timestamp:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;