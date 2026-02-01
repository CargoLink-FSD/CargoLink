import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import { formatCurrency } from '../../utils/currency';
import './OrderManagement.css';

export default function OrderManagement() {
  const { showNotification } = useNotification();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderBids, setOrderBids] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await http.get('/api/admin/orders');
      setOrders(response.data || []);
      setFilteredOrders(response.data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      showNotification({ message: 'Failed to load orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(order => 
        order.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        const orderId = `ord-${order.order_id}`.toLowerCase();
        const customerName = order.customer_name?.toLowerCase() || '';
        
        return orderId.includes(searchLower) ||
               customerName.includes(searchLower);
      });
    }

    setFilteredOrders(filtered);
  };

  const showOrderDetails = async (order) => {
    setShowModal(true);
    setSelectedOrder(order);
    setLoadingModal(true);
    setOrderBids([]);

    try {
      const response = await http.get(`/api/admin/orders/${order.order_id}/bids`);
      setOrderBids(response.data || []);
    } catch (err) {
      console.error('Error fetching bids:', err);
      showNotification({ message: 'Failed to load bids', type: 'error' });
    } finally {
      setLoadingModal(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    setOrderBids([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    return status ? status.toLowerCase().replace(/\s+/g, '-') : 'pending';
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="orders-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="admin-main orders-container">
        {/* Filter Section */}
        <section className="filter-section">
          <div className="section-header">
            <h2>Order Management</h2>
            <button className="refresh-btn" onClick={fetchOrders}>
              Refresh
            </button>
          </div>
          
          <div className="search-filter">
            <div className="search-box">
              <input
                type="text"
                id="searchInput"
                placeholder="Search by order ID, customer, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-controls">
              <div className="filter-group">
                <label>Status:</label>
                <select
                  className="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Placed">Placed</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Orders Table */}
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Pickup Location</th>
                <th>Delivery Location</th>
                <th>Created Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-results">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td>#ORD-{order.order_id.slice(-6)}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.pickup_location || 'N/A'}</td>
                    <td>{order.dropoff_location || 'N/A'}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="view-btn"
                        onClick={() => showOrderDetails(order)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && (
        <div className="admin-modal" onClick={closeModal}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Order Details - #ORD-{selectedOrder?.order_id.slice(-6)}</h3>
              <span className="close-admin-modal" onClick={closeModal}>&times;</span>
            </div>
            
            <div className="admin-modal-body">
              {selectedOrder && (
                <>
                  <div className="order-details">
                    <div className="detail-row">
                      <span className="detail-label">Customer:</span>
                      <span>{selectedOrder.customer_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Customer Email:</span>
                      <span>{selectedOrder.customer_email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Transporter:</span>
                      <span>{selectedOrder.transporter_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Truck Type:</span>
                      <span>{selectedOrder.truck_type}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Final Price:</span>
                      <span>{formatCurrency(selectedOrder.final_price, { includeDecimals: true })}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Created Date:</span>
                      <span>{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  <h4>Bids</h4>
                  {loadingModal ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading bids...</p>
                    </div>
                  ) : (
                    <table className="bids-table">
                      <thead>
                        <tr>
                          <th>Transporter</th>
                          <th>Bid Amount</th>
                          <th>Bid Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderBids.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center' }}>
                              No bids available
                            </td>
                          </tr>
                        ) : (
                          orderBids.map((bid, index) => (
                            <tr key={index}>
                              <td>{bid.transporter_name || 'N/A'}</td>
                              <td>{formatCurrency(bid.bid_amount, { includeDecimals: true })}</td>
                              <td>{formatDateTime(bid.bid_time || bid.createdAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
            
            <div className="admin-modal-footer">
              <button className="close-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
