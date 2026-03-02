// Geocoding Service — server-side geocoding and distance calculation using Google Maps APIs
import { GOOGLE_MAPS_API_KEY } from '../config/index.js';
import { AppError, logger } from '../utils/misc.js';

const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const DISTANCE_BASE = 'https://maps.googleapis.com/maps/api/distancematrix/json';

/**
 * Geocode an address string to lat/lng using Google Geocoding API
 * @param {string} address — e.g. "14 MG Road, Bangalore, Karnataka 560001"
 * @returns {{ lat: number, lng: number }}
 */
const geocodeAddress = async (address) => {
    const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&region=in`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
        logger.warn('Geocoding failed', { address, status: data.status });
        throw new AppError(400, 'GeocodingError', `Could not geocode address: ${address}`, 'ERR_GEOCODE_FAIL');
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
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
    const origin = `${originCoords.lat},${originCoords.lng}`;
    const dest = `${destCoords.lat},${destCoords.lng}`;

    const url = `${DISTANCE_BASE}?origins=${origin}&destinations=${dest}&key=${GOOGLE_MAPS_API_KEY}&units=metric`;

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
};

export default {
    geocodeAddress,
    buildAddressString,
    calculateDistance,
};
