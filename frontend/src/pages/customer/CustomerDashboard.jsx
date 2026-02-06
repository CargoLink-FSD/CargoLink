// Customer Dashboard Page
// Overview of shipments, statistics, and recent orders

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCustomerDashboardStats } from '../../api/customer';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './CustomerDashboard.css';

export default function CustomerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCustomerDashboardStats();
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge class
  const getStatusClass = (status) => {
    if (!status) return '';
    const statusMap = {
      'Placed': 'placed',
      'Assigned': 'assigned',
      'In Transit': 'in-transit',
      'Started': 'started',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
    };
    return statusMap[status] || '';
  };

  // Get order price (final_price or max_price)
  const getOrderPrice = (order) => {
    return order?.final_price || order?.max_price || 0;
  };

  // Filter and sort recent orders
  const filteredOrders = useMemo(() => {
    if (!stats?.recentOrders) return [];
    
    let orders = [...stats.recentOrders];
    
    // Apply status filter
    if (statusFilter === 'active') {
      orders = orders.filter(o => ['Placed', 'Assigned', 'In Transit', 'Started'].includes(o.status));
    } else if (statusFilter === 'completed') {
      orders = orders.filter(o => o.status === 'Completed');
    } else if (statusFilter === 'cancelled') {
      orders = orders.filter(o => o.status === 'Cancelled');
    }
    
    // Apply sort
    if (sortBy === 'date') {
      orders.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    } else if (sortBy === 'price') {
      orders.sort((a, b) => getOrderPrice(b) - getOrderPrice(a));
    }
    
    return orders;
  }, [stats?.recentOrders, statusFilter, sortBy]);

  // Calculate status bar width percentage
  const getBarWidth = (count) => {
    if (!stats?.totalOrders || stats.totalOrders === 0) return 0;
    return Math.max((count / stats.totalOrders) * 100, count > 0 ? 3 : 0);
  };

  // Pie chart data calculation
  const getPieChartData = () => {
    if (!stats?.statusBreakdown) return [];
    const statusColors = {
      'Placed': '#3b82f6',
      'Assigned': '#f59e0b',
      'In Transit': '#8b5cf6',
      'Started': '#06b6d4',
      'Completed': '#10b981',
      'Cancelled': '#ef4444',
    };
    
    const total = stats.totalOrders || 0;
    if (total === 0) return [];
    
    let currentAngle = 0;
    const segments = [];
    
    Object.entries(stats.statusBreakdown).forEach(([status, count]) => {
      if (count > 0 && statusColors[status]) {
        const percentage = (count / total) * 100;
        const angle = (count / total) * 360;
        segments.push({
          status,
          count,
          percentage,
          color: statusColors[status],
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
        });
        currentAngle += angle;
      }
    });
    
    return segments;
  };

  // Generate SVG pie chart path
  const getPieSlicePath = (startAngle, endAngle, radius = 80) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M 100 100 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // Determine action link for pickup item
  const getPickupActionLink = (order) => {
    if (['Assigned', 'In Transit', 'Started'].includes(order.status)) {
      return { to: `/customer/orders/${order._id}/track`, label: 'Track' };
    }
    if (order.status === 'Placed') {
      return { to: `/customer/order/${order._id}/bids`, label: 'View Bids' };
    }
    return { to: `/customer/orders/${order._id}`, label: 'View' };
  };

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ paddingTop: '80px' }}>
          <div className="dashboard-container">
            <div className="dashboard-loading">
              <div className="spinner"></div>
              <p>Loading your dashboard...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error && !stats) {
    return (
      <>
        <Header />
        <div style={{ paddingTop: '80px' }}>
          <div className="dashboard-container">
            <div className="dashboard-error">
              <p>{error}</p>
              <button onClick={fetchDashboardStats}>Try Again</button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const statusBreakdown = stats?.statusBreakdown || {};
  const pieChartData = getPieChartData();

  return (
    <>
      <Header />
      <div style={{ paddingTop: '80px' }}>
        <div className="dashboard-container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p>Overview of your shipments and orders</p>
          </div>

          {/* KPI Cards */}
          <div className="dashboard-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.totalOrders || 0}</div>
              <div className="kpi-card-label">Total Orders</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.activeOrders || 0}</div>
              <div className="kpi-card-label">Active Orders</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.completedOrders || 0}</div>
              <div className="kpi-card-label">Completed</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.cancelledOrders || 0}</div>
              <div className="kpi-card-label">Cancelled</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{formatCurrency(stats?.estimatedTotalSpend)}</div>
              <div className="kpi-card-label">Estimated Spend</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{formatCurrency(stats?.thisMonthSpend)}</div>
              <div className="kpi-card-label">This Month Spend</div>
            </div>
          </div>

          {/* Panels Grid */}
          <div className="dashboard-panels-grid">
            {/* Status Breakdown Panel with Pie Chart */}
            <div className="dashboard-panel">
              <h2>Status Breakdown</h2>
              <div className="pie-chart-container">
                {pieChartData.length > 0 ? (
                  <>
                    <svg viewBox="0 0 200 200" className="pie-chart">
                      {pieChartData.map((segment, index) => (
                        <path
                          key={segment.status}
                          d={getPieSlicePath(segment.startAngle, segment.endAngle)}
                          fill={segment.color}
                          className="pie-slice"
                        >
                          <title>{segment.status}: {segment.count} ({segment.percentage.toFixed(1)}%)</title>
                        </path>
                      ))}
                      {/* Center circle for donut effect */}
                      <circle cx="100" cy="100" r="45" fill="#1a1a2e" />
                      <text x="100" y="95" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
                        {stats?.totalOrders || 0}
                      </text>
                      <text x="100" y="115" textAnchor="middle" fill="#9ca3af" fontSize="10">
                        Total
                      </text>
                    </svg>
                    <div className="pie-chart-legend">
                      {pieChartData.map((segment) => (
                        <div key={segment.status} className="legend-item">
                          <span className="legend-color" style={{ background: segment.color }}></span>
                          <span className="legend-label">{segment.status}</span>
                          <span className="legend-value">{segment.count} ({segment.percentage.toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state-message">No orders to display</div>
                )}
              </div>
            </div>

            {/* Upcoming Pickups Panel */}
            <div className="dashboard-panel">
              <h2>Upcoming Pickups ({stats?.upcomingPickupsCount || 0})</h2>
              {stats?.upcomingOrders && stats.upcomingOrders.length > 0 ? (
                <div className="upcoming-pickups-list">
                  {stats.upcomingOrders.map((order) => {
                    const action = getPickupActionLink(order);
                    return (
                      <div key={order._id} className="upcoming-pickup-item">
                        <div className="pickup-route">
                          <div className="pickup-route-text">
                            {order.pickup?.city || 'Unknown'}, {order.pickup?.state || ''} → {order.delivery?.city || 'Unknown'}, {order.delivery?.state || ''}
                          </div>
                          <div className="pickup-date">
                            {formatDate(order.scheduled_at)}
                          </div>
                        </div>
                        <span className={`pickup-status-badge ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                        <Link to={action.to} className="pickup-action-link">
                          {action.label}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-message">
                  No upcoming pickups in the next 7 days
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="recent-orders-section">
            <div className="recent-orders-header">
              <h2>Recent Orders</h2>
              <div className="recent-orders-filters">
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date">Sort by Date</option>
                  <option value="price">Sort by Price</option>
                </select>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredOrders.length > 0 ? (
              <table className="recent-orders-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        {order.pickup?.city || 'N/A'}, {order.pickup?.state || ''}
                      </td>
                      <td>
                        {order.delivery?.city || 'N/A'}, {order.delivery?.state || ''}
                      </td>
                      <td>{formatDate(order.scheduled_at)}</td>
                      <td>
                        <span className={`order-status-badge ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{formatCurrency(getOrderPrice(order))}</td>
                      <td>
                        <Link
                          to={`/customer/orders/${order._id}`}
                          className="order-action-btn view"
                        >
                          View
                        </Link>
                        {['Assigned', 'In Transit', 'Started'].includes(order.status) && (
                          <Link
                            to={`/customer/orders/${order._id}/track`}
                            className="order-action-btn track"
                          >
                            Track
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state-message">
                No orders match the selected filters
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
