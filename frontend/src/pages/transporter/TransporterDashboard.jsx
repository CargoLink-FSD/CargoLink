// Transporter Dashboard Page
// Overview of operations, orders, bids, fleet, and earnings

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getTransporterDashboardStats } from '../../api/transporter';
import { getTransporterOrders, getAvailableOrders } from '../../api/transporterOrders';
import { fetchMyBids, withdrawBid } from '../../api/bids';
import { getFleet } from '../../api/fleet';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './TransporterDashboard.css';

// Lightweight SVG Donut Chart Component
const DonutChart = ({ data, size = 160, strokeWidth = 20 }) => {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  if (total === 0) {
    return (
      <div className="donut-empty">
        <span>No data</span>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const colors = {
    'Assigned': '#f59e0b',
    'In Transit': '#8b5cf6',
    'Started': '#06b6d4',
    'Completed': '#10b981',
    'Cancelled': '#ef4444',
    'Placed': '#3b82f6',
    'Available': '#10b981',
    'In Maintenance': '#f59e0b',
    'Unavailable': '#ef4444'
  };

  let cumulativePercentage = 0;
  const segments = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([label, value]) => {
      const percentage = value / total;
      const startAngle = cumulativePercentage * 360;
      cumulativePercentage += percentage;
      
      return {
        label,
        value,
        percentage,
        startAngle,
        color: colors[label] || '#6b7280'
      };
    });

  return (
    <div className="donut-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * segment.percentage} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${segment.startAngle - 90} ${center} ${center})`}
            className="donut-segment"
          />
        ))}
        <text x={center} y={center - 8} textAnchor="middle" className="donut-total-value">
          {total}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" className="donut-total-label">
          Total
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map(segment => (
          <div key={segment.label} className="donut-legend-item">
            <span className="donut-legend-color" style={{ backgroundColor: segment.color }}></span>
            <span className="donut-legend-label">{segment.label}</span>
            <span className="donut-legend-value">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TransporterDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobSortBy, setJobSortBy] = useState('date');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [statsRes, ordersRes, jobsRes, bidsRes, fleetRes] = await Promise.all([
        getTransporterDashboardStats().catch(e => { console.error('Stats error:', e); return null; }),
        getTransporterOrders().catch(e => { console.error('Orders error:', e); return []; }),
        getAvailableOrders().catch(e => { console.error('Jobs error:', e); return []; }),
        fetchMyBids().catch(e => { console.error('Bids error:', e); return []; }),
        getFleet().catch(e => { console.error('Fleet error:', e); return []; })
      ]);

      setStats(statsRes);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setAvailableJobs(Array.isArray(jobsRes) ? jobsRes : []);
      setMyBids(Array.isArray(bidsRes) ? bidsRes : []);
      setFleet(Array.isArray(fleetRes) ? fleetRes : []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency in INR
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

  // Format short date
  const formatShortDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
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

  // Get fleet status class
  const getFleetStatusClass = (status) => {
    const statusMap = {
      'Available': 'available',
      'Assigned': 'assigned',
      'In Maintenance': 'maintenance',
      'Unavailable': 'unavailable',
    };
    return statusMap[status] || '';
  };

  // Filter upcoming pickups
  const upcomingPickups = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return orders
      .filter(order => {
        const scheduled = new Date(order.scheduled_at);
        const isActive = ['Assigned', 'In Transit', 'Started'].includes(order.status);
        return isActive && scheduled >= now && scheduled <= sevenDays;
      })
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .slice(0, 5);
  }, [orders]);

  // Filter orders needing vehicle assignment
  const ordersNeedingVehicle = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    return orders
      .filter(order => {
        const isActive = ['Assigned', 'In Transit', 'Started'].includes(order.status);
        const noVehicle = !order.assignment?.vehicle_id;
        return isActive && noVehicle;
      })
      .slice(0, 5);
  }, [orders]);

  // Sort and filter available jobs
  const sortedAvailableJobs = useMemo(() => {
    if (!availableJobs || availableJobs.length === 0) return [];
    
    let sorted = [...availableJobs];
    if (jobSortBy === 'date') {
      sorted.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    } else if (jobSortBy === 'price') {
      sorted.sort((a, b) => (b.max_price || 0) - (a.max_price || 0));
    } else if (jobSortBy === 'distance') {
      sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return sorted.slice(0, 5);
  }, [availableJobs, jobSortBy]);

  // Recent bids (sorted by newest)
  const recentBids = useMemo(() => {
    if (!myBids || myBids.length === 0) return [];
    
    return [...myBids]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [myBids]);

  // Fleet issues (maintenance/unavailable)
  const fleetIssues = useMemo(() => {
    if (!fleet || fleet.length === 0) return [];
    
    return fleet
      .filter(v => v.status === 'In Maintenance' || v.status === 'Unavailable')
      .slice(0, 5);
  }, [fleet]);

  // Handle bid withdrawal
  const handleWithdrawBid = async (orderId, bidId) => {
    try {
      await withdrawBid(orderId, bidId);
      setMyBids(prev => prev.filter(bid => bid._id !== bidId));
    } catch (err) {
      console.error('Failed to withdraw bid:', err);
    }
  };

  // Check if order has an active bid from this transporter
  const hasMyBid = (orderId) => {
    return myBids.some(bid => bid.order_id?._id === orderId || bid.order_id === orderId);
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

  // Even if stats failed, render the page frame with error card
  const orderStats = stats?.orders || {};
  const bidsStats = stats?.bids || {};
  const fleetStats = stats?.fleet || {};
  const earningsStats = stats?.earnings || {};
  const jobsStats = stats?.jobs || {};
  const tripsStats = stats?.trips || {};

  return (
    <>
      <Header />
      <div style={{ paddingTop: '80px' }}>
        <div className="dashboard-container">
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p>Operations overview</p>
          </div>

          {/* Error Card (non-blocking) */}
          {error && (
            <div className="dashboard-error-card">
              <span>{error}</span>
              <button onClick={fetchDashboardData}>Retry</button>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="dashboard-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-value">{orderStats.activeOrders || 0}</div>
              <div className="kpi-card-label">Active Orders</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{orderStats.upcomingPickupsCount || 0}</div>
              <div className="kpi-card-label">Upcoming Pickups</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{orderStats.needsVehicleAssignmentCount || 0}</div>
              <div className="kpi-card-label">Needs Vehicle</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{jobsStats.availableJobsCount || 0}</div>
              <div className="kpi-card-label">Available Jobs</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">
                {fleetStats.fleetStatusBreakdown?.Available || 0} / {fleetStats.totalVehicles || 0}
              </div>
              <div className="kpi-card-label">Fleet Available</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{formatCurrency(earningsStats.estimatedEarningsThisMonth)}</div>
              <div className="kpi-card-label">Earnings This Month</div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-card-value">{formatCurrency(earningsStats.pipelineValue)}</div>
              <div className="kpi-card-label">Pipeline Value</div>
            </div>
          </div>

          {/* Charts and Status Section */}
          <div className="dashboard-panels-grid">
            {/* Order Status Breakdown Chart */}
            <div className="dashboard-panel">
              <h2>Order Status Breakdown</h2>
              {orderStats.statusBreakdown ? (
                <DonutChart data={orderStats.statusBreakdown} />
              ) : (
                <div className="empty-state-message">No order data available</div>
              )}
            </div>

            {/* Fleet Status Breakdown */}
            <div className="dashboard-panel">
              <h2>Fleet Status</h2>
              {fleetStats.fleetStatusBreakdown ? (
                <DonutChart data={fleetStats.fleetStatusBreakdown} />
              ) : (
                <div className="empty-state-message">No fleet data available</div>
              )}
            </div>
          </div>

          {/* My Work Today Section */}
          <div className="dashboard-work-section">
            <h2 className="section-title">My Work Today</h2>
            
            <div className="dashboard-panels-grid">
              {/* Upcoming Pickups Panel */}
              <div className="dashboard-panel">
                <h2>
                  Next Pickups ({upcomingPickups.length})
                </h2>
                {upcomingPickups.length > 0 ? (
                  <div className="work-list">
                    {upcomingPickups.map((order) => (
                      <div key={order._id} className="work-item">
                        <div className="work-item-info">
                          <div className="work-item-route">
                            {order.pickup?.city || 'Unknown'} → {order.delivery?.city || 'Unknown'}
                          </div>
                          <div className="work-item-date">
                            {formatDate(order.scheduled_at)}
                          </div>
                        </div>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                        <div className="work-item-actions">
                          <Link to={`/transporter/orders/${order._id}/track`} className="action-btn track">
                            Track
                          </Link>
                          {!order.assignment?.vehicle_id && (
                            <Link to={`/transporter/orders/${order._id}`} className="action-btn assign">
                              Assign Vehicle
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-message">
                    No upcoming pickups in the next 7 days
                  </div>
                )}
                <Link to="/transporter/orders" className="panel-view-all">
                  View All Orders →
                </Link>
              </div>

              {/* Orders Needing Vehicle Panel */}
              <div className="dashboard-panel">
                <h2>
                  Needs Vehicle Assignment ({ordersNeedingVehicle.length})
                </h2>
                {ordersNeedingVehicle.length > 0 ? (
                  <div className="work-list">
                    {ordersNeedingVehicle.map((order) => (
                      <div key={order._id} className="work-item">
                        <div className="work-item-info">
                          <div className="work-item-route">
                            {order.pickup?.city || 'Unknown'} → {order.delivery?.city || 'Unknown'}
                          </div>
                          <div className="work-item-date">
                            Pickup: {formatShortDate(order.scheduled_at)}
                          </div>
                        </div>
                        <Link to={`/transporter/orders/${order._id}`} className="action-btn assign">
                          Assign Vehicle
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-message">
                    All active orders have vehicles assigned
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Available Jobs Section */}
          <div className="dashboard-panel full-width">
            <div className="panel-header-with-filter">
              <h2>Available Jobs ({availableJobs.length})</h2>
              <select
                className="filter-select"
                value={jobSortBy}
                onChange={(e) => setJobSortBy(e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="price">Sort by Price</option>
                <option value="distance">Sort by Distance</option>
              </select>
            </div>
            {sortedAvailableJobs.length > 0 ? (
              <div className="jobs-grid">
                {sortedAvailableJobs.map((job) => (
                  <div key={job._id} className="job-card">
                    <div className="job-card-header">
                      <span className="job-card-price">{formatCurrency(job.max_price)}</span>
                      <span className="job-card-distance">{job.distance || 'N/A'} km</span>
                    </div>
                    <div className="job-card-route">
                      <span className="job-from">{job.pickup?.city || 'Unknown'}, {job.pickup?.state || ''}</span>
                      <span className="job-arrow">→</span>
                      <span className="job-to">{job.delivery?.city || 'Unknown'}, {job.delivery?.state || ''}</span>
                    </div>
                    <div className="job-card-details">
                      <span>{formatShortDate(job.scheduled_at)}</span>
                      <span>{job.goods_type || 'General'}</span>
                      <span>{job.weight || 'N/A'} kg</span>
                    </div>
                    <div className="job-card-actions">
                      {hasMyBid(job._id) ? (
                        <span className="bid-placed-badge">Bid Placed</span>
                      ) : (
                        <Link to="/transporter/bid" className="action-btn bid">
                          Place Bid
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-message">
                No jobs available for bidding right now
              </div>
            )}
            <Link to="/transporter/bid" className="panel-view-all">
              View All Available Jobs →
            </Link>
          </div>

          {/* Bids Panel */}
          <div className="dashboard-panels-grid">
            <div className="dashboard-panel">
              <h2>
                My Bids ({bidsStats.activeBidsCount || myBids.length})
              </h2>
              <div className="bids-summary">
                <span>Average Bid: {formatCurrency(bidsStats.avgBidAmount)}</span>
              </div>
              {recentBids.length > 0 ? (
                <div className="work-list">
                  {recentBids.map((bid) => {
                    const order = bid.order_id || {};
                    return (
                      <div key={bid._id} className="work-item bid-item">
                        <div className="work-item-info">
                          <div className="work-item-route">
                            {order.pickup?.city || 'Unknown'} → {order.delivery?.city || 'Unknown'}
                          </div>
                          <div className="work-item-date">
                            Bid: {formatCurrency(bid.bid_amount)}
                          </div>
                        </div>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {order.status || 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-message">
                  No active bids
                </div>
              )}
              <Link to="/transporter/my-bids" className="panel-view-all">
                View All Bids →
              </Link>
            </div>

            {/* Fleet Snapshot Panel */}
            <div className="dashboard-panel">
              <h2>
                Fleet Snapshot
              </h2>
              <div className="fleet-summary">
                <div className="fleet-stat">
                  <span className="fleet-stat-value">{fleetStats.totalVehicles || fleet.length}</span>
                  <span className="fleet-stat-label">Total Vehicles</span>
                </div>
                <div className="fleet-stat available">
                  <span className="fleet-stat-value">{fleetStats.fleetStatusBreakdown?.Available || 0}</span>
                  <span className="fleet-stat-label">Available</span>
                </div>
                <div className="fleet-stat assigned">
                  <span className="fleet-stat-value">{fleetStats.fleetStatusBreakdown?.Assigned || 0}</span>
                  <span className="fleet-stat-label">Assigned</span>
                </div>
              </div>
              
              {fleetIssues.length > 0 && (
                <>
                  <h3 className="fleet-issues-title">Vehicles Needing Attention</h3>
                  <div className="work-list">
                    {fleetIssues.map((vehicle) => (
                      <div key={vehicle._id} className="work-item fleet-item">
                        <div className="work-item-info">
                          <div className="work-item-route">{vehicle.name}</div>
                          <div className="work-item-date">{vehicle.registration}</div>
                        </div>
                        <span className={`fleet-status-badge ${getFleetStatusClass(vehicle.status)}`}>
                          {vehicle.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <Link to="/transporter/fleet" className="panel-view-all">
                Manage Fleet →
              </Link>
            </div>
          </div>

          {/* Trips Section (only show if there are active trips) */}
          {tripsStats.activeTripsCount > 0 && (
            <div className="dashboard-panel full-width trips-panel">
              <h2>Active Trips</h2>
              <div className="trips-summary">
                <div className="trips-stat">
                  <span className="trips-stat-value">{tripsStats.activeTripsCount}</span>
                  <span className="trips-stat-label">Active Trips</span>
                </div>
                {tripsStats.delayedTripsCount > 0 && (
                  <div className="trips-stat delayed">
                    <span className="trips-stat-value">{tripsStats.delayedTripsCount}</span>
                    <span className="trips-stat-label">Delayed</span>
                  </div>
                )}
                {tripsStats.nextStop && (
                  <div className="next-stop-info">
                    <span className="next-stop-label">Next Stop:</span>
                    <span className="next-stop-location">
                      {tripsStats.nextStop.city}, {tripsStats.nextStop.state}
                    </span>
                    <span className="next-stop-type">({tripsStats.nextStop.type})</span>
                    {tripsStats.nextStop.eta && (
                      <span className="next-stop-eta">ETA: {formatDate(tripsStats.nextStop.eta)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}
