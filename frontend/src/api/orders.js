import http from './http.js';

/**
 * Fetch all orders for the authenticated customer
 */
export async function getCustomerOrders() {
  const response = await http.get('/api/orders/my-orders');
  console.log('Backend response:', response);
  return response.data || [];
}

/**
 * Get order details by ID
 */
export async function getOrderDetails(orderId) {
  const response = await http.get(`/api/orders/${orderId}`);
  console.log('Order details:', response);
  return response.data || null;
}

/**
 * Delete/Cancel a specific order by ID
 */
export async function deleteOrder(orderId) {
  return await http.del(`/api/orders/${orderId}`);
}

/**
 * Get bids for a specific order (customer view)
 */
export async function getOrderBids(orderId) {
  const response = await http.get(`/api/orders/${orderId}/bids`);
  return response.data || [];
}

/**
 * Accept a bid for an order
 */
export async function acceptBid(orderId, bidId) {
  return await http.post(`/api/orders/${orderId}/bids/${bidId}/accept`, { bidId });
}

/**
 * Reject a bid for an order
 */
export async function rejectBid(orderId, bidId) {
  return await http.del(`/api/orders/${orderId}/bids/${bidId}`);
}

/**
 * Confirm pickup for an order
 */
export async function confirmPickup({ orderId, otp }) {
  console.log("calling confirmpickup with: ", orderId);

  return await http.post(`/api/orders/${orderId}/confirm-pickup`, { otp });
}

/**
 * Confirm delivery for an order
 */
export async function confirmDelivery({ orderId }) {
  return await http.post(`/api/orders/${orderId}/confirm-delivery`);
}

/**
 * Place a new order
 */
export async function placeOrder(orderData, cargoPhoto) {
  // Always use FormData to maintain consistency with multer middleware
  const formData = new FormData();

  // Append all order data fields
  Object.keys(orderData).forEach(key => {
    if (key === 'pickup' || key === 'delivery') {
      formData.append(key, JSON.stringify(orderData[key]));
    } else if (key === 'shipments') {
      formData.append(key, JSON.stringify(orderData[key]));
    } else {
      formData.append(key, orderData[key]);
    }
  });

  // Append the cargo photo file if it exists
  if (cargoPhoto) {
    formData.append('cargo_photo', cargoPhoto);
  }

  // Don't set Content-Type manually - let axios set it with proper boundary
  const response = await http.post('/api/orders', formData);
  return response.data;
}
