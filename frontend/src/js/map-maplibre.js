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

    // Cleanup method
    destroy() {
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
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Check if we should use MapLibre (can toggle this during migration)
    const useMapLibre = true; // Set to false to use Leaflet
    
    if (useMapLibre) {
        console.log('Initializing MapLibre GL map...');
        uwrMap = new UWRMapLibre('map');
        uwrMap.initialize().then(map => {
            console.log('MapLibre map initialized successfully');
            
            // Make compatible with existing code expecting window.map
            window.map = {
                // Wrapper methods for Leaflet compatibility
                setView: (center, zoom) => uwrMap.setView(center, zoom),
                invalidateSize: () => uwrMap.invalidateSize(),
                closePopup: () => uwrMap.closeAllPopups(),
                fitBounds: (bounds) => uwrMap.fitBounds(bounds),
                // MapLibre instance for new code
                _maplibre: map
            };
        });
    }
}

// Export for use in other modules
window.UWRMapLibre = UWRMapLibre;
window.initializeMapLibre = initializeMapLibre;