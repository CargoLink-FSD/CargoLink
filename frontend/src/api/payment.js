import { http } from "./http"; // Ensure this matches your named export

export const paymentAPI = {
  initiatePayment: (orderId) => 
    http.post(`/api/payments/orders/${orderId}/initiate`),

  processPayment: (orderId, paymentData) => 
    http.post(`/api/payments/orders/${orderId}/process`, paymentData),

  submitReview: async (orderId, reviewData) => {
    console.log('=== STARTING API CALL ===');
    console.log('API Call: submitReview', { orderId, reviewData });
    
    try {
      console.log('About to make HTTP request...');
      const response = await http.post(`/api/payments/orders/${orderId}/review`, reviewData);
      console.log('=== GOT API RESPONSE ===');
      console.log('API Response:', response);
      return response;
    } catch (error) {
      console.log('=== API ERROR CAUGHT ===');
      console.error('API Error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      throw error;
    }
  },

  getHistory: () => 
    http.get("/api/payments/history"),
};

export default paymentAPI;