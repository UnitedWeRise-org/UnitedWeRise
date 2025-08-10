/* 
 * BACKUP: Original Leaflet Map Implementation
 * Created: 2025-01-10
 * This file contains the original Leaflet map code before MapLibre migration
 */

// Original Map Initialization (from index.html lines 851-876)
function initializeMapLeaflet() {
    const map = L.map('map', {
        center: [39.8283, -98.5795],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
        minZoom: 3,
        maxZoom: 18,
        preferCanvas: true
    });

    // Store globally
    window.map = map;

    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}

// Original Map Overlay System (from index.html lines 3091-3113)
class MapOverlaySystemLeaflet {
    constructor(map) {
        this.map = map;
        this.layers = new Map();
    }

    addOverlay(key, geojsonData, style = {}) {
        this.removeOverlay(key);
        const layer = L.geoJSON(geojsonData, { style }).addTo(this.map);
        this.layers.set(key, layer);
        return layer;
    }

    removeOverlay(key) {
        if (this.layers.has(key)) {
            this.map.removeLayer(this.layers.get(key));
            this.layers.delete(key);
        }
    }

    clearOverlays() {
        this.layers.forEach(layer => this.map.removeLayer(layer));
        this.layers.clear();
    }
}

// Original Popup Creation (from index.html lines 903-914)
function createMapPopup(latlng, content) {
    const popup = L.popup({
        closeButton: true,
        className: 'custom-popup',
        maxWidth: 300,
        minWidth: 200,
        autoPan: true,
        keepInView: true
    })
    .setLatLng(latlng)
    .setContent(content)
    .openOn(window.map);

    // Auto-close after 30 seconds
    setTimeout(() => window.map.closePopup(popup), 30000);
    
    return popup;
}

// Original Map View Controls (from index.html lines 3220-3300)
function setMapView(location, zoom = 4) {
    const mapInstance = window.map;
    if (!mapInstance) return;

    if (location === 'US') {
        mapInstance.setView([37.8283, -98.5795], zoom);
    } else if (location.lat && location.lng) {
        mapInstance.setView([location.lat, location.lng], zoom);
    }
}

// Original Geocoding Integration (from index.html line 3160)
async function geocodeAddress(address) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await response.json();
    if (data && data[0]) {
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };
    }
    return null;
}

// Original Map Resize Handler (from index.html line 927)
function handleMapResize() {
    if (window.map) {
        window.map.invalidateSize();
    }
}