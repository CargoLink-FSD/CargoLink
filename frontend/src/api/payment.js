import http from "./http.js";

export const paymentAPI = {
  /**
   * Initiate payment — creates a Razorpay order on the backend
   */
  initiatePayment: (orderId) => 
    http.post(`/api/payments/orders/${orderId}/initiate`),

  /**
   * Verify Razorpay payment after checkout
   */
  verifyPayment: (orderId, paymentData) => 
    http.post(`/api/payments/orders/${orderId}/verify`, paymentData),

  /**
   * Submit a review for a completed order
   */
  submitReview: async (orderId, reviewData) => {
    const response = await http.post(`/api/payments/orders/${orderId}/review`, reviewData);
    return response;
  },

  /**
   * Get payment history
   */
  getHistory: () => 
    http.get("/api/payments/history"),
};

export default paymentAPI;