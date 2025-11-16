import { prisma } from '../lib/prisma';
;
import { emailService } from './emailService';
import { logger } from './logger';

// Using singleton prisma from lib/prisma.ts

export interface InquiryData {
  candidateId: string;
  inquirerId?: string; // null for anonymous
  subject: string;
  content: string;
  category?: string;
  isAnonymous?: boolean;
  contactEmail?: string;
  contactName?: string;
  policyTopic?: string;
  specificQuestion?: string;
}

export interface ResponseData {
  inquiryId: string;
  responderId: string;
  content: string;
  responseType?: 'DIRECT' | 'PUBLIC_QA' | 'POLICY_STATEMENT' | 'REFERRAL';
  isPublic?: boolean;
  isFromCandidate?: boolean;
}

export interface PublicQAData {
  candidateId: string;
  question: string;
  answer: string;
  category?: string;
  sourceInquiryId?: string;
}

export class CandidateInboxService {
  
  /**
   * Initialize candidate inbox (automatically created when candidate registers)
   */
  static async createInbox(candidateId: string, settings?: {
    allowPublicQ?: boolean;
    autoResponse?: string;
    staffEmails?: string[];
    categories?: string[];
  }): Promise<any> {
    try {
      console.log(`📬 Creating inbox for candidate ${candidateId}`);

      const inbox = await prisma.candidateInbox.create({
        data: {
          candidateId,
          allowPublicQ: settings?.allowPublicQ ?? true,
          autoResponse: settings?.autoResponse,
          staffEmails: settings?.staffEmails || [],
          categories: settings?.categories || [
            'GENERAL', 'HEALTHCARE', 'EDUCATION', 'ECONOMY', 
            'ENVIRONMENT', 'INFRASTRUCTURE'
          ]
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              campaignEmail: true
            }
          }
        }
      });

      return inbox;

    } catch (error) {
      console.error(`Failed to create inbox for candidate ${candidateId}:`, error);
      throw new Error('Failed to create candidate inbox');
    }
  }

  /**
   * Submit inquiry to candidate
   */
  static async submitInquiry(inquiryData: InquiryData): Promise<any> {
    try {
      console.log(`📝 Submitting inquiry to candidate ${inquiryData.candidateId}`);

      // Validate candidate exists and has active inbox
      const candidate = await prisma.candidate.findUnique({
        where: { id: inquiryData.candidateId },
        include: {
          inbox: true,
          office: {
            include: {
              election: true
            }
          }
        }
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      if (!candidate.inbox?.isActive) {
        throw new Error('Candidate inbox is not accepting inquiries');
      }

      // Create the inquiry
      const inquiry = await prisma.politicalInquiry.create({
        data: {
          candidateId: inquiryData.candidateId,
          inquirerId: inquiryData.inquirerId || null,
          subject: inquiryData.subject,
          content: inquiryData.content,
          category: inquiryData.category as any || 'GENERAL',
          isAnonymous: inquiryData.isAnonymous || false,
          contactEmail: inquiryData.contactEmail,
          contactName: inquiryData.contactName,
          policyTopic: inquiryData.policyTopic,
          specificQuestion: inquiryData.specificQuestion,
          priority: this.determinePriority(inquiryData.content, inquiryData.subject)
        },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              campaignEmail: true
            }
          },
          inquirer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      // Send auto-response if configured
      if (candidate.inbox.autoResponse) {
        await this.sendAutoResponse(inquiry.id, candidate.inbox.autoResponse);
      }

      // Notify staff via email
      await this.notifyStaff(candidate.inbox, inquiry);

      console.log(`✅ Inquiry submitted successfully: ${inquiry.id}`);
      return inquiry;

    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      throw error;
    }
  }

  /**
   * Get candidate inbox with inquiries
   */
  static async getCandidateInbox(candidateId: string, userId: string, filters?: {
    status?: string[];
    category?: string[];
    priority?: string[];
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      // Verify user has access to this inbox
      const hasAccess = await this.verifyInboxAccess(candidateId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to candidate inbox');
      }

      const { status, category, priority, limit = 20, offset = 0 } = filters || {};

      const where: any = {
        candidateId
      };

      if (status?.length) {
        where.status = { in: status };
      }

      if (category?.length) {
        where.category = { in: category };
      }

      if (priority?.length) {
        where.priority = { in: priority };
      }

      const [inquiries, totalCount, inbox] = await Promise.all([
        prisma.politicalInquiry.findMany({
          where,
          include: {
            inquirer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
              }
            },
            responses: {
              include: {
                responder: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        username: true
                      }
                    }
                  }
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            },
            assignedStaff: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    username: true
                  }
                }
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: limit
        }),

        prisma.politicalInquiry.count({ where }),

        prisma.candidateInbox.findUnique({
          where: { candidateId },
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
                party: true
              }
            },
            staffMembers: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true
                  }
                }
              }
            }
          }
        })
      ]);

      return {
        inbox,
        inquiries,
        totalCount,
        hasMore: totalCount > offset + limit,
        stats: await this.getInboxStats(candidateId)
      };

    } catch (error) {
      console.error(`Failed to get candidate inbox ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Respond to inquiry
   */
  static async respondToInquiry(responseData: ResponseData): Promise<any> {
    try {
      console.log(`💬 Responding to inquiry ${responseData.inquiryId}`);

      const inquiry = await prisma.politicalInquiry.findUnique({
        where: { id: responseData.inquiryId },
        include: {
          candidate: true,
          inquirer: true
        }
      });

      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      // Create response
      const response = await prisma.inquiryResponse.create({
        data: {
          inquiryId: responseData.inquiryId,
          responderId: responseData.responderId,
          content: responseData.content,
          responseType: responseData.responseType as any || 'DIRECT',
          isPublic: responseData.isPublic || false,
          isFromCandidate: responseData.isFromCandidate || false
        },
        include: {
          responder: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  username: true
                }
              }
            }
          }
        }
      });

      // Update inquiry status
      await prisma.politicalInquiry.update({
        where: { id: responseData.inquiryId },
        data: {
          status: 'RESOLVED',
          respondedAt: new Date()
        }
      });

      // If response type is PUBLIC_QA, create public Q&A entry
      if (responseData.responseType === 'PUBLIC_QA' && responseData.isPublic) {
        await this.convertToPublicQA(responseData.inquiryId, inquiry.subject, responseData.content);
      }

      // Send email notification to inquirer if not anonymous
      if (inquiry.inquirer && !inquiry.isAnonymous) {
        await this.notifyInquirer(inquiry, response);
      } else if (inquiry.contactEmail && inquiry.isAnonymous) {
        await this.notifyAnonymousInquirer(inquiry, response);
      }

      console.log(`✅ Response sent successfully: ${response.id}`);
      return response;

    } catch (error) {
      console.error('Failed to respond to inquiry:', error);
      throw error;
    }
  }

  /**
   * Convert inquiry to public Q&A
   */
  static async convertToPublicQA(inquiryId: string, question: string, answer: string): Promise<any> {
    try {
      const inquiry = await prisma.politicalInquiry.findUnique({
        where: { id: inquiryId },
        include: { candidate: true }
      });

      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      const publicQA = await prisma.publicQA.create({
        data: {
          candidateId: inquiry.candidateId,
          question,
          answer,
          category: inquiry.category,
          sourceInquiryId: inquiryId,
          isVisible: true
        }
      });

      console.log(`📢 Created public Q&A: ${publicQA.id}`);
      return publicQA;

    } catch (error) {
      console.error('Failed to convert to public Q&A:', error);
      throw error;
    }
  }

  /**
   * Get public Q&A for candidate
   */
  static async getPublicQA(candidateId: string, filters?: {
    category?: string[];
    limit?: number;
    offset?: number;
    pinned?: boolean;
  }): Promise<any> {
    try {
      const { category, limit = 20, offset = 0, pinned } = filters || {};

      const where: any = {
        candidateId,
        isVisible: true
      };

      if (category?.length) {
        where.category = { in: category };
      }

      if (pinned !== undefined) {
        where.isPinned = pinned;
      }

      const [qas, totalCount] = await Promise.all([
        prisma.publicQA.findMany({
          where,
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
                party: true
              }
            },
            votes: true
          },
          orderBy: [
            { isPinned: 'desc' },
            { upvotes: 'desc' },
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: limit
        }),

        prisma.publicQA.count({ where })
      ]);

      return {
        qas,
        totalCount,
        hasMore: totalCount > offset + limit
      };

    } catch (error) {
      console.error(`Failed to get public Q&A for candidate ${candidateId}:`, error);
      throw error;
    }
  }

  /**
   * Add staff member to candidate inbox
   */
  static async addStaffMember(candidateId: string, userId: string, staffData: {
    role: string;
    permissions: string[];
    addedBy: string;
  }): Promise<any> {
    try {
      // Verify the person adding has MANAGE_STAFF permission
      const hasPermission = await this.verifyStaffPermission(candidateId, staffData.addedBy, 'MANAGE_STAFF');
      if (!hasPermission) {
        throw new Error('Permission denied: Cannot manage staff');
      }

      const inbox = await prisma.candidateInbox.findUnique({
        where: { candidateId }
      });

      if (!inbox) {
        throw new Error('Candidate inbox not found');
      }

      const staffMember = await prisma.candidateStaff.create({
        data: {
          inboxId: inbox.id,
          userId,
          role: staffData.role as any,
          permissions: staffData.permissions as any[]
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              email: true
            }
          }
        }
      });

      console.log(`👥 Added staff member ${userId} to candidate ${candidateId}`);
      return staffMember;

    } catch (error) {
      console.error('Failed to add staff member:', error);
      throw error;
    }
  }

  // Private helper methods

  private static determinePriority(content: string, subject: string): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    const urgentKeywords = ['urgent', 'emergency', 'immediately', 'asap', 'crisis'];
    const highKeywords = ['important', 'critical', 'serious', 'concern', 'issue'];
    
    const text = `${subject} ${content}`.toLowerCase();
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'URGENT';
    }
    
    if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'HIGH';
    }
    
    return 'NORMAL';
  }

  private static async sendAutoResponse(inquiryId: string, autoResponseMessage: string): Promise<void> {
    // This would integrate with email service to send auto-response
    console.log(`📧 Sending auto-response for inquiry ${inquiryId}`);
    // Implementation depends on email service setup
  }

  private static async notifyStaff(inbox: any, inquiry: any): Promise<void> {
    if (inbox.staffEmails.length > 0) {
      console.log(`📧 Notifying ${inbox.staffEmails.length} staff members of new inquiry`);
      // Implementation would send emails to staff members
    }
  }

  private static async notifyInquirer(inquiry: any, response: any): Promise<void> {
    console.log(`📧 Notifying inquirer ${inquiry.inquirer.username} of response`);
    // Implementation would send email notification
  }

  private static async notifyAnonymousInquirer(inquiry: any, response: any): Promise<void> {
    console.log(`📧 Notifying anonymous inquirer at ${inquiry.contactEmail} of response`);
    // Implementation would send email to contactEmail
  }

  private static async verifyInboxAccess(candidateId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is the candidate themselves
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId }
      });

      if (candidate?.userId === userId) {
        return true;
      }

      // Check if user is staff member
      const staffMember = await prisma.candidateStaff.findFirst({
        where: {
          userId,
          inbox: {
            candidateId
          },
          isActive: true
        }
      });

      return !!staffMember;

    } catch (error) {
      console.error('Failed to verify inbox access:', error);
      return false;
    }
  }

  private static async verifyStaffPermission(candidateId: string, userId: string, permission: string): Promise<boolean> {
    try {
      const staffMember = await prisma.candidateStaff.findFirst({
        where: {
          userId,
          inbox: {
            candidateId
          },
          isActive: true
        }
      });

      if (!staffMember) {
        return false;
      }

      return staffMember.permissions.includes(permission as any);

    } catch (error) {
      console.error('Failed to verify staff permission:', error);
      return false;
    }
  }

  private static async getInboxStats(candidateId: string): Promise<any> {
    try {
      const [total, open, inProgress, resolved] = await Promise.all([
        prisma.politicalInquiry.count({
          where: { candidateId }
        }),
        prisma.politicalInquiry.count({
          where: { candidateId, status: 'OPEN' }
        }),
        prisma.politicalInquiry.count({
          where: { candidateId, status: 'IN_PROGRESS' }
        }),
        prisma.politicalInquiry.count({
          where: { candidateId, status: 'RESOLVED' }
        })
      ]);

      return {
        total,
        open,
        inProgress,
        resolved,
        responseRate: total > 0 ? Math.round((resolved / total) * 100) : 0
      };

    } catch (error) {
      console.error('Failed to get inbox stats:', error);
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        responseRate: 0
      };
    }
  }
}