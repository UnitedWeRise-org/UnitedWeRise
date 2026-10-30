/**
 * MAP HANDLERS MODULE
 * Comprehensive map system management for United We Rise
 *
 * Handles:
 * - Map utility helpers (geocoding, state/district centers, zoom helpers)
 * - Layer dropdown outside-click closing and layer toggle bridging
 *
 * Map rendering and initialization are owned solely by map-maplibre.js (UWRMapLibre).
 * Map button actions are dispatched by navigation-handlers.js.
 *
 * @module handlers/map-handlers
 */

import { apiCall } from '../js/api-compatibility-shim.js';

export class MapHandlers {
    constructor() {
        // Instance variables for map state
        this.map = null;
        this.topics = [];
        this.usedTopics = new Map();
        this.popupInterval = null;

        // Configuration
        this.USE_MAPLIBRE = typeof USE_MAPLIBRE !== 'undefined' ? USE_MAPLIBRE : true;

        // Close layers dropdown on outside click
        this.initializeEventListeners();
    }

    /**
     * Close the layers dropdown when clicking outside of it.
     * (The open/close toggle itself is dispatched by navigation-handlers.js;
     * the old duplicate toggle here caused a double-toggle that kept the
     * dropdown from opening.)
     */
    initializeEventListeners() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('layerDropdown');
            const dropdownContainer = document.querySelector('.map-layer-dropdown');
            if (dropdown && dropdownContainer && !dropdownContainer.contains(e.target)) {
                dropdown.classList.remove('show');
                const btn = document.querySelector('.layer-dropdown-btn');
                if (btn) btn.textContent = 'Layers ▼';
            }
        });
    }

    /**
     * Initialize main map.
     * MapLibre (map-maplibre.js) is the single map implementation; this simply
     * delegates to it. (Map UI button actions are dispatched by
     * navigation-handlers.js.)
     * @returns {Object|undefined} Map instance
     */
    initializeMap() {
        if (typeof window.initializeMapLibre === 'function') {
            return window.initializeMapLibre();
        }
        console.warn('MapLibre initializer unavailable');
    }

    /**
     * Initialize MapLibre (delegates to the single implementation in map-maplibre.js).
     */
    initializeMapLibreLocal() {
        window.mapLoadStartTime = Date.now();
        if (typeof window.initializeMapLibre === 'function') {
            return window.initializeMapLibre();
        }
        console.error('MapLibre initializer unavailable (map-maplibre.js not loaded)');
    }

    /**
     * Toggle map layer visibility
     * @param {string} layerName - Name of layer to toggle
     */
    toggleMapLayer(layerName) {
        console.log(`🔧 Toggling map layer: ${layerName}`);

        if (window.map && typeof window.map.toggleLayer === 'function') {
            window.map.toggleLayer(layerName);
        } else {
            console.warn('Map layer toggle not available - map may not be initialized yet');
        }
    }

    /**
     * Toggle layer dropdown visibility
     */
    toggleLayerDropdown() {
        const dropdown = document.getElementById('layerDropdown');
        const btn = document.querySelector('.layer-dropdown-btn');

        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
            btn.textContent = 'Layers ▼';
        } else {
            dropdown.classList.add('show');
            btn.textContent = 'Layers ▲';
        }
    }

    /**
     * Switch map view between national/state/local jurisdictions
     * @param {string} jurisdiction - 'national', 'state', or 'local'
     */
    toggleMapView(jurisdiction) {
        console.log(`🔧 Switching map view to: ${jurisdiction}`);

        // Update active button styling
        const buttons = document.querySelectorAll('.zoom-buttons-group .map-action-btn');
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase() === jurisdiction.toLowerCase()) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (window.map && typeof window.map.setJurisdiction === 'function') {
            window.map.setJurisdiction(jurisdiction);
        } else {
            console.warn('Map jurisdiction change not available - map may not be initialized yet');
        }

        // Refresh map topics for new scope
        if (typeof updateMapTopics === 'function') {
            updateMapTopics().catch(console.error);
        }
    }

    /**
     * Update map topics with AI content and caching
     * Migrated from index.html line 1785
     */
    async updateMapTopics() {
        try {
            const now = Date.now();

            // Check if we need to refresh the cache or if scope changed
            const currentScope = window.currentZoomLevel || 'national';
            const MAP_TOPIC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

            if (!this.mapTopicCache) this.mapTopicCache = [];
            if (!this.lastMapTopicUpdate) this.lastMapTopicUpdate = 0;

            if (now - this.lastMapTopicUpdate > MAP_TOPIC_CACHE_DURATION ||
                this.mapTopicCache.length === 0 ||
                this.lastMapTopicScope !== currentScope) {

                const response = await apiCall(`/trending/map-topics?count=9&scope=${currentScope}`);

                if (response.ok && response.data.topics) {
                    this.mapTopicCache = response.data.topics;
                    this.lastMapTopicUpdate = now;
                    this.lastMapTopicScope = currentScope;
                    console.log(`Updated map topic cache with ${this.mapTopicCache.length} topics for ${currentScope} scope`);
                }
            }

            // Get current set of 3 topics to display (rotating every 15 seconds)
            return this.getCurrentMapTopics();

        } catch (error) {
            console.error('Error updating map topics:', error);
            return [];
        }
    }

    /**
     * Get the current 3 topics to display on map (cycles every 15 seconds)
     * Migrated from index.html line 1812
     */
    getCurrentMapTopics() {
        if (!this.mapTopicCache || this.mapTopicCache.length === 0) return [];

        // Calculate which slice of 3 topics to show based on time
        const cycleIndex = Math.floor(Date.now() / 15000) % Math.max(1, Math.ceil(this.mapTopicCache.length / 3));
        const startIndex = cycleIndex * 3;
        const endIndex = Math.min(startIndex + 3, this.mapTopicCache.length);

        return this.mapTopicCache.slice(startIndex, endIndex);
    }

    /**
     * Sync map with trending topics
     * Migrated from index.html line 1939
     */
    syncMapWithTrendingTopics() {
        if (typeof window.updateMapWithTrendingTopics === 'function') {
            window.updateMapWithTrendingTopics();
        } else if (this.map) {
            // Fallback: update map topics directly
            this.updateMapTopics().then(topics => {
                if (topics && topics.length > 0) {
                    // Update map visualization with new topics
                    console.log('Map synced with trending topics:', topics.length);
                }
            }).catch(console.error);
        }
    }

    /**
     * Update map with trending topics
     * Migrated from index.html line 1519
     */
    async updateMapWithTrendingTopics() {
        try {
            // Get current trending topics
            const response = await apiCall('/trending/topics?limit=20');
            if (response.ok && response.data.topics) {
                const geographicTopics = this.getGeographicLayeredTopics(response.data.topics, this.currentZoomLevel || 'national');
                this.updateMapVisualization(geographicTopics);
            } else {
                // Fallback to cached topics
                const fallbackTopics = this.getFallbackMapTopics();
                this.updateMapVisualization(fallbackTopics);
            }
        } catch (error) {
            console.log('Error updating map with trending topics:', error);
            const fallbackTopics = this.getFallbackMapTopics();
            this.updateMapVisualization(fallbackTopics);
        }
    }

    /**
     * Get fallback map topics
     * Migrated from index.html line 1561
     */
    getFallbackMapTopics() {
        return [
            { name: "Economic Policy", description: "Discussion about fiscal and monetary policies" },
            { name: "Healthcare Reform", description: "Ongoing healthcare system improvements" },
            { name: "Education Funding", description: "State and local education budget discussions" },
            { name: "Infrastructure", description: "Transportation and utility improvements" },
            { name: "Environmental Policy", description: "Climate and conservation initiatives" }
        ];
    }

    /**
     * Get geographic layered topics with coordinates
     * Migrated from index.html line 1594
     */
    getGeographicLayeredTopics(aiTopics, zoomLevel = 'national') {
        if (!aiTopics || aiTopics.length === 0) {
            return this.getFallbackMapTopics().map(topic => ({
                ...topic,
                coordinates: this.getCoordinatesByZoomLevel(zoomLevel)
            }));
        }

        // Layer topics geographically based on zoom level
        const coordinates = this.getCoordinatesByZoomLevel(zoomLevel);

        return aiTopics.slice(0, coordinates.length).map((topic, index) => ({
            ...topic,
            coordinates: coordinates[index] || coordinates[0], // Fallback to first coordinate
            zoomLevel
        }));
    }

    /**
     * Get coordinates by zoom level
     * Migrated from index.html line 1705
     */
    getCoordinatesByZoomLevel(zoomLevel) {
        switch (zoomLevel) {
            case 'national':
                return [
                    { lat: 39.8283, lng: -98.5795 }, // Geographic center of US
                    { lat: 41.8781, lng: -87.6298 }, // Chicago
                    { lat: 34.0522, lng: -118.2437 }, // Los Angeles
                    { lat: 40.7128, lng: -74.0060 }, // New York
                    { lat: 29.7604, lng: -95.3698 }, // Houston
                    { lat: 33.4484, lng: -112.0740 }, // Phoenix
                    { lat: 39.7392, lng: -104.9903 }, // Denver
                    { lat: 47.6062, lng: -122.3321 } // Seattle
                ];
            case 'state':
                return this.getUserStateCoordinates();
            case 'local':
                return this.getUserLocalCoordinates();
            default:
                return [{ lat: 39.8283, lng: -98.5795 }]; // US center fallback
        }
    }

    /**
     * Get user state coordinates
     * Migrated from index.html line 1736
     */
    getUserStateCoordinates() {
        if (!window.currentUser || !window.currentUser.state) {
            return [{ lat: 39.8283, lng: -98.5795 }]; // US center fallback
        }

        const stateCenter = this.getStateCenterCoordinates(window.currentUser.state);
        if (stateCenter) {
            // Generate multiple coordinates around the state center
            return [
                stateCenter,
                { lat: stateCenter.lat + 1.0, lng: stateCenter.lng + 1.0 },
                { lat: stateCenter.lat - 1.0, lng: stateCenter.lng - 1.0 },
                { lat: stateCenter.lat + 0.5, lng: stateCenter.lng - 0.5 },
                { lat: stateCenter.lat - 0.5, lng: stateCenter.lng + 0.5 }
            ];
        }

        return [{ lat: 39.8283, lng: -98.5795 }]; // Fallback
    }

    /**
     * Get user local coordinates
     * Migrated from index.html line 1767
     */
    getUserLocalCoordinates() {
        if (window.currentLocation) {
            // Generate coordinates in local area
            const base = window.currentLocation;
            return [
                base,
                { lat: base.lat + 0.1, lng: base.lng + 0.1 },
                { lat: base.lat - 0.1, lng: base.lng - 0.1 },
                { lat: base.lat + 0.05, lng: base.lng - 0.05 },
                { lat: base.lat - 0.05, lng: base.lng + 0.05 }
            ];
        }

        // Fallback to state or national
        return this.getUserStateCoordinates();
    }

    /**
     * Start geographic topic balancing
     * Migrated from index.html line 1791
     */
    startGeographicTopicBalancing() {
        // Start the geographic balancing interval (every 30 seconds)
        if (this.geographicBalancingInterval) {
            clearInterval(this.geographicBalancingInterval);
        }

        this.geographicBalancingInterval = setInterval(() => {
            this.updateMapWithTrendingTopics();
        }, 30000);

        console.log('Geographic topic balancing started');
    }

    /**
     * Set map instance
     * Migrated from index.html line 3373
     */
    setMapInstance(map) {
        this.mapInstance = map;
        this.map = map;
        this.boundaryManager = new this.BoundaryManager(map);

        // Try to get user location, with fallback
        setTimeout(() => {
            if (window.currentUser && window.currentUser.state) {
                this.getCurrentUserLocation();
            } else {
                window.currentLocation = { lat: 37.8283, lng: -98.5795 }; // Center of US
            }
        }, 500); // Wait for user data to load
    }

    /**
     * Get current user location
     * Migrated from index.html line 3387
     */
    async getCurrentUserLocation() {
        try {
            if (window.currentUser && window.currentUser.zipCode && window.currentUser.state) {
                // Use user's stored address for location
                const address = window.currentUser.city ?
                    `${window.currentUser.city}, ${window.currentUser.state} ${window.currentUser.zipCode}` :
                    `${window.currentUser.zipCode}, ${window.currentUser.state}`;

                const coords = await this.geocodeLocation(address);
                if (coords) {
                    window.currentLocation = coords;
                    // Only set zoom level if we're not at national level
                    if (this.currentZoomLevel !== 'national') {
                        await this.setZoomLevel(this.currentZoomLevel);
                    }

                    // Load representative data to get district info
                    if (typeof loadElectedOfficials === 'function') {
                        loadElectedOfficials();
                    }
                }
            }
        } catch (error) {
            console.error('Error getting user location:', error);
            window.currentLocation = { lat: 37.8283, lng: -98.5795 }; // Fallback
        }
    }

    /**
     * Geocode location
     * Migrated from index.html line 3413
     */
    async geocodeLocation(address) {
        try {
            // Using a free geocoding service
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();

            if (data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    /**
     * Geocode and zoom
     * Migrated from index.html line 3432
     */
    async geocodeAndZoom() {
        const locationInput = document.getElementById('locationInput');
        const address = locationInput?.value.trim();

        if (!address) {
            // Use current location if no address provided
            this.getCurrentUserLocation();
            return;
        }

        const coords = await this.geocodeLocation(address);
        if (coords) {
            window.currentLocation = coords;
            // Apply current zoom level to new location
            await this.setZoomLevel(this.currentZoomLevel);
        } else {
            alert('Location not found. Please try a different address.');
        }
    }

    /**
     * Set zoom level
     * Migrated from index.html line 3452
     */
    async setZoomLevel(level) {
        if (this.USE_MAPLIBRE && this.map && this.map.setZoomLevel) {
            // Use MapLibre zoom level method
            this.map.setZoomLevel(level);
            this.updateRadioButtonState(level);
            return;
        }

        if (!this.mapInstance) return;

        // Update current zoom level and radio button state
        this.currentZoomLevel = level;
        this.updateRadioButtonState(level);

        let zoom, bounds;

        // Clear existing boundaries
        if (this.boundaryManager) {
            this.boundaryManager.clearAll();
        }

        console.log(`Setting zoom level: ${level}`);

        switch(level) {
            case 'national':
                // Show national view
                const isCollapsed = document.getElementById('mapContainer')?.classList.contains('collapsed');
                zoom = isCollapsed ? 3 : 5;
                this.mapInstance.setView([37.8283, -98.5795], zoom); // Center of US
                break;

            case 'state':
                // Zoom to show state
                const isCollapsedState = document.getElementById('mapContainer')?.classList.contains('collapsed');
                zoom = isCollapsedState ? 5 : 7;

                if (window.currentUser && window.currentUser.state) {
                    const stateCenter = await this.getStateCenterCoordinates(window.currentUser.state);
                    if (stateCenter) {
                        this.mapInstance.setView([stateCenter.lat, stateCenter.lng], zoom);

                        // Load state boundary
                        if (this.boundaryManager) {
                            this.boundaryManager.loadBoundary('state', null, window.currentUser.state);
                        }
                    } else {
                        this.mapInstance.setView([37.8283, -98.5795], zoom);
                    }
                } else {
                    console.error('State zoom requested but no state data available');
                }
                break;

            case 'local':
                // Zoom to user's actual address
                const isCollapsedLocal = document.getElementById('mapContainer')?.classList.contains('collapsed');
                zoom = isCollapsedLocal ? 9 : 11;

                if (window.currentUser && (window.currentUser.zipCode || window.currentUser.city) && window.currentUser.state) {
                    // Build address from user profile
                    let userAddress = '';
                    if (window.currentUser.streetAddress && window.currentUser.city) {
                        userAddress = `${window.currentUser.streetAddress}, ${window.currentUser.city}, ${window.currentUser.state}`;
                        if (window.currentUser.zipCode) userAddress += ` ${window.currentUser.zipCode}`;
                    } else if (window.currentUser.city) {
                        userAddress = `${window.currentUser.city}, ${window.currentUser.state}`;
                    } else if (window.currentUser.zipCode) {
                        userAddress = `${window.currentUser.zipCode}, ${window.currentUser.state}`;
                    }

                    // Geocode the user's address and fly there
                    const addressCoords = await this.geocodeLocation(userAddress);
                    if (addressCoords) {
                        this.mapInstance.setView([addressCoords.lat, addressCoords.lng], zoom);

                        // Load district boundary if we have district info
                        if (this.boundaryManager && window.currentUser.district) {
                            this.boundaryManager.loadBoundary('district', window.currentUser.district, window.currentUser.state);
                        }
                    } else {
                        // Fallback to state center
                        const stateCenter = await this.getStateCenterCoordinates(window.currentUser.state);
                        if (stateCenter) {
                            this.mapInstance.setView([stateCenter.lat, stateCenter.lng], zoom);
                        } else {
                            this.mapInstance.setView([37.8283, -98.5795], zoom);
                        }
                    }
                } else {
                    console.error('Local zoom requested but no address data available');
                }
                break;
        }
    }

    /**
     * Helper function to get state center coordinates
     * Migrated from index.html line 3585
     */
    getStateCenterCoordinates(stateAbbr) {
        // State center coordinates (approximate geographic centers)
        const stateCenters = {
            'AL': { lat: 32.806671, lng: -86.791130 },
            'AK': { lat: 61.370716, lng: -152.404419 },
            'AZ': { lat: 33.729759, lng: -111.431221 },
            'AR': { lat: 34.969704, lng: -92.373123 },
            'CA': { lat: 36.116203, lng: -119.681564 },
            'CO': { lat: 39.059811, lng: -105.311104 },
            'CT': { lat: 41.597782, lng: -72.755371 },
            'DE': { lat: 39.318523, lng: -75.507141 },
            'FL': { lat: 27.766279, lng: -81.686783 },
            'GA': { lat: 33.040619, lng: -83.643074 },
            'HI': { lat: 21.094318, lng: -157.498337 },
            'ID': { lat: 44.240459, lng: -114.478828 },
            'IL': { lat: 40.349457, lng: -88.986137 },
            'IN': { lat: 39.849426, lng: -86.258278 },
            'IA': { lat: 42.011539, lng: -93.210526 },
            'KS': { lat: 38.526600, lng: -96.726486 },
            'KY': { lat: 37.668140, lng: -84.670067 },
            'LA': { lat: 31.169546, lng: -91.867805 },
            'ME': { lat: 44.693947, lng: -69.381927 },
            'MD': { lat: 39.063946, lng: -76.802101 },
            'MA': { lat: 42.230171, lng: -71.530106 },
            'MI': { lat: 43.326618, lng: -84.536095 },
            'MN': { lat: 45.694454, lng: -93.900192 },
            'MS': { lat: 32.741646, lng: -89.678696 },
            'MO': { lat: 38.456085, lng: -92.288368 },
            'MT': { lat: 47.097633, lng: -110.362566 },
            'NE': { lat: 41.492537, lng: -99.901813 },
            'NV': { lat: 38.313515, lng: -117.055374 },
            'NH': { lat: 43.452492, lng: -71.563896 },
            'NJ': { lat: 40.298904, lng: -74.521011 },
            'NM': { lat: 34.840515, lng: -106.248482 },
            'NY': { lat: 42.165726, lng: -74.948051 },
            'NC': { lat: 35.630066, lng: -79.806419 },
            'ND': { lat: 47.528912, lng: -99.784012 },
            'OH': { lat: 40.388783, lng: -82.764915 },
            'OK': { lat: 35.565342, lng: -96.928917 },
            'OR': { lat: 44.572021, lng: -122.070938 },
            'PA': { lat: 40.590752, lng: -77.209755 },
            'RI': { lat: 41.680893, lng: -71.51178 },
            'SC': { lat: 33.856892, lng: -80.945007 },
            'SD': { lat: 44.299782, lng: -99.438828 },
            'TN': { lat: 35.747845, lng: -86.692345 },
            'TX': { lat: 31.054487, lng: -97.563461 },
            'UT': { lat: 40.150032, lng: -111.862434 },
            'VT': { lat: 44.045876, lng: -72.710686 },
            'VA': { lat: 37.769337, lng: -78.169968 },
            'WA': { lat: 47.400902, lng: -121.490494 },
            'WV': { lat: 38.491226, lng: -80.954570 },
            'WI': { lat: 44.268543, lng: -89.616508 },
            'WY': { lat: 42.755966, lng: -107.302490 }
        };

        return stateCenters[stateAbbr.toUpperCase()] || null;
    }

    /**
     * Get district center coordinates
     * Migrated from index.html line 3644
     */
    async getDistrictCenterCoordinates(stateAbbr, districtNumber) {
        try {
            // Try to fetch the district boundary data to calculate center
            const url = `https://theunitedstates.io/districts/cds/2012/${stateAbbr.toUpperCase()}-${districtNumber}/shape.geojson`;
            const response = await fetch(url);

            if (response.ok) {
                const geojsonData = await response.json();

                // Calculate the center of the district from its geometry
                const center = this.calculateGeometryCenter(geojsonData);
                if (center) {
                    return center;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting district center:', error);
            return null;
        }
    }

    /**
     * Calculate the center of a GeoJSON geometry
     * Migrated from index.html line 3670
     */
    calculateGeometryCenter(geojsonData) {
        try {
            if (!geojsonData.features || geojsonData.features.length === 0) {
                return null;
            }

            let totalLat = 0;
            let totalLng = 0;
            let pointCount = 0;

            geojsonData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    const coordinates = feature.geometry.coordinates[0]; // First ring (exterior)
                    coordinates.forEach(coord => {
                        totalLng += coord[0];
                        totalLat += coord[1];
                        pointCount++;
                    });
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        const coordinates = polygon[0]; // First ring of each polygon
                        coordinates.forEach(coord => {
                            totalLng += coord[0];
                            totalLat += coord[1];
                            pointCount++;
                        });
                    });
                }
            });

            if (pointCount > 0) {
                return {
                    lat: totalLat / pointCount,
                    lng: totalLng / pointCount
                };
            }

            return null;
        } catch (error) {
            console.error('Error calculating geometry center:', error);
            return null;
        }
    }

    /**
     * Initialize location input with user's address if available
     * Migrated from index.html line 3715
     */
    updateLocationPlaceholder() {
        setTimeout(() => {
            if (window.currentUser && window.currentUser.city && window.currentUser.state) {
                const locationInput = document.getElementById('locationInput');
                if (locationInput) {
                    locationInput.placeholder = `${window.currentUser.city}, ${window.currentUser.state}`;
                }
            }
        }, 100);
    }

    /**
     * Update radio button state for zoom levels
     */
    updateRadioButtonState(level) {
        document.querySelectorAll('input[name="zoomLevel"]').forEach(radio => {
            radio.checked = radio.value === level;
        });
    }

    /**
     * Update map visualization with topics
     */
    updateMapVisualization(topics) {
        // Legacy Leaflet renderer removed during Phase 2 consolidation.
        // MapLibre (map-maplibre.js) owns all map rendering now.
        if (!topics || topics.length === 0) return;
        if (window.DEBUG_MAP) {
            console.debug('updateMapVisualization skipped — MapLibre owns rendering:', topics.length);
        }
    }

    /**
     * Boundary manager class for district/state boundaries
     */
    BoundaryManager = class {
        constructor(map) {
            this.map = map;
            this.layers = new Map();
            this.cache = new Map();
        }

        clearAll() {
            this.layers.forEach(layer => this.map.removeLayer(layer));
            this.layers.clear();
        }

        async loadBoundary(type, identifier, state) {
            // Simplified boundary loading implementation
            console.log(`Loading ${type} boundary for ${state}-${identifier || 'state'}`);
        }
    }
}

// Create singleton instance
const mapHandlers = new MapHandlers();

// Global exports for backward compatibility
window.MapHandlers = mapHandlers;
window.initializeMap = () => mapHandlers.initializeMap();
window.initializeMapLibreLocal = () => mapHandlers.initializeMapLibreLocal();
window.toggleMapLayer = (layerName) => mapHandlers.toggleMapLayer(layerName);
window.toggleLayerDropdown = () => mapHandlers.toggleLayerDropdown();
window.updateMapTopics = () => mapHandlers.updateMapTopics();
window.syncMapWithTrendingTopics = () => mapHandlers.syncMapWithTrendingTopics();
window.updateMapWithTrendingTopics = () => mapHandlers.updateMapWithTrendingTopics();
window.getCurrentMapTopics = () => mapHandlers.getCurrentMapTopics();
window.getFallbackMapTopics = () => mapHandlers.getFallbackMapTopics();
window.getGeographicLayeredTopics = (topics, zoomLevel) => mapHandlers.getGeographicLayeredTopics(topics, zoomLevel);
window.getCoordinatesByZoomLevel = (zoomLevel) => mapHandlers.getCoordinatesByZoomLevel(zoomLevel);
window.getUserStateCoordinates = () => mapHandlers.getUserStateCoordinates();
window.getUserLocalCoordinates = () => mapHandlers.getUserLocalCoordinates();
window.startGeographicTopicBalancing = () => mapHandlers.startGeographicTopicBalancing();
window.setMapInstance = (map) => mapHandlers.setMapInstance(map);
window.getCurrentUserLocation = () => mapHandlers.getCurrentUserLocation();
window.geocodeLocation = (address) => mapHandlers.geocodeLocation(address);
window.geocodeAndZoom = () => mapHandlers.geocodeAndZoom();
window.setZoomLevel = (level) => mapHandlers.setZoomLevel(level);
window.getStateCenterCoordinates = (stateAbbr) => mapHandlers.getStateCenterCoordinates(stateAbbr);
window.getDistrictCenterCoordinates = (stateAbbr, districtNumber) => mapHandlers.getDistrictCenterCoordinates(stateAbbr, districtNumber);
window.calculateGeometryCenter = (geojsonData) => mapHandlers.calculateGeometryCenter(geojsonData);
window.updateLocationPlaceholder = () => mapHandlers.updateLocationPlaceholder();

// Set up the location placeholder update when user data loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => mapHandlers.updateLocationPlaceholder(), 1000);
    });
}

export { mapHandlers };