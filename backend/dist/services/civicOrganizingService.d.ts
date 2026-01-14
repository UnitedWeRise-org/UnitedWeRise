/**
 * Civic Organizing Service
 *
 * Handles petitions, civic events, RSVPs, and signatures
 * Provides geographic search and filtering capabilities
 */
import { Petition, CivicEvent, PetitionSignature, EventRSVP, EventType, EventCategory, IssueCategory, GeographicScope, PetitionType, EventStatus, PetitionStatus, RSVPStatus } from '@prisma/client';
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
        coordinates?: {
            lat: number;
            lon: number;
        };
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
        coordinates?: {
            lat: number;
            lon: number;
        };
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
    organizationId?: string;
}
interface CivicSearchFilters {
    category?: IssueCategory;
    eventType?: EventType;
    geographicScope?: GeographicScope;
    proximity?: number;
    coordinates?: {
        lat: number;
        lon: number;
    };
    timeframe?: 'week' | 'month' | 'future';
    status?: PetitionStatus | EventStatus;
    createdAfter?: Date;
    createdBefore?: Date;
}
export declare class CivicOrganizingService {
    /**
     * PETITION MANAGEMENT
     */
    createPetition(userId: string, data: CreatePetitionRequest): Promise<Petition>;
    signPetition(userId: string, petitionId: string, ipAddress?: string): Promise<PetitionSignature>;
    getPetitions(filters?: CivicSearchFilters, page?: number, limit?: number): Promise<{
        petitions: Petition[];
        total: number;
        hasMore: boolean;
    }>;
    getPetitionById(id: string): Promise<Petition | null>;
    /**
     * EVENT MANAGEMENT
     */
    createEvent(userId: string, data: CreateEventRequest): Promise<CivicEvent>;
    rsvpToEvent(userId: string, eventId: string, status?: RSVPStatus): Promise<EventRSVP>;
    getEvents(filters?: CivicSearchFilters, page?: number, limit?: number): Promise<{
        events: CivicEvent[];
        total: number;
        hasMore: boolean;
    }>;
    getEventById(id: string): Promise<CivicEvent | null>;
    /**
     * UTILITY METHODS
     */
    private updateEventRSVPCount;
    searchCivic(query: string, filters?: CivicSearchFilters, page?: number, limit?: number): Promise<{
        petitions: any[];
        events: any[];
        total: number;
    }>;
    /**
     * USER ACTIVITY
     */
    getUserPetitions(userId: string): Promise<Petition[]>;
    getUserEvents(userId: string): Promise<CivicEvent[]>;
    getUserSignedPetitions(userId: string): Promise<any[]>;
    getUserRSVPedEvents(userId: string): Promise<any[]>;
}
declare const _default: CivicOrganizingService;
export default _default;
//# sourceMappingURL=civicOrganizingService.d.ts.map