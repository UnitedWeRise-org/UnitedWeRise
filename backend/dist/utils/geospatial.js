"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVotingDistrict = exports.formatFullAddress = exports.generatePrivacyDisplacedCoordinates = exports.addressToH3 = exports.getNearbyH3Indexes = exports.h3ToCoordinates = exports.coordinatesToH3 = exports.geocodeAddress = void 0;
const h3_js_1 = require("h3-js");
const logger_1 = require("../services/logger");
// H3 resolution levels:
// 7 = ~5km hexagons (good for voting districts)
// 8 = ~1km hexagons (neighborhood level)
// 9 = ~174m hexagons (block level)
const DEFAULT_H3_RESOLUTION = 7;
// Convert address to coordinates (simplified - in production you'd use Google/Mapbox geocoding)
const geocodeAddress = async (address) => {
    try {
        // This is a simplified geocoding function
        // In production, you'd integrate with Google Maps, Mapbox, or similar service
        // For demo purposes, we'll use some sample coordinates for common areas
        const mockCoordinates = {
            '62701_IL': { lat: 39.7817, lng: -89.6501 }, // Springfield, IL
            '60601_CHI': { lat: 41.8781, lng: -87.6298 }, // Chicago, IL
            '10001_NY': { lat: 40.7505, lng: -73.9934 }, // NYC
            '90210_CA': { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
            '20001_DC': { lat: 38.9072, lng: -77.0369 } // Washington DC
        };
        const key = `${address.zipCode}_${address.state}`;
        const coords = mockCoordinates[key];
        if (coords) {
            return coords;
        }
        // Fallback: rough coordinates based on state
        const stateCoordinates = {
            'IL': { lat: 40.0, lng: -89.0 },
            'NY': { lat: 43.0, lng: -75.0 },
            'CA': { lat: 36.0, lng: -119.0 },
            'DC': { lat: 38.9, lng: -77.0 }
        };
        return stateCoordinates[address.state] || null;
    }
    catch (error) {
        logger_1.logger.error({ error, state: address.state }, 'Geocoding error');
        return null;
    }
};
exports.geocodeAddress = geocodeAddress;
// Convert coordinates to H3 index
const coordinatesToH3 = (coords, resolution = DEFAULT_H3_RESOLUTION) => {
    return (0, h3_js_1.latLngToCell)(coords.lat, coords.lng, resolution);
};
exports.coordinatesToH3 = coordinatesToH3;
// Convert H3 index back to coordinates
const h3ToCoordinates = (h3Index) => {
    const [lat, lng] = (0, h3_js_1.cellToLatLng)(h3Index);
    return { lat, lng };
};
exports.h3ToCoordinates = h3ToCoordinates;
// Get neighboring H3 hexagons (for finding nearby users)
const getNearbyH3Indexes = (h3Index, ringSize = 1) => {
    return (0, h3_js_1.gridRingUnsafe)(h3Index, ringSize);
};
exports.getNearbyH3Indexes = getNearbyH3Indexes;
// Calculate H3 index from full address
const addressToH3 = async (address, resolution = DEFAULT_H3_RESOLUTION) => {
    const coords = await (0, exports.geocodeAddress)(address);
    if (!coords)
        return null;
    return (0, exports.coordinatesToH3)(coords, resolution);
};
exports.addressToH3 = addressToH3;
// Privacy displacement for post coordinates
const generatePrivacyDisplacedCoordinates = (realCoords, privacyLevel = 'standard') => {
    const minDistance = privacyLevel === 'high' ? 500 : 50; // meters
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
exports.generatePrivacyDisplacedCoordinates = generatePrivacyDisplacedCoordinates;
// Enhanced address formatting using both address lines
const formatFullAddress = (address) => {
    const parts = [
        address.streetAddress,
        address.streetAddress2, // Include second line
        address.city,
        address.state,
        address.zipCode
    ].filter(Boolean); // Remove empty parts
    return parts.join(', ');
};
exports.formatFullAddress = formatFullAddress;
// Get voting district info (integrated with existing Geocodio system)
const getVotingDistrict = async (coords) => {
    try {
        // This integrates with the existing DistrictIdentificationService
        // which already uses Geocodio + Google Civic APIs
        // For demo, return mock district info
        return {
            congressional: "IL-13",
            state: "Illinois Senate District 48",
            local: "Springfield Ward 3"
        };
    }
    catch (error) {
        logger_1.logger.error({ error, coords }, 'Voting district lookup error');
        return null;
    }
};
exports.getVotingDistrict = getVotingDistrict;
//# sourceMappingURL=geospatial.js.map