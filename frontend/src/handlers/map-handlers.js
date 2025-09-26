/**
 * MAP HANDLERS MODULE
 * Comprehensive map system management for United We Rise
 *
 * Handles:
 * - Map initialization (Leaflet and MapLibre implementations)
 * - Interactive topic popups with timing system
 * - Layer controls and visibility toggles
 * - Map view switching (national/state/local)
 * - Dynamic topic updates from AI system
 *
 * @module handlers/map-handlers
 */

console.log('🗺️ Loading map-handlers.js module...');

export class MapHandlers {
    constructor() {
        console.log('🗺️ Initializing MapHandlers...');

        // Instance variables for map state
        this.map = null;
        this.topics = [];
        this.usedTopics = new Map();
        this.popupInterval = null;

        // Configuration
        this.USE_MAPLIBRE = typeof USE_MAPLIBRE !== 'undefined' ? USE_MAPLIBRE : true;

        // Initialize event listeners with delegation
        this.initializeEventListeners();

        console.log('✅ MapHandlers initialized successfully');
    }

    /**
     * Initialize event delegation for map controls
     */
    initializeEventListeners() {
        // Layer dropdown toggle handler
        document.addEventListener('click', (e) => {
            // Toggle layer dropdown
            if (e.target.matches('.layer-dropdown-btn')) {
                e.preventDefault();
                this.toggleLayerDropdown();
            }

            // Close dropdown when clicking outside
            const dropdown = document.getElementById('layerDropdown');
            const dropdownContainer = document.querySelector('.map-layer-dropdown');
            if (dropdown && dropdownContainer && !dropdownContainer.contains(e.target)) {
                dropdown.classList.remove('show');
                const btn = document.querySelector('.layer-dropdown-btn');
                if (btn) btn.textContent = 'Layers ▼';
            }
        });

        // Map view button handlers (zoom level switching)
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-map-view]')) {
                e.preventDefault();
                const jurisdiction = e.target.getAttribute('data-map-view');
                this.toggleMapView(jurisdiction);
            }
        });

        // Layer toggle handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-layer-toggle]')) {
                const layerName = e.target.getAttribute('data-layer-toggle');
                this.toggleMapLayer(layerName);
            }
        });

        console.log('🎯 Map event delegation initialized');
    }

    /**
     * Initialize main map - chooses between Leaflet and MapLibre
     * @returns {Object} Map instance
     */
    initializeMap() {
        console.log('🗺️ initializeMap() called');

        if (this.USE_MAPLIBRE) {
            // Use new MapLibre implementation
            this.initializeMapLibreLocal();
            return;
        }

        // Original Leaflet implementation (fallback)
        this.map = L.map('map', {
            center: [37.8283, -98.5795],
            zoom: 5,
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false,
            touchZoom: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '',
            subdomains: 'abcd',
        }).addTo(this.map);

        // Initialize default topics array - will be updated with AI-generated content
        this.topics = [
            { coords: [40.7128, -74.0060], text: '📢 Rent control in NYC gaining momentum!' },
            { coords: [34.0522, -118.2437], text: '🚗 EV subsidies debated in California legislature.' },
            { coords: [41.8781, -87.6298], text: '⚖️ Chicago voters discuss criminal justice reform.' },
            { coords: [29.7604, -95.3698], text: '🗳️ Texas push for open primaries gaining traction.' },
            { coords: [47.6062, -122.3321], text: '🌳 Seattle community organizing for green zoning laws.' },
            { coords: [39.7392, -104.9903], text: '🏡 Denver debates housing-first initiatives.' },
            { coords: [33.4484, -112.0740], text: '🚁 Phoenix drone delivery regulations spark debate.' },
            { coords: [25.7617, -80.1918], text: '🏖️ Miami climate resiliency bonds trending.' },
            { coords: [32.7767, -96.7970], text: '💼 Dallas campaign finance reform gaining traction.' },
            { coords: [42.3601, -71.0589], text: '📚 Boston pushes universal childcare ballot measure.' }
        ];

        // Make update function globally accessible
        window.updateMapTopics = (newTopics) => this.updateLeafletMapTopics(newTopics);

        // Start random popup animation
        this.showRandomPopups();

        // Set map instance for zoom controls
        if (typeof setMapInstance === 'function') {
            setMapInstance(this.map);
        }

        return this.map;
    }

    /**
     * Create interactive topic popup with "Join Discussion" functionality
     * @param {Object} topicData - Topic data with coords, text, topicId
     * @param {Object} map - Leaflet map instance
     * @returns {Object} Leaflet popup instance
     */
    createTopicPopup(topicData, map) {
        const popupOptions = {
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            autoPan: false
        };

        let popupContent = topicData.text;

        // Add click functionality for AI topics
        if (topicData.topicId) {
            popupContent += `<br><div style="margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: rgba(255,107,53,0.9); color: white; border-radius: 4px; cursor: pointer; font-size: 0.8rem; text-align: center;" data-topic-id="${topicData.topicId}" class="topic-popup-join">💬 Join Discussion</div>`;
        }

        const popup = L.popup(popupOptions)
            .setLatLng(topicData.coords)
            .setContent(popupContent)
            .openOn(map);

        // Add click handler for "Join Discussion" button using event delegation
        // (Event delegation is handled at document level in content-handlers.js for enterTopicMode)

        return popup;
    }

    /**
     * Update Leaflet map topics dynamically with AI-generated content
     * @param {Array} newTopics - Array of topic objects with coords, text, topicId
     */
    updateLeafletMapTopics(newTopics) {
        if (newTopics && newTopics.length > 0) {
            this.topics = newTopics.map(bubble => ({
                coords: bubble.coords,
                text: bubble.text,
                topicId: bubble.topicId || null,
                priority: bubble.priority || 'normal'
            }));
            console.log('🗺️ Updated Leaflet map topics with', this.topics.length, 'AI-generated topics');
        }
    }

    /**
     * Show random topic popups with timing logic
     * Animates topic display on map with controlled timing
     */
    showRandomPopups() {
        const count = Math.floor(Math.random() * 2) + 1;
        const now = Date.now();

        const availableTopics = this.topics.filter(t => {
            const lastShown = this.usedTopics.has(t.text) ? this.usedTopics.get(t.text) : 0;
            return now - lastShown > 180000; // 3 minutes cooldown
        });

        const shuffled = availableTopics.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        selected.forEach(topic => {
            const popup = this.createTopicPopup(topic, this.map);

            this.usedTopics.set(topic.text, now);
            setTimeout(() => this.map.closePopup(popup), 30000); // 30 second display
        });

        // Schedule next popup cycle
        const nextDelay = Math.floor(Math.random() * 3000) + 13000; // 13-16 seconds
        this.popupInterval = setTimeout(() => this.showRandomPopups(), nextDelay);
    }

    /**
     * Initialize MapLibre GL map implementation
     * Alternative to Leaflet with modern WebGL rendering
     */
    initializeMapLibreLocal() {
        console.log('🗺️ initializeMapLibreLocal() called');

        // Set loading start time for minimum loading duration
        window.mapLoadStartTime = Date.now();

        // CRITICAL FIX: Show the map container BEFORE initializing MapLibre
        // MapLibre needs the container to be visible to measure dimensions correctly
        const mapContainer = document.getElementById('mapContainer');
        const loadingState = document.getElementById('mapLoadingState');

        console.log('Showing map container for MapLibre initialization...');
        if (mapContainer && loadingState) {
            // Hide loading state and show map container immediately
            loadingState.classList.add('hidden');
            mapContainer.style.display = 'block';
            console.log('Map container is now visible');
        }

        // Initialize MapLibre through the class in map-maplibre.js
        console.log('🔍 Checking for external initializeMapLibre function...');
        console.log('🔍 typeof window.initializeMapLibre:', typeof window.initializeMapLibre);

        if (typeof window.initializeMapLibre === 'function' && window.initializeMapLibre !== this.initializeMapLibreLocal) {
            console.log('✅ Found external initializeMapLibre function, calling it...');
            window.initializeMapLibre();
        } else {
            console.error('❌ External initializeMapLibre function not found - map-maplibre.js may not have loaded correctly');

            // Fallback: Initialize directly if the function isn't available
            if (typeof UWRMapLibre !== 'undefined') {
                console.log('UWRMapLibre class found, initializing directly...');
                const mapInstance = new UWRMapLibre('map');
                mapInstance.initialize().then(map => {
                    console.log('Direct MapLibre initialization complete');

                    // Create window.map object manually since initializeMapLibre() wasn't called
                    window.map = {
                        // Wrapper methods for Leaflet compatibility
                        setView: (center, zoom) => mapInstance.setView(center, zoom),
                        invalidateSize: () => mapInstance.invalidateSize(),
                        closePopup: () => mapInstance.closeAllPopups(),
                        fitBounds: (bounds) => mapInstance.fitBounds(bounds),
                        // New MapLibre-specific methods
                        toggleCollapsed: () => {
                            console.log('window.map.toggleCollapsed called');
                            return mapInstance.toggleCollapsed();
                        },
                        closeMap: () => mapInstance.closeMap(),
                        showMap: () => mapInstance.showMap(),
                        // Transition methods for smooth bubble handling
                        hideBubbles: () => mapInstance.hideAllBubblesDuringTransition(),
                        showBubbles: () => mapInstance.showAllBubblesAfterTransition(),
                        // Map container state adjustment
                        adjustForContainerState: (isCollapsed) => mapInstance.adjustForContainerState(isCollapsed),
                        setZoomLevel: (level) => {
                            mapInstance.setZoomLevel(level);
                            // Update button states
                            if (typeof updateMapViewButtons === 'function') {
                                updateMapViewButtons(level);
                            }
                        },
                        geocodeAndZoom: () => mapInstance.geocodeAndZoom(),
                        // Layer management system
                        toggleLayer: (layerName) => mapInstance.toggleLayer(layerName),
                        setJurisdiction: (jurisdiction) => mapInstance.setJurisdiction(jurisdiction),
                        // MapLibre instance for advanced use
                        _maplibre: map,
                        _uwrMap: mapInstance
                    };

                    console.log('window.map object created with adjustForContainerState:', !!window.map.adjustForContainerState);
                }).catch(error => {
                    console.error('Direct MapLibre initialization failed:', error);
                });
            } else {
                console.error('UWRMapLibre class not found - falling back to Leaflet');
                // Fall back to Leaflet if MapLibre fails completely
                this.USE_MAPLIBRE = false;
                this.initializeMap();
            }
        }
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
}

// Create singleton instance
const mapHandlers = new MapHandlers();

// Global exports for backward compatibility
window.MapHandlers = mapHandlers;
window.initializeMap = () => mapHandlers.initializeMap();
window.initializeMapLibreLocal = () => mapHandlers.initializeMapLibreLocal();
window.toggleMapLayer = (layerName) => mapHandlers.toggleMapLayer(layerName);
window.toggleLayerDropdown = () => mapHandlers.toggleLayerDropdown();
window.toggleMapView = (jurisdiction) => mapHandlers.toggleMapView(jurisdiction);

console.log('✅ Map handlers module loaded and exported globally');

export { mapHandlers };