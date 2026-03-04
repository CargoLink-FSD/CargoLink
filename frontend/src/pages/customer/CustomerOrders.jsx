import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCustomerOrders,
  selectAllOrders,
  selectOrdersLoading,
  selectOrdersError,
} from "../../store/slices/ordersSlice";
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

  // Rating/review is handled in Order Details after final payment

  return (
    <>
      <Header />
      <br />
      <br />
      <br />
      <div className="co-page">
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
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
