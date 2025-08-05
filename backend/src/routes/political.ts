import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { addressToH3, getNearbyH3Indexes } from '../utils/geospatial';
import { GoogleCivicService } from '../services/googleCivic';

const router = express.Router();
const prisma = new PrismaClient();

// Update user's address and political info (existing route - enhanced)
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      streetAddress,
      city,
      state,
      zipCode,
      politicalParty,
      campaignWebsite
    } = req.body;

    // Basic validation
    if (streetAddress && (!city || !state || !zipCode)) {
      return res.status(400).json({ 
        error: 'City, state, and zip code are required when providing street address' 
      });
    }

    // Calculate H3 geospatial index
    let h3Index = null;
    if (streetAddress && city && state && zipCode) {
      h3Index = await addressToH3({
        streetAddress,
        city, 
        state,
        zipCode
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        streetAddress,
        city,
        state,
        zipCode,
        h3Index,
        politicalParty,
        campaignWebsite
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        politicalProfileType: true,
        verificationStatus: true,
        politicalParty: true,
        campaignWebsite: true,
        office: true,
        officialTitle: true
      }
    });

    // If user provided full address, pre-load their elected officials
    if (streetAddress && city && state && zipCode) {
      // Background task - don't wait for it
      GoogleCivicService.getOfficialsByAddress(
        `${streetAddress}, ${city}, ${state} ${zipCode}`,
        zipCode,
        state
      ).catch(error => {
        console.error('Background official loading failed:', error);
      });
    }

    res.json({
      message: 'Political profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update political profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get elected officials for user's location
router.get('/officials', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { forceRefresh } = req.query;

    // Get user's address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streetAddress: true, city: true, state: true, zipCode: true }
    });

    if (!user?.zipCode || !user?.state) {
      return res.status(400).json({ 
        error: 'Please add your address in profile settings to see your elected officials' 
      });
    }

    let officials: any[] = [];

    // Try to get from our database cache first (fastest)
    if (forceRefresh !== 'true') {
      officials = await GoogleCivicService.getCachedOfficialsByLocation(
        user.zipCode, 
        user.state
      );
    }

    // If no cached data or force refresh, get from Google Civic API
    if (officials.length === 0 || forceRefresh === 'true') {
      const fullAddress = user.streetAddress 
        ? `${user.streetAddress}, ${user.city}, ${user.state} ${user.zipCode}`
        : `${user.zipCode}, ${user.state}`;

      const civicResponse = await GoogleCivicService.getOfficialsByAddress(
        fullAddress,
        user.zipCode,
        user.state,
        forceRefresh === 'true'
      );

      officials = civicResponse?.officials || [];
    }

    // Group officials by government level
    const groupedOfficials = {
      federal: officials.filter(o => 
        o.office.toLowerCase().includes('president') ||
        o.office.toLowerCase().includes('senator') ||
        o.office.toLowerCase().includes('representative') ||
        o.office.toLowerCase().includes('congress')
      ),
      state: officials.filter(o => 
        o.office.toLowerCase().includes('governor') ||
        o.office.toLowerCase().includes('state') ||
        o.office.toLowerCase().includes('assembly')
      ),
      local: officials.filter(o => 
        o.office.toLowerCase().includes('mayor') ||
        o.office.toLowerCase().includes('council') ||
        o.office.toLowerCase().includes('commissioner') ||
        o.office.toLowerCase().includes('sheriff') ||
        (!o.office.toLowerCase().includes('president') && 
         !o.office.toLowerCase().includes('senator') && 
         !o.office.toLowerCase().includes('representative') &&
         !o.office.toLowerCase().includes('congress') &&
         !o.office.toLowerCase().includes('governor') &&
         !o.office.toLowerCase().includes('state') &&
         !o.office.toLowerCase().includes('assembly'))
      )
    };

    res.json({
      officials: groupedOfficials,
      totalCount: officials.length,
      location: {
        zipCode: user.zipCode,
        state: user.state,
        city: user.city
      },
      lastUpdated: new Date().toISOString(),
      cached: forceRefresh !== 'true'
    });

  } catch (error) {
    console.error('Get elected officials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh elected officials data
router.post('/officials/refresh', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { zipCode: true, state: true }
    });

    if (!user?.zipCode || !user?.state) {
      return res.status(400).json({ 
        error: 'Please add your address to refresh elected officials data' 
      });
    }

    const success = await GoogleCivicService.refreshLocation(user.zipCode, user.state);

    if (success) {
      res.json({ 
        message: 'Elected officials data refreshed successfully',
        refreshed: true 
      });
    } else {
      res.status(503).json({ 
        error: 'Unable to refresh data at this time. Please try again later.',
        refreshed: false 
      });
    }

  } catch (error) {
    console.error('Refresh officials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get officials by location (public endpoint for search)
router.get('/officials/:zipCode/:state', async (req, res) => {
  try {
    const { zipCode, state } = req.params;
    const { forceRefresh } = req.query;

    // Basic validation
    if (!/^\d{5}$/.test(zipCode) || !/^[A-Z]{2}$/i.test(state)) {
      return res.status(400).json({ 
        error: 'Invalid zip code or state format' 
      });
    }

    let officials: any[] = [];

    // Get cached data first
    if (forceRefresh !== 'true') {
      officials = await GoogleCivicService.getCachedOfficialsByLocation(
        zipCode.toUpperCase(), 
        state.toUpperCase()
      );
    }

    // Get fresh data if needed
    if (officials.length === 0 || forceRefresh === 'true') {
      const civicResponse = await GoogleCivicService.getOfficialsByAddress(
        `${zipCode}, ${state}`,
        zipCode,
        state.toUpperCase(),
        forceRefresh === 'true'
      );

      officials = civicResponse?.officials || [];
    }

    res.json({
      officials,
      location: { zipCode, state: state.toUpperCase() },
      count: officials.length
    });

  } catch (error) {
    console.error('Get officials by location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Existing routes (verify, local, admin/approve) remain unchanged...
// [Keep all your existing routes here]

export default router;