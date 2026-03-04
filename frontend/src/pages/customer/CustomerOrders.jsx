import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCustomerOrders,
  selectAllOrders,
  selectOrdersLoading,
  selectOrdersError,
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
  const orders = useSelector(selectAllOrders);
  const loading = useSelector(selectOrdersLoading);
  const error = useSelector(selectOrdersError);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debounceRef = useRef(null);

  // Initial load
  useEffect(() => {
    dispatch(fetchCustomerOrders({ search: "", status: "all" }));
  }, [dispatch]);

  // Debounced search — fires API call 400 ms after user stops typing
  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        dispatch(fetchCustomerOrders({ search: value, status: statusFilter }));
      }, 400);
    },
    [dispatch, statusFilter]
  );

  // Status filter — immediate API call
  const handleStatusChange = useCallback(
    (e) => {
      const value = e.target.value;
      setStatusFilter(value);
      dispatch(fetchCustomerOrders({ search: searchInput, status: value }));
    },
    [dispatch, searchInput]
  );

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
      <div className="customerOrders-container co-page">
        {/* ── Header ── */}
        <div className="co-header">
          <h1>My Orders</h1>
        </div>

        {/* ── Controls bar ── */}
        <div className="co-controls">
          <input
            className="co-search-input"
            type="text"
            placeholder="Search by city..."
            value={searchInput}
            onChange={handleSearchChange}
          />
          <select
            className="co-status-select"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="assigned">Assigned</option>
            <option value="scheduled">Scheduled</option>
            <option value="started">Started</option>
            <option value="in transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="co-loading">
            <div className="co-spinner" />
            <p>Loading orders…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="co-empty">
            <h3>Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && orders.length === 0 && (
          <div className="co-empty">
            <h3>No orders found</h3>
            <p>
              {searchInput || statusFilter !== "all"
                ? "Try a different search or filter."
                : "You haven't placed any orders yet."}
            </p>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && !error && orders.length > 0 && (
          <div className="co-grid">
            {orders.map((order) => (
              <div key={order._id} className="co-card-wrap">
                <OrderCard order={order} variant="customer" />

                {order.status === "Completed" && !order.is_reviewed && (
                  <button
                    className="co-review-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateTransporter(order._id);
                    }}
                  >
                    Rate Transporter
                  </button>
                )}

                {order.is_reviewed && (
                  <span className="co-reviewed-badge">Review Submitted</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
