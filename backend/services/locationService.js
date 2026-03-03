// Location Service — business logic for geocoding and distance calculation only
import geocodingService from './geocodingService.js';
import { AppError } from '../utils/misc.js';

/**
 * Geocode and calculate distance between pickup and delivery addresses.
 * Called from frontend when user fills in both addresses.
 * @param {{ street, city, state, pin }} pickup
 * @param {{ street, city, state, pin }} delivery
 * @returns {{ pickupCoords, deliveryCoords, distanceKm, durationMin }}
 */
const calculateOrderDistance = async (pickup, delivery) => {
    const pickupAddress = geocodingService.buildAddressString(pickup);
    const deliveryAddress = geocodingService.buildAddressString(delivery);

    if (!pickupAddress || !deliveryAddress) {
        throw new AppError(400, 'ValidationError', 'Both pickup and delivery addresses are required', 'ERR_MISSING_ADDRESS');
    }

    // Geocode both addresses
    const [pickupCoords, deliveryCoords] = await Promise.all([
        geocodingService.geocodeAddress(pickupAddress),
        geocodingService.geocodeAddress(deliveryAddress),
    ]);

    // Calculate driving distance
    const { distanceKm, durationMin } = await geocodingService.calculateDistance(pickupCoords, deliveryCoords);

    return {
        pickupCoords,
        deliveryCoords,
        distanceKm,
        durationMin,
    };
};

export default {
    calculateOrderDistance,
};
