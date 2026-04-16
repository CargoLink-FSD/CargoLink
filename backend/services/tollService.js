// Toll Service — isolated toll lookup via Google Maps Routes API v2

import { GOOGLE_MAPS_API_KEY } from '../config/index.js';
import { makeCacheKey, rememberCachedJson } from '../core/cache.js';
import { CACHE_EXTERNAL_TTL } from '../core/index.js';
import { logger } from '../utils/misc.js';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/**
 * Get estimated toll cost (INR) between origin and destination.
 * @param {{lat:number,lng:number}} originCoords
 * @param {{lat:number,lng:number}} destCoords
 * @returns {Promise<number>} integer toll estimate in INR
 */
export async function getTollCost(originCoords, destCoords) {
  if (!GOOGLE_MAPS_API_KEY) {
    logger.warn('GOOGLE_MAPS_API_KEY not set — toll lookup skipped');
    return 0;
  }

  const key = makeCacheKey('svc:toll:', {
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
      try {
        const requestBody = {
          origin: {
            location: {
              latLng: {
                latitude: originCoords.lat,
                longitude: originCoords.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destCoords.lat,
                longitude: destCoords.lng,
              },
            },
          },
          travelMode: 'DRIVE',
          extraComputations: ['TOLLS'],
          routeModifiers: {
            vehicleInfo: { emissionType: 'GASOLINE' },
            tollPasses: [],
          },
        };

        const res = await fetch(ROUTES_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'routes.travelAdvisory.tollInfo,routes.distanceMeters',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (!data.routes?.length) {
          logger.warn('Routes API returned no routes for toll lookup');
          return 0;
        }

        const tollInfo = data.routes[0].travelAdvisory?.tollInfo;
        if (!tollInfo?.estimatedPrice?.length) {
          // Route exists but has no tolls
          return 0;
        }

        // Prefer INR; fall back to first currency entry available
        const priceEntry =
          tollInfo.estimatedPrice.find((p) => p.currencyCode === 'INR') ||
          tollInfo.estimatedPrice[0];

        // Routes API encodes money as { units: "string", nanos: number }
        const amount =
          parseFloat(priceEntry.units || 0) + (priceEntry.nanos || 0) / 1e9;

        const toll = Math.round(amount);
        logger.info('Toll cost fetched from Routes API', {
          toll,
          currency: priceEntry.currencyCode,
        });

        return toll;
      } catch (err) {
        logger.warn('Toll API call failed — defaulting toll cost to 0', {
          error: err.message,
        });
        return 0;
      }
    },
  });

  return value;
}

export default {
  getTollCost,
};
