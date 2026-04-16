// Geocoding Service — server-side geocoding and distance calculation using Google Maps APIs
import { CACHE_EXTERNAL_TTL } from '../core/index.js';
import { makeCacheKey, rememberCachedJson } from '../core/cache.js';
import { AppError, logger } from '../utils/misc.js';

const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const DISTANCE_BASE = 'https://maps.googleapis.com/maps/api/distancematrix/json';

/**
 * Geocode an address string to lat/lng using Google Geocoding API
 * @param {string} address — e.g. "14 MG Road, Bangalore, Karnataka 560001"
 * @returns {{ lat: number, lng: number }}
 */
const geocodeAddress = async (address) => {
    const key = makeCacheKey('svc:geocode:', {
        address: String(address || '').trim().toLowerCase(),
    });

    const { value } = await rememberCachedJson({
        key,
        ttlSeconds: CACHE_EXTERNAL_TTL,
        producer: async () => {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${apiKey}&region=in`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.status !== 'OK' || !data.results?.length) {
                logger.warn('Geocoding failed', { address, status: data.status });
                throw new AppError(400, 'GeocodingError', `Could not geocode address: ${address}`, 'ERR_GEOCODE_FAIL');
            }

            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        },
    });

    return value;
};

/**
 * Build a full address string from address parts
 */
const buildAddressString = (addr) => {
    if (!addr) return '';
    return [addr.street, addr.city, addr.state, addr.pin].filter(Boolean).join(', ');
};

/**
 * Calculate driving distance between two coordinates using Google Distance Matrix API
 * @returns {{ distanceKm: number, durationMin: number }}
 */
const calculateDistance = async (originCoords, destCoords) => {
    const key = makeCacheKey('svc:distance:', {
        origin: {
            lat: Number(originCoords?.lat || 0).toFixed(5),
            lng: Number(originCoords?.lng || 0).toFixed(5),
        },
        destination: {
            lat: Number(destCoords?.lat || 0).toFixed(5),
            lng: Number(destCoords?.lng || 0).toFixed(5),
        },
    });

    const { value } = await rememberCachedJson({
        key,
        ttlSeconds: CACHE_EXTERNAL_TTL,
        producer: async () => {
            const origin = `${originCoords.lat},${originCoords.lng}`;
            const dest = `${destCoords.lat},${destCoords.lng}`;
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            const url = `${DISTANCE_BASE}?origins=${origin}&destinations=${dest}&key=${apiKey}&units=metric`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.status !== 'OK') {
                throw new AppError(400, 'DistanceError', 'Could not calculate distance', 'ERR_DISTANCE_FAIL');
            }

            const element = data.rows?.[0]?.elements?.[0];
            if (!element || element.status !== 'OK') {
                throw new AppError(400, 'DistanceError', 'No route found between locations', 'ERR_NO_ROUTE');
            }

            return {
                distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,  // meters → km, 1 decimal
                durationMin: Math.round(element.duration.value / 60),                 // seconds → minutes
            };
        },
    });

    return value;
};

export default {
    geocodeAddress,
    buildAddressString,
    calculateDistance,
};
