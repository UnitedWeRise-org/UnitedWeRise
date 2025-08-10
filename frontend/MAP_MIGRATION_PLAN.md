# MapLibre GL Migration Plan

## Current Leaflet Implementation Analysis

### Features Currently Used:
1. **Map Initialization**
   - `L.map()` with zoom controls
   - CartoDB light tiles as base layer
   - Min/max zoom levels (3-18)

2. **Map Methods**
   - `setView()` - Center map on coordinates
   - `invalidateSize()` - Handle container resize
   - `closePopup()` - Close popups programmatically

3. **Layers & Data**
   - `L.tileLayer()` - Base map tiles
   - `L.geoJSON()` - Political boundary overlays
   - Layer management (add/remove layers)

4. **User Interactions**
   - `L.popup()` - Information popups
   - Address search via Nominatim API
   - Zoom to state/location functionality

5. **Key Variables**
   - Global `window.map` reference
   - Layer storage in `this.layers` Map
   - State center coordinates lookup

## Migration Strategy

### Phase 1: Preparation
- [ ] Backup current map implementation
- [ ] Create feature branch for migration
- [ ] Document all map interactions

### Phase 2: Setup MapLibre
- [ ] Add MapLibre GL CSS/JS
- [ ] Keep Leaflet temporarily (parallel run)
- [ ] Create MapLibre initialization alongside Leaflet

### Phase 3: Feature Migration
- [ ] Basic map display
- [ ] Tile layer equivalent
- [ ] Zoom controls
- [ ] SetView functionality
- [ ] GeoJSON political boundaries
- [ ] Popups and interactions
- [ ] Address search integration

### Phase 4: Testing
- [ ] Desktop responsiveness
- [ ] Tablet responsiveness  
- [ ] Mobile responsiveness
- [ ] All user interactions
- [ ] Performance comparison

### Phase 5: Cleanup
- [ ] Remove Leaflet dependencies
- [ ] Remove Leaflet code
- [ ] Clean up CSS
- [ ] Update documentation

## Files to Modify:
1. `/frontend/index.html` - Main map code
2. `/frontend/src/styles/map.css` - Map styling
3. `/frontend/src/integrations/officials-system-integration.js` - Officials overlay

## Rollback Plan:
- Git commit before each phase
- Keep Leaflet code commented initially
- Test thoroughly before removing Leaflet