import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Get trending topics - simplified fallback implementation
 */
router.get('/topics', async (req, res) => {
  try {
    const { scope = 'national', limit = 7 } = req.query;
    
    // For now, return empty topics array to prevent frontend errors
    // Full AI implementation will be restored in next session
    res.json({
      success: true,
      scope,
      topics: [],
      message: 'AI topic aggregation temporarily unavailable'
    });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics'
    });
  }
});

/**
 * Get topics for map display
 */
router.get('/map-topics', async (req, res) => {
  try {
    const { count = 3 } = req.query;
    
    // Return empty array for now
    res.json({
      success: true,
      topics: [],
      message: 'Map topics temporarily unavailable'
    });
  } catch (error) {
    console.error('Error fetching map topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch map topics'
    });
  }
});

export default router;