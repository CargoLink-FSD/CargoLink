import http from './http.js';

/**
 * Calculate distance between pickup and delivery addresses
 * @param {{ street, city, state, pin }} pickup
 * @param {{ street, city, state, pin }} delivery
 * @returns {{ pickupCoords, deliveryCoords, distanceKm, durationMin }}
 */
export async function calculateDistance(pickup, delivery) {
  const response = await http.post('/api/location/calculate-distance', { pickup, delivery });
  return response.data;
}

/**
 * Get order location data (for map display)
 */
export async function getOrderLocation(orderId) {
  const response = await http.get(`/api/location/orders/${orderId}`);
  return response.data;
}

export default {
  calculateDistance,
  getOrderLocation,
};
