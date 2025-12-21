import http from './http.js';

/**
 * Fetch all orders assigned to the authenticated transporter
 */
export async function getTransporterOrders() {
  const response = await http.get('/api/orders/my-orders');
  console.log('Transporter orders response:', response);
  return response.data || response || [];
}

/**
 * Get order details by ID (transporter view)
 */
export async function getTransporterOrderDetails(orderId) {
  const response = await http.get(`/api/orders/${orderId}`);
  console.log('Transporter order details:', response);
  return response.data || response || null;
}

/**
 * Get available orders for bidding
 * Note: This endpoint may have routing issues - /available comes after /:orderId in backend
 */
export async function getAvailableOrders() {
  const response = await http.get('/api/orders/available');
  console.log('Available orders:', response);
  return response.data || response || [];
}

/**
 * Submit a bid for an order
 */
export async function submitBid(orderId, bidData) {
  return await http.post(`/api/orders/${orderId}/bids`, bidData);
}

/**
 * Withdraw a bid
 * Backend route: DELETE /api/orders/:orderId/bids/:bidId
 */
export async function withdrawBid(orderId, bidId) {
  const response = await http.del(`/api/orders/${orderId}/bids/${bidId}`);
  return response;
}

/**
 * Get transporter's bids
 */
export async function getTransporterBids() {
  const response = await http.get('/api/orders/my-bids');
  return response.data || response || [];
}

/**
 * Get transporter's available vehicles
 */
export async function getTransporterVehicles() {
  const response = await http.get('/api/orders/transporter/vehicles');
  return response.data || response || [];
}

/**
 * Assign vehicle to an order
 */
export async function assignVehicleToOrder(orderId, vehicleId) {
  console.log('API: assignVehicleToOrder called with:', { orderId, vehicleId });
  const payload = { vehicleId };
  console.log('API: Sending POST to /api/orders/' + orderId + '/assign-vehicle with payload:', payload);
  const result = await http.post(`/api/orders/${orderId}/assign-vehicle`, payload);
  console.log('API: Assignment response:', result);
  return result;
}

/**
 * Unassign vehicle from an order
 */
export async function unassignVehicleFromOrder(tripId, orderId) {
  return await http.del(`/api/trips/${tripId}/orders/${orderId}`);
}

/**
 * Start transit for an order
 */
export async function startTransit(orderId) {
  return await http.post(`/api/orders/${orderId}/start-transit`);
}

/**
 * Update trip location
 */
export async function updateTripLocation(tripId, locationData) {
  return await http.post(`/api/trips/${tripId}/location`, locationData);
}

/**
 * Complete trip
 */
export async function completeTrip(tripId) {
  return await http.post(`/api/trips/${tripId}/complete`);
}
