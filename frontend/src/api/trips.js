// Trip API Endpoints
import { http } from './http';

// ─── Transporter Trip CRUD ──────────────────────────────────────────────────────

export const getTrips = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/trips?${query}` : '/api/trips';
  const response = await http.get(url);
  return response.data;
};

export const getTripDetails = async (tripId) => {
  const response = await http.get(`/api/trips/${tripId}`);
  return response.data;
};

export const createTrip = async (tripData) => {
  const response = await http.post('/api/trips', tripData);
  return response.data;
};

export const updateTrip = async (tripId, tripData) => {
  const response = await http.put(`/api/trips/${tripId}`, tripData);
  return response.data;
};

export const deleteTrip = async (tripId) => {
  const response = await http.del(`/api/trips/${tripId}`);
  return response;
};

// ─── Trip Lifecycle ─────────────────────────────────────────────────────────────

export const scheduleTrip = async (tripId) => {
  const response = await http.post(`/api/trips/${tripId}/schedule`);
  return response.data;
};

export const cancelTrip = async (tripId) => {
  const response = await http.post(`/api/trips/${tripId}/cancel`);
  return response.data;
};

export const completeTrip = async (tripId) => {
  const response = await http.post(`/api/trips/${tripId}/complete`);
  return response.data;
};

// ─── Resources ──────────────────────────────────────────────────────────────────

export const getAssignableOrders = async () => {
  const response = await http.get('/api/trips/resources/assignable-orders');
  return response.data;
};

export const getAvailableDrivers = async () => {
  const response = await http.get('/api/trips/resources/available-drivers');
  return response.data;
};

export const getAvailableVehicles = async () => {
  const response = await http.get('/api/trips/resources/available-vehicles');
  return response.data;
};

// ─── Driver Trip Endpoints ──────────────────────────────────────────────────────

export const getDriverTrips = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = query ? `/api/trips/driver/my-trips?${query}` : '/api/trips/driver/my-trips';
  const response = await http.get(url);
  return response.data;
};

export const getDriverTripDetails = async (tripId) => {
  const response = await http.get(`/api/trips/driver/${tripId}`);
  return response.data;
};

export const startTrip = async (tripId) => {
  const response = await http.post(`/api/trips/driver/${tripId}/start`);
  return response.data;
};

export const arriveAtStop = async (tripId, stopId) => {
  const response = await http.post(`/api/trips/driver/${tripId}/stops/${stopId}/arrive`);
  return response.data;
};

export const confirmPickup = async (tripId, stopId, otp) => {
  const response = await http.post(`/api/trips/driver/${tripId}/stops/${stopId}/confirm-pickup`, { otp });
  return response.data;
};

export const confirmDelivery = async (tripId, stopId, otp) => {
  const response = await http.post(`/api/trips/driver/${tripId}/stops/${stopId}/confirm-delivery`, { otp });
  return response.data;
};

export const departFromStop = async (tripId, stopId) => {
  const response = await http.post(`/api/trips/driver/${tripId}/stops/${stopId}/depart`);
  return response.data;
};

export const declareDelay = async (tripId, delayData) => {
  const response = await http.post(`/api/trips/driver/${tripId}/delay`, delayData);
  return response.data;
};

export const clearDelay = async (tripId) => {
  const response = await http.post(`/api/trips/driver/${tripId}/clear-delay`);
  return response.data;
};

export const updateTripLocation = async (tripId, coordinates) => {
  const response = await http.post(`/api/trips/driver/${tripId}/location`, { coordinates });
  return response.data;
};

// ─── Customer Tracking ──────────────────────────────────────────────────────────

export const getOrderTracking = async (orderId) => {
  const response = await http.get(`/api/trips/track/${orderId}`);
  return response.data;
};

export default {
  getTrips, getTripDetails, createTrip, updateTrip, deleteTrip,
  scheduleTrip, cancelTrip, completeTrip,
  getAssignableOrders, getAvailableDrivers, getAvailableVehicles,
  getDriverTrips, getDriverTripDetails, startTrip,
  arriveAtStop, confirmPickup, confirmDelivery, departFromStop,
  declareDelay, clearDelay, updateTripLocation,
  getOrderTracking,
};
