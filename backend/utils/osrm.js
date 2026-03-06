import { logger } from './misc.js';

const OSRM_BASE_URL = 'https://router.project-osrm.org';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Calculate route between multiple coordinates using OSRM
 * @param {Array<[number, number]>} coordinates - Array of [lng, lat] pairs
 * @returns {Object} { distance_km, duration_minutes, legs, geometry }
 */
export const calculateRoute = async (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    throw new Error('At least 2 coordinates required for route calculation');
  }

  const coordsStr = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('OSRM routing failed: ' + (data.message || 'No route found'));
  }

  const route = data.routes[0];
  return {
    distance_km: Number((route.distance / 1000).toFixed(1)),
    duration_minutes: Number((route.duration / 60).toFixed(1)),
    legs: (route.legs || []).map(leg => ({
      distance_km: Number((leg.distance / 1000).toFixed(1)),
      duration_minutes: Number((leg.duration / 60).toFixed(1)),
    })),
    geometry: route.geometry,
  };
};

/**
 * Geocode an address string to coordinates using Nominatim
 * @param {string} address - Address string
 * @returns {Object|null} { lat, lng, display_name }
 */
export const geocodeAddress = async (address) => {
  try {
    const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CargoLink/1.0' },
    });
    const data = await response.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch (err) {
    logger.warn('Geocoding failed:', err.message);
    return null;
  }
};

/**
 * Reverse geocode coordinates to an address object
 * @param {number} lat
 * @param {number} lng
 * @returns {Object|null}
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CargoLink/1.0' },
    });
    const data = await response.json();
    if (!data || data.error) return null;
    return {
      street: data.address?.road || data.address?.suburb || '',
      city: data.address?.city || data.address?.town || data.address?.village || '',
      state: data.address?.state || '',
      pin: data.address?.postcode || '',
      display_name: data.display_name,
    };
  } catch (err) {
    logger.warn('Reverse geocoding failed:', err.message);
    return null;
  }
};

export default { calculateRoute, geocodeAddress, reverseGeocode };
