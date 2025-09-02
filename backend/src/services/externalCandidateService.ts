/**
 * External Candidate Import Service
 * 
 * Pre-populates candidate data from external sources before they register
 * Supports Google Civic API, FEC API, and future Ballotpedia integration
 */

import { prisma } from '../lib/prisma';
import { OfficeLevel, ElectionLevel } from '@prisma/client';
import { ApiCacheService } from './apiCache';
import logger from '../utils/logger';

interface GoogleCivicCandidate {
  name: string;
  party?: string;
  candidateUrl?: string;
  phone?: string;
  photoUrl?: string;
  email?: string;
  orderOnBallot?: number;
  channels?: Array<{
    type: string;
    id: string;
  }>;
}

interface GoogleCivicContest {
  office: string;
  level: string[];
  district?: {
    name: string;
    scope: string;
  };
  candidates: GoogleCivicCandidate[];
}

interface GoogleCivicResponse {
  contests: GoogleCivicContest[];
  election: {
    id: string;
    name: string;
    electionDay: string;
  };
}

export class ExternalCandidateService {
  private static googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY;
  private static fecApiKey = process.env.FEC_API_KEY;

  // Cache durations for different data types (in minutes)
  private static readonly CACHE_DURATIONS = {
    GOOGLE_CIVIC_CANDIDATES: 30 * 24 * 60,  // 30 days - candidate rosters rarely change
    GOOGLE_CIVIC_ELECTIONS: 7 * 24 * 60,    // 7 days - election dates are stable
    FEC_FINANCIAL_DATA: 7 * 24 * 60,        // 7 days - FEC reports filed monthly/quarterly
    BALLOTPEDIA_POLICY: 14 * 24 * 60,       // 14 days - policy positions stable during campaigns
    CANDIDATE_SEARCH: 3 * 24 * 60,          // 3 days - search results can be cached shorter
    CLAIMABLE_CANDIDATES: 60                // 1 hour - user-specific data should refresh more often
  };

  /**
   * Import candidates from Google Civic API for a specific address
   */
  static async importCandidatesForAddress(address: string): Promise<{
    imported: number;
    updated: number;
    errors: string[];
  }> {
    if (!this.googleCivicApiKey) {
      logger.warn('Google Civic API key not configured');
      return { imported: 0, updated: 0, errors: ['Google Civic API key not configured'] };
    }

    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    try {
      // Generate cache key for this address
      const cacheKey = ApiCacheService.generateGeoKey(
        address.split(' ').pop() || '', // Extract ZIP if possible
        'US', // Default state for national lookup
        'candidates'
      );

      // Check cache first (30 day TTL for candidate data)
      const cached = await ApiCacheService.get('google_civic_candidates', cacheKey);
      if (cached) {
        logger.info('Using cached Google Civic candidate data', { 
          address, 
          cacheKey,
          cacheDurationDays: this.CACHE_DURATIONS.GOOGLE_CIVIC_CANDIDATES / (24 * 60)
        });
        return this.processCachedCandidateData(cached);
      }

      const encodedAddress = encodeURIComponent(address);
      const url = `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodedAddress}&key=${this.googleCivicApiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Civic API error: ${response.status}`);
      }

      const data = await response.json() as GoogleCivicResponse;
      
      // Cache the raw response for 30 days
      await ApiCacheService.set(
        'google_civic_candidates', 
        cacheKey, 
        data, 
        this.CACHE_DURATIONS.GOOGLE_CIVIC_CANDIDATES
      );
      
      if (!data.contests) {
        return { imported: 0, updated: 0, errors: ['No contests found for address'] };
      }

      // Process each contest and its candidates
      for (const contest of data.contests) {
        try {
          // Map Google Civic office levels to our system
          const officeLevel = this.mapGoogleCivicLevel(contest.level);
          
          // Find or create corresponding office
          const office = await this.findOrCreateOffice(
            contest.office,
            officeLevel,
            contest.district?.name,
            data.election
          );

          if (!office) {
            errors.push(`Could not create office for ${contest.office}`);
            continue;
          }

          // Process each candidate in the contest
          for (const candidate of contest.candidates) {
            try {
              const result = await this.importSingleCandidate(
                candidate,
                office.id,
                data.election.id
              );
              
              if (result.imported) imported++;
              if (result.updated) updated++;
              
            } catch (candidateError) {
              errors.push(`Failed to import ${candidate.name}: ${candidateError}`);
            }
          }
          
        } catch (contestError) {
          errors.push(`Failed to process contest ${contest.office}: ${contestError}`);
        }
      }

      logger.info('Google Civic import completed', {
        address,
        imported,
        updated,
        errorCount: errors.length
      });

      return { imported, updated, errors };

    } catch (error) {
      logger.error('Google Civic import failed', { address, error });
      return { 
        imported: 0, 
        updated: 0, 
        errors: [`API request failed: ${error}`] 
      };
    }
  }

  /**
   * Import single candidate from Google Civic data
   */
  private static async importSingleCandidate(
    candidateData: GoogleCivicCandidate,
    officeId: string,
    electionId: string
  ): Promise<{ imported: boolean; updated: boolean }> {
    // Check if candidate already exists
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        AND: [
          { name: candidateData.name },
          { officeId },
          { dataSource: 'GOOGLE_CIVIC' }
        ]
      }
    });

    const candidateRecord = {
      name: candidateData.name,
      party: candidateData.party || null,
      campaignWebsite: candidateData.candidateUrl || null,
      campaignEmail: candidateData.email || null,
      campaignPhone: candidateData.phone || null,
      externalPhotoUrl: candidateData.photoUrl || null,
      isExternallySourced: true,
      dataSource: 'GOOGLE_CIVIC',
      googleCivicId: `${electionId}-${candidateData.name}`,
      lastExternalSync: new Date(),
      externalDataConfidence: 0.8, // High confidence for official Google data
      officeId
    };

    if (existingCandidate) {
      // Update existing external candidate
      await prisma.candidate.update({
        where: { id: existingCandidate.id },
        data: candidateRecord
      });
      return { imported: false, updated: true };
    } else {
      // Create new external candidate
      await prisma.candidate.create({
        data: candidateRecord
      });
      return { imported: true, updated: false };
    }
  }

  /**
   * Map Google Civic office levels to our system
   */
  private static mapGoogleCivicLevel(levels: string[]): OfficeLevel {
    if (!levels || levels.length === 0) return OfficeLevel.LOCAL;
    
    const level = levels[0].toLowerCase();
    
    if (level.includes('federal') || level.includes('country')) return OfficeLevel.FEDERAL;
    if (level.includes('state') || level.includes('statewide')) return OfficeLevel.STATE;
    if (level.includes('municipal') || level.includes('city')) return OfficeLevel.MUNICIPAL;
    if (level.includes('local') || level.includes('county') || level.includes('regional')) return OfficeLevel.LOCAL;
    
    return OfficeLevel.LOCAL; // Default
  }

  /**
   * Find or create office for external candidate
   */
  private static async findOrCreateOffice(
    title: string,
    level: OfficeLevel,
    district: string | undefined,
    election: { id: string; name: string; electionDay: string }
  ) {
    // Try to find existing office
    let office = await prisma.office.findFirst({
      where: {
        title,
        level,
        state: 'US',
        district: district || null
      }
    });

    if (!office) {
      // Find or create election
      let electionRecord = await prisma.election.findFirst({
        where: {
          name: election.name,
          date: new Date(election.electionDay)
        }
      });

      if (!electionRecord) {
        electionRecord = await prisma.election.create({
          data: {
            name: election.name,
            type: 'GENERAL',
            level: level as ElectionLevel,
            date: new Date(election.electionDay),
            state: 'US', // Will be refined later
            isActive: true
          }
        });
      }

      // Create office
      office = await prisma.office.create({
        data: {
          title,
          level: level,
          state: 'US', // Will be refined with actual state data
          district: district || null,
          electionId: electionRecord.id
        }
      });
    }

    return office;
  }

  /**
   * Bulk import candidates for all ZIP codes in database
   */
  static async bulkImportFromUserLocations(): Promise<{
    addressesProcessed: number;
    totalImported: number;
    totalUpdated: number;
    errors: string[];
  }> {
    // Get unique ZIP codes from users
    const userLocations = await prisma.user.findMany({
      where: {
        zipCode: { not: null },
        state: { not: null }
      },
      select: {
        city: true,
        state: true,
        zipCode: true
      },
      distinct: ['zipCode', 'state']
    });

    let totalImported = 0;
    let totalUpdated = 0;
    const allErrors: string[] = [];
    let processed = 0;

    for (const location of userLocations) {
      if (!location.zipCode || !location.state) continue;

      const address = `${location.city || ''} ${location.state} ${location.zipCode}`.trim();
      
      try {
        const result = await this.importCandidatesForAddress(address);
        totalImported += result.imported;
        totalUpdated += result.updated;
        allErrors.push(...result.errors);
        processed++;

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        allErrors.push(`Failed to process ${address}: ${error}`);
      }
    }

    logger.info('Bulk candidate import completed', {
      addressesProcessed: processed,
      totalImported,
      totalUpdated,
      errorCount: allErrors.length
    });

    return {
      addressesProcessed: processed,
      totalImported,
      totalUpdated,
      errors: allErrors
    };
  }

  /**
   * Allow user to claim an external candidate profile
   */
  static async claimCandidateProfile(
    userId: string,
    candidateId: string,
    verificationData?: {
      legalName: string;
      email: string;
      phone: string;
    }
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { user: true }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    if (!candidate.isExternallySourced) {
      throw new Error('This candidate was not externally sourced');
    }

    if (candidate.isClaimed) {
      throw new Error('This candidate profile has already been claimed');
    }

    // Update candidate with claiming user
    const updatedCandidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        userId,
        isClaimed: true,
        claimedBy: userId,
        claimedAt: new Date(),
        verificationStatus: 'PENDING_IDENTITY_VERIFICATION', // Start verification process
        // Merge verification data if provided
        ...(verificationData && {
          campaignEmail: verificationData.email,
          campaignPhone: verificationData.phone
        })
      }
    });

    // Update user's political profile type
    await prisma.user.update({
      where: { id: userId },
      data: {
        politicalProfileType: 'CANDIDATE'
      }
    });

    logger.info('Candidate profile claimed', {
      candidateId,
      userId,
      candidateName: candidate.name,
      dataSource: candidate.dataSource
    });

    return updatedCandidate;
  }

  /**
   * Get unclaimed candidates that match a user's name
   */
  static async getClaimableCandidates(userId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        city: true,
        state: true,
        zipCode: true
      }
    });

    if (!user) return [];

    const fullName = `${user.firstName} ${user.lastName}`;
    
    // Find unclaimed external candidates with similar names in user's area
    const potentialMatches = await prisma.candidate.findMany({
      where: {
        AND: [
          { isExternallySourced: true },
          { isClaimed: false },
          { 
            OR: [
              { name: { contains: user.firstName, mode: 'insensitive' } },
              { name: { contains: user.lastName, mode: 'insensitive' } },
              { name: { contains: fullName, mode: 'insensitive' } }
            ]
          },
          {
            office: {
              OR: [
                { state: user.state },
                { jurisdiction: user.city }
              ]
            }
          }
        ]
      },
      include: {
        office: {
          include: {
            election: true
          }
        }
      },
      orderBy: {
        externalDataConfidence: 'desc'
      }
    });

    // Calculate name similarity scores
    return potentialMatches.map(candidate => ({
      ...candidate,
      nameSimilarity: this.calculateNameSimilarity(fullName, candidate.name),
      isExactMatch: candidate.name.toLowerCase() === fullName.toLowerCase()
    })).sort((a, b) => b.nameSimilarity - a.nameSimilarity);
  }

  /**
   * Process cached candidate data from ApiCacheService
   */
  private static async processCachedCandidateData(cachedData: GoogleCivicResponse): Promise<{
    imported: number;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let imported = 0;
    let updated = 0;

    if (!cachedData.contests) {
      return { imported: 0, updated: 0, errors: ['No contests in cached data'] };
    }

    // Process cached data same way as fresh API data
    for (const contest of cachedData.contests) {
      try {
        const officeLevel = this.mapGoogleCivicLevel(contest.level);
        
        const office = await this.findOrCreateOffice(
          contest.office,
          officeLevel,
          contest.district?.name,
          {
            id: 'cached-election',
            name: 'Cached Election Data',
            electionDay: new Date().toISOString().split('T')[0]
          }
        );

        if (!office) {
          errors.push(`Could not create office for ${contest.office}`);
          continue;
        }

        for (const candidate of contest.candidates) {
          try {
            const result = await this.importSingleCandidate(
              candidate,
              office.id,
              'cached-election'
            );
            
            if (result.imported) imported++;
            if (result.updated) updated++;
            
          } catch (candidateError) {
            errors.push(`Failed to import cached ${candidate.name}: ${candidateError}`);
          }
        }
        
      } catch (contestError) {
        errors.push(`Failed to process cached contest ${contest.office}: ${contestError}`);
      }
    }

    return { imported, updated, errors };
  }

  /**
   * Calculate simple name similarity score
   */
  private static calculateNameSimilarity(userFullName: string, candidateName: string): number {
    const user = userFullName.toLowerCase().split(' ');
    const candidate = candidateName.toLowerCase().split(' ');
    
    let matches = 0;
    let total = Math.max(user.length, candidate.length);
    
    for (const userPart of user) {
      if (candidate.some(candidatePart => 
        candidatePart.includes(userPart) || userPart.includes(candidatePart)
      )) {
        matches++;
      }
    }
    
    return matches / total;
  }

  /**
   * Get externally sourced candidates for search with caching
   */
  static async searchExternalCandidates(searchTerm: string, limit: number = 10) {
    // Generate cache key for search
    const cacheKey = `search_${Buffer.from(searchTerm.toLowerCase()).toString('base64').substring(0, 20)}_${limit}`;
    
    // Check cache first (3 day TTL for search results)
    const cached = await ApiCacheService.get('candidate_search', cacheKey);
    if (cached) {
      logger.debug('Using cached search results', { searchTerm, cacheKey });
      return cached;
    }

    const results = await prisma.candidate.findMany({
      where: {
        AND: [
          { isExternallySourced: true },
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { party: { contains: searchTerm, mode: 'insensitive' } },
              { office: { title: { contains: searchTerm, mode: 'insensitive' } } }
            ]
          }
        ]
      },
      include: {
        office: {
          include: {
            election: true
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            verified: true
          }
        }
      },
      take: limit,
      orderBy: [
        { isClaimed: 'desc' }, // Claimed candidates first
        { externalDataConfidence: 'desc' },
        { name: 'asc' }
      ]
    });

    // Cache the results for 3 days
    await ApiCacheService.set(
      'candidate_search',
      cacheKey,
      results,
      this.CACHE_DURATIONS.CANDIDATE_SEARCH
    );

    return results;
  }

  /**
   * Sync external data for existing candidates
   */
  static async syncExternalData(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

    const staleCandidates = await prisma.candidate.findMany({
      where: {
        AND: [
          { isExternallySourced: true },
          {
            OR: [
              { lastExternalSync: null },
              { lastExternalSync: { lt: staleThreshold } }
            ]
          }
        ]
      },
      take: 50 // Limit for rate limiting
    });

    logger.info(`Syncing ${staleCandidates.length} stale external candidates`);

    for (const candidate of staleCandidates) {
      try {
        // Re-fetch from original source and update
        if (candidate.dataSource === 'GOOGLE_CIVIC' && candidate.googleCivicId) {
          // Would re-query Google Civic API
          await prisma.candidate.update({
            where: { id: candidate.id },
            data: { lastExternalSync: new Date() }
          });
        }
      } catch (error) {
        logger.error(`Failed to sync candidate ${candidate.id}`, { error });
      }
    }
  }

  /**
   * Health check for external APIs
   */
  static async healthCheck(): Promise<{
    googleCivic: { status: string; configured: boolean };
    fec: { status: string; configured: boolean };
  }> {
    const result = {
      googleCivic: { status: 'unknown', configured: !!this.googleCivicApiKey },
      fec: { status: 'unknown', configured: !!this.fecApiKey }
    };

    // Test Google Civic API with a simple request
    if (this.googleCivicApiKey) {
      try {
        const testUrl = `https://www.googleapis.com/civicinfo/v2/elections?key=${this.googleCivicApiKey}`;
        const response = await fetch(testUrl);
        result.googleCivic.status = response.ok ? 'healthy' : 'error';
      } catch {
        result.googleCivic.status = 'error';
      }
    }

    // Test FEC API if configured
    if (this.fecApiKey) {
      try {
        const testUrl = `https://api.open.fec.gov/v1/candidates/?api_key=${this.fecApiKey}&cycle=2024&per_page=1`;
        const response = await fetch(testUrl);
        result.fec.status = response.ok ? 'healthy' : 'error';
      } catch {
        result.fec.status = 'error';
      }
    }

    return result;
  }
}

export const externalCandidateService = new ExternalCandidateService();