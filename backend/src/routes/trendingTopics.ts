import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Simple test endpoint to verify route mounting
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Trending topics route is working',
    timestamp: new Date().toISOString()
  });
});

export default router;