/**
 * @module config/map
 * @description Single source of truth for the basemap provider.
 *
 * Provider: Stadia Maps (https://stadiamaps.com).
 * - `MAP_STYLE_URL` is a MapLibre vector style (tiles + glyphs + sprites, light theme).
 * - `MAP_RASTER_TILES` is the equivalent raster tile template for the legacy Leaflet
 *   fallback in `handlers/map-handlers.js`.
 *
 * The Stadia API key is a PUBLIC, origin-restricted client key (it ships in the
 * frontend bundle and is protected by the Stadia domain allow-list), so it is not
 * a secret in the same sense as the server keys. Restrict/rotate it in the Stadia
 * dashboard if it is ever abused.
 */
const STADIA_API_KEY = 'b6114730-b2a0-4d6f-b390-9e12c3a8bdda';

// Vector style for MapLibre GL (primary map implementation)
export const MAP_STYLE_URL = `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${STADIA_API_KEY}`;

// Raster tile template for the legacy Leaflet fallback
export const MAP_RASTER_TILES = `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`;
