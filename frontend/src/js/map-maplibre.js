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
            zoom: 4,
            minZoom: 3,
            maxZoom: 18,
            attributionControl: false
        });

        // Store globally for compatibility
        window.mapLibre = this.map;
        
        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
        
        // Setup responsive behavior
        this.setupResponsiveBehavior();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Show map container when fully loaded
        this.map.on('load', () => {
            this.showMapContainer();
        });

        // Handle map errors
        this.map.on('error', (e) => {
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

    setupResponsiveBehavior() {
        // Store initial bounds when map loads
        this.map.on('load', () => {
            this.initialBounds = this.map.getBounds();
            
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
        this.map.flyTo({
            center: mapLibreCenter,
            zoom: zoom,
            essential: true
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
                    this.map.flyTo({ center: this.US_CENTER, zoom: 5 });
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
                        this.map.flyTo({ zoom: 8 });
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
            this.map.flyTo({
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
        console.log('showMapContainer called');
        const loadingState = document.getElementById('mapLoadingState');
        const mapContainer = document.getElementById('mapContainer');
        
        if (loadingState && mapContainer) {
            // Check if container is already visible (we now show it before initialization)
            const containerAlreadyVisible = mapContainer.style.display === 'block';
            console.log('Container already visible:', containerAlreadyVisible);
            
            if (!containerAlreadyVisible) {
                // Hide loading state and show map container
                loadingState.classList.add('hidden');
                mapContainer.style.display = 'block';
                console.log('Map container shown');
            }
            
            // Always trigger resize to ensure map renders correctly
            setTimeout(() => {
                console.log('Triggering map resize');
                this.handleResize();
            }, 100);
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

    // Trending Comments System
    startTrendingComments() {
        // Clear existing interval
        if (this.trendingInterval) {
            clearInterval(this.trendingInterval);
        }
        
        // Clear existing popups
        this.clearTrendingPopups();
        
        // Start showing trending comments every 8 seconds
        this.trendingInterval = setInterval(() => {
            this.showNextTrendingComment();
        }, 8000);
        
        // Show first one immediately
        setTimeout(() => this.showNextTrendingComment(), 2000);
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
        
        // Mock data reflecting the corrected vision - replace with real API calls
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
        // State capitol coordinates for official events
        const capitolCoords = {
            'CA': [-121.4686, 38.5767], // Sacramento
            'TX': [-97.7431, 30.2672],  // Austin
            'NY': [-73.7562, 42.6526],  // Albany
            'FL': [-84.2700, 30.4518],  // Tallahassee
            // Add more as needed
        };
        return capitolCoords[stateCode] || this.getRandomUSCoordinates();
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
        // For now, use state-level randomization with higher zoom
        return this.getRandomStateCoordinates(districtInfo.state);
    }

    displayTrendingPopup(comment) {
        // Clear previous trending popup
        this.clearTrendingPopups();

        const popupHtml = `
            <div class="trending-popup">
                <div class="trending-popup-header">
                    <span class="trending-topic">${comment.topic}</span>
                    <span class="trending-location">${comment.location}</span>
                </div>
                <div class="trending-popup-content">
                    ${comment.summary}
                </div>
                <div class="trending-popup-footer">
                    <span class="trending-engagement">💬 ${comment.engagement}</span>
                    <span class="trending-time">${comment.timestamp}</span>
                </div>
                <div class="trending-popup-actions">
                    <button class="popup-action-btn primary" onclick="window.navigateToComment && window.navigateToComment(${comment.id}); event.stopPropagation();">
                        📖 Join Discussion
                    </button>
                    <button class="popup-action-btn secondary" onclick="window.uwrMap.joinCivicGroup('${this.currentJurisdiction}', '${comment.topic}'); event.stopPropagation();">
                        👥 Find Community
                    </button>
                    ${comment.actionable ? `
                        <button class="popup-action-btn action" onclick="window.uwrMap.takeAction('${comment.id}', '${comment.actionType}'); event.stopPropagation();">
                            🎯 Take Action
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'trending-comment-popup',
            maxWidth: '300px',
            anchor: 'bottom'
        })
        .setLngLat(comment.coordinates)
        .setHTML(popupHtml)
        .addTo(this.map);

        // Store popup reference
        this.trendingPopups.push(popup);

        // Auto-close after 7 seconds
        setTimeout(() => {
            if (this.trendingPopups.includes(popup)) {
                popup.remove();
                this.trendingPopups = this.trendingPopups.filter(p => p !== popup);
            }
        }, 7000);
    }

    clearTrendingPopups() {
        this.trendingPopups.forEach(popup => popup.remove());
        this.trendingPopups = [];
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

function initializeMapLibre() {
    // Only initialize if container exists
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) return;
    
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
        
        // CRITICAL FIX: Show map container BEFORE initializing MapLibre
        // MapLibre needs the container to be visible to measure dimensions correctly
        const mapContainer = document.getElementById('mapContainer');
        const loadingState = document.getElementById('mapLoadingState');
        
        if (mapContainer && loadingState && !mapWasClosed) {
            console.log('Making map container visible for MapLibre initialization...');
            loadingState.classList.add('hidden');
            mapContainer.style.display = 'block';
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
                setZoomLevel: (level) => {
                    uwrMap.setZoomLevel(level);
                    // Update button states
                    updateMapViewButtons(level);
                },
                geocodeAndZoom: () => uwrMap.geocodeAndZoom(),
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

// Global navigation function for trending comment clicks
window.navigateToComment = function(commentId) {
    console.log('Navigating to comment:', commentId);
    // TODO: Implement navigation to specific comment/conversation
    // This would typically:
    // 1. Close any open panels
    // 2. Open the posts/conversation panel
    // 3. Navigate to the specific comment thread
    // 4. Highlight the comment
    alert(`Would navigate to comment ${commentId} (not yet implemented)`);
};

// Export for use in other modules
window.UWRMapLibre = UWRMapLibre;
window.initializeMapLibre = initializeMapLibre;