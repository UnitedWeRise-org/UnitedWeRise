import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { ApiCacheService } from '../services/apiCache';
import { logger } from '../services/logger';

const router = Router();

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;

/**
 * @swagger
 * /api/geo/search:
 *   get:
 *     tags: [Geo]
 *     summary: Geocode a US address for the map
 *     description: Resolves a US address (or place) to coordinates using Geocodio, with a 30-day DB cache. Used by the map address search to zoom to a location.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Address or place query (3-250 chars)
 *         example: "1600 Pennsylvania Ave NW, Washington, DC"
 *     responses:
 *       200:
 *         description: Coordinates resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *                     formattedAddress:
 *                       type: string
 *                     accuracy:
 *                       type: number
 *                     accuracyType:
 *                       type: string
 *                 cached:
 *                   type: boolean
 *       400:
 *         description: Invalid or missing query
 *       404:
 *         description: Address not found
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Geocoding service not configured
 *       500:
 *         description: Geocoding failed
 */
router.get('/search', requireAuth, async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();

  if (q.length < 3 || q.length > 250) {
    return res.status(400).json({ success: false, error: 'Query must be between 3 and 250 characters' });
  }

  if (!GEOCODIO_API_KEY) {
    return res.status(503).json({ success: false, error: 'Geocoding service not configured' });
  }

  const cacheKey = q.toLowerCase();

  try {
    const cached = await ApiCacheService.get('geocode', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const params = new URLSearchParams({
      api_key: GEOCODIO_API_KEY,
      q,
      limit: '1'
    });

    const response = await fetch(`https://api.geocod.io/v1.7/geocode?${params}`);
    if (!response.ok) {
      logger.warn({ status: response.status, q }, 'Geocodio geocode request failed');
      return res.status(502).json({ success: false, error: 'Geocoding provider error' });
    }

    const data: any = await response.json();
    const result = data?.results?.[0];

    if (!result || !result.location) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    const payload = {
      lat: result.location.lat,
      lng: result.location.lng,
      formattedAddress: result.formatted_address,
      accuracy: result.accuracy,
      accuracyType: result.accuracy_type
    };

    // Addresses change rarely; cache for 30 days.
    await ApiCacheService.set('geocode', cacheKey, payload, 30 * 24 * 60);

    res.json({ success: true, data: payload, cached: false });
  } catch (error) {
    logger.error({ error, q }, 'Geocode search error');
    res.status(500).json({ success: false, error: 'Geocoding failed' });
  }
});

export default router;
