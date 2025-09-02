import { prisma } from '../lib/prisma';
import { ReportReason, ReportTargetType, ReportPriority } from '@prisma/client';
import { azureOpenAI } from './azureOpenAIService';

interface GeographicInfo {
  district: string;
  state: string;
  county?: string;
  officeLevel: string; // FEDERAL, STATE, COUNTY, MUNICIPAL, LOCAL
}

export class CandidateReportService {
  /**
   * Calculate geographic weight based on reporter location vs candidate district
   */
  static calculateGeographicWeight(
    reporterInfo: GeographicInfo,
    candidateInfo: GeographicInfo
  ): number {
    const { officeLevel } = candidateInfo;

    // Presidential candidates - all reports have equal weight nationwide
    if (officeLevel === 'PRESIDENTIAL') {
      return 1.0;
    }

    // US Senate - state-level weighting
    if (officeLevel === 'FEDERAL' && candidateInfo.district?.includes('Senate')) {
      if (reporterInfo.state === candidateInfo.state) {
        return 1.0; // Full weight for same state
      }
      return 0.2; // Minimal weight for out-of-state
    }

    // US House - district-level weighting
    if (officeLevel === 'FEDERAL' && candidateInfo.district?.includes('CD')) {
      if (reporterInfo.district === candidateInfo.district) {
        return 1.0; // Full weight for same district
      }
      if (reporterInfo.state === candidateInfo.state) {
        return 0.5; // Half weight for same state
      }
      return 0.2; // Minimal weight for out-of-state
    }

    // State-level offices (Governor, Lt. Governor, Attorney General)
    if (officeLevel === 'STATE') {
      if (reporterInfo.state === candidateInfo.state) {
        return 1.0; // Full weight for same state
      }
      return 0.2; // Minimal weight for out-of-state
    }

    // Regional offices (State House, State Senate)
    if (officeLevel === 'REGIONAL') {
      if (reporterInfo.district === candidateInfo.district) {
        return 1.0; // Full weight for same district
      }
      if (reporterInfo.county === candidateInfo.county) {
        return 0.7; // High weight for same county
      }
      if (reporterInfo.state === candidateInfo.state) {
        return 0.4; // Moderate weight for same state
      }
      return 0.2; // Minimal weight for out-of-state
    }

    // Local offices (Mayor, City Council, School Board)
    if (officeLevel === 'LOCAL') {
      if (reporterInfo.district === candidateInfo.district) {
        return 1.0; // Full weight for same district
      }
      if (reporterInfo.county === candidateInfo.county) {
        return 0.6; // Moderate weight for same county
      }
      if (reporterInfo.state === candidateInfo.state) {
        return 0.3; // Low weight for same state
      }
      return 0.1; // Very minimal weight for out-of-state
    }

    // Default weighting
    return 0.5;
  }

  /**
   * Assess urgency of candidate report using AI
   */
  static async assessReportUrgency(
    reason: ReportReason,
    description: string,
    candidateName: string,
    officeTitle: string
  ): Promise<{
    urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    assessmentScore: number;
    analysisNotes: string;
  }> {
    try {
      const prompt = `
        Analyze this candidate report for urgency and severity:
        
        Candidate: ${candidateName}
        Office: ${officeTitle}
        Report Reason: ${reason}
        Description: ${description}
        
        Consider:
        1. Immediate threats to election integrity
        2. Potential for voter deception
        3. Legal violations
        4. Extremist rhetoric that could incite violence
        5. Scale of potential impact
        
        Respond with JSON format:
        {
          "urgencyLevel": "HIGH|MEDIUM|LOW",
          "assessmentScore": 0-100,
          "analysisNotes": "Brief explanation of assessment"
        }
      `;

      const content = await azureOpenAI.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 200,
        systemMessage: "You are a content moderation specialist analyzing candidate reports for urgency and election integrity concerns."
      });

      const assessment = JSON.parse(content);
      return {
        urgencyLevel: assessment.urgencyLevel || 'LOW',
        assessmentScore: assessment.assessmentScore || 0,
        analysisNotes: assessment.analysisNotes || 'AI assessment completed'
      };
    } catch (error) {
      console.error('AI urgency assessment failed:', error);
      
      // Fallback assessment based on reason
      const highUrgencyReasons = [
        'FRAUDULENT_CANDIDACY',
        'ELECTION_FRAUD',
        'VIOLENCE_THREATS',
        'ILLEGAL_CONTENT'
      ];
      
      const mediumUrgencyReasons = [
        'EXTREMIST_POSITIONS',
        'HATE_SPEECH',
        'CAMPAIGN_VIOLATIONS',
        'MISINFORMATION'
      ];

      let urgencyLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      let assessmentScore = 30;

      if (highUrgencyReasons.includes(reason)) {
        urgencyLevel = 'HIGH';
        assessmentScore = 80;
      } else if (mediumUrgencyReasons.includes(reason)) {
        urgencyLevel = 'MEDIUM';
        assessmentScore = 60;
      }

      return {
        urgencyLevel,
        assessmentScore,
        analysisNotes: 'Automated assessment based on report category (AI unavailable)'
      };
    }
  }

  /**
   * Submit a report for a candidate
   */
  static async submitCandidateReport(
    reporterId: string,
    candidateId: string,
    reason: ReportReason,
    description: string
  ) {
    // Get reporter and candidate information
    const [reporter, candidate] = await Promise.all([
      prisma.user.findUnique({
        where: { id: reporterId },
        select: {
          streetAddress: true,
          city: true,
          state: true,
          zipCode: true
        }
      }),
      prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          office: {
            select: {
              title: true,
              level: true,
              district: true,
              state: true,
              jurisdiction: true
            }
          }
        }
      })
    ]);

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Check for existing report
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType: 'CANDIDATE',
        targetId: candidateId,
        status: { in: ['PENDING', 'IN_REVIEW'] }
      }
    });

    if (existingReport) {
      throw new Error('You have already reported this candidate');
    }

    // Get geographic information
    const reporterDistrict = await this.getUserDistrict(reporter);
    const candidateDistrict = candidate.office.district || '';

    // Calculate geographic weight
    const geographicWeight = this.calculateGeographicWeight(
      {
        district: reporterDistrict,
        state: reporter?.state || '',
        county: reporter?.city || '',
        officeLevel: candidate.office.level
      },
      {
        district: candidateDistrict,
        state: candidate.office.state || '',
        county: candidate.office.jurisdiction || '',
        officeLevel: candidate.office.level
      }
    );

    // AI urgency assessment
    const urgencyAssessment = await this.assessReportUrgency(
      reason,
      description,
      candidate.name,
      candidate.office.title
    );

    // Determine priority based on urgency and weight
    let priority: ReportPriority = 'LOW';
    const weightedScore = urgencyAssessment.assessmentScore * geographicWeight;
    
    if (weightedScore >= 70 || urgencyAssessment.urgencyLevel === 'HIGH') {
      priority = 'URGENT';
    } else if (weightedScore >= 50 || urgencyAssessment.urgencyLevel === 'MEDIUM') {
      priority = 'HIGH';
    } else if (weightedScore >= 30) {
      priority = 'MEDIUM';
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: 'CANDIDATE',
        targetId: candidateId,
        reason,
        description,
        priority,
        reporterDistrict,
        candidateDistrict,
        geographicWeight,
        aiAssessmentScore: urgencyAssessment.assessmentScore,
        aiUrgencyLevel: urgencyAssessment.urgencyLevel,
        aiAnalysisNotes: urgencyAssessment.analysisNotes,
        aiAssessedAt: new Date()
      }
    });

    // Check for brigading patterns
    await this.checkBrigadingPatterns(candidateId);

    return report;
  }

  /**
   * Get user's electoral district based on address
   */
  private static async getUserDistrict(user: any): Promise<string> {
    if (!user?.zipCode) return '';

    const districtMapping = await prisma.addressDistrictMapping.findFirst({
      where: {
        zipCode: user.zipCode,
        state: user.state
      },
      include: {
        district: true
      }
    });

    return districtMapping?.district?.identifier || '';
  }

  /**
   * Check for brigading patterns
   */
  private static async checkBrigadingPatterns(candidateId: string) {
    const recentReports = await prisma.report.findMany({
      where: {
        targetType: 'CANDIDATE',
        targetId: candidateId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        reporterId: true,
        geographicWeight: true,
        createdAt: true
      }
    });

    // Detect suspicious patterns
    const reportsByHour = new Map<number, number>();
    const lowWeightReports = recentReports.filter(r => (r.geographicWeight || 1) < 0.3);

    recentReports.forEach(report => {
      const hour = new Date(report.createdAt).getHours();
      reportsByHour.set(hour, (reportsByHour.get(hour) || 0) + 1);
    });

    // Flag if >10 reports in any hour or >50% are low-weight out-of-district
    const maxReportsPerHour = Math.max(...Array.from(reportsByHour.values()));
    const lowWeightPercentage = lowWeightReports.length / recentReports.length;

    if (maxReportsPerHour > 10 || lowWeightPercentage > 0.5) {
      // Flag for manual review
      await prisma.contentFlag.create({
        data: {
          contentType: 'CANDIDATE',
          contentId: candidateId,
          flagType: 'POTENTIAL_BRIGADING',
          confidence: Math.min(maxReportsPerHour * 10, 100),
          source: 'AUTOMATED',
          details: {
            reason: `Suspicious reporting pattern detected: ${maxReportsPerHour} reports/hour, ${Math.round(lowWeightPercentage * 100)}% out-of-district`,
            maxReportsPerHour,
            lowWeightPercentage,
            detectedAt: new Date()
          }
        }
      });
    }
  }

  /**
   * Get monthly verification due candidates
   */
  static async getCandidatesDueForVerification(): Promise<any[]> {
    const firstMonday = this.getFirstMondayOfMonth();
    const secondMonday = this.getSecondMondayOfMonth();
    const today = new Date();

    return await prisma.candidate.findMany({
      where: {
        OR: [
          { nextVerificationDue: null }, // Never verified
          { nextVerificationDue: { lte: secondMonday } } // Due this month
        ],
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        },
        office: true
      }
    });
  }

  /**
   * Request documents from candidate
   */
  static async requestVerificationDocuments(
    candidateId: string,
    requestedBy: string,
    documentTypes: string[]
  ) {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Create document requests
    const documentRequests = await Promise.all(
      documentTypes.map(type =>
        prisma.candidateVerificationDocument.create({
          data: {
            candidateId,
            documentType: type,
            documentUrl: '', // Will be filled when uploaded
            documentName: `${type}_pending`,
            requestedAt: new Date(),
            requestedBy
          }
        })
      )
    );

    // Update candidate verification status
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        verificationStatus: 'DOCUMENTS_REQUESTED'
      }
    });

    // Send email notification to candidate
    if (candidate.user?.email) {
      // TODO: Implement email notification
      console.log(`Document verification requested for ${candidate.user.email}`);
    }

    return documentRequests;
  }

  /**
   * Helper functions for monthly verification dates
   */
  private static getFirstMondayOfMonth(): Date {
    const date = new Date();
    date.setDate(1);
    while (date.getDay() !== 1) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  private static getSecondMondayOfMonth(): Date {
    const firstMonday = this.getFirstMondayOfMonth();
    const secondMonday = new Date(firstMonday);
    secondMonday.setDate(secondMonday.getDate() + 7);
    return secondMonday;
  }
}

export const candidateReportService = new CandidateReportService();