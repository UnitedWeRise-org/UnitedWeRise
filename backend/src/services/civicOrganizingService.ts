/**
 * Civic Organizing Service
 * 
 * Handles petitions, civic events, RSVPs, and signatures
 * Provides geographic search and filtering capabilities
 */

import { Petition, CivicEvent, PetitionSignature, EventRSVP, EventType, EventCategory, IssueCategory, GeographicScope, PetitionType, EventStatus, PetitionStatus, RSVPStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

// Using singleton prisma from lib/prisma.ts

// Types for API requests
interface CreatePetitionRequest {
  title: string;
  description: string;
  petitionType: PetitionType;
  category: IssueCategory;
  geographicScope: GeographicScope;
  targetOfficials: string[];
  signatureGoal: number;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    coordinates?: { lat: number; lon: number };
  };
  expiresAt?: Date;
}

interface CreateEventRequest {
  title: string;
  description: string;
  eventType: EventType;
  category: EventCategory;
  scheduledDate: Date;
  endDate?: Date;
  timeZone?: string;
  location: {
    address: string;
    city: string;
    state: string;
    coordinates?: { lat: number; lon: number };
    venue?: string;
  };
  capacity?: number;
  isVirtual?: boolean;
  virtualLink?: string;
  organizerInfo: {
    name: string;
    contact: string;
    organization?: string;
    website?: string;
  };
  requirements?: string;
  rsvpRequired?: boolean;
  organizationId?: string; // Optional: create event as organization
}

interface CivicSearchFilters {
  category?: IssueCategory;
  eventType?: EventType;
  geographicScope?: GeographicScope;
  proximity?: number; // radius in miles
  coordinates?: { lat: number; lon: number };
  timeframe?: 'week' | 'month' | 'future';
  status?: PetitionStatus | EventStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}

export class CivicOrganizingService {
  
  /**
   * PETITION MANAGEMENT
   */
  
  async createPetition(userId: string, data: CreatePetitionRequest): Promise<Petition> {
    // Validate user location for geographic scope restrictions
    if (data.geographicScope === 'LOCAL' && !data.location) {
      throw new Error('Local petitions require location information');
    }

    const petition = await prisma.petition.create({
      data: {
        title: data.title,
        description: data.description,
        petitionType: data.petitionType,
        category: data.category,
        geographicScope: data.geographicScope,
        targetOfficials: data.targetOfficials,
        signatureGoal: data.signatureGoal,
        location: data.location ? JSON.stringify(data.location) : null,
        expiresAt: data.expiresAt,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            signatures: true
          }
        }
      }
    });

    return petition;
  }

  async signPetition(userId: string, petitionId: string, ipAddress?: string): Promise<PetitionSignature> {
    // Check if user already signed
    const existingSignature = await prisma.petitionSignature.findUnique({
      where: {
        petitionId_userId: {
          petitionId,
          userId
        }
      }
    });

    if (existingSignature) {
      throw new Error('You have already signed this petition');
    }

    // Verify petition is still active
    const petition = await prisma.petition.findUnique({
      where: { id: petitionId }
    });

    if (!petition) {
      throw new Error('Petition not found');
    }

    if (petition.status !== 'ACTIVE') {
      throw new Error('This petition is no longer accepting signatures');
    }

    if (petition.expiresAt && petition.expiresAt < new Date()) {
      throw new Error('This petition has expired');
    }

    // Create signature and update petition count
    const signature = await prisma.$transaction(async (tx) => {
      const newSignature = await tx.petitionSignature.create({
        data: {
          petitionId,
          userId,
          ipAddress,
          isVerified: true // For now, auto-verify. Could add verification workflow later
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      // Update petition signature count
      await tx.petition.update({
        where: { id: petitionId },
        data: {
          currentSignatures: {
            increment: 1
          }
        }
      });

      return newSignature;
    });

    return signature;
  }

  async getPetitions(filters: CivicSearchFilters = {}, page = 1, limit = 20): Promise<{ petitions: Petition[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;
    
    const where: any = {
      status: filters.status || 'ACTIVE'
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.geographicScope) {
      where.geographicScope = filters.geographicScope;
    }

    if (filters.createdAfter) {
      where.createdAt = { gte: filters.createdAfter };
    }

    // Proximity search (simplified - in production would use PostGIS)
    if (filters.proximity && filters.coordinates) {
      // For now, we'll filter by location existence and let frontend handle proximity
      where.location = { not: null };
    }

    const [petitions, total] = await Promise.all([
      prisma.petition.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          _count: {
            select: {
              signatures: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.petition.count({ where })
    ]);

    // Calculate progress for each petition
    const petitionsWithProgress = petitions.map(petition => ({
      ...petition,
      progress: petition.signatureGoal > 0 ? 
        Math.min(100, (petition.currentSignatures / petition.signatureGoal) * 100) : 0
    }));

    return {
      petitions: petitionsWithProgress,
      total,
      hasMore: skip + petitions.length < total
    };
  }

  async getPetitionById(id: string): Promise<Petition | null> {
    const petition = await prisma.petition.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: {
            signedAt: 'desc'
          },
          take: 10 // Recent signatures only
        },
        _count: {
          select: {
            signatures: true
          }
        }
      }
    });

    if (petition) {
      (petition as any).progress = petition.signatureGoal > 0 ? 
        Math.min(100, (petition.currentSignatures / petition.signatureGoal) * 100) : 0;
    }

    return petition;
  }

  /**
   * EVENT MANAGEMENT
   */
  
  async createEvent(userId: string, data: CreateEventRequest): Promise<CivicEvent> {
    const event = await prisma.civicEvent.create({
      data: {
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        category: data.category,
        scheduledDate: data.scheduledDate,
        endDate: data.endDate,
        timeZone: data.timeZone,
        location: JSON.stringify(data.location),
        capacity: data.capacity,
        isVirtual: data.isVirtual,
        virtualLink: data.virtualLink,
        organizerInfo: JSON.stringify(data.organizerInfo),
        requirements: data.requirements,
        rsvpRequired: data.rsvpRequired || false,
        createdBy: userId,
        organizationId: data.organizationId, // Optional org ownership
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        _count: {
          select: {
            rsvps: true
          }
        }
      }
    });

    return event;
  }

  async rsvpToEvent(userId: string, eventId: string, status: RSVPStatus = 'ATTENDING'): Promise<EventRSVP> {
    // Check if user already RSVP'd
    const existingRSVP = await prisma.eventRSVP.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (existingRSVP) {
      // Update existing RSVP
      const updatedRSVP = await prisma.eventRSVP.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          rsvpStatus: status,
          rsvpedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      // Update event RSVP count
      await this.updateEventRSVPCount(eventId);

      return updatedRSVP;
    }

    // Verify event exists and is accepting RSVPs
    const event = await prisma.civicEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status === 'CANCELLED') {
      throw new Error('Cannot RSVP to cancelled event');
    }

    if (event.scheduledDate < new Date()) {
      throw new Error('Cannot RSVP to past event');
    }

    // Check capacity
    if (event.capacity && event.currentRSVPs >= event.capacity && status === 'ATTENDING') {
      throw new Error('Event is at capacity');
    }

    // Create RSVP and update event count
    const rsvp = await prisma.$transaction(async (tx) => {
      const newRSVP = await tx.eventRSVP.create({
        data: {
          eventId,
          userId,
          rsvpStatus: status
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      // Update event RSVP count
      if (status === 'ATTENDING') {
        await tx.civicEvent.update({
          where: { id: eventId },
          data: {
            currentRSVPs: {
              increment: 1
            }
          }
        });
      }

      return newRSVP;
    });

    return rsvp;
  }

  async getEvents(filters: CivicSearchFilters = {}, page = 1, limit = 20): Promise<{ events: CivicEvent[]; total: number; hasMore: boolean }> {
    const skip = (page - 1) * limit;
    
    const where: any = {
      status: filters.status || 'SCHEDULED',
      isPublic: true
    };

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    // Time filtering
    if (filters.timeframe) {
      const now = new Date();
      let dateFilter: any = { gte: now }; // Future events by default

      if (filters.timeframe === 'week') {
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        dateFilter = { gte: now, lte: nextWeek };
      } else if (filters.timeframe === 'month') {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        dateFilter = { gte: now, lte: nextMonth };
      }

      where.scheduledDate = dateFilter;
    } else {
      // Default to future events only
      where.scheduledDate = { gte: new Date() };
    }

    // Proximity search (simplified)
    if (filters.proximity && filters.coordinates) {
      // For now, we'll filter by location existence and let frontend handle proximity
      where.location = { not: null };
    }

    const [events, total] = await Promise.all([
      prisma.civicEvent.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          _count: {
            select: {
              rsvps: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.civicEvent.count({ where })
    ]);

    return {
      events,
      total,
      hasMore: skip + events.length < total
    };
  }

  async getEventById(id: string): Promise<CivicEvent | null> {
    const event = await prisma.civicEvent.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        rsvps: {
          where: {
            rsvpStatus: 'ATTENDING'
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: {
            rsvpedAt: 'desc'
          },
          take: 20 // Recent attendees
        },
        _count: {
          select: {
            rsvps: true
          }
        }
      }
    });

    return event;
  }

  /**
   * UTILITY METHODS
   */

  private async updateEventRSVPCount(eventId: string): Promise<void> {
    const attendingCount = await prisma.eventRSVP.count({
      where: {
        eventId,
        rsvpStatus: 'ATTENDING'
      }
    });

    await prisma.civicEvent.update({
      where: { id: eventId },
      data: {
        currentRSVPs: attendingCount
      }
    });
  }

  async searchCivic(
    query: string,
    filters: CivicSearchFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ petitions: any[]; events: any[]; total: number }> {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    // Build search conditions
    const petitionWhere: any = {
      status: 'ACTIVE',
      OR: searchTerms.map(term => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { targetOfficials: { has: term } }
        ]
      }))
    };

    const eventWhere: any = {
      status: 'SCHEDULED',
      isPublic: true,
      scheduledDate: { gte: new Date() },
      OR: searchTerms.map(term => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } }
        ]
      }))
    };

    // Apply filters
    if (filters.category) {
      petitionWhere.category = filters.category;
    }
    if (filters.eventType) {
      eventWhere.eventType = filters.eventType;
    }

    const [petitions, events] = await Promise.all([
      prisma.petition.findMany({
        where: petitionWhere,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              signatures: true
            }
          }
        },
        take: Math.ceil(limit / 2),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.civicEvent.findMany({
        where: eventWhere,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              rsvps: true
            }
          }
        },
        take: Math.ceil(limit / 2),
        orderBy: { scheduledDate: 'asc' }
      })
    ]);

    return {
      petitions,
      events,
      total: petitions.length + events.length
    };
  }

  /**
   * USER ACTIVITY
   */

  async getUserPetitions(userId: string): Promise<Petition[]> {
    return prisma.petition.findMany({
      where: { createdBy: userId },
      include: {
        _count: {
          select: {
            signatures: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUserEvents(userId: string): Promise<CivicEvent[]> {
    return prisma.civicEvent.findMany({
      where: { createdBy: userId },
      include: {
        _count: {
          select: {
            rsvps: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });
  }

  async getUserSignedPetitions(userId: string): Promise<any[]> {
    const signatures = await prisma.petitionSignature.findMany({
      where: { userId },
      include: {
        petition: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            _count: {
              select: {
                signatures: true
              }
            }
          }
        }
      },
      orderBy: { signedAt: 'desc' }
    });

    return signatures.map(sig => ({
      ...sig.petition,
      signedAt: sig.signedAt
    }));
  }

  async getUserRSVPedEvents(userId: string): Promise<any[]> {
    const rsvps = await prisma.eventRSVP.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            },
            _count: {
              select: {
                rsvps: true
              }
            }
          }
        }
      },
      orderBy: { rsvpedAt: 'desc' }
    });

    return rsvps.map(rsvp => ({
      ...rsvp.event,
      rsvpStatus: rsvp.rsvpStatus,
      rsvpedAt: rsvp.rsvpedAt
    }));
  }
}

export default new CivicOrganizingService();