import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCustomerOrders,
  selectFilteredOrders,
  selectOrdersLoading,
} from "../../store/slices/ordersSlice";
import { paymentAPI } from "../../api/payment";
import { useNotification } from "../../context/NotificationContext";
import OrderCard from "../../components/common/OrderCard";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";
import "./CustomerOrders.css";

export default function CustomerOrders() {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const orders = useSelector(selectFilteredOrders);
  const loading = useSelector(selectOrdersLoading);

  useEffect(() => {
    dispatch(fetchCustomerOrders());
  }, [dispatch]);

  const handleRateTransporter = async (orderId) => {
    console.log("=== HANDLE RATE TRANSPORTER STARTED ===");
    console.log("Order ID:", orderId);
    
    try {
      console.log("About to show prompts...");
      const ratingInput = window.prompt("Rate transporter (1-5):", "5");
      if (!ratingInput) {
        console.log("User cancelled rating input");
        return;
      }
      
      const rating = parseInt(ratingInput);
      console.log("Rating:", rating);
      
      if (isNaN(rating) || rating < 1 || rating > 5) {
        showNotification({
          message: "Please use a number between 1 and 5",
          type: "error",
        });
        return;
      }

      const comment = window.prompt("Feedback:");
      console.log("Comment:", comment);
      
      if (!comment || !comment.trim()) {
        showNotification({
          message: "Comment is required",
          type: "error",
        });
        return;
      }

      // Show loading state
      showNotification({ 
        message: "Submitting review...", 
        type: "info",
        duration: 15000
      });

      try {
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const testResponse = await fetch('http://localhost:3000/api/payments/orders/68ebb6c5d87de4f9c4d83088/review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rating: rating, comment: comment.trim() }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log("Direct fetch data:", testData);
        } else {
          console.log("Direct fetch failed with status:", testResponse.status);
          console.log("Response text:", await testResponse.text());
        }
      } catch (testError) {
        console.log("Direct fetch error:", testError);
        console.log("Error name:", testError.name);
        console.log("Error message:", testError.message);
        
        if (testError.name === 'AbortError') {
          console.log("Fetch request timed out after 5 seconds");
        }
      }
      
      console.log("Submitting review for order:", orderId, { rating, comment });
      
      const response = await paymentAPI.submitReview(orderId, { 
        rating: rating, 
        comment: comment.trim() 
      });
      
      console.log("Review submission response:", response);
      
      if (response && response.success) {
        showNotification({ 
          message: "Review submitted successfully!", 
          type: "success" 
        });
        
        setTimeout(() => {
          console.log("Refreshing orders after review submission");
          dispatch(fetchCustomerOrders());
        }, 1000);
      } else {
        showNotification({ 
          message: "Review may not have been saved properly", 
          type: "warning",
          duration: 5000
        });
      }
      
    } catch (err) {
      console.error("=== FULL ERROR CAUGHT ===");
      console.error("Review submission error:", err);
      console.error("Error stack:", err.stack);
      
      if (err.message.includes('timeout') || err.message.includes('not responding')) {
        showNotification({ 
          message: "Server is not responding. Please check your connection and try again.",
          type: "error",
          duration: 8000
        });
        return;
      }
      
      const errorMsg = err.response?.data?.message || err.message || "Failed to submit review";
      showNotification({ 
        message: errorMsg, 
        type: "error",
        duration: 5000
      });
    }
  
  };

  return (
    <>
      <Header />
      <div className="orders-container">
        <h1>My Orders</h1>
        <div className="orders-grid">
          {orders.map((order) => (
            <div
              key={order._id}
              className="order-card-wrapper"
              style={{ position: "relative" }}
            >
              <OrderCard order={order} variant="customer" />

              {/* STRICTOR CHECK: Show ONLY if Completed and NOT yet reviewed */}
              {order.status === "Completed" && !order.is_reviewed && (
                <button
                  className="btn-review-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRateTransporter(order._id);
                  }}
                >
                  Rate Transporter
                </button>
              )}

              {/* Show label if already reviewed */}
              {order.is_reviewed && (
                <span className="reviewed-badge">Review Submitted</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
