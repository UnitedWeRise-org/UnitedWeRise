import { latLngToCell, cellToLatLng, gridRingUnsafe } from 'h3-js';

// H3 resolution levels:
// 7 = ~5km hexagons (good for voting districts)
// 8 = ~1km hexagons (neighborhood level)
// 9 = ~174m hexagons (block level)
const DEFAULT_H3_RESOLUTION = 7;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AddressComponents {
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
}

// Convert address to coordinates (simplified - in production you'd use Google/Mapbox geocoding)
export const geocodeAddress = async (address: AddressComponents): Promise<Coordinates | null> => {
  try {
    // This is a simplified geocoding function
    // In production, you'd integrate with Google Maps, Mapbox, or similar service
    
    // For demo purposes, we'll use some sample coordinates for common areas
    const mockCoordinates: { [key: string]: Coordinates } = {
      '62701_IL': { lat: 39.7817, lng: -89.6501 }, // Springfield, IL
      '60601_CHI': { lat: 41.8781, lng: -87.6298 }, // Chicago, IL
      '10001_NY': { lat: 40.7505, lng: -73.9934 },  // NYC
      '90210_CA': { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
      '20001_DC': { lat: 38.9072, lng: -77.0369 }   // Washington DC
    };

    const key = `${address.zipCode}_${address.state}`;
    const coords = mockCoordinates[key];
    
    if (coords) {
      return coords;
    }

    // Fallback: rough coordinates based on state
    const stateCoordinates: { [key: string]: Coordinates } = {
      'IL': { lat: 40.0, lng: -89.0 },
      'NY': { lat: 43.0, lng: -75.0 },
      'CA': { lat: 36.0, lng: -119.0 },
      'DC': { lat: 38.9, lng: -77.0 }
    };

    return stateCoordinates[address.state] || null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Convert coordinates to H3 index
export const coordinatesToH3 = (coords: Coordinates, resolution: number = DEFAULT_H3_RESOLUTION): string => {
  return latLngToCell(coords.lat, coords.lng, resolution);
};

// Convert H3 index back to coordinates
export const h3ToCoordinates = (h3Index: string): Coordinates => {
  const [lat, lng] = cellToLatLng(h3Index);
  return { lat, lng };
};

// Get neighboring H3 hexagons (for finding nearby users)
export const getNearbyH3Indexes = (h3Index: string, ringSize: number = 1): string[] => {
  return gridRingUnsafe(h3Index, ringSize);
};

// Calculate H3 index from full address
export const addressToH3 = async (address: AddressComponents, resolution: number = DEFAULT_H3_RESOLUTION): Promise<string | null> => {
  const coords = await geocodeAddress(address);
  if (!coords) return null;
  
  return coordinatesToH3(coords, resolution);
};

// Privacy displacement for post coordinates
export const generatePrivacyDisplacedCoordinates = (
  realCoords: Coordinates,
  privacyLevel: 'standard' | 'high' = 'standard'
): Coordinates => {
  const minDistance = privacyLevel === 'high' ? 500 : 50;   // meters
  const maxDistance = privacyLevel === 'high' ? 5000 : 2000; // meters

  const randomAngle = Math.random() * 360; // degrees
  const randomDistance = minDistance + Math.random() * (maxDistance - minDistance);

  // Convert to radians
  const angleRad = randomAngle * Math.PI / 180;

  // Earth's radius in meters
  const earthRadius = 6371000;

  // Calculate displacement
  const deltaLat = (randomDistance * Math.cos(angleRad)) / earthRadius * (180 / Math.PI);
  const deltaLng = (randomDistance * Math.sin(angleRad)) /
    (earthRadius * Math.cos(realCoords.lat * Math.PI / 180)) * (180 / Math.PI);

  return {
    lat: realCoords.lat + deltaLat,
    lng: realCoords.lng + deltaLng
  };
};

// Enhanced address formatting using both address lines
export const formatFullAddress = (address: AddressComponents): string => {
  const parts = [
    address.streetAddress,
    address.streetAddress2, // Include second line
    address.city,
    address.state,
    address.zipCode
  ].filter(Boolean); // Remove empty parts

  return parts.join(', ');
};

// Get voting district info (integrated with existing Geocodio system)
export const getVotingDistrict = async (coords: Coordinates): Promise<{
  congressional: string;
  state: string;
  local: string;
} | null> => {
  try {
    // This integrates with the existing DistrictIdentificationService
    // which already uses Geocodio + Google Civic APIs

    // For demo, return mock district info
    return {
      congressional: "IL-13",
      state: "Illinois Senate District 48",
      local: "Springfield Ward 3"
    };
  } catch (error) {
    console.error('Voting district lookup error:', error);
    return null;
  }
};