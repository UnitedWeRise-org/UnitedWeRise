import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createNotification } from './notifications';
import { addressToH3, getNearbyH3Indexes } from '../utils/geospatial';
import { RepresentativeService } from '../services/representativeService';
import { validatePoliticalProfile } from '../middleware/validation';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

// Update user's address and political info (existing route - enhanced)
router.put('/profile', requireAuth, validatePoliticalProfile, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      streetAddress,
      city,
      state,
      zipCode,
      politicalParty,
      campaignWebsite,
      politicalProfileType,
      office,
      officialTitle,
      termStart,
      termEnd
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

    // Prepare update data
    const updateData: any = {
      streetAddress,
      city,
      state,
      zipCode,
      h3Index,
      politicalParty,
      campaignWebsite,
      office,
      officialTitle
    };

    // Add political profile type if provided
    if (politicalProfileType) {
      updateData.politicalProfileType = politicalProfileType;
      
      // If changing to a political role, set verification to pending
      if (politicalProfileType !== 'CITIZEN') {
        updateData.verificationStatus = 'PENDING';
      } else {
        updateData.verificationStatus = 'NOT_REQUIRED';
      }
    }

    // Add date fields if provided
    if (termStart) {
      updateData.termStart = new Date(termStart);
    }
    if (termEnd) {
      updateData.termEnd = new Date(termEnd);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        officialTitle: true,
        termStart: true,
        termEnd: true
      }
    });

    // If user provided full address, pre-load their elected officials
    if (streetAddress && city && state && zipCode) {
      // Background task - don't wait for it
      RepresentativeService.getRepresentativesByAddress(
        `${streetAddress}, ${city}, ${state} ${zipCode}`,
        zipCode,
        state
      ).catch(error => {
        console.error('Background representative loading failed:', error);
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

    let representatives: any[] = [];
    let responseSource = 'cache';

    // Try to get from our database cache first (fastest)
    if (forceRefresh !== 'true') {
      representatives = await RepresentativeService.getCachedRepresentativesByLocation(
        user.zipCode, 
        user.state
      );
    }

    // If no cached data or force refresh, get from API
    if (representatives.length === 0 || forceRefresh === 'true') {
      const fullAddress = user.streetAddress 
        ? `${user.streetAddress}, ${user.city}, ${user.state} ${user.zipCode}`
        : `${user.zipCode}, ${user.state}`;

      const repResponse = await RepresentativeService.getRepresentativesByAddress(
        fullAddress,
        user.zipCode,
        user.state,
        forceRefresh === 'true'
      );

      const repsData = repResponse?.representatives || [];
      
      // Handle both array and grouped formats
      if (Array.isArray(repsData)) {
        representatives = repsData;
      } else {
        representatives = [
          ...(repsData.federal || []),
          ...(repsData.state || []),
          ...(repsData.local || [])
        ];
      }
      responseSource = repResponse?.source || 'none';
    }

    // Group representatives by government level
    const groupedRepresentatives = {
      federal: representatives.filter((r: any) => r.level === 'federal'),
      state: representatives.filter((r: any) => r.level === 'state'),
      local: representatives.filter((r: any) => r.level === 'local')
    };

    res.json({
      representatives: groupedRepresentatives,
      totalCount: representatives.length,
      location: {
        zipCode: user.zipCode,
        state: user.state,
        city: user.city
      },
      source: responseSource,
      lastUpdated: new Date().toISOString(),
      cached: forceRefresh !== 'true'
    });

  } catch (error) {
    console.error('Get representatives error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alias for /officials endpoint (for frontend compatibility)
router.get('/representatives', requireAuth, async (req: AuthRequest, res) => {
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
        error: 'Please add your address in profile settings to see your representatives' 
      });
    }

    let representatives: any[] = [];
    let responseSource = 'cache';

    // Try to get from our database cache first (fastest)
    if (forceRefresh !== 'true') {
      representatives = await RepresentativeService.getCachedRepresentativesByLocation(
        user.zipCode, 
        user.state
      );
    }

    // If no cached data or force refresh, get from API
    if (representatives.length === 0 || forceRefresh === 'true') {
      const fullAddress = user.streetAddress 
        ? `${user.streetAddress}, ${user.city}, ${user.state} ${user.zipCode}`
        : `${user.zipCode}, ${user.state}`;

      const repResponse = await RepresentativeService.getRepresentativesByAddress(
        fullAddress,
        user.zipCode,
        user.state,
        forceRefresh === 'true'
      );

      const repsData = repResponse?.representatives || [];
      
      // Handle both array and grouped formats
      if (Array.isArray(repsData)) {
        representatives = repsData;
      } else {
        representatives = [
          ...(repsData.federal || []),
          ...(repsData.state || []),
          ...(repsData.local || [])
        ];
      }
      responseSource = repResponse?.source || 'none';
    }

    // Group representatives by government level
    const groupedRepresentatives = {
      federal: representatives.filter((r: any) => r.level === 'federal'),
      state: representatives.filter((r: any) => r.level === 'state'),
      local: representatives.filter((r: any) => r.level === 'local')
    };

    res.json({
      representatives: groupedRepresentatives,
      totalCount: representatives.length,
      location: {
        zipCode: user.zipCode,
        state: user.state,
        city: user.city
      },
      source: responseSource,
      lastUpdated: new Date().toISOString(),
      cached: forceRefresh !== 'true'
    });

  } catch (error) {
    console.error('Get representatives error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get representatives by address (PUBLIC - no authentication required)
router.get('/representatives/lookup', async (req, res) => {
  try {
    const { address, forceRefresh } = req.query;

    if (!address) {
      return res.status(400).json({ 
        error: 'Address parameter is required' 
      });
    }

    // Call the representative service with the provided address
    const repResponse = await RepresentativeService.getRepresentativesByAddress(
      address as string,
      undefined, // zipCode - will be extracted from address
      undefined, // state - will be extracted from address  
      forceRefresh === 'true'
    );

    if (!repResponse) {
      return res.status(404).json({ 
        error: 'No representatives found for this address' 
      });
    }

    // Group representatives by government level
    const repsData = repResponse.representatives || [];
    let representatives: any[] = [];
    
    // Handle both array and grouped formats
    if (Array.isArray(repsData)) {
      representatives = repsData;
    } else {
      representatives = [
        ...(repsData.federal || []),
        ...(repsData.state || []),
        ...(repsData.local || [])
      ];
    }

    const groupedRepresentatives = {
      federal: representatives.filter((r: any) => r.level === 'federal'),
      state: representatives.filter((r: any) => r.level === 'state'),
      local: representatives.filter((r: any) => r.level === 'local')
    };

    res.json({
      representatives: groupedRepresentatives,
      totalCount: representatives.length,
      location: repResponse.location || {},
      source: repResponse.source,
      lastUpdated: new Date().toISOString(),
      cached: forceRefresh !== 'true'
    });

  } catch (error) {
    console.error('Get representatives by address error:', error);
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

    const success = await RepresentativeService.refreshLocation(user.zipCode, user.state);

    if (success) {
      res.json({ 
        message: 'Representatives data refreshed successfully',
        refreshed: true 
      });
    } else {
      res.status(503).json({ 
        error: 'Unable to refresh data at this time. Please try again later.',
        refreshed: false 
      });
    }

  } catch (error) {
    console.error('Refresh representatives error:', error);
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

    let representatives: any[] = [];
    let responseSource = 'cache';

    // Get cached data first
    if (forceRefresh !== 'true') {
      representatives = await RepresentativeService.getCachedRepresentativesByLocation(
        zipCode, 
        state.toUpperCase()
      );
    }

    // Get fresh data if needed
    if (representatives.length === 0 || forceRefresh === 'true') {
      const repResponse = await RepresentativeService.getRepresentativesByAddress(
        `${zipCode}, ${state}`,
        zipCode,
        state.toUpperCase(),
        forceRefresh === 'true'
      );

      const repsData = repResponse?.representatives || [];
      
      // Handle both array and grouped formats
      if (Array.isArray(repsData)) {
        representatives = repsData;
      } else {
        representatives = [
          ...(repsData.federal || []),
          ...(repsData.state || []),
          ...(repsData.local || [])
        ];
      }
      responseSource = repResponse?.source || 'none';
    }

    res.json({
      representatives,
      location: { zipCode, state: state.toUpperCase() },
      count: representatives.length,
      source: responseSource
    });

  } catch (error) {
    console.error('Get representatives by location error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Existing routes (verify, local, admin/approve) remain unchanged...
// [Keep all your existing routes here]

export default router;