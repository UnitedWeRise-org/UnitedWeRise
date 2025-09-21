/* 
 * MapLibre GL Implementation for United We Rise
 * Replacing Leaflet for better responsive behavior
 */

class UWRMapLibre {
    constructor(containerId = 'map') {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.layers = new Map();
        this.popups = new Map();
        
        // US center coordinates
        this.US_CENTER = [-98.5795, 39.8283];
        this.US_BOUNDS = [
            [-130, 24], // Southwest
            [-65, 50]   // Northeast
        ];
        
        // Trending comments system
        this.currentJurisdiction = 'national';
        this.trendingPopups = [];
        this.trendingInterval = null;
        this.bubbleCycles = []; // Track bubble cycles with timestamps
        
        // Map layers system
        this.activeLayers = new Set(['trending', 'events', 'news', 'civic', 'community']); // Default active layers
        this.layerPopups = new Map(); // Track popups by layer
        this.layerIntervals = new Map(); // Track intervals by layer
        
        // Animation management with cooldown timer
        this.lastAnimationTime = 0;
        this.baseCooldown = 800; // Base cooldown between operations
        this.lastZoom = null; // Track last zoom for dynamic cooldown
        
        // Civic social infrastructure
        this.civicGroups = new Map();
        this.userCivicActions = [];
        this.civicEvents = [];
    }

    async initialize() {
        // Create MapLibre map instance
        this.map = new maplibregl.Map({
            container: this.containerId,
            style: {
                version: 8,
                sources: {
                    'carto-light': {
                        type: 'raster',
                        tiles: [
                            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors © CARTO'
                    }
                },
                layers: [
                    {
                        id: 'carto-light-layer',
                        type: 'raster',
                        source: 'carto-light',
                        minzoom: 0,
                        maxzoom: 22
                    }
                ],
                glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
            },
            center: this.US_CENTER,
            zoom: 3.6,
            bearing: 0, // Lock to north
            pitch: 0,   // No 3D tilt
            minZoom: 2,
            maxZoom: 18,
            attributionControl: false,
            // Disable rotation and pitch
            dragRotate: false,
            pitchWithRotate: false
        });

        // Store globally for compatibility
        window.mapLibre = this.map;
        
        // No navigation controls - use mouse/touch only
        
        // Disable rotation on touch devices while keeping zoom
        this.map.on('load', () => {
            this.map.touchZoomRotate.disableRotation();
        });
        
        // Setup responsive behavior
        this.setupResponsiveBehavior();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Show map container when fully loaded
        this.map.on('load', () => {
            this.showMapContainer();
            
            // Display dummy civic events on the map
            this.displayCivicEvents();
            
            // Start trending comments system
            this.startTrendingComments();
        });

        // Handle map errors (filter out expected navigation AbortErrors)
        this.map.on('error', (e) => {
            // Filter out AbortErrors during map navigation - these are expected
            if (e.error && e.error.name === 'AbortError' && e.error.message.includes('signal is aborted')) {
                // Only log these in debug mode, not as errors
                if (window.DEBUG_MAP) {
                    console.debug('MapLibre tile request aborted (expected during navigation):', e.error.message);
                }
                return;
            }
            
            // Log other errors normally
            console.error('MapLibre error:', e);
            this.showLoadingError();
        });

        // FALLBACK: Force show map after maximum wait time (for localhost testing)
        setTimeout(() => {
            console.log('TIMEOUT FALLBACK: Force showing map after 5 seconds');
            this.showMapContainer();
        }, 5000);
        
        return this.map;
    }

    // Smart flyTo method with dynamic cooldown based on zoom level changes
    smartFlyTo(options) {
        const currentTime = Date.now();
        const timeSinceLastAnimation = currentTime - this.lastAnimationTime;
        
        // Calculate dynamic cooldown based on zoom level change
        const currentZoom = this.map.getZoom();
        const targetZoom = options.zoom || currentZoom;
        const zoomDifference = this.lastZoom ? Math.abs(targetZoom - this.lastZoom) : 0;
        
        // Dynamic cooldown: larger zoom changes need more time
        // Local → National (zoom 10 → 4) = 6 levels = 1400ms cooldown
        // National → Local (zoom 4 → 10) = 6 levels = 1400ms cooldown  
        // State transitions = smaller changes = shorter cooldown
        const dynamicCooldown = this.baseCooldown + (zoomDifference * 100);
        
        // If within cooldown period, ignore the request (most recent user action wins)
        if (timeSinceLastAnimation < dynamicCooldown) {
            if (window.DEBUG_MAP) {
                console.debug(`Map operation ignored due to dynamic cooldown: ${timeSinceLastAnimation}ms < ${dynamicCooldown}ms (zoom change: ${zoomDifference})`);
            }
            return;
        }
        
        this.lastAnimationTime = currentTime;
        this.lastZoom = targetZoom;
        
        // Enhanced options to reduce tile abort errors
        const enhancedOptions = {
            ...options,
            // Smoother animation for larger transitions
            speed: options.speed || (zoomDifference > 4 ? 0.6 : 0.8),
            curve: options.curve || (zoomDifference > 4 ? 1.4 : 1.2),
            // Mark as essential to prevent skipping on reduced motion
            essential: options.essential !== undefined ? options.essential : true
        };

        if (window.DEBUG_MAP) {
            console.debug(`Map flyTo: zoom ${currentZoom} → ${targetZoom}, cooldown: ${dynamicCooldown}ms, speed: ${enhancedOptions.speed}`);
        }

        this.map.flyTo(enhancedOptions);
    }

    setupResponsiveBehavior() {
        // Store initial bounds when map loads
        this.map.on('load', () => {
            this.initialBounds = this.map.getBounds();
            this.lastZoom = this.map.getZoom(); // Initialize zoom tracking
            
            // Fit to US bounds initially
            this.fitUSBounds();
        });

        // Handle container resize
        const resizeObserver = new ResizeObserver(() => {
            this.handleResize();
        });
        
        const container = document.getElementById(this.containerId);
        if (container) {
            resizeObserver.observe(container);
        }

        // Also handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleResize() {
        // Let MapLibre know the container resized
        this.map.resize();
        
        // Maintain visible area on resize
        if (this.currentView === 'bounds' && this.currentBounds) {
            // Refit to the same bounds
            this.map.fitBounds(this.currentBounds, {
                padding: this.getResponsivePadding(),
                animate: false
            });
        }
    }

    getResponsivePadding() {
        const width = window.innerWidth;
        
        if (width < 768) {
            // Mobile
            return { top: 20, right: 20, bottom: 80, left: 20 };
        } else if (width < 1024) {
            // Tablet
            return { top: 40, right: 40, bottom: 40, left: 40 };
        } else {
            // Desktop
            return { top: 50, right: 50, bottom: 50, left: 50 };
        }
    }

    setupEventHandlers() {
        // Click handler for popups
        this.map.on('click', (e) => {
            // Check for features at click point
            const features = this.map.queryRenderedFeatures(e.point);
            if (features.length > 0) {
                this.handleFeatureClick(features[0], e.lngLat);
            }
        });

        // Cursor change on hover
        this.map.on('mouseenter', 'political-boundaries', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'political-boundaries', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    // Compatibility methods to match Leaflet API
    
    setView(center, zoom) {
        // Convert Leaflet [lat, lng] to MapLibre [lng, lat]
        const mapLibreCenter = Array.isArray(center) 
            ? [center[1], center[0]] 
            : [center.lng || center.lon, center.lat];
        
        this.currentView = 'center';
        this.smartFlyTo({
            center: mapLibreCenter,
            zoom: zoom
        });
    }

    fitBounds(bounds, options = {}) {
        this.currentView = 'bounds';
        this.currentBounds = bounds;
        
        this.map.fitBounds(bounds, {
            ...options,
            padding: options.padding || this.getResponsivePadding()
        });
    }

    fitUSBounds() {
        this.fitBounds(this.US_BOUNDS, {
            padding: this.getResponsivePadding(),
            animate: false
        });
    }

    invalidateSize() {
        // MapLibre equivalent of Leaflet's invalidateSize
        this.map.resize();
    }

    addGeoJSON(key, geojsonData, style = {}) {
        // Remove existing layer if it exists
        this.removeLayer(key);
        
        // Add source
        this.map.addSource(key, {
            type: 'geojson',
            data: geojsonData
        });
        
        // Add layer with style
        const layerStyle = {
            id: key,
            type: 'fill',
            source: key,
            paint: {
                'fill-color': style.fillColor || '#088',
                'fill-opacity': style.fillOpacity || 0.3,
                'fill-outline-color': style.color || '#000'
            }
        };
        
        this.map.addLayer(layerStyle);
        this.layers.set(key, true);
    }

    removeLayer(key) {
        if (this.layers.has(key)) {
            // Remove layer
            if (this.map.getLayer(key)) {
                this.map.removeLayer(key);
            }
            
            // Remove source
            if (this.map.getSource(key)) {
                this.map.removeSource(key);
            }
            
            this.layers.delete(key);
        }
    }

    clearLayers() {
        this.layers.forEach((_, key) => {
            this.removeLayer(key);
        });
    }

    createPopup(lngLat, content, options = {}) {
        const popup = new maplibregl.Popup({
            closeButton: options.closeButton !== false,
            closeOnClick: options.closeOnClick !== false,
            maxWidth: options.maxWidth || '300px',
            className: options.className || 'custom-popup'
        })
        .setLngLat(lngLat)
        .setHTML(content)
        .addTo(this.map);
        
        // Auto-close after timeout if specified
        if (options.autoClose) {
            setTimeout(() => popup.remove(), options.autoClose);
        }
        
        return popup;
    }

    closeAllPopups() {
        // Close all open popups
        const popups = document.getElementsByClassName('maplibregl-popup');
        Array.from(popups).forEach(popup => popup.remove());
    }

    handleFeatureClick(feature, lngLat) {
        // Handle clicks on map features
        if (feature.properties) {
            const content = this.formatPopupContent(feature.properties);
            this.createPopup(lngLat, content);
        }
    }

    formatPopupContent(properties) {
        // Format properties into HTML for popup
        let html = '<div class="popup-content">';
        for (const [key, value] of Object.entries(properties)) {
            if (value && key !== 'geometry') {
                html += `<p><strong>${key}:</strong> ${value}</p>`;
            }
        }
        html += '</div>';
        return html;
    }

    // Geocoding integration (same as before)
    async geocodeAddress(address) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();
        if (data && data[0]) {
            return {
                lng: parseFloat(data[0].lon),
                lat: parseFloat(data[0].lat)
            };
        }
        return null;
    }

    async centerOnAddress(address, zoom = 12) {
        const coords = await this.geocodeAddress(address);
        if (coords) {
            this.setView([coords.lat, coords.lng], zoom);
            return coords;
        }
        return null;
    }

    async geocodeAndZoom() {
        const locationInput = document.getElementById('locationInput');
        if (!locationInput) return false;
        
        const address = locationInput.value.trim();
        if (!address) {
            alert('Please enter an address or city name.');
            return false;
        }

        try {
            const coords = await this.geocodeAddress(address);
            if (coords) {
                // Store current location globally for compatibility
                window.currentLocation = coords;
                
                // Apply current zoom level to new location
                const currentLevel = window.currentZoomLevel || 'local';
                this.setZoomLevel(currentLevel);
                
                return true;
            } else {
                alert('Location not found. Please try a different address.');
                return false;
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('Error searching for location. Please try again.');
            return false;
        }
    }

    // Mobile-specific optimizations
    optimizeForMobile() {
        if (window.innerWidth < 768) {
            // Reduce max zoom for better performance
            this.map.setMaxZoom(16);
            
            // Simplify interactions
            this.map.dragRotate.disable();
            this.map.touchZoomRotate.disableRotation();
        }
    }

    // Map visibility and layout methods
    toggleCollapsed() {
        console.log('toggleCollapsed called');
        const containerSelector = this.containerId + 'Container';
        console.log('Looking for container:', containerSelector);
        const container = document.getElementById(containerSelector);
        console.log('Found container:', container);
        
        if (container) {
            const isCurrentlyCollapsed = container.classList.contains('collapsed');
            console.log('Currently collapsed:', isCurrentlyCollapsed);
            container.classList.toggle('collapsed');
            console.log('Toggled to collapsed:', !isCurrentlyCollapsed);
            
            // Update toggle button text
            const toggleBtn = document.getElementById('mapToggleBtn');
            if (toggleBtn) {
                toggleBtn.textContent = isCurrentlyCollapsed ? 'Collapse' : 'Expand';
                console.log('Button text updated to:', toggleBtn.textContent);
            }
            
            // Resize map after layout change
            setTimeout(() => {
                this.handleResize();
            }, 350); // Wait for CSS transition
            
            return !isCurrentlyCollapsed;
        } else {
            console.error('Container not found:', containerSelector);
        }
        return false;
    }

    closeMap() {
        const container = document.getElementById(this.containerId + 'Container');
        
        if (container) {
            container.style.display = 'none';
            // Store that map was closed
            localStorage.setItem('mapClosed', 'true');
            
            // Show Map button in sidebar
            const mapThumb = document.getElementById('mapThumb');
            if (mapThumb) {
                mapThumb.style.display = 'block';
            }
            
            return true;
        }
        return false;
    }

    showMap() {
        const container = document.getElementById(this.containerId + 'Container');
        
        if (container) {
            container.style.display = 'block';
            // Remove closed flag
            localStorage.removeItem('mapClosed');
            
            // Hide Map button in sidebar
            const mapThumb = document.getElementById('mapThumb');
            if (mapThumb) {
                mapThumb.style.display = 'none';
            }
            
            // Resize map after showing
            setTimeout(() => {
                this.handleResize();
            }, 100);
            return true;
        }
        return false;
    }

    // Zoom level controls
    setZoomLevel(level) {
        // Store the zoom level globally for compatibility
        if (typeof window.currentZoomLevel !== 'undefined') {
            window.currentZoomLevel = level;
        }
        
        // Update jurisdiction level for trending comments
        this.currentJurisdiction = level;
        
        switch (level) {
            case 'national':
                this.fitUSBounds();
                break;
            case 'state':
                // Fly to user's state from profile
                const userState = this.getUserState();
                if (userState) {
                    this.zoomToState(userState);
                } else {
                    // Fallback to center US if no profile state
                    this.smartFlyTo({ center: this.US_CENTER, zoom: 5 });
                }
                break;
            case 'local':
                // Fly to user's district/local area from profile
                const userDistrict = this.getUserDistrict();
                if (userDistrict) {
                    this.zoomToDistrict(userDistrict);
                } else {
                    // Fallback behavior
                    const userState = this.getUserState();
                    if (userState) {
                        this.zoomToState(userState, 8); // Closer zoom for local
                    } else {
                        this.smartFlyTo({ zoom: 8 });
                    }
                }
                break;
        }
        
        // Start trending comments for this jurisdiction
        this.startTrendingComments();
    }

    // User profile methods
    getUserState() {
        // Get state from current user profile
        if (window.currentUser && window.currentUser.state) {
            return window.currentUser.state;
        }
        return null;
    }

    getUserDistrict() {
        // Get district/city from current user profile
        if (window.currentUser) {
            return {
                city: window.currentUser.city,
                state: window.currentUser.state,
                zipCode: window.currentUser.zipCode
            };
        }
        return null;
    }

    zoomToState(stateCode, zoom = 6) {
        // Comprehensive state center coordinates
        const stateCenters = {
            'AL': [-86.7916, 32.3617], // Alabama
            'AK': [-152.4044, 61.3707], // Alaska
            'AZ': [-111.4312, 33.7298], // Arizona
            'AR': [-92.3731, 34.9697], // Arkansas
            'CA': [-119.4179, 36.7783], // California
            'CO': [-105.7821, 39.5501], // Colorado
            'CT': [-72.7354, 41.5978], // Connecticut
            'DE': [-75.5277, 39.3185], // Delaware
            'FL': [-81.5158, 27.6648], // Florida
            'GA': [-83.6431, 33.7490], // Georgia
            'HI': [-157.8583, 21.0943], // Hawaii
            'ID': [-114.7420, 44.2394], // Idaho
            'IL': [-88.9934, 40.3494], // Illinois
            'IN': [-86.1349, 39.8647], // Indiana
            'IA': [-93.7502, 42.0115], // Iowa
            'KS': [-96.7267, 38.5266], // Kansas
            'KY': [-84.6701, 37.6681], // Kentucky
            'LA': [-91.8259, 31.1695], // Louisiana
            'ME': [-69.3194, 44.6074], // Maine
            'MD': [-76.2859, 39.0639], // Maryland
            'MA': [-71.5301, 42.2373], // Massachusetts
            'MI': [-84.3476, 43.3266], // Michigan
            'MN': [-95.3656, 45.7326], // Minnesota
            'MS': [-89.6678, 32.7673], // Mississippi
            'MO': [-92.1890, 38.4623], // Missouri
            'MT': [-110.3626, 46.9048], // Montana
            'NE': [-99.9018, 41.4925], // Nebraska
            'NV': [-117.0554, 38.4199], // Nevada
            'NH': [-71.5491, 43.4525], // New Hampshire
            'NJ': [-74.5089, 40.2989], // New Jersey
            'NM': [-106.2485, 34.8405], // New Mexico
            'NY': [-74.9481, 42.9538], // New York
            'NC': [-79.0193, 35.7596], // North Carolina
            'ND': [-99.7238, 47.5515], // North Dakota
            'OH': [-82.7649, 40.3428], // Ohio
            'OK': [-96.9247, 35.4676], // Oklahoma
            'OR': [-122.0709, 44.9778], // Oregon
            'PA': [-77.1945, 40.5908], // Pennsylvania
            'RI': [-71.5118, 41.6809], // Rhode Island
            'SC': [-80.9342, 33.8361], // South Carolina
            'SD': [-99.9018, 44.2998], // South Dakota
            'TN': [-86.6823, 35.7449], // Tennessee
            'TX': [-97.5635, 31.0545], // Texas
            'UT': [-111.8910, 40.1135], // Utah
            'VT': [-72.7317, 44.0459], // Vermont
            'VA': [-78.1690, 37.7693], // Virginia
            'WA': [-121.1746, 47.0417], // Washington
            'WV': [-80.9545, 38.4680], // West Virginia
            'WI': [-90.0990, 44.2563], // Wisconsin
            'WY': [-107.3025, 42.7475]  // Wyoming
        };
        
        const center = stateCenters[stateCode];
        if (center) {
            this.smartFlyTo({
                center: center,
                zoom: zoom
            });
        }
    }

    zoomToDistrict(districtInfo) {
        // Zoom to user's local district/city area
        if (districtInfo.city && districtInfo.state) {
            // For now, zoom closer to state center - could be enhanced with city coordinates
            this.zoomToState(districtInfo.state, 10);
        }
    }

    // Loading state management
    showMapContainer() {
        console.log('showMapContainer called - hiding loading state');
        const loadingState = document.getElementById('mapLoadingState');
        const mapContainer = document.getElementById('mapContainer');
        
        if (loadingState && mapContainer) {
            // Add minimum loading time to prevent flickering
            const minLoadingTime = 1000; // 1 second minimum
            const loadStartTime = window.mapLoadStartTime || Date.now();
            const elapsed = Date.now() - loadStartTime;
            const remainingTime = Math.max(0, minLoadingTime - elapsed);
            
            console.log(`Loading for ${elapsed}ms, waiting ${remainingTime}ms more`);
            
            setTimeout(() => {
                // Hide loading state - map should now be ready
                loadingState.classList.add('hidden');
                loadingState.style.display = 'none';
                console.log('Loading state hidden, map should be visible');
                
                // Ensure map container is visible
                mapContainer.style.display = 'block';
                
                // Trigger resize to ensure map renders correctly
                setTimeout(() => {
                    console.log('Triggering map resize');
                    this.handleResize();
                }, 100);
            }, remainingTime);
        }
    }

    showLoadingError() {
        const loadingState = document.getElementById('mapLoadingState');
        if (loadingState) {
            const spinnerEl = loadingState.querySelector('.map-loading-spinner');
            const textEl = loadingState.querySelector('.map-loading-text');
            
            if (spinnerEl) {
                spinnerEl.style.display = 'none';
            }
            if (textEl) {
                textEl.textContent = 'Map failed to load. Please refresh the page.';
                textEl.style.color = '#dc3545';
            }
        }
    }

    // Display civic events on map
    displayCivicEvents() {
        // Always clear event markers first
        this.clearEventMarkers();

        // Don't show events if layer is disabled OR if no real data available
        if (!this.activeLayers.has('events')) {
            return;
        }

        const dummyContent = getDummyCivicContent();

        // Skip displaying events if array is empty (dummy data disabled)
        if (!dummyContent.events || dummyContent.events.length === 0) {
            if (typeof adminDebugLog !== 'undefined') {
                adminDebugLog('MapSystem', 'Event markers disabled - no real data available', null);
            }
            return;
        }

        // Add markers for each event
        dummyContent.events.forEach(event => {
            const el = document.createElement('div');
            el.className = 'civic-event-marker';
            el.innerHTML = `
                <div style="
                    background: ${event.type === 'council_meeting' ? '#4b5c09' : 
                               event.type === 'town_hall' ? '#2c5aa0' :
                               event.type === 'rally' ? '#dc3545' :
                               event.type === 'school_board' ? '#6f42c1' :
                               '#ffc107'};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    white-space: nowrap;
                ">
                    📅 ${event.title.substring(0, 20)}...
                </div>
            `;
            
            const marker = new maplibregl.Marker(el)
                .setLngLat(event.coordinates)
                .addTo(this.map);
            
            // Add popup on click
            el.addEventListener('click', () => {
                this.showEventDetails(event);
            });
            
            this.eventMarkers = this.eventMarkers || [];
            this.eventMarkers.push(marker);
        });
    }
    
    clearEventMarkers() {
        if (this.eventMarkers) {
            this.eventMarkers.forEach(marker => marker.remove());
            this.eventMarkers = [];
        }
    }
    
    showEventDetails(event) {
        const popup = new maplibregl.Popup({ closeOnClick: true })
            .setLngLat(event.coordinates)
            .setHTML(`
                <div style="max-width: 300px; padding: 10px;">
                    <h3 style="margin: 0 0 10px 0; color: #4b5c09;">${event.title}</h3>
                    <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${event.date}</p>
                    <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${event.location}</p>
                    <p style="margin: 10px 0;">${event.description}</p>
                    <p style="margin: 5px 0;"><strong>👥 Expected Attendees:</strong> ${event.attendees}</p>
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <button onclick="alert('RSVP feature coming soon!')" style="
                            background: #4b5c09;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                        ">RSVP</button>
                        <button onclick="alert('Share feature coming soon!')" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-weight: bold;
                        ">Share</button>
                    </div>
                </div>
            `)
            .addTo(this.map);
    }

    // Trending Comments System
    startTrendingComments() {
        // Stop any existing interval
        if (this.trendingInterval) {
            clearInterval(this.trendingInterval);
        }
        
        // Clear existing popups and cycles
        this.clearTrendingPopups();
        this.bubbleCycles = [];
        
        // Start the cycling system with responsive intervals
        // 15 seconds for expanded, 30 seconds for collapsed (half rate)
        const getIntervalTime = () => {
            const mapContainer = document.getElementById('mapContainer');
            return mapContainer && mapContainer.classList.contains('collapsed') ? 30000 : 15000;
        };

        const startInterval = () => {
            if (this.trendingInterval) {
                clearInterval(this.trendingInterval);
            }
            this.trendingInterval = setInterval(() => {
                this.manageBubbleCycles();
                // Check if interval needs to change and restart if so
                const currentInterval = getIntervalTime();
                if ((currentInterval === 30000 && this.lastInterval === 15000) ||
                    (currentInterval === 15000 && this.lastInterval === 30000)) {
                    this.lastInterval = currentInterval;
                    startInterval();
                }
            }, getIntervalTime());
            this.lastInterval = getIntervalTime();
        };

        startInterval();
        
        // Start first cycle after brief delay
        setTimeout(() => this.manageBubbleCycles(), 3000);
    }

    async manageBubbleCycles() {
        try {
            const currentTime = Date.now();
            
            // Remove cycles that are 45+ seconds old (3 cycles * 15 seconds)
            this.bubbleCycles = this.bubbleCycles.filter(cycle => {
                const age = currentTime - cycle.timestamp;
                if (age >= 45000) {
                    // Fade out these bubbles
                    cycle.popups.forEach(popup => this.fadeOutBubble(popup));
                    return false;
                }
                return true;
            });
            
            // Create new cycle
            await this.createNewBubbleCycle(currentTime);
            
        } catch (error) {
            console.error('Error managing bubble cycles:', error);
        }
    }

    async createNewBubbleCycle(timestamp) {
        // Responsive bubble count: fewer bubbles when collapsed
        const mapContainer = document.getElementById('mapContainer');
        const isCollapsed = mapContainer && mapContainer.classList.contains('collapsed');

        // Collapsed: 1-2 bubbles, Expanded: 1-3 bubbles
        const maxBubbles = isCollapsed ? 2 : 3;
        const popupCount = Math.floor(Math.random() * maxBubbles) + 1;

        if (typeof adminDebugLog !== 'undefined') {
            adminDebugLog('MapSystem', `Creating ${popupCount} bubbles (${isCollapsed ? 'collapsed' : 'expanded'} state)`, null);
        }

        const newCycle = {
            timestamp: timestamp,
            popups: []
        };
        
        for (let i = 0; i < popupCount; i++) {
            const comment = await this.fetchTrendingComment(this.currentJurisdiction);
            if (comment) {
                // Stagger bubble creation to avoid overlap
                setTimeout(async () => {
                    const popup = await this.displayTrendingPopup(comment);
                    if (popup) {
                        newCycle.popups.push(popup);
                        this.fadeInBubble(popup);
                    }
                }, i * 300); // 300ms stagger
            }
        }
        
        this.bubbleCycles.push(newCycle);
    }

    fadeInBubble(popup) {
        // Add fade-in class after a brief delay to ensure element is rendered
        setTimeout(() => {
            const popupElement = popup.getElement();
            if (popupElement) {
                popupElement.classList.add('fade-in');
            }
        }, 50);
    }

    fadeOutBubble(popup) {
        const popupElement = popup.getElement();
        if (popupElement) {
            popupElement.classList.add('fade-out');
            popupElement.classList.remove('fade-in');
            
            // Remove popup after fade animation completes
            setTimeout(() => {
                if (popup && popup.remove) {
                    popup.remove();
                    // Remove from main tracking array
                    this.trendingPopups = this.trendingPopups.filter(p => p !== popup);
                }
            }, 400); // Match CSS transition duration
        }
    }

    // Map transition methods for smooth bubble handling
    hideAllBubblesDuringTransition() {
        console.log('🔄 Hiding all bubbles for map transition...');
        this.trendingPopups.forEach(popup => {
            const popupElement = popup.getElement();
            if (popupElement) {
                popupElement.classList.add('fade-out');
                popupElement.classList.remove('fade-in');
            }
        });
    }

    showAllBubblesAfterTransition() {
        console.log('✨ Restoring all bubbles after map transition...');
        // Wait for map transition to complete, then restore bubbles
        setTimeout(() => {
            this.trendingPopups.forEach(popup => {
                const popupElement = popup.getElement();
                if (popupElement) {
                    popupElement.classList.remove('fade-out');
                    popupElement.classList.add('fade-in');
                }
            });
        }, 350); // Slightly after CSS transition completes
    }

    // Map container state adjustment with different zoom levels
    adjustForContainerState(isCollapsed) {
        console.log(`🗺️ Adjusting map for container state: ${isCollapsed ? 'collapsed' : 'expanded'}`);
        console.log(`🔍 Current jurisdiction: ${this.currentJurisdiction}`);
        console.log(`🔍 Map object exists: ${!!this.map}`);
        
        // Wait for container CSS transition to complete
        setTimeout(() => {
            try {
                // Get current map state before adjustment
                const beforeZoom = this.map.getZoom();
                const beforeCenter = this.map.getCenter();
                console.log(`📊 Before adjustment - Zoom: ${beforeZoom.toFixed(2)}, Center: [${beforeCenter.lng.toFixed(2)}, ${beforeCenter.lat.toFixed(2)}]`);
                
                // Debug map properties that might prevent zoom changes
                console.log(`🔍 Map debug info:`);
                console.log(`   - Min zoom: ${this.map.getMinZoom()}`);
                console.log(`   - Max zoom: ${this.map.getMaxZoom()}`);
                console.log(`   - Is moving: ${this.map.isMoving()}`);
                console.log(`   - Is zooming: ${this.map.isZooming()}`);
                console.log(`   - Is rotating: ${this.map.isRotating()}`);
                console.log(`   - Map loaded: ${this.map.loaded()}`);
                
                // Resize map to fit new container
                console.log('🔄 Calling map.resize()...');
                this.map.resize();
                
                // Set appropriate view based on current jurisdiction and container state
                if (this.currentJurisdiction === 'national') {
                    if (isCollapsed) {
                        console.log('📍 Setting COLLAPSED state: Zoom way out to fit US in small container');
                        // Collapsed: Use jumpTo for immediate zoom change
                        console.log('🚀 Using jumpTo() for immediate zoom change...');
                        this.map.jumpTo({
                            center: [-97.5, 39],  // Center on continental US
                            zoom: 2.1             // STANDARDIZED: Collapsed state zoom (preferred by user)
                        });
                    } else {
                        console.log('📍 Setting EXPANDED state: Zoom in for detail in large container');
                        // Expanded: Use jumpTo for immediate zoom change
                        console.log('🚀 Using jumpTo() for immediate zoom change...');
                        this.map.jumpTo({
                            center: [-97.5, 39],  // Center on continental US
                            zoom: 3.6             // Match default zoom level
                        });
                    }
                    
                    // Log the change after animation completes
                    setTimeout(() => {
                        const afterZoom = this.map.getZoom();
                        const afterCenter = this.map.getCenter();
                        console.log(`📊 After adjustment - Zoom: ${afterZoom.toFixed(2)}, Center: [${afterCenter.lng.toFixed(2)}, ${afterCenter.lat.toFixed(2)}]`);
                        console.log(`📈 Zoom change: ${beforeZoom.toFixed(2)} → ${afterZoom.toFixed(2)} (${afterZoom > beforeZoom ? '+' : ''}${(afterZoom - beforeZoom).toFixed(2)})`);
                        
                        // Double-check if zoom didn't change as expected
                        const expectedZoom = isCollapsed ? 2.1 : 3.6;
                        if (Math.abs(afterZoom - expectedZoom) > 0.1) {
                            console.warn(`⚠️ Zoom didn't reach expected level! Expected: ${expectedZoom}, Actual: ${afterZoom.toFixed(2)}`);
                            console.log(`🔄 Attempting to force zoom to ${expectedZoom}...`);
                            this.map.setZoom(expectedZoom);
                            
                            // Verify the forced zoom worked
                            setTimeout(() => {
                                const finalZoom = this.map.getZoom();
                                console.log(`✅ Final zoom after force: ${finalZoom.toFixed(2)}`);
                            }, 100);
                        }
                    }, 500); // Wait longer for easeTo animation
                    
                } else {
                    console.log('🔄 Non-national jurisdiction, just resizing...');
                    // For state/local views, just resize without changing bounds
                    this.map.resize();
                }
                
                console.log('✅ Map adjusted for new container state');
            } catch (error) {
                console.error('❌ Error adjusting map for container state:', error);
            }
        }, 320); // After CSS transition (300ms) + small buffer
    }

    async showNextTrendingComment() {
        try {
            // Get trending comment for current jurisdiction
            const comment = await this.fetchTrendingComment(this.currentJurisdiction);
            if (comment) {
                this.displayTrendingPopup(comment);
            }
        } catch (error) {
            console.error('Error showing trending comment:', error);
        }
    }

    async fetchTrendingComment(jurisdiction) {
        const userState = this.getUserState();
        const userDistrict = this.getUserDistrict();
        
        // Use dummy civic content for testing
        const dummyContent = getDummyCivicContent();
        
        // Filter content by jurisdiction and active layers
        const filteredTopics = dummyContent.trendingTopics.filter(topic => {
            // Check jurisdiction match
            const jurisdictionMatch = jurisdiction === 'national' || topic.jurisdiction === jurisdiction;
            
            // Check if any of the topic's layers are active
            const layerMatch = topic.layers.some(layer => this.activeLayers.has(layer));
            
            return jurisdictionMatch && layerMatch;
        });
        
        // Randomly select a topic
        if (filteredTopics.length > 0) {
            const topic = filteredTopics[Math.floor(Math.random() * filteredTopics.length)];
            return {
                id: topic.id,
                summary: topic.content,
                topic: topic.title,
                location: topic.location,
                coordinates: topic.coordinates,
                engagement: topic.engagement,
                time: `${Math.floor(Math.random() * 60) + 1} minutes ago`,
                tags: topic.tags,
                layers: topic.layers
            };
        }
        
        // Fallback to original mock data if no dummy content matches
        const mockComments = {
            national: [
                // Nationally relevant posts from anywhere
                {
                    id: 1,
                    summary: "Supreme Court decision impacts state voting laws nationwide...",
                    topic: "Voting Rights",
                    location: "Trending Nationally",
                    coordinates: this.getRandomUSCoordinates(),
                    engagement: 847,
                    timestamp: "1 hour ago"
                },
                {
                    id: 2,
                    summary: "Summary: 15 states debate similar healthcare legislation...",
                    topic: "Healthcare Policy",
                    location: "Multi-State Summary",
                    coordinates: this.getRandomUSCoordinates(),
                    engagement: 623,
                    timestamp: "3 hours ago"
                },
                {
                    id: 3,
                    summary: "District-level races gaining national attention across 8 states...",
                    topic: "Election Summary",
                    location: "Congressional Districts",
                    coordinates: this.getRandomUSCoordinates(),
                    engagement: 412,
                    timestamp: "5 hours ago"
                }
            ],
            state: [
                // State-specific trending + district summaries within state
                {
                    id: 4,
                    summary: `${userState || 'State'} Governor responds to federal infrastructure bill...`,
                    topic: "State Politics",
                    location: `${userState || 'State'} Capitol`,
                    coordinates: userState ? this.getStateCapitolCoords(userState) : this.getRandomUSCoordinates(),
                    engagement: 156,
                    timestamp: "2 hours ago"
                },
                {
                    id: 5,
                    summary: `Summary: District conversations about ${userState || 'state'} education funding...`,
                    topic: "District Summary",
                    location: `Multiple ${userState || 'State'} Districts`,
                    coordinates: userState ? this.getRandomStateCoordinates(userState) : this.getRandomUSCoordinates(),
                    engagement: 98,
                    timestamp: "4 hours ago"
                },
                {
                    id: 6,
                    summary: `Upcoming: ${userState || 'State'} Senate hearing on environmental policy...`,
                    topic: "State Event",
                    location: `${userState || 'State'} Legislature`,
                    coordinates: userState ? this.getStateCapitolCoords(userState) : this.getRandomUSCoordinates(),
                    engagement: 73,
                    timestamp: "6 hours ago",
                    actionable: true,
                    actionType: "contact_representative"
                }
            ],
            local: [
                // Local district trending (privacy-protected coordinates)
                {
                    id: 7,
                    summary: `${userDistrict?.city || 'Local'} school board discusses budget allocation...`,
                    topic: "Education",
                    location: `${userDistrict?.city || 'Local'} Area`,
                    coordinates: userDistrict ? this.getSecureLocalCoordinates(userDistrict) : this.getRandomUSCoordinates(),
                    engagement: 34,
                    timestamp: "1 hour ago"
                },
                {
                    id: 8,
                    summary: "City council meeting scheduled for downtown development review...",
                    topic: "Municipal Event",
                    location: `${userDistrict?.city || 'Local'} City Hall`,
                    coordinates: userDistrict ? this.getSecureLocalCoordinates(userDistrict) : this.getRandomUSCoordinates(),
                    engagement: 28,
                    timestamp: "Tomorrow 7PM",
                    actionable: true,
                    actionType: "attend_meeting"
                },
                {
                    id: 9,
                    summary: "Local candidates debate district representation priorities...",
                    topic: "Local Politics",
                    location: `${userDistrict?.city || 'District'} Area`,
                    coordinates: userDistrict ? this.getSecureLocalCoordinates(userDistrict) : this.getRandomUSCoordinates(),
                    engagement: 19,
                    timestamp: "3 hours ago"
                }
            ]
        };

        const comments = mockComments[jurisdiction] || [];
        return comments[Math.floor(Math.random() * comments.length)];
    }

    getRandomUSCoordinates() {
        // Random coordinates within US bounds for national trending
        const lng = -130 + Math.random() * 65; // -130 to -65
        const lat = 24 + Math.random() * 26;   // 24 to 50
        return [lng, lat];
    }

    getStateCapitolCoords(stateCode) {
        // Comprehensive state capitol coordinates for all 50 states + territories
        const capitolCoords = {
            // Continental US States
            'AL': [-86.7911, 32.377716], // Montgomery
            'AZ': [-112.073844, 33.448457], // Phoenix
            'AR': [-92.331122, 34.736009], // Little Rock
            'CA': [-121.4686, 38.5767], // Sacramento
            'CO': [-105.015861, 39.739236], // Denver
            'CT': [-72.677, 41.767], // Hartford
            'DE': [-75.526755, 39.161921], // Dover
            'FL': [-84.2700, 30.4518], // Tallahassee
            'GA': [-84.39, 33.76], // Atlanta
            'ID': [-116.237651, 43.613739], // Boise
            'IL': [-89.650373, 39.78325], // Springfield
            'IN': [-86.147685, 39.790942], // Indianapolis
            'IA': [-93.620866, 41.590939], // Des Moines
            'KS': [-95.69, 39.04], // Topeka
            'KY': [-84.86311, 38.197274], // Frankfort
            'LA': [-91.140229, 30.45809], // Baton Rouge
            'ME': [-69.765261, 44.323535], // Augusta
            'MD': [-76.501157, 38.972945], // Annapolis
            'MA': [-71.0275, 42.2352], // Boston
            'MI': [-84.5467, 42.354558], // Lansing
            'MN': [-94.6859, 46.729553], // Saint Paul
            'MS': [-90.207, 32.32], // Jackson
            'MO': [-92.189283, 38.572954], // Jefferson City
            'MT': [-112.027031, 46.595805], // Helena
            'NE': [-96.675345, 40.809868], // Lincoln
            'NV': [-119.753877, 39.161921], // Carson City
            'NH': [-71.549709, 43.220093], // Concord
            'NJ': [-74.756138, 40.221741], // Trenton
            'NM': [-105.964575, 35.667231], // Santa Fe
            'NY': [-73.7562, 42.6526], // Albany
            'NC': [-78.638, 35.771], // Raleigh
            'ND': [-100.779004, 46.813343], // Bismarck
            'OH': [-82.999069, 39.961176], // Columbus
            'OK': [-97.544594, 35.482309], // Oklahoma City
            'OR': [-123.029159, 44.931109], // Salem
            'PA': [-76.875613, 40.269789], // Harrisburg
            'RI': [-71.422132, 41.82355], // Providence
            'SC': [-81.035, 34.000], // Columbia
            'SD': [-100.346405, 44.367966], // Pierre
            'TN': [-86.784, 36.165], // Nashville
            'TX': [-97.7431, 30.2672], // Austin
            'UT': [-111.892622, 40.777477], // Salt Lake City
            'VT': [-72.57194, 44.26639], // Montpelier
            'VA': [-77.46, 37.54], // Richmond
            'WA': [-122.893077, 47.042418], // Olympia
            'WV': [-81.633294, 38.349497], // Charleston
            'WI': [-89.384444, 43.074722], // Madison
            'WY': [-104.802042, 41.145548], // Cheyenne

            // Alaska & Hawaii
            'AK': [-152.404419, 61.270716], // Anchorage (largest city)
            'HI': [-157.826182, 21.30895], // Honolulu

            // US Territories with voting rights
            'PR': [-66.590149, 18.220833], // San Juan, Puerto Rico
            'VI': [-64.896334, 17.718], // Charlotte Amalie, USVI
            'GU': [144.793731, 13.444304], // Hagåtña, Guam
            'AS': [-170.132217, -14.270972], // Pago Pago, American Samoa
            'MP': [145.38, 15.0979], // Saipan, Northern Mariana Islands
        };
        return capitolCoords[stateCode] || this.US_CENTER;
    }

    getRandomStateCoordinates(stateCode) {
        // Random coordinates within state bounds for district summaries
        const stateBounds = {
            'CA': { minLng: -124.4, maxLng: -114.1, minLat: 32.5, maxLat: 42.0 },
            'TX': { minLng: -106.6, maxLng: -93.5, minLat: 25.8, maxLat: 36.5 },
            'NY': { minLng: -79.8, maxLng: -71.9, minLat: 40.5, maxLat: 45.0 },
            'FL': { minLng: -87.6, maxLng: -80.0, minLat: 24.4, maxLat: 31.0 }
            // Add more as needed
        };
        
        const bounds = stateBounds[stateCode];
        if (bounds) {
            const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
            const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
            return [lng, lat];
        }
        return this.getRandomUSCoordinates();
    }

    getSecureLocalCoordinates(districtInfo) {
        // Secure local coordinates - randomized within district to prevent doxxing
        // For specific known locations, use approximate coordinates
        if (districtInfo && districtInfo.city) {
            const cityCoords = {
                'Troy': [-73.6918, 42.7284], // Troy, NY
                'Albany': [-73.7562, 42.6526], // Albany, NY  
                'Schenectady': [-73.9395, 42.8142], // Schenectady, NY
                'Buffalo': [-78.8784, 42.8864], // Buffalo, NY
                'Rochester': [-77.6088, 43.1566], // Rochester, NY
                'Syracuse': [-76.1474, 43.0481], // Syracuse, NY
                // Add more cities as needed
            };
            
            const coords = cityCoords[districtInfo.city];
            if (coords) {
                // Add small random offset for privacy (±0.01 degrees ≈ ±1km)
                return [
                    coords[0] + (Math.random() - 0.5) * 0.02,
                    coords[1] + (Math.random() - 0.5) * 0.02
                ];
            }
        }
        
        // Fallback: use state-level randomization with higher zoom
        return this.getRandomStateCoordinates(districtInfo?.state || 'NY');
    }

    getUserState() {
        // Get user's state from localStorage or currentUser profile
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.address) {
            // Extract state from address - assuming format includes state abbreviation
            const addressParts = currentUser.address.split(',').map(part => part.trim());
            // Look for NY, CA, TX etc. in address
            for (const part of addressParts) {
                if (/^[A-Z]{2}$/.test(part)) {
                    return part;
                }
            }
            // Fallback: if address contains "Troy", assume NY
            if (currentUser.address.toLowerCase().includes('troy')) {
                return 'NY';
            }
        }
        // Default fallback for demo purposes
        return 'NY';
    }

    getUserDistrict() {
        // Get user's district info from localStorage or currentUser profile
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.address) {
            const address = currentUser.address.toLowerCase();
            // Extract city from address
            if (address.includes('troy')) {
                return { city: 'Troy', state: 'NY' };
            } else if (address.includes('albany')) {
                return { city: 'Albany', state: 'NY' };
            } else if (address.includes('schenectady')) {
                return { city: 'Schenectady', state: 'NY' };
            }
            // Add more city detection as needed
        }
        
        // Default fallback for demo purposes - user is in Troy, NY
        return { city: 'Troy', state: 'NY' };
    }

    displayTrendingPopup(comment) {
        // Adjust coordinates slightly to prevent overlapping popups
        const adjustedCoords = [
            comment.coordinates[0] + (Math.random() - 0.5) * 2, // ±1 degree longitude
            comment.coordinates[1] + (Math.random() - 0.5) * 1   // ±0.5 degree latitude
        ];

        // Truncate text to appropriate length for bubble display
        const maxLength = 120; // Character limit for bubble text
        let displayText = comment.summary || comment.content || '';
        if (displayText.length > maxLength) {
            displayText = displayText.substring(0, maxLength).trim() + '...';
        }

        // Simplified chat bubble with only text content
        // For mock data: topics have 'topic' property, regular comments don't
        // For real API data: check for topicId and aiTopic properties
        const isAITopic = comment.topic || (comment.topicId && comment.aiTopic);
        const topicIdentifier = comment.topic || comment.topicId || comment.id;
        const clickHandler = isAITopic ? 
            `window.enterTopicMode && window.enterTopicMode('${topicIdentifier}')` : 
            `window.navigateToComment && window.navigateToComment('${comment.id}')`;
        const clickTitle = isAITopic ? 
            "Click to view posts about this topic" : 
            "Click to view full conversation";
            
        const popupHtml = `
            <div class="trending-bubble" onclick="${clickHandler}" 
                 title="${clickTitle}" 
                 data-comment-id="${comment.id}" ${isAITopic ? `data-topic-id="${topicIdentifier}"` : ''}>
                <div class="bubble-content">
                    ${displayText}
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'trending-bubble-popup',
            maxWidth: '220px',
            anchor: 'bottom',
            offset: 12
        })
        .setLngLat(adjustedCoords)
        .setHTML(popupHtml)
        .addTo(this.map);

        // Add hover effect to the bubble
        const bubbleElement = popup.getElement();
        if (bubbleElement) {
            const bubble = bubbleElement.querySelector('.trending-bubble');
            if (bubble) {
                bubble.style.cursor = 'pointer';
                bubble.addEventListener('mouseenter', () => {
                    bubble.style.transform = 'scale(1.02)';
                    bubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                bubble.addEventListener('mouseleave', () => {
                    bubble.style.transform = 'scale(1)';
                    bubble.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                });
            }
        }

        // Store popup reference
        this.trendingPopups.push(popup);

        // Return the popup for cycle management
        return popup;
    }

    clearTrendingPopups() {
        this.trendingPopups.forEach(popup => popup.remove());
        this.trendingPopups = [];
    }

    // Layer Management System
    toggleLayer(layerName) {
        console.log(`🔧 Toggling layer: ${layerName}`);
        
        if (this.activeLayers.has(layerName)) {
            // Deactivate layer
            this.activeLayers.delete(layerName);
            this.clearLayerPopups(layerName);
            console.log(`❌ Layer ${layerName} deactivated`);
        } else {
            // Activate layer
            this.activeLayers.add(layerName);
            this.startLayerContent(layerName);
            console.log(`✅ Layer ${layerName} activated`);
        }
    }

    clearLayerPopups(layerName) {
        if (this.layerPopups.has(layerName)) {
            this.layerPopups.get(layerName).forEach(popup => popup.remove());
            this.layerPopups.delete(layerName);
        }
        
        if (layerName === 'trending') {
            this.clearTrendingPopups();
        }
    }

    startLayerContent(layerName) {
        // Start showing content for the specified layer
        if (layerName === 'trending') {
            this.startTrendingComments();
        }
        // Add other layer types here as they're implemented
    }

    setJurisdiction(jurisdiction) {
        console.log(`🗺️ Setting jurisdiction to: ${jurisdiction}`);
        this.currentJurisdiction = jurisdiction;
        
        // Update map view based on jurisdiction
        let zoomLevel;
        switch (jurisdiction) {
            case 'national':
                // Use fitBounds to show full US regardless of container size
                this.map.fitBounds([
                    [-130, 24], // Southwest corner (Alaska/Hawaii included)
                    [-65, 50]   // Northeast corner
                ], {
                    padding: 20,
                    duration: 1000
                });
                break;
            case 'state':
                zoomLevel = 6;
                const userState = this.getUserState();
                if (userState) {
                    const stateCoords = this.getStateCapitolCoords(userState);
                    this.smartFlyTo({
                        center: stateCoords,
                        zoom: zoomLevel
                    });
                }
                break;
            case 'local':
                zoomLevel = 10;
                const userDistrict = this.getUserDistrict();
                if (userDistrict) {
                    const localCoords = this.getSecureLocalCoordinates(userDistrict);
                    this.smartFlyTo({
                        center: localCoords,
                        zoom: zoomLevel
                    });
                }
                break;
        }
        
        // Refresh content for new jurisdiction
        this.refreshActiveLayersContent();
    }

    refreshActiveLayersContent() {
        // Clear all current popups
        this.activeLayers.forEach(layer => {
            this.clearLayerPopups(layer);
        });
        
        // Restart content for active layers
        this.activeLayers.forEach(layer => {
            this.startLayerContent(layer);
        });
    }

    // Civic Social Infrastructure Methods
    joinCivicGroup(jurisdiction, topic) {
        console.log(`Joining civic group: ${jurisdiction} - ${topic}`);
        
        // Create or join civic group
        const groupKey = `${jurisdiction}-${topic}`;
        if (!this.civicGroups.has(groupKey)) {
            this.civicGroups.set(groupKey, {
                jurisdiction,
                topic,
                members: 1,
                created: new Date(),
                recentActivity: []
            });
        } else {
            const group = this.civicGroups.get(groupKey);
            group.members++;
        }
        
        // For now, show a modal with group information
        this.showCivicGroupModal(jurisdiction, topic);
    }

    takeAction(commentId, actionType) {
        console.log(`Taking action: ${actionType} for comment ${commentId}`);
        
        // Track user's civic action
        const action = {
            commentId,
            actionType,
            timestamp: new Date(),
            jurisdiction: this.currentJurisdiction,
            completed: false
        };
        
        this.userCivicActions.push(action);
        
        // Show action modal with specific steps
        this.showActionModal(actionType, commentId);
    }

    showCivicGroupModal(jurisdiction, topic) {
        // Create modal to show civic group information
        const modalHtml = `
            <div class="civic-modal-overlay" onclick="this.remove()">
                <div class="civic-modal" onclick="event.stopPropagation()">
                    <div class="civic-modal-header">
                        <h3>💬 ${topic} Community</h3>
                        <span class="civic-modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                    </div>
                    <div class="civic-modal-content">
                        <div class="civic-group-info">
                            <div class="jurisdiction-badge">${jurisdiction.charAt(0).toUpperCase() + jurisdiction.slice(1)} Level</div>
                            <p>Connect with others in your area discussing <strong>${topic}</strong>.</p>
                            
                            <div class="civic-group-features">
                                <div class="feature-item">
                                    <div class="feature-icon">📅</div>
                                    <div class="feature-text">
                                        <strong>Upcoming Events</strong>
                                        <p>Find meetings and actions related to this topic</p>
                                    </div>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">🏛️</div>
                                    <div class="feature-text">
                                        <strong>Representative Info</strong>
                                        <p>Contact officials who can act on this issue</p>
                                    </div>
                                </div>
                                <div class="feature-item">
                                    <div class="feature-icon">📊</div>
                                    <div class="feature-text">
                                        <strong>Action Tracking</strong>
                                        <p>See real progress on this issue in your area</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="civic-modal-footer">
                        <button class="modal-btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Maybe Later</button>
                        <button class="modal-btn primary" onclick="alert('Full civic group features coming soon!'); this.parentElement.parentElement.parentElement.remove();">Join Community</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);
    }

    showActionModal(actionType, commentId) {
        const actionSteps = this.getActionSteps(actionType);
        
        const modalHtml = `
            <div class="civic-modal-overlay" onclick="this.remove()">
                <div class="civic-modal" onclick="event.stopPropagation()">
                    <div class="civic-modal-header">
                        <h3>🎯 Take Civic Action</h3>
                        <span class="civic-modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                    </div>
                    <div class="civic-modal-content">
                        <div class="action-info">
                            <h4>${actionSteps.title}</h4>
                            <div class="action-steps">
                                ${actionSteps.steps.map((step, index) => `
                                    <div class="action-step">
                                        <div class="step-number">${index + 1}</div>
                                        <div class="step-content">${step}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="civic-modal-footer">
                        <button class="modal-btn secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Not Now</button>
                        <button class="modal-btn primary" onclick="alert('Action tracking features coming soon!'); this.parentElement.parentElement.parentElement.remove();">I'll Do This</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);
    }

    getActionSteps(actionType) {
        const actionMap = {
            'attend_meeting': {
                title: 'Attend Public Meeting',
                steps: [
                    'Check the meeting agenda and location',
                    'Prepare questions or comments about the issue',
                    'Attend the meeting and participate in public comment',
                    'Report back to the community what happened'
                ]
            },
            'contact_representative': {
                title: 'Contact Your Representative',
                steps: [
                    'Find your representative\'s contact information',
                    'Write a clear, specific message about the issue',
                    'Call or email their office',
                    'Follow up and share their response with the community'
                ]
            },
            'organize_action': {
                title: 'Organize Community Action',
                steps: [
                    'Create an event or gathering',
                    'Invite others from your civic community',
                    'Plan specific actions or goals',
                    'Execute the plan and document results'
                ]
            },
            'vote': {
                title: 'Vote on This Issue',
                steps: [
                    'Check your voter registration status',
                    'Research candidates\' positions on this issue',
                    'Make a voting plan (when, where, how)',
                    'Vote and encourage others to vote too'
                ]
            }
        };
        
        return actionMap[actionType] || {
            title: 'Take Civic Action',
            steps: ['Research the issue further', 'Connect with your community', 'Take appropriate action']
        };
    }

    // Cleanup method
    destroy() {
        if (this.trendingInterval) {
            clearInterval(this.trendingInterval);
        }
        this.clearTrendingPopups();
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

// Initialize when ready
let uwrMap = null;

// Dummy civic content for testing
// Generate random coordinates within CONUS, Alaska, Hawaii, and territories
function generateRandomCoordinates() {
    const regions = [
        // Continental US (85% probability)
        { bounds: [[-125, 25], [-65, 49]], weight: 85, name: 'CONUS' },
        // Alaska (5% probability)
        { bounds: [[-170, 55], [-130, 71]], weight: 5, name: 'Alaska' },
        // Hawaii (5% probability)
        { bounds: [[-162, 18], [-154, 23]], weight: 5, name: 'Hawaii' },
        // Puerto Rico (3% probability)
        { bounds: [[-67.5, 17.5], [-65.5, 18.7]], weight: 3, name: 'Puerto Rico' },
        // US Virgin Islands (1% probability)
        { bounds: [[-65.2, 17.6], [-64.5, 18.5]], weight: 1, name: 'USVI' },
        // Guam (1% probability)
        { bounds: [[144.5, 13.2], [145.0, 13.7]], weight: 1, name: 'Guam' }
    ];

    // Weighted random selection
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedRegion = regions[0]; // Default to CONUS

    for (const region of regions) {
        cumulative += region.weight;
        if (rand <= cumulative) {
            selectedRegion = region;
            break;
        }
    }

    const [[minLng, minLat], [maxLng, maxLat]] = selectedRegion.bounds;
    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);

    return { coordinates: [lng, lat], region: selectedRegion.name };
}

function getDummyCivicContent() {
    // Note: Events are temporarily disabled until real data is available
    // Remove this comment and uncomment events array when ready to show real events
    return {
        events: [], // Disabled dummy events per user request
        
        // Generate diverse trending topics with random geographic distribution
        trendingTopics: (() => {
            const topics = [
                {
                    id: 'topic1',
                    title: 'Infrastructure Bill Impact',
                    content: 'New federal infrastructure funding allocates $2.3B to our state for road improvements and public transit upgrades.',
                    engagement: 1250,
                    jurisdiction: 'state',
                    tags: ['infrastructure', 'federal_funding', 'transportation'],
                    layers: ['news', 'civic']
                },
                {
                    id: 'topic2',
                    title: 'Local Housing Crisis',
                    content: 'City council debates rent control measures as housing costs rise 30% in past year.',
                    engagement: 890,
                    jurisdiction: 'local',
                    tags: ['housing', 'rent_control', 'affordability'],
                    layers: ['trending', 'civic']
                },
                {
                    id: 'topic3',
                    title: 'Education Funding Debate',
                    content: 'State legislature considers increasing teacher salaries by 15% amid budget negotiations.',
                    engagement: 2100,
                    jurisdiction: 'state',
                    tags: ['education', 'teachers', 'budget'],
                    layers: ['news', 'civic', 'community']
                },
                {
                    id: 'topic4',
                    title: 'Environmental Protection Act',
                    content: 'National debate on new EPA regulations affecting local businesses and industry.',
                    engagement: 5400,
                    jurisdiction: 'national',
                    tags: ['environment', 'regulation', 'business'],
                    layers: ['news', 'trending']
                },
                {
                    id: 'topic5',
                    title: 'Police Reform Initiative',
                    content: 'Community-led police reform proposal gains traction with city officials.',
                    engagement: 1800,
                    jurisdiction: 'local',
                    tags: ['police_reform', 'community', 'public_safety'],
                    layers: ['trending', 'community', 'civic']
                },
                {
                    id: 'topic6',
                    title: 'Downtown Concert Series',
                    content: 'Local band performs at city hall plaza fundraiser for community center renovations.',
                    engagement: 340,
                    jurisdiction: 'local',
                    tags: ['community', 'arts', 'fundraiser'],
                    layers: ['events', 'community']
                },
                {
                    id: 'topic7',
                    title: 'Breaking: Supreme Court Rules',
                    content: 'Supreme Court decision on redistricting case affects elections in 12 states.',
                    engagement: 8900,
                    jurisdiction: 'national',
                    tags: ['supreme_court', 'redistricting', 'elections'],
                    layers: ['news', 'trending', 'civic']
                },
                {
                    id: 'topic8',
                    title: 'Neighborhood Watch Meeting',
                    content: 'Monthly community safety discussion and new member orientation.',
                    engagement: 85,
                    jurisdiction: 'local',
                    tags: ['public_safety', 'neighborhood', 'volunteer'],
                    layers: ['events', 'community']
                },
                {
                    id: 'topic9',
                    title: 'Coastal Protection Initiative',
                    content: 'New seawall construction approved to protect against rising sea levels.',
                    engagement: 450,
                    jurisdiction: 'local',
                    tags: ['climate', 'infrastructure', 'coastal'],
                    layers: ['news', 'civic']
                },
                {
                    id: 'topic10',
                    title: 'Rural Broadband Expansion',
                    content: 'Federal grant provides high-speed internet access to remote communities.',
                    engagement: 680,
                    jurisdiction: 'state',
                    tags: ['technology', 'rural', 'connectivity'],
                    layers: ['news', 'community']
                },
                {
                    id: 'topic11',
                    title: 'Veterans Healthcare Access',
                    content: 'New VA facility opens, reducing travel time for veterans seeking care.',
                    engagement: 920,
                    jurisdiction: 'local',
                    tags: ['veterans', 'healthcare', 'access'],
                    layers: ['news', 'community']
                },
                {
                    id: 'topic12',
                    title: 'Tribal Sovereignty Discussion',
                    content: 'Native American leaders meet with state officials on land rights and jurisdiction.',
                    engagement: 730,
                    jurisdiction: 'state',
                    tags: ['tribal', 'sovereignty', 'rights'],
                    layers: ['news', 'civic']
                },
                {
                    id: 'topic13',
                    title: 'Tourism Recovery Plan',
                    content: 'Local businesses collaborate on strategies to boost tourism and economic recovery.',
                    engagement: 380,
                    jurisdiction: 'local',
                    tags: ['tourism', 'economy', 'recovery'],
                    layers: ['community', 'trending']
                },
                {
                    id: 'topic14',
                    title: 'Military Base Expansion',
                    content: 'Defense Department announces major facility upgrades and job creation.',
                    engagement: 560,
                    jurisdiction: 'local',
                    tags: ['military', 'jobs', 'defense'],
                    layers: ['news', 'community']
                },
                {
                    id: 'topic15',
                    title: 'Agricultural Support Program',
                    content: 'New federal assistance helps farmers adapt to climate challenges.',
                    engagement: 420,
                    jurisdiction: 'state',
                    tags: ['agriculture', 'climate', 'support'],
                    layers: ['news', 'civic']
                }
            ];

            // Assign random coordinates to each topic
            return topics.map(topic => {
                const coordData = generateRandomCoordinates();
                return {
                    ...topic,
                    coordinates: coordData.coordinates,
                    location: coordData.region,
                    region: coordData.region
                };
            });
        })(),
        
        civicGroups: [
            {
                id: 'group1',
                name: 'Citizens for Transparent Government',
                members: 450,
                jurisdiction: 'state',
                focus: 'Government accountability and transparency',
                nextMeeting: '2025-01-16 19:00'
            },
            {
                id: 'group2',
                name: 'Green Future Coalition',
                members: 320,
                jurisdiction: 'local',
                focus: 'Environmental protection and sustainability',
                nextMeeting: '2025-01-19 18:30'
            },
            {
                id: 'group3',
                name: 'Education First Alliance',
                members: 280,
                jurisdiction: 'state',
                focus: 'Improving public education funding and policy',
                nextMeeting: '2025-01-21 17:00'
            }
        ],
        
        representatives: [
            {
                id: 'rep1',
                name: 'Senator Jane Smith',
                role: 'U.S. Senator',
                party: 'Independent',
                nextTownHall: '2025-01-23 14:00',
                keyIssues: ['Healthcare', 'Climate', 'Education']
            },
            {
                id: 'rep2',
                name: 'Rep. Michael Johnson',
                role: 'State Representative',
                party: 'Democrat',
                nextTownHall: '2025-01-20 18:00',
                keyIssues: ['Housing', 'Transportation', 'Jobs']
            },
            {
                id: 'rep3',
                name: 'Mayor Sarah Williams',
                role: 'City Mayor',
                party: 'Republican',
                nextTownHall: '2025-01-25 19:00',
                keyIssues: ['Public Safety', 'Infrastructure', 'Business']
            }
        ]
    };
}

function initializeMapLibre() {
    // Prevent double initialization
    if (window.mapLibreInitialized) {
        console.log('🗺️ MapLibre already initialized, skipping');
        return;
    }
    
    // Only initialize if container exists
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
    // Mark as initializing
    window.mapLibreInitialized = true;
    
    // Set loading start time
    window.mapLoadStartTime = Date.now();
    
    // Check if map was previously closed - if so, skip loading state
    const mapWasClosed = localStorage.getItem('mapClosed') === 'true';
    if (mapWasClosed) {
        const loadingState = document.getElementById('mapLoadingState');
        const mapContainerEl = document.getElementById('mapContainer');
        if (loadingState) loadingState.style.display = 'none';
        if (mapContainerEl) mapContainerEl.style.display = 'none';
    }
    
    // Check if we should use MapLibre (can toggle this during migration)
    const useMapLibre = true; // Set to false to use Leaflet
    
    if (useMapLibre) {
        console.log('Initializing MapLibre GL map...');
        
        // IMPROVED FIX: Show map container but keep loading state visible during initialization
        // MapLibre needs the container to be visible to measure dimensions correctly
        const mapContainer = document.getElementById('mapContainer');
        const loadingState = document.getElementById('mapLoadingState');
        
        if (mapContainer && !mapWasClosed) {
            console.log('Making map container visible for MapLibre initialization...');
            // Show the map container immediately (loading state is now inside as overlay)
            mapContainer.style.display = 'block';
            
            if (loadingState) {
                // Ensure loading state is visible as overlay
                loadingState.style.display = 'flex';
                loadingState.classList.remove('hidden');
                console.log('Loading state shown as overlay');
            }
        }
        
        uwrMap = new UWRMapLibre('map');
        uwrMap.initialize().then(map => {
            console.log('MapLibre map initialized successfully - PROMISE CALLBACK');
            
            // Check if map was previously closed
            const mapWasClosed = localStorage.getItem('mapClosed') === 'true';
            if (mapWasClosed) {
                // Show sidebar Map button
                const mapThumb = document.getElementById('mapThumb');
                if (mapThumb) {
                    mapThumb.style.display = 'block';
                }
            } else {
                // Set National as default active button
                updateMapViewButtons('national');
            }
            
            // Make compatible with existing code expecting window.map
            window.map = {
                // Wrapper methods for Leaflet compatibility
                setView: (center, zoom) => uwrMap.setView(center, zoom),
                invalidateSize: () => uwrMap.invalidateSize(),
                closePopup: () => uwrMap.closeAllPopups(),
                fitBounds: (bounds) => uwrMap.fitBounds(bounds),
                // New MapLibre-specific methods
                toggleCollapsed: () => {
                    console.log('window.map.toggleCollapsed called');
                    return uwrMap.toggleCollapsed();
                },
                closeMap: () => uwrMap.closeMap(),
                showMap: () => uwrMap.showMap(),
                // Transition methods for smooth bubble handling
                hideBubbles: () => uwrMap.hideAllBubblesDuringTransition(),
                showBubbles: () => uwrMap.showAllBubblesAfterTransition(),
                // Map container state adjustment
                adjustForContainerState: (isCollapsed) => uwrMap.adjustForContainerState(isCollapsed),
                setZoomLevel: (level) => {
                    uwrMap.setZoomLevel(level);
                    // Update button states
                    updateMapViewButtons(level);
                },
                geocodeAndZoom: () => uwrMap.geocodeAndZoom(),
                // Layer management system
                toggleLayer: (layerName) => uwrMap.toggleLayer(layerName),
                setJurisdiction: (jurisdiction) => uwrMap.setJurisdiction(jurisdiction),
                // MapLibre instance for advanced use
                _maplibre: map,
                _uwrMap: uwrMap
            };
            
            console.log('window.map object created:', window.map);
            console.log('toggleCollapsed method:', window.map.toggleCollapsed);
            
            // Make uwrMap globally available too
            window.uwrMap = uwrMap;
        }).catch(error => {
            console.error('MapLibre initialization failed:', error);
            // Create a fallback window.map object
            window.map = {
                toggleCollapsed: () => {
                    console.log('Fallback toggleCollapsed called - MapLibre failed to initialize');
                    // Fallback toggle logic
                    const container = document.getElementById('mapContainer');
                    if (container) {
                        container.classList.toggle('collapsed');
                        const toggleBtn = document.getElementById('mapToggleBtn');
                        if (toggleBtn) {
                            const isCollapsed = container.classList.contains('collapsed');
                            toggleBtn.textContent = isCollapsed ? 'Expand' : 'Collapse';
                        }
                    }
                }
            };
        });
    }
}

// Export immediately after function definition to avoid race conditions
window.initializeMapLibre = initializeMapLibre;

// Global functions for HTML button integration
window.toggleMapView = function(level) {
    if (window.map && window.map.setZoomLevel) {
        window.map.setZoomLevel(level);
    }
};

window.toggleMapSize = function() {
    if (window.map && window.map.toggleCollapsed) {
        window.map.toggleCollapsed();
    }
};

window.closeMap = function() {
    if (window.map && window.map.closeMap) {
        window.map.closeMap();
    }
};

window.showMapFromSidebar = function() {
    if (window.map && window.map.showMap) {
        window.map.showMap();
    }
};

window.updateMapViewButtons = function(currentLevel) {
    // Update button states to show which view is active
    const buttons = document.querySelectorAll('.map-action-buttons .map-action-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase() === currentLevel) {
            btn.classList.add('active');
        }
    });
};

// Auto-initialize the map when the script loads
console.log('map-maplibre.js script loaded, initializing...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, calling initializeMapLibre()');
    initializeMapLibre();
});

// Also initialize immediately if DOM is already ready
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    console.log('DOM still loading, waiting for DOMContentLoaded event');
} else {
    // DOM already loaded, initialize immediately
    console.log('DOM already ready, calling initializeMapLibre() immediately');
    initializeMapLibre();
}

// Global navigation function for trending comment clicks
window.navigateToComment = function(commentId) {
    console.log('Navigating to comment:', commentId);
    
    try {
        // Get the main content area
        const postsFeed = document.getElementById('postsFeed');
        if (!postsFeed) {
            console.error('Posts feed not found');
            return;
        }

        // Get the comment data from the dummy content
        const dummyContent = getDummyCivicContent();
        const topicData = dummyContent.trendingTopics.find(topic => topic.id === commentId);
        
        if (topicData) {
            console.log('Found topic data, populating main content...');
            
            // Create conversation view in main content area
            const conversationHtml = `
                <div class="conversation-view">
                    <div class="conversation-header">
                        <button onclick="goBackToFeed()" class="back-btn">← Back to Feed</button>
                        <div class="conversation-meta">
                            <h2 class="conversation-title">${topicData.title}</h2>
                            <div class="conversation-location">
                                📍 ${topicData.location} • 
                                <span class="engagement-count">💬 ${topicData.engagement} people discussing</span>
                            </div>
                            <div class="conversation-tags">
                                ${topicData.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="conversation-content">
                        <div class="main-post">
                            <div class="post-header">
                                <div class="post-author">
                                    <div class="author-avatar">🗣️</div>
                                    <div class="author-info">
                                        <div class="author-name">Community Discussion</div>
                                        <div class="post-time">From your area • Trending now</div>
                                    </div>
                                </div>
                            </div>
                            <div class="post-body">
                                <p>${topicData.content}</p>
                            </div>
                            <div class="post-actions">
                                <button class="action-btn like-btn">❤️ Like</button>
                                <button class="action-btn comment-btn">💬 Comment</button>
                                <button class="action-btn share-btn">📤 Share</button>
                            </div>
                        </div>
                        
                        <div class="comments-section">
                            <div class="add-comment">
                                <textarea placeholder="Add your thoughts to this discussion..." rows="3"></textarea>
                                <button class="btn comment-submit-btn">Post Comment</button>
                            </div>
                            
                            <div class="comments-list">
                                <div class="comment">
                                    <div class="comment-avatar">👤</div>
                                    <div class="comment-content">
                                        <div class="comment-header">
                                            <span class="comment-author">@LocalCitizen</span>
                                            <span class="comment-time">2 hours ago</span>
                                        </div>
                                        <div class="comment-body">
                                            This is exactly what our community needs. I've been following this issue closely and the impact will be significant for local families.
                                        </div>
                                        <div class="comment-actions">
                                            <button class="comment-action">❤️ 12</button>
                                            <button class="comment-action">💬 Reply</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="comment">
                                    <div class="comment-avatar">👩</div>
                                    <div class="comment-content">
                                        <div class="comment-header">
                                            <span class="comment-author">@ConcernedParent</span>
                                            <span class="comment-time">1 hour ago</span>
                                        </div>
                                        <div class="comment-body">
                                            Has anyone attended the recent town halls about this? I'd love to hear firsthand accounts of what was discussed.
                                        </div>
                                        <div class="comment-actions">
                                            <button class="comment-action">❤️ 8</button>
                                            <button class="comment-action">💬 Reply</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="comment">
                                    <div class="comment-avatar">🏛️</div>
                                    <div class="comment-content">
                                        <div class="comment-header">
                                            <span class="comment-author">@CivicVolunteer</span>
                                            <span class="comment-time">30 minutes ago</span>
                                        </div>
                                        <div class="comment-body">
                                            I can help connect people with the right representatives to voice concerns. DM me if you want contact information for your district officials.
                                        </div>
                                        <div class="comment-actions">
                                            <button class="comment-action">❤️ 15</button>
                                            <button class="comment-action">💬 Reply</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Update the main content
            postsFeed.innerHTML = conversationHtml;
            
            // Scroll to top of conversation
            postsFeed.scrollTop = 0;
            
            // Show a brief success message
            console.log('✅ Conversation loaded in main content area');
            
        } else {
            console.log('Topic data not found, showing general message');
            
            // Show a general "join the conversation" view
            const generalHtml = `
                <div class="conversation-view">
                    <div class="conversation-header">
                        <button onclick="goBackToFeed()" class="back-btn">← Back to Feed</button>
                        <h2 class="conversation-title">Join the Discussion</h2>
                    </div>
                    
                    <div class="conversation-content">
                        <div class="main-post">
                            <div class="post-body">
                                <p>💬 <strong>Looking for discussion ID: ${commentId}</strong></p>
                                <p>This conversation is part of the trending political discussions in your area. 
                                   Check out the latest trending topics below or start your own discussion.</p>
                            </div>
                            <div class="post-actions">
                                <button class="btn" onclick="if(window.toggleTrendingPanel) window.toggleTrendingPanel()">View All Trending 🔥</button>
                                <button class="btn" onclick="goBackToFeed()">Back to Feed</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            postsFeed.innerHTML = generalHtml;
        }
        
    } catch (error) {
        console.error('Error navigating to comment:', error);
        // Fallback: show error message in main content
        const postsFeed = document.getElementById('postsFeed');
        if (postsFeed) {
            postsFeed.innerHTML = `
                <div class="error-message">
                    <h2>Unable to Load Conversation</h2>
                    <p>There was an error loading the discussion. Please try again.</p>
                    <button class="btn" onclick="goBackToFeed()">Back to Feed</button>
                </div>
            `;
        }
    }
};

// Function to go back to the main feed
window.goBackToFeed = function() {
    console.log('Going back to main feed...');
    const postsFeed = document.getElementById('postsFeed');
    if (postsFeed) {
        postsFeed.innerHTML = `
            <h1>Welcome to United We Rise</h1>
            <p>Connect with candidates, elected officials, and fellow citizens. Join the conversation about the issues that matter.</p>
            <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4b5c09;">
                <h3 style="margin: 0 0 0.5rem 0; color: #4b5c09;">💬 Want to see what's trending?</h3>
                <p style="margin: 0 0 1rem 0;">Check out the hottest political discussions in your area by clicking the map bubbles or browsing trending topics.</p>
                <button class="btn" onclick="if(window.toggleTrendingPanel) window.toggleTrendingPanel()" style="background: #4b5c09; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    🔥 View Trending
                </button>
            </div>
        `;
    }
};

// Export UWRMapLibre class for use in other modules
window.UWRMapLibre = UWRMapLibre;