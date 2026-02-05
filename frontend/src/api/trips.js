/**
 * Trip API Client
 * Handles all HTTP requests to /api/trips endpoints
 */

import http from './http.js';


export async function getTrips(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const url = params ? `/api/trips?${params}` : '/api/trips';
  const response = await http.get(url);
  return response.data || [];
}

/**
 * Get single trip details by ID
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} Trip details with populated references
 */
export async function getTripDetails(tripId) {
  const response = await http.get(`/api/trips/${tripId}`);
  return response.data || null;
}

/**
 * Create new trip (Planned status)
 * @param {Object} tripData - { name, notes }
 * @returns {Promise<Object>} Created trip
 */
export async function createTrip(tripData) {
  const response = await http.post('/api/trips', tripData);
  return response.data;
}

/**
 * Delete trip (only Planned status)
 * @param {string} tripId - Trip ID
 * @returns {Promise<void>}
 */
export async function deleteTrip(tripId) {
  await http.del(`/api/trips/${tripId}`);
}

/**
 * Assign vehicle to trip
 * @param {string} tripId - Trip ID
 * @param {string} vehicleId - Vehicle ID from fleet
 * @returns {Promise<Object>} Updated trip
 */
export async function assignVehicle(tripId, vehicleId) {
  const response = await http.post(`/api/trips/${tripId}/vehicle`, { vehicleId });
  return response.data;
}

/**
 * Add orders to trip
 * @param {string} tripId - Trip ID
 * @param {Array<string>} orderIds - Array of order IDs
 * @returns {Promise<Object>} Updated trip
 */
export async function addOrders(tripId, orderIds) {
  const response = await http.post(`/api/trips/${tripId}/orders`, { orderIds });
  return response.data;
}

/**
 * Schedule trip (generate stops with OTPs)
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} Scheduled trip with stops array
 */
export async function scheduleTrip(tripId) {
  const response = await http.post(`/api/trips/${tripId}/schedule`, {});
  return response.data;
}

/**
 * Start trip (set InTransit status)
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} Started trip
 */
export async function startTrip(tripId) {
  const response = await http.post(`/api/trips/${tripId}/start`, {});
  return response.data;
}

/**
 * Mark arrival at stop
 * @param {string} tripId - Trip ID
 * @param {number} seq - Stop sequence number
 * @returns {Promise<Object>} Updated trip
 */
export async function arriveAtStop(tripId, seq) {
  const response = await http.post(`/api/trips/${tripId}/stops/${seq}/arrive`, {});
  return response.data;
}

/**
 * Confirm pickup with OTP validation
 * @param {string} tripId - Trip ID
 * @param {number} seq - Stop sequence number
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Updated trip
 */
export async function confirmPickup(tripId, seq, otp) {
  const response = await http.post(`/api/trips/${tripId}/stops/${seq}/confirm-pickup`, { otp });
  return response.data;
}

/**
 * Confirm dropoff
 * @param {string} tripId - Trip ID
 * @param {number} seq - Stop sequence number
 * @returns {Promise<Object>} Updated trip
 */
export async function confirmDropoff(tripId, seq) {
  const response = await http.post(`/api/trips/${tripId}/stops/${seq}/confirm-dropoff`, {});
  return response.data;
}

/**
 * Complete trip (free vehicle, mark orders complete)
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} Completed trip
 */
export async function completeTrip(tripId) {
  const response = await http.post(`/api/trips/${tripId}/complete`, {});
  return response.data;
}
