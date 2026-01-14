/**
 * Jurisdiction Service
 *
 * Handles H3 cell management for organization jurisdictions.
 * Provides boundary conversion, containment checks, and discovery.
 *
 * @module services/jurisdictionService
 */
import { JurisdictionType } from '@prisma/client';
/**
 * Jurisdiction Service Class
 */
export declare class JurisdictionService {
    /**
     * Convert coordinates to H3 cell at standard resolution
     */
    coordinatesToH3(lat: number, lng: number): string;
    /**
     * Get center coordinates of an H3 cell
     */
    h3ToCoordinates(h3Index: string): {
        lat: number;
        lng: number;
    };
    /**
     * Get H3 cells for a state (simplified - uses disk around center)
     * In production, you would use actual state boundary polygons
     */
    getStateCells(stateCode: string, radius?: number): string[];
    /**
     * Get H3 cells for a city (simplified - uses disk around center)
     * In production, you would use actual city boundary polygons or geocoding
     */
    getCityCells(city: string, state: string, radius?: number): Promise<string[]>;
    /**
     * Get H3 cells for a county (simplified)
     * In production, you would use actual county boundary polygons
     */
    getCountyCells(county: string, state: string, radius?: number): Promise<string[]>;
    /**
     * Generate H3 cells for national jurisdiction (all US states)
     * Returns a representative set of cells covering the country
     */
    getNationalCells(): string[];
    /**
     * Generate H3 cells based on jurisdiction type and value
     */
    generateJurisdictionCells(jurisdictionType: JurisdictionType, jurisdictionValue: string): Promise<string[]>;
    /**
     * Check if an H3 cell is within a set of jurisdiction cells
     */
    isWithinJurisdiction(h3Cell: string, jurisdictionCells: string[]): boolean;
    /**
     * Check if coordinates are within a jurisdiction
     */
    areCoordinatesInJurisdiction(lat: number, lng: number, jurisdictionCells: string[]): boolean;
    /**
     * Find organizations that have jurisdiction over a location
     */
    findOrganizationsForLocation(lat: number, lng: number): Promise<any[]>;
    /**
     * Find organizations that have jurisdiction over a user's H3 cell
     */
    findOrganizationsForH3Cell(h3Cell: string): Promise<any[]>;
    /**
     * Find organizations near a location (within certain number of rings)
     */
    findNearbyOrganizations(lat: number, lng: number, rings?: number): Promise<any[]>;
    /**
     * Check if a candidate is within an organization's jurisdiction
     * Used for endorsement eligibility
     */
    isCandidateInJurisdiction(candidateId: string, organizationId: string): Promise<boolean>;
}
export declare const jurisdictionService: JurisdictionService;
//# sourceMappingURL=jurisdictionService.d.ts.map