import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CircleX, Clock, FileText } from 'lucide-react';
import { getDriverDashboardStats, getDriverVerificationStatus, getDriverSchedule } from '../../api/driver';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './DriverDashboard.css';

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
    'Scheduled': '#f59e0b',
    'Active': '#8b5cf6',
    'In Transit': '#06b6d4',
    'Completed': '#10b981',
    'Cancelled': '#ef4444',
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

export default function DriverDashboard() {
  const [stats, setStats] = useState(null);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [schedule, setSchedule] = useState({ blocks: [] });
  const [verificationInfo, setVerificationInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [statsRes, verifyRes, scheduleRes] = await Promise.all([
        getDriverDashboardStats().catch(e => { console.error('Stats error:', e); return null; }),
        getDriverVerificationStatus().catch(e => { console.error('Verification error:', e); return null; }),
        getDriverSchedule().catch(e => { console.error('Schedule error:', e); return { blocks: [] }; })
      ]);

      setStats(statsRes);
      setVerificationInfo(verifyRes);
      setUpcomingTrips(statsRes?.upcomingTrips || []);
      setSchedule(scheduleRes || { blocks: [] });

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

  const getStatusClass = (status) => {
    const statusMap = {
      'Scheduled': 'scheduled',
      'Active': 'active',
      'Completed': 'completed',
    };
    return statusMap[status] || '';
  };

  const recentBlocks = useMemo(() => {
    if (!schedule.blocks || schedule.blocks.length === 0) return [];
    const now = new Date();
    return schedule.blocks
      .filter(block => new Date(block.startTime) >= now || new Date(block.endTime) >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [schedule]);

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

  const statusBreakdownData = stats?.statusBreakdown || { 'Scheduled': 0, 'Active': 0, 'Completed': 0 };

  return (
    <>
      <Header />
      <div style={{ paddingTop: '80px' }}>
        {/* Verification Status Banner */}
        {verificationInfo && verificationInfo.verificationStatus === 'unsubmitted' && (
          <div className="verification-banner verification-unsubmitted">
            <span>
              <FileText size={16} aria-hidden="true" />
              <span>Complete document upload to activate your profile.</span>
            </span>
            <Link to="/driver/profile" className="banner-action">Upload Documents</Link>
          </div>
        )}
        {verificationInfo && verificationInfo.verificationStatus === 'under_review' && (
          <div className="verification-banner verification-under-review">
            <span>
              <Clock size={16} aria-hidden="true" />
              <span>Your documents are under manager review. You will be notified once verified.</span>
            </span>
          </div>
        )}
        {verificationInfo && verificationInfo.verificationStatus === 'rejected' && (
          <div className="verification-banner verification-rejected">
            <span>
              <CircleX size={16} aria-hidden="true" />
              <span>One or more of your documents were rejected. Please re-upload to continue.</span>
            </span>
            <Link to="/driver/profile" className="banner-action">Re-upload</Link>
          </div>
        )}

        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1>Driver Dashboard</h1>
            <p>Welcome back! Here is your operations overview.</p>
          </div>

          {error && (
            <div className="dashboard-error-card">
              <span>{error}</span>
              <button onClick={fetchDashboardData}>Retry</button>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="dashboard-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.activeTripsCount || 0}</div>
              <div className="kpi-card-label">Active Trips</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.upcomingTripsCount || 0}</div>
              <div className="kpi-card-label">Upcoming Trips</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-value">{stats?.completedTripsCount || 0}</div>
              <div className="kpi-card-label">Total Completed</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-value">{schedule.blocks?.length || 0}</div>
              <div className="kpi-card-label">Schedule Blocks</div>
            </div>
          </div>

          {/* Charts and Status Section */}
          <div className="dashboard-panels-grid">
            <div className="dashboard-panel">
              <h2>Trip Status Breakdown</h2>
              <DonutChart data={statusBreakdownData} />
            </div>

            {/* Upcoming Trips List */}
            <div className="dashboard-panel">
              <h2>Next Scheduled Trips ({upcomingTrips.length})</h2>
              {upcomingTrips.length > 0 ? (
                <div className="work-list">
                  {upcomingTrips.map((trip) => (
                    <div key={trip._id} className="work-item">
                      <div className="work-item-info">
                        <div className="work-item-route">
                          Trip #{trip._id.substring(trip._id.length - 6).toUpperCase()}
                        </div>
                        <div className="work-item-date">
                          Start: {formatDate(trip.planned_start_at)}
                        </div>
                      </div>
                      <span className={`status-badge ${getStatusClass(trip.status)}`}>
                        {trip.status}
                      </span>
                      <div className="work-item-actions">
                        <Link to={`/driver/trips/${trip._id}`} className="action-btn view">
                          View Trip
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-message">
                  No upcoming trips scheduled
                </div>
              )}
              <Link to="/driver/trips" className="panel-view-all">
                View All Trips →
              </Link>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="dashboard-panels-grid">
            <div className="dashboard-panel full-width">
              <h2>My Upcoming Schedule Blocks</h2>
              {recentBlocks.length > 0 ? (
                <div className="work-list">
                  {recentBlocks.map((block) => (
                    <div key={block._id} className="work-item">
                      <div className="work-item-info">
                        <div className="work-item-route">{block.title || 'Unavailable'}</div>
                        <div className="work-item-date">
                          {formatDate(block.startTime)} - {formatDate(block.endTime)}
                        </div>
                      </div>
                      <span className="status-badge scheduled">{block.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-message">
                  Your schedule is completely open for the next 14 days.
                </div>
              )}
              <Link to="/driver/schedule" className="panel-view-all">
                Manage Schedule →
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}