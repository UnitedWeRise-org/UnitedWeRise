import { prisma } from '../lib/prisma';
import { logger } from './logger';

/**
 * Coarse geographic areas and privacy-safe display points.
 *
 * A post stores only:
 * - `areaType` / `areaId`: the author's home ZIP (used for map area matching)
 * - `privacyAreaType` / `privacyAreaId`: the area used for display (ZIP, or
 *   county when the ZIP has fewer than `MAP_AREA_MIN_POPULATION` residents)
 * - `geoSeed`: a random integer per post
 *
 * Display coordinates are derived at read time from a precomputed list of
 * in-polygon sample points. No user-specific point is ever stored.
 *
 * @module services/geoAreaService
 */

export type GeoAreaType = 'zip' | 'county';

export interface GeoAreaRecord {
  id: string;
  areaType: string;
  areaId: string;
  label: string | null;
  population: number | null;
  centroidLat: number;
  centroidLng: number;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  samples: [number, number][];
}

interface CensusPolygon {
  rings: number[][][];
  population: number | null;
  label: string | null;
  areaId: string | null;
}

const ZCTA_QUERY_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query';
const COUNTY_QUERY_URL =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/55/query';

const SAMPLE_COUNT = 64;
const CENSUS_TIMEOUT_MS = 5_000;
const DEFAULT_MIN_POPULATION = 50;
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000;
const EARTH_RADIUS_KM = 6371;

function minPopulation(): number {
  const raw = Number.parseInt(process.env.MAP_AREA_MIN_POPULATION || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MIN_POPULATION;
}

/**
 * Normalize a US ZIP code to its 5-digit form.
 * Accepts `12345`, `12345-6789`, and `123456789`.
 * @param value - Raw ZIP code
 * @returns 5-digit ZIP or null when invalid
 */
export function normalizeZip(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{5})(?:-\d{4})?$/);
  if (match) return match[1];
  if (/^\d{9}$/.test(trimmed)) return trimmed.slice(0, 5);
  return null;
}

/**
 * Normalize a county FIPS code (5 digits).
 * @param value - Raw county FIPS
 * @returns 5-digit FIPS or null when invalid
 */
export function normalizeCountyFips(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return /^\d{5}$/.test(value.trim()) ? value.trim() : null;
}

async function fetchJson(url: string): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(CENSUS_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new Error(`Census request failed with HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Census request failed');
}

function parseCensusPolygon(feature: any): CensusPolygon | null {
  const rings = feature?.geometry?.rings;
  if (!Array.isArray(rings) || rings.length === 0) return null;

  const validRings = rings
    .filter((ring: any) => Array.isArray(ring) && ring.length >= 4)
    .map((ring: any) =>
      ring
        .filter(
          (point: any) =>
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1])
        )
        .map((point: any) => [Number(point[0]), Number(point[1])])
    )
    .filter((ring: number[][]) => ring.length >= 4);

  if (validRings.length === 0) return null;

  const populationRaw = feature?.attributes?.POP100;
  const population =
    populationRaw === null || populationRaw === undefined
      ? null
      : Math.round(Number(populationRaw));

  return {
    rings: validRings,
    population: Number.isFinite(population as number) ? population : null,
    label: feature?.attributes?.NAME || null,
    areaId: feature?.attributes?.ZCTA5 || feature?.attributes?.GEOID || null
  };
}

/**
 * Ray-cast a single ring. Even-odd rule gives correct results for holes when
 * applied across all rings of an Esri polygon.
 */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, rings: number[][][]): boolean {
  let inside = false;
  for (const ring of rings) {
    if (pointInRing(lng, lat, ring)) inside = !inside;
  }
  return inside;
}

function polygonBounds(rings: number[][][]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Generate precomputed sample points that lie inside the polygon.
 * Rejection sampling keeps runtime O(1) (index an array) and guarantees the
 * displayed point is inside the area rather than in the ocean or a neighboring
 * ZIP.
 */
function buildSamples(rings: number[][][]): [number, number][] | null {
  const bounds = polygonBounds(rings);
  if (!Number.isFinite(bounds.minLat) || !Number.isFinite(bounds.minLng)) {
    return null;
  }

  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  if (latSpan <= 0 || lngSpan <= 0) return null;

  const samples: [number, number][] = [];
  const maxAttempts = SAMPLE_COUNT * 250;

  for (let attempt = 0; attempt < maxAttempts && samples.length < SAMPLE_COUNT; attempt++) {
    const lat = bounds.minLat + Math.random() * latSpan;
    const lng = bounds.minLng + Math.random() * lngSpan;
    if (pointInPolygon(lng, lat, rings)) {
      samples.push([lat, lng]);
    }
  }

  if (samples.length < 8) {
    // Degenerate/thin polygons: fall back to the bbox center if it is inside,
    // otherwise use ring vertices (they are on the boundary and therefore in
    // the area's vicinity).
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;
    if (pointInPolygon(centerLng, centerLat, rings)) {
      samples.push([centerLat, centerLng]);
    }
    for (const ring of rings) {
      for (let i = 0; i < ring.length && samples.length < SAMPLE_COUNT; i += 4) {
        const [lng, lat] = ring[i];
        samples.push([lat, lng]);
      }
    }
  }

  return samples.length > 0 ? samples : null;
}

function averagePoint(samples: [number, number][]): [number, number] {
  const total = samples.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 }
  );
  return [total.lat / samples.length, total.lng / samples.length];
}

function toRecord(
  areaType: GeoAreaType,
  areaId: string,
  polygon: CensusPolygon,
  samples: [number, number][]
): Omit<GeoAreaRecord, 'id'> {
  const bounds = polygonBounds(polygon.rings);
  const [centroidLat, centroidLng] = averagePoint(samples);

  return {
    areaType,
    areaId: polygon.areaId || areaId,
    label: polygon.label,
    population: polygon.population,
    centroidLat,
    centroidLng,
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLng: bounds.minLng,
    maxLng: bounds.maxLng,
    samples
  };
}

function parseSamples(value: unknown): [number, number][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
    )
    .map((point) => [Number(point[0]), Number(point[1])]);
}

function fromDb(row: any): GeoAreaRecord {
  return {
    id: row.id,
    areaType: row.areaType,
    areaId: row.areaId,
    label: row.label,
    population: row.population,
    centroidLat: row.centroidLat,
    centroidLng: row.centroidLng,
    minLat: row.minLat,
    maxLat: row.maxLat,
    minLng: row.minLng,
    maxLng: row.maxLng,
    samples: parseSamples(row.samples)
  };
}

async function queryZcta(zip: string): Promise<CensusPolygon | null> {
  const params = new URLSearchParams({
    where: `ZCTA5='${zip}'`,
    outFields: 'ZCTA5,POP100',
    returnGeometry: 'true',
    outSR: '4326',
    geometryPrecision: '5',
    f: 'json'
  });

  const data = await fetchJson(`${ZCTA_QUERY_URL}?${params.toString()}`);
  const feature = data?.features?.[0];
  return feature ? parseCensusPolygon(feature) : null;
}

async function queryCountyByPoint(lat: number, lng: number): Promise<CensusPolygon | null> {
  const params = new URLSearchParams({
    geometry: JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 }
    }),
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'GEOID,NAME,POP100',
    returnGeometry: 'true',
    outSR: '4326',
    geometryPrecision: '4',
    f: 'json'
  });

  const data = await fetchJson(`${COUNTY_QUERY_URL}?${params.toString()}`);
  const feature = data?.features?.[0];
  return feature ? parseCensusPolygon(feature) : null;
}

async function queryCountyByFips(fips: string): Promise<CensusPolygon | null> {
  const params = new URLSearchParams({
    where: `GEOID='${fips}'`,
    outFields: 'GEOID,NAME,POP100',
    returnGeometry: 'true',
    outSR: '4326',
    geometryPrecision: '4',
    f: 'json'
  });

  const data = await fetchJson(`${COUNTY_QUERY_URL}?${params.toString()}`);
  const feature = data?.features?.[0];
  return feature ? parseCensusPolygon(feature) : null;
}

/**
 * Haversine distance in kilometers.
 * @param lat1 - Latitude of point A
 * @param lng1 - Longitude of point A
 * @param lat2 - Latitude of point B
 * @param lng2 - Longitude of point B
 * @returns Distance in kilometers
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export class GeoAreaService {
  private static inflight = new Map<string, Promise<GeoAreaRecord | null>>();
  private static negativeCache = new Map<string, number>();

  /**
   * Get an area by its composite key.
   * @param areaType - "zip" or "county"
   * @param areaId - ZIP or county FIPS
   * @returns Area record or null
   */
  static async getArea(areaType: string, areaId: string): Promise<GeoAreaRecord | null> {
    const row = await prisma.geoArea.findUnique({
      where: { areaType_areaId: { areaType, areaId } }
    });
    return row ? fromDb(row) : null;
  }

  /**
   * Get many areas by composite keys.
   * @param keys - Array of { areaType, areaId }
   * @returns Map keyed by `type:id`
   */
  static async getAreas(keys: { areaType: string; areaId: string }[]): Promise<Map<string, GeoAreaRecord>> {
    const result = new Map<string, GeoAreaRecord>();
    if (keys.length === 0) return result;

    const rows = await prisma.geoArea.findMany({
      where: {
        OR: keys.map((key) => ({ areaType: key.areaType, areaId: key.areaId }))
      }
    });

    for (const row of rows) {
      const record = fromDb(row);
      result.set(`${record.areaType}:${record.areaId}`, record);
    }
    return result;
  }

  /**
   * Ensure the ZIP area exists. Fetches the Census ZCTA polygon once and caches
   * a set of interior sample points in Postgres.
   * @param zip - 5-digit ZIP
   * @returns Area record or null when the ZIP has no ZCTA/polygon
   */
  static async ensureZipArea(zip: string): Promise<GeoAreaRecord | null> {
    const normalized = normalizeZip(zip);
    if (!normalized) return null;

    const existing = await this.getArea('zip', normalized);
    if (existing && existing.samples.length > 0) return existing;

    const key = `zip:${normalized}`;
    const negativeUntil = this.negativeCache.get(key);
    if (negativeUntil && Date.now() < negativeUntil) return null;
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const task = (async () => {
      try {
        const polygon = await queryZcta(normalized);
        if (!polygon) {
          logger.warn({ zip: normalized }, 'GeoAreaService: no ZCTA polygon found');
          this.negativeCache.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS);
          return null;
        }
        const samples = buildSamples(polygon.rings);
        if (!samples) {
          logger.warn({ zip: normalized }, 'GeoAreaService: unable to generate ZCTA samples');
          this.negativeCache.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS);
          return null;
        }
        this.negativeCache.delete(key);
        const data = toRecord('zip', normalized, polygon, samples);
        const row = await prisma.geoArea.upsert({
          where: { areaType_areaId: { areaType: 'zip', areaId: normalized } },
          create: data,
          update: { ...data, updatedAt: new Date() }
        });
        return fromDb(row);
      } catch (error) {
        logger.error({ error, zip: normalized }, 'GeoAreaService: ZIP area lookup failed');
        return null;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, task);
    return task;
  }

  /**
   * Ensure a county area exists by FIPS.
   * @param fips - 5-digit county FIPS
   * @returns Area record or null
   */
  static async ensureCountyArea(fips: string): Promise<GeoAreaRecord | null> {
    const normalized = normalizeCountyFips(fips);
    if (!normalized) return null;

    const existing = await this.getArea('county', normalized);
    if (existing && existing.samples.length > 0) return existing;

    const key = `county:${normalized}`;
    const negativeUntil = this.negativeCache.get(key);
    if (negativeUntil && Date.now() < negativeUntil) return null;
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const task = (async () => {
      try {
        const polygon = await queryCountyByFips(normalized);
        if (!polygon) {
          logger.warn({ fips: normalized }, 'GeoAreaService: no county polygon found');
          this.negativeCache.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS);
          return null;
        }
        const samples = buildSamples(polygon.rings);
        if (!samples) {
          logger.warn({ fips: normalized }, 'GeoAreaService: unable to generate county samples');
          this.negativeCache.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS);
          return null;
        }
        this.negativeCache.delete(key);
        const data = toRecord('county', normalized, polygon, samples);
        const row = await prisma.geoArea.upsert({
          where: { areaType_areaId: { areaType: 'county', areaId: normalized } },
          create: data,
          update: { ...data, updatedAt: new Date() }
        });
        return fromDb(row);
      } catch (error) {
        logger.error({ error, fips: normalized }, 'GeoAreaService: county area lookup failed');
        return null;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, task);
    return task;
  }

  /**
   * Resolve the county containing a point.
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Area record or null
   */
  static async ensureCountyAreaAt(lat: number, lng: number): Promise<GeoAreaRecord | null> {
    try {
      const polygon = await queryCountyByPoint(lat, lng);
      if (!polygon?.areaId) return null;
      return this.ensureCountyArea(polygon.areaId);
    } catch (error) {
      logger.error({ error, lat, lng }, 'GeoAreaService: county point lookup failed');
      return null;
    }
  }

  /**
   * Resolve the home ZIP + privacy area for a new post.
   *
   * The home ZIP is used for map area matching. The privacy area is the same
   * ZIP when its population meets `MAP_AREA_MIN_POPULATION`; otherwise the
   * enclosing county is used so display randomization cannot identify a
   * household in a low-density ZIP.
   *
   * @param zip - Author's ZIP code
   * @returns Area keys or null when geography cannot be resolved
   */
  static async resolvePostAreas(zip: string): Promise<{
    areaType: string;
    areaId: string;
    privacyAreaType: string;
    privacyAreaId: string;
  } | null> {
    const normalized = normalizeZip(zip);
    if (!normalized) return null;

    const home = await this.ensureZipArea(normalized);
    if (!home) return null;

    const threshold = minPopulation();
    if (home.population !== null && home.population >= threshold) {
      return {
        areaType: 'zip',
        areaId: normalized,
        privacyAreaType: 'zip',
        privacyAreaId: normalized
      };
    }

    const county = await this.ensureCountyAreaAt(home.centroidLat, home.centroidLng);
    if (!county) {
      logger.warn(
        { zip: normalized, population: home.population, threshold },
        'GeoAreaService: low-population ZIP could not be escalated to county'
      );
      return null;
    }

    return {
      areaType: 'zip',
      areaId: normalized,
      privacyAreaType: 'county',
      privacyAreaId: county.areaId
    };
  }

  /**
   * Find home ZIP areas whose representative point is within a radius.
   * The radius is derived from the map tier (see PostGeographicService).
   *
   * @param lat - Map center latitude
   * @param lng - Map center longitude
   * @param radiusKm - Search radius in kilometers
   * @returns ZIP area records inside the radius
   */
  static async findAreasNear(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<GeoAreaRecord[]> {
    const latDelta = radiusKm / 111.32;
    const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
    const lngDelta = radiusKm / (111.32 * cosLat);

    const rows = await prisma.geoArea.findMany({
      where: {
        areaType: 'zip',
        centroidLat: { gte: lat - latDelta, lte: lat + latDelta },
        centroidLng: { gte: lng - lngDelta, lte: lng + lngDelta }
      },
      take: 5000
    });

    return rows
      .map(fromDb)
      .filter((area) => distanceKm(lat, lng, area.centroidLat, area.centroidLng) <= radiusKm);
  }

  /**
   * Derive a stable-in-session display coordinate from a post's privacy area.
   * The point is an actual precomputed interior sample, never a user location.
   *
   * @param area - Privacy area record
   * @param geoSeed - Per-post random seed
   * @param sessionNonce - Client session nonce (varies the pick per session)
   * @returns [longitude, latitude] for MapLibre, or null when unavailable
   */
  static deriveDisplayCoords(
    area: GeoAreaRecord,
    geoSeed: number,
    sessionNonce: number = 0
  ): [number, number] | null {
    if (area.samples.length === 0) return null;
    const seed = Number.isFinite(geoSeed) ? Math.abs(Math.trunc(geoSeed)) : 0;
    const nonce = Number.isFinite(sessionNonce) ? Math.abs(Math.trunc(sessionNonce)) : 0;
    const index = (seed + nonce) % area.samples.length;
    const [lat, lng] = area.samples[index];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lng, lat];
  }

  /**
   * `type:id` composite key helper.
   * @param areaType - Area type
   * @param areaId - Area id
   * @returns Composite key
   */
  static key(areaType: string, areaId: string): string {
    return `${areaType}:${areaId}`;
  }
}

export default GeoAreaService;
