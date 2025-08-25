import { prisma } from '../lib/prisma';
import express from 'express';
;
import { requireAuth, AuthRequest } from '../middleware/auth';
import { DistrictIdentificationService } from '../services/districtIdentificationService';
import { createNotification } from './notifications';

const router = express.Router();
// Using singleton prisma from lib/prisma.ts

// Rate limiting for crowdsourcing submissions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, maxSubmissions: number = 5, windowMs: number = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= maxSubmissions) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Get districts for an address (PUBLIC endpoint)
router.get('/districts/lookup', async (req, res) => {
  try {
    const { address, state, zipCode, forceRefresh } = req.query;
    
    if (!address && (!state || !zipCode)) {
      return res.status(400).json({
        error: 'Either full address or state+zipCode is required'
      });
    }
    
    const addressComponents = {
      streetAddress: address ? address.toString().split(',')[0] : undefined,
      city: address ? address.toString().split(',')[1]?.trim() : undefined,
      state: (state || address?.toString().match(/\b([A-Z]{2})\b/)?.[1] || '').toString(),
      zipCode: (zipCode || address?.toString().match(/\b(\d{5})\b/)?.[1] || '').toString()
    };
    
    if (!addressComponents.state || !addressComponents.zipCode) {
      return res.status(400).json({
        error: 'Valid state and ZIP code are required'
      });
    }
    
    const result = await DistrictIdentificationService.identifyDistricts(
      addressComponents,
      forceRefresh === 'true'
    );
    
    res.json(result);
  } catch (error) {
    console.error('District lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get missing offices for districts (PUBLIC endpoint)
router.post('/districts/missing-offices', async (req, res) => {
  try {
    const { districtIds } = req.body;
    
    if (!Array.isArray(districtIds) || districtIds.length === 0) {
      return res.status(400).json({
        error: 'Array of district IDs is required'
      });
    }
    
    if (districtIds.length > 20) {
      return res.status(400).json({
        error: 'Maximum 20 districts per request'
      });
    }
    
    const missingOffices = await DistrictIdentificationService.findMissingOffices(districtIds);
    
    res.json({
      missingOffices,
      total: missingOffices.length,
      districtCount: districtIds.length
    });
  } catch (error) {
    console.error('Missing offices lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a new district (requires authentication)
router.post('/districts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Rate limiting
    if (!checkRateLimit(userId, 3, 60 * 60 * 1000)) { // 3 submissions per hour
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before submitting more districts.'
      });
    }
    
    const {
      name,
      type,
      level,
      identifier,
      state,
      county,
      municipality,
      coordinates,
      population,
      externalId,
      dataSource,
      parentDistrict
    } = req.body;
    
    // Validation
    if (!name || !type || !level || !identifier || !state) {
      return res.status(400).json({
        error: 'Name, type, level, identifier, and state are required'
      });
    }
    
    // Check for duplicate
    const existing = await prisma.electoralDistrict.findFirst({
      where: {
        identifier,
        state,
        type
      }
    });
    
    if (existing) {
      return res.status(409).json({
        error: 'District with this identifier already exists in this state'
      });
    }
    
    const district = await prisma.electoralDistrict.create({
      data: {
        name,
        type,
        level,
        identifier,
        state,
        county,
        municipality,
        coordinates,
        population,
        externalId,
        dataSource: dataSource || 'CROWDSOURCED',
        parentDistrict,
        submittedBy: userId,
        verificationLevel: 'UNVERIFIED'
      }
    });
    
    res.status(201).json({
      message: 'District submitted successfully',
      district: {
        id: district.id,
        name: district.name,
        identifier: district.identifier,
        verificationLevel: district.verificationLevel
      }
    });
  } catch (error) {
    console.error('District submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a new office for a district (requires authentication)
router.post('/districts/:districtId/offices', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { districtId } = req.params;
    
    // Rate limiting
    if (!checkRateLimit(userId, 5, 60 * 60 * 1000)) { // 5 submissions per hour
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before submitting more offices.'
      });
    }
    
    const {
      title,
      level,
      termLength,
      electionCycle,
      nextElection,
      salary,
      hasTermLimits,
      maxTerms,
      currentOfficeholder,
      holderStartDate,
      holderEndDate,
      holderParty,
      holderContactInfo,
      holderPhotoUrl,
      sourceType,
      sourceUrl,
      sourceNotes
    } = req.body;
    
    // Validation
    if (!title || !level) {
      return res.status(400).json({
        error: 'Title and level are required'
      });
    }
    
    // Verify district exists
    const district = await prisma.electoralDistrict.findUnique({
      where: { id: districtId }
    });
    
    if (!district) {
      return res.status(404).json({
        error: 'District not found'
      });
    }
    
    const office = await prisma.districtOffice.create({
      data: {
        title,
        level,
        termLength,
        electionCycle,
        nextElection: nextElection ? new Date(nextElection) : undefined,
        salary,
        hasTermLimits,
        maxTerms,
        currentOfficeholder,
        holderStartDate: holderStartDate ? new Date(holderStartDate) : undefined,
        holderEndDate: holderEndDate ? new Date(holderEndDate) : undefined,
        holderParty,
        holderContactInfo,
        holderPhotoUrl,
        dataSource: sourceType || 'CROWDSOURCED',
        sourceUrl,
        submittedBy: userId,
        verificationLevel: 'UNVERIFIED',
        districtId
      }
    });
    
    res.status(201).json({
      message: 'Office submitted successfully',
      office: {
        id: office.id,
        title: office.title,
        currentOfficeholder: office.currentOfficeholder,
        verificationLevel: office.verificationLevel
      }
    });
  } catch (error) {
    console.error('Office submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit crowdsourced official data (requires authentication)
router.post('/offices/:officeId/officials', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { officeId } = req.params;
    
    // Rate limiting
    if (!checkRateLimit(userId, 10, 60 * 60 * 1000)) { // 10 submissions per hour
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before submitting more official data.'
      });
    }
    
    const {
      name,
      party,
      contactInfo,
      photoUrl,
      website,
      socialMedia,
      biography,
      keyAccomplishments,
      sourceType,
      sourceUrl,
      sourceNotes
    } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        error: 'Official name is required'
      });
    }
    
    if (!sourceType || !['OFFICIAL_WEBSITE', 'NEWS_ARTICLE', 'PERSONAL_KNOWLEDGE'].includes(sourceType)) {
      return res.status(400).json({
        error: 'Valid source type is required (OFFICIAL_WEBSITE, NEWS_ARTICLE, PERSONAL_KNOWLEDGE)'
      });
    }
    
    // Verify office exists
    const office = await prisma.districtOffice.findUnique({
      where: { id: officeId }
    });
    
    if (!office) {
      return res.status(404).json({
        error: 'Office not found'
      });
    }
    
    const official = await prisma.crowdsourcedOfficial.create({
      data: {
        name,
        party,
        contactInfo,
        photoUrl,
        website,
        socialMedia,
        biography,
        keyAccomplishments,
        sourceType,
        sourceUrl,
        sourceNotes,
        submittedBy: userId,
        verificationLevel: 'UNVERIFIED',
        officeId
      }
    });
    
    res.status(201).json({
      message: 'Official data submitted successfully',
      official: {
        id: official.id,
        name: official.name,
        party: official.party,
        verificationLevel: official.verificationLevel
      }
    });
  } catch (error) {
    console.error('Official submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vote on crowdsourced official data (requires authentication)
router.post('/officials/:officialId/vote', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { officialId } = req.params;
    const { voteType, reason } = req.body;
    
    if (!['UPVOTE', 'DOWNVOTE', 'REPORT'].includes(voteType)) {
      return res.status(400).json({
        error: 'Valid vote type is required (UPVOTE, DOWNVOTE, REPORT)'
      });
    }
    
    // Verify official exists
    const official = await prisma.crowdsourcedOfficial.findUnique({
      where: { id: officialId }
    });
    
    if (!official) {
      return res.status(404).json({
        error: 'Official not found'
      });
    }
    
    // Prevent self-voting
    if (official.submittedBy === userId) {
      return res.status(400).json({
        error: 'Cannot vote on your own submissions'
      });
    }
    
    // Update or create vote
    const existingVote = await prisma.crowdsourceVote.findUnique({
      where: {
        userId_officialId: {
          userId,
          officialId
        }
      }
    });
    
    if (existingVote) {
      // Update existing vote
      await prisma.crowdsourceVote.update({
        where: { id: existingVote.id },
        data: { voteType, reason }
      });
    } else {
      // Create new vote
      await prisma.crowdsourceVote.create({
        data: {
          userId,
          officialId,
          voteType,
          reason
        }
      });
    }
    
    // Update vote counts
    const votes = await prisma.crowdsourceVote.findMany({
      where: { officialId }
    });
    
    const upvotes = votes.filter(v => v.voteType === 'UPVOTE').length;
    const downvotes = votes.filter(v => v.voteType === 'DOWNVOTE').length;
    const reports = votes.filter(v => v.voteType === 'REPORT').length;
    
    await prisma.crowdsourcedOfficial.update({
      where: { id: officialId },
      data: {
        upvotes,
        downvotes,
        reportCount: reports
      }
    });
    
    // Auto-verify if enough upvotes
    if (upvotes >= 3 && downvotes === 0) {
      await prisma.crowdsourcedOfficial.update({
        where: { id: officialId },
        data: { verificationLevel: 'COMMUNITY_VERIFIED' }
      });
    }
    
    res.json({
      message: 'Vote recorded successfully',
      votes: { upvotes, downvotes, reports }
    });
  } catch (error) {
    console.error('Voting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Report a conflict or dispute (requires authentication)
router.post('/districts/:districtId/conflicts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { districtId } = req.params;
    
    // Rate limiting
    if (!checkRateLimit(userId, 3, 24 * 60 * 60 * 1000)) { // 3 reports per day
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before reporting more conflicts.'
      });
    }
    
    const { type, description, evidence } = req.body;
    
    if (!type || !description) {
      return res.status(400).json({
        error: 'Conflict type and description are required'
      });
    }
    
    if (!['BOUNDARY_DISPUTE', 'OFFICE_HOLDER_DISPUTE', 'ELECTION_DATE_DISPUTE', 
          'CONTACT_INFO_DISPUTE', 'TERM_LENGTH_DISPUTE', 'DUPLICATE_ENTRY', 'OUTDATED_INFO'].includes(type)) {
      return res.status(400).json({
        error: 'Valid conflict type is required'
      });
    }
    
    // Verify district exists
    const district = await prisma.electoralDistrict.findUnique({
      where: { id: districtId }
    });
    
    if (!district) {
      return res.status(404).json({
        error: 'District not found'
      });
    }
    
    const conflict = await prisma.districtConflict.create({
      data: {
        type,
        description,
        evidence,
        reportedBy: userId,
        districtId,
        status: 'OPEN',
        priority: 'MEDIUM'
      }
    });
    
    // Increment conflict count on district
    await prisma.electoralDistrict.update({
      where: { id: districtId },
      data: {
        conflictCount: { increment: 1 }
      }
    });
    
    res.status(201).json({
      message: 'Conflict reported successfully',
      conflict: {
        id: conflict.id,
        type: conflict.type,
        status: conflict.status
      }
    });
  } catch (error) {
    console.error('Conflict reporting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's crowdsourcing contributions (requires authentication)
router.get('/my-contributions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page.toString());
    const limitNum = Math.min(parseInt(limit.toString()), 100);
    const offset = (pageNum - 1) * limitNum;
    
    const [districts, offices, officials, conflicts] = await Promise.all([
      prisma.electoralDistrict.findMany({
        where: { submittedBy: userId },
        select: {
          id: true,
          name: true,
          identifier: true,
          verificationLevel: true,
          createdAt: true
        },
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.districtOffice.findMany({
        where: { submittedBy: userId },
        select: {
          id: true,
          title: true,
          currentOfficeholder: true,
          verificationLevel: true,
          createdAt: true,
          district: {
            select: { name: true }
          }
        },
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.crowdsourcedOfficial.findMany({
        where: { submittedBy: userId },
        select: {
          id: true,
          name: true,
          party: true,
          verificationLevel: true,
          upvotes: true,
          downvotes: true,
          createdAt: true,
          office: {
            select: {
              title: true,
              district: {
                select: { name: true }
              }
            }
          }
        },
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      
      prisma.districtConflict.findMany({
        where: { reportedBy: userId },
        select: {
          id: true,
          type: true,
          description: true,
          status: true,
          createdAt: true,
          district: {
            select: { name: true }
          }
        },
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    res.json({
      contributions: {
        districts,
        offices,
        officials,
        conflicts
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: districts.length === limitNum || 
                offices.length === limitNum || 
                officials.length === limitNum || 
                conflicts.length === limitNum
      }
    });
  } catch (error) {
    console.error('Contributions lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get crowdsourcing leaderboard (PUBLIC endpoint)
router.get('/leaderboard', async (req, res) => {
  try {
    const { timeframe = '30', limit = 10 } = req.query;
    
    const daysAgo = Math.min(parseInt(timeframe.toString()), 365);
    const limitNum = Math.min(parseInt(limit.toString()), 50);
    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Get contribution counts by user
    const [districtCounts, officeCounts, officialCounts] = await Promise.all([
      prisma.electoralDistrict.groupBy({
        by: ['submittedBy'],
        where: {
          submittedBy: { not: null },
          createdAt: { gte: cutoffDate }
        },
        _count: { id: true }
      }),
      
      prisma.districtOffice.groupBy({
        by: ['submittedBy'],
        where: {
          submittedBy: { not: null },
          createdAt: { gte: cutoffDate }
        },
        _count: { id: true }
      }),
      
      prisma.crowdsourcedOfficial.groupBy({
        by: ['submittedBy'],
        where: {
          createdAt: { gte: cutoffDate }
        },
        _count: { id: true }
      })
    ]);
    
    // Aggregate contributions by user
    const userContributions = new Map<string, number>();
    
    districtCounts.forEach(({ submittedBy, _count }) => {
      if (submittedBy) {
        userContributions.set(submittedBy, (userContributions.get(submittedBy) || 0) + _count.id);
      }
    });
    
    officeCounts.forEach(({ submittedBy, _count }) => {
      if (submittedBy) {
        userContributions.set(submittedBy, (userContributions.get(submittedBy) || 0) + _count.id);
      }
    });
    
    officialCounts.forEach(({ submittedBy, _count }) => {
      userContributions.set(submittedBy, (userContributions.get(submittedBy) || 0) + _count.id);
    });
    
    // Get top contributors
    const sortedContributors = Array.from(userContributions.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limitNum);
    
    // Get user details
    const userIds = sortedContributors.map(([userId]) => userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true
      }
    });
    
    const userMap = new Map(users.map(user => [user.id, user]));
    
    const leaderboard = sortedContributors.map(([userId, count], index) => ({
      rank: index + 1,
      user: userMap.get(userId),
      contributions: count
    }));
    
    res.json({
      leaderboard,
      timeframe: `${daysAgo} days`,
      totalContributors: userContributions.size
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;