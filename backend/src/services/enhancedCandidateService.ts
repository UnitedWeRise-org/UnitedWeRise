import { Candidate, Photo } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { QwenService } from './qwenService';
import { PhotoService } from './photoService';

// Using singleton prisma from lib/prisma.ts

interface CandidateProfile {
  id: string;
  name: string;
  party?: string;
  isIncumbent: boolean;
  campaignWebsite?: string;
  campaignEmail?: string;
  platformSummary?: string;
  keyIssues: string[];
  isVerified: boolean;
  
  // Enhanced data
  photos: {
    avatar?: Photo;
    campaignHeadshot?: Photo;
    gallery: Photo[];
  };
  
  policyPositions?: {
    issue: string;
    position: string;
    stance: 'for' | 'against' | 'neutral' | 'nuanced';
    confidence: number;
  }[];
  
  office: {
    id: string;
    title: string;
    level: string;
    description?: string;
  };
  
  election: {
    id: string;
    name: string;
    date: Date;
    type: string;
  };
}

interface CandidateComparisonResult {
  candidates: CandidateProfile[];
  comparison: {
    sharedIssues: {
      issue: string;
      positions: {
        candidateId: string;
        candidateName: string;
        position: string;
        stance: string;
        confidence: number;
      }[];
      agreement: 'agree' | 'disagree' | 'mixed' | 'unclear';
      summary: string;
    }[];
    uniqueIssues: {
      candidateId: string;
      candidateName: string;
      issues: {
        issue: string;
        position: string;
        defaultMessage?: string;
      }[];
    }[];
    overallSummary: string;
    generatedAt: Date;
  };
}

export class EnhancedCandidateService {
  
  /**
   * Get enhanced candidate profile with photos and AI-analyzed positions
   */
  static async getCandidateProfile(candidateId: string): Promise<CandidateProfile | null> {
    try {
      console.log(`👤 Loading enhanced profile for candidate ${candidateId}`);

      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId },
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
              avatar: true
            }
          },
          financialData: true,
          endorsements: {
            where: { isPublic: true },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!candidate) {
        return null;
      }

      // Get candidate photos
      const photos = await this.getCandidatePhotos(candidateId);
      
      // Get AI-analyzed policy positions
      let policyPositions = [];
      try {
        console.log('🤖 Analyzing candidate policy positions...');
        policyPositions = await QwenService.analyzeCandidatePositions(candidateId);
      } catch (error) {
        console.warn('Policy position analysis failed, continuing without AI analysis:', error);
      }

      const profile: CandidateProfile = {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party || undefined,
        isIncumbent: candidate.isIncumbent,
        campaignWebsite: candidate.campaignWebsite || undefined,
        campaignEmail: candidate.campaignEmail || undefined,
        platformSummary: candidate.platformSummary || undefined,
        keyIssues: candidate.keyIssues,
        isVerified: candidate.isVerified,
        photos,
        policyPositions,
        office: {
          id: candidate.office.id,
          title: candidate.office.title,
          level: candidate.office.level,
          description: candidate.office.description || undefined
        },
        election: {
          id: candidate.office.election.id,
          name: candidate.office.election.name,
          date: candidate.office.election.date,
          type: candidate.office.election.type
        }
      };

      console.log(`✅ Enhanced profile loaded for ${candidate.name}`);
      return profile;

    } catch (error) {
      console.error(`Failed to load candidate profile ${candidateId}:`, error);
      return null;
    }
  }

  /**
   * Compare multiple candidates using AI-powered analysis
   */
  static async compareCandidates(
    candidateIds: string[],
    officeId?: string
  ): Promise<CandidateComparisonResult | null> {
    try {
      console.log(`🔄 Creating AI-powered comparison of ${candidateIds.length} candidates`);

      if (candidateIds.length < 2) {
        throw new Error('At least 2 candidates required for comparison');
      }

      // Load candidate profiles
      const candidates = await Promise.all(
        candidateIds.map(id => this.getCandidateProfile(id))
      );

      const validCandidates = candidates.filter(c => c !== null) as CandidateProfile[];

      if (validCandidates.length < 2) {
        throw new Error('Could not load enough valid candidate profiles for comparison');
      }

      // Use Qwen3 for intelligent comparison
      let comparison;
      try {
        console.log('🤖 Generating AI-powered candidate comparison...');
        comparison = await QwenService.compareCandidates(
          validCandidates.map(c => c.id),
          officeId
        );
      } catch (error) {
        console.warn('AI comparison failed, generating fallback comparison:', error);
        comparison = this.generateFallbackComparison(validCandidates);
      }

      const result: CandidateComparisonResult = {
        candidates: validCandidates,
        comparison: {
          sharedIssues: comparison.sharedIssues.map(issue => ({
            issue: issue.issue,
            positions: issue.positions.map(pos => {
              const candidate = validCandidates.find(c => c.id === pos.candidateId);
              return {
                candidateId: pos.candidateId,
                candidateName: candidate?.name || 'Unknown',
                position: pos.position,
                stance: pos.stance,
                confidence: pos.confidence
              };
            }),
            agreement: issue.agreement,
            summary: issue.summary
          })),
          uniqueIssues: comparison.uniqueIssues.map(ui => {
            const candidate = validCandidates.find(c => c.id === ui.candidateId);
            return {
              candidateId: ui.candidateId,
              candidateName: candidate?.name || 'Unknown',
              issues: ui.issues
            };
          }),
          overallSummary: comparison.overallSummary,
          generatedAt: new Date()
        }
      };

      console.log(`✅ Comparison complete for ${validCandidates.length} candidates`);
      return result;

    } catch (error) {
      console.error('Candidate comparison failed:', error);
      return null;
    }
  }

  /**
   * Get candidates by office with enhanced data
   */
  static async getCandidatesByOffice(
    officeId: string,
    includeAnalysis: boolean = true
  ): Promise<CandidateProfile[]> {
    try {
      const candidates = await prisma.candidate.findMany({
        where: {
          officeId,
          isWithdrawn: false
        },
        include: {
          office: {
            include: {
              election: true
            }
          }
        },
        orderBy: [
          { isIncumbent: 'desc' },
          { name: 'asc' }
        ]
      });

      const profiles = await Promise.all(
        candidates.map(async candidate => {
          if (includeAnalysis) {
            return await this.getCandidateProfile(candidate.id);
          } else {
            // Return basic profile without AI analysis for performance
            return this.buildBasicProfile(candidate);
          }
        })
      );

      return profiles.filter(p => p !== null) as CandidateProfile[];

    } catch (error) {
      console.error(`Failed to get candidates for office ${officeId}:`, error);
      return [];
    }
  }

  /**
   * Search candidates with enhanced filtering
   */
  static async searchCandidates(params: {
    query?: string;
    state?: string;
    party?: string;
    office?: string;
    isIncumbent?: boolean;
    limit?: number;
  }): Promise<CandidateProfile[]> {
    try {
      const { query, state, party, office, isIncumbent, limit = 20 } = params;

      const where: any = {
        isWithdrawn: false
      };

      if (query) {
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { platformSummary: { contains: query, mode: 'insensitive' } }
        ];
      }

      if (party) {
        where.party = { contains: party, mode: 'insensitive' };
      }

      if (isIncumbent !== undefined) {
        where.isIncumbent = isIncumbent;
      }

      if (state || office) {
        where.office = {};
        if (state) where.office.state = state.toUpperCase();
        if (office) where.office.title = { contains: office, mode: 'insensitive' };
      }

      const candidates = await prisma.candidate.findMany({
        where,
        include: {
          office: {
            include: {
              election: true
            }
          }
        },
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { isIncumbent: 'desc' },
          { name: 'asc' }
        ]
      });

      // Return basic profiles for search results (no AI analysis for performance)
      const profiles = await Promise.all(
        candidates.map(candidate => this.buildBasicProfile(candidate))
      );

      return profiles.filter(p => p !== null) as CandidateProfile[];

    } catch (error) {
      console.error('Candidate search failed:', error);
      return [];
    }
  }

  /**
   * Update candidate policy positions (for candidates updating their own profiles)
   */
  static async updateCandidatePlatform(
    candidateId: string,
    updates: {
      platformSummary?: string;
      keyIssues?: string[];
      campaignWebsite?: string;
      campaignEmail?: string;
    }
  ): Promise<boolean> {
    try {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Updated platform for candidate ${candidateId}`);
      
      // Trigger re-analysis of policy positions
      try {
        await QwenService.analyzeCandidatePositions(candidateId);
        console.log('🤖 Policy positions re-analyzed');
      } catch (error) {
        console.warn('Policy re-analysis failed:', error);
      }

      return true;

    } catch (error) {
      console.error(`Failed to update candidate platform ${candidateId}:`, error);
      return false;
    }
  }

  // Private helper methods

  private static async getCandidatePhotos(candidateId: string) {
    try {
      const photos = await PhotoService.getCandidatePhotos(candidateId);
      
      return {
        avatar: photos.find(p => p.photoType === 'AVATAR') || undefined,
        campaignHeadshot: photos.find(p => p.photoType === 'CAMPAIGN') || undefined,
        gallery: photos.filter(p => p.photoType === 'GALLERY' || p.photoType === 'EVENT')
      };

    } catch (error) {
      console.warn(`Failed to load photos for candidate ${candidateId}:`, error);
      return {
        avatar: undefined,
        campaignHeadshot: undefined,
        gallery: []
      };
    }
  }

  private static async buildBasicProfile(candidate: any): Promise<CandidateProfile> {
    const photos = await this.getCandidatePhotos(candidate.id);
    
    return {
      id: candidate.id,
      name: candidate.name,
      party: candidate.party || undefined,
      isIncumbent: candidate.isIncumbent,
      campaignWebsite: candidate.campaignWebsite || undefined,
      campaignEmail: candidate.campaignEmail || undefined,
      platformSummary: candidate.platformSummary || undefined,
      keyIssues: candidate.keyIssues,
      isVerified: candidate.isVerified,
      photos,
      office: {
        id: candidate.office.id,
        title: candidate.office.title,
        level: candidate.office.level,
        description: candidate.office.description || undefined
      },
      election: {
        id: candidate.office.election.id,
        name: candidate.office.election.name,
        date: candidate.office.election.date,
        type: candidate.office.election.type
      }
    };
  }

  private static generateFallbackComparison(candidates: CandidateProfile[]) {
    // Generate a basic comparison when AI analysis fails
    const sharedIssues = this.findSharedIssues(candidates);
    const uniqueIssues = this.findUniqueIssues(candidates);
    
    return {
      candidates: candidates.map(c => ({ id: c.id, name: c.name, party: c.party })),
      sharedIssues: sharedIssues.map(issue => ({
        issue,
        positions: candidates
          .filter(c => c.keyIssues.some(ki => ki.toLowerCase().includes(issue.toLowerCase())))
          .map(c => ({
            candidateId: c.id,
            position: c.platformSummary || 'No detailed position available',
            stance: 'nuanced' as const,
            confidence: 0.5
          })),
        agreement: 'mixed' as const,
        summary: `Candidates have different approaches to ${issue}.`
      })),
      uniqueIssues: uniqueIssues.map(ui => ({
        candidateId: ui.candidateId,
        issues: ui.issues.map(issue => ({
          issue,
          position: 'Position details not available',
          defaultMessage: QwenService.generateMissingPositionMessage(ui.candidateName, issue, ui.candidateId)
        }))
      })),
      overallSummary: `${candidates.length} candidates are running for this office with varying policy positions.`
    };
  }

  private static findSharedIssues(candidates: CandidateProfile[]): string[] {
    const allIssues = candidates.flatMap(c => c.keyIssues);
    const issueCounts = allIssues.reduce((acc, issue) => {
      const normalized = issue.toLowerCase().trim();
      acc[normalized] = (acc[normalized] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(issueCounts)
      .filter(([_, count]) => count > 1)
      .map(([issue, _]) => issue);
  }

  private static findUniqueIssues(candidates: CandidateProfile[]) {
    const sharedIssues = this.findSharedIssues(candidates);
    
    return candidates.map(candidate => ({
      candidateId: candidate.id,
      candidateName: candidate.name,
      issues: candidate.keyIssues.filter(issue => 
        !sharedIssues.some(shared => 
          issue.toLowerCase().includes(shared.toLowerCase())
        )
      )
    })).filter(ui => ui.issues.length > 0);
  }

  /**
   * Get candidate messaging inbox (for DM system integration)
   */
  static async getCandidateInbox(candidateId: string, userId: string): Promise<any> {
    // This will integrate with the messaging system we'll build next
    // For now, return placeholder
    return {
      candidateId,
      inboxUrl: `/messages/candidate/${candidateId}`,
      canMessage: true,
      messageCount: 0
    };
  }
}