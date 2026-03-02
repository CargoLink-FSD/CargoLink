import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
];

export default function Dashboard() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await http.get('/api/admin/dashboard/stats');
      setData(res.data);
    } catch (err) {
      console.error(err);
      showNotification({ message: 'Failed to load dashboard', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <>
        <Header />
        <div className="admin-container">
          <div className="adm-loading">
            <div className="adm-spinner" />
            <p>Loading dashboard...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const ordersChart = {
    labels: (data.ordersPerDay || []).map(d => d.order_day).reverse(),
    datasets: [{
      label: 'Orders',
      data: (data.ordersPerDay || []).map(d => d.total_orders).reverse(),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
    }],
  };

  const revenueChart = {
    labels: (data.revenuePerDay || []).map(d => d.order_day).reverse(),
    datasets: [{
      label: 'Revenue (₹)',
      data: (data.revenuePerDay || []).map(d => d.total_revenue).reverse(),
      backgroundColor: 'rgba(16,185,129,0.75)',
      borderRadius: 6,
    }],
  };

  const statusChart = {
    labels: (data.orderStatusDistribution || []).map(d => d.status),
    datasets: [{
      data: (data.orderStatusDistribution || []).map(d => d.count),
      backgroundColor: CHART_COLORS.slice(0, (data.orderStatusDistribution || []).length),
    }],
  };

  const topTransChart = {
    labels: (data.topTransporters || []).map(d => d.name),
    datasets: [{
      label: 'Completed Orders',
      data: (data.topTransporters || []).map(d => d.total_orders),
      backgroundColor: '#8b5cf6',
      borderRadius: 6,
    }],
  };

  const truckChart = {
    labels: (data.truckTypes || []).map(d => d.truck_type),
    datasets: [{
      data: (data.truckTypes || []).map(d => d.total_orders),
      backgroundColor: CHART_COLORS.slice(0, (data.truckTypes || []).length),
    }],
  };

  const custChart = {
    labels: (data.newCustomersPerMonth || []).map(d => d.month).reverse(),
    datasets: [{
      label: 'New Customers',
      data: (data.newCustomersPerMonth || []).map(d => d.new_customers).reverse(),
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236,72,153,0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
    },
  };

  const pieOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { font: { size: 12 }, padding: 12 } } },
  };

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Dashboard</h1>
          <p className="adm-page-subtitle">Platform overview at a glance</p>
        </div>

        {/* Stat Cards */}
        <div className="adm-stats-row">
          <div className="adm-stat-card blue">
            <span className="adm-stat-label">Total Orders</span>
            <span className="adm-stat-value">{data.totalOrders}</span>
          </div>
          <div className="adm-stat-card green">
            <span className="adm-stat-label">Revenue</span>
            <span className="adm-stat-value">₹{(data.totalRevenue || 0).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card purple">
            <span className="adm-stat-label">Customers</span>
            <span className="adm-stat-value">{data.totalCustomers || 0}</span>
          </div>
          <div className="adm-stat-card cyan">
            <span className="adm-stat-label">Transporters</span>
            <span className="adm-stat-value">{data.totalTransporters || 0}</span>
          </div>
          <div className="adm-stat-card orange">
            <span className="adm-stat-label">Active Orders</span>
            <span className="adm-stat-value">{data.pendingOrders}</span>
          </div>
          <div className="adm-stat-card green">
            <span className="adm-stat-label">Completed</span>
            <span className="adm-stat-value">{data.completedOrders}</span>
          </div>
          <div className="adm-stat-card pink">
            <span className="adm-stat-label">Fleet Size</span>
            <span className="adm-stat-value">{data.totalVehicles || 0}</span>
          </div>
          <div className="adm-stat-card red">
            <span className="adm-stat-label">Open Tickets</span>
            <span className="adm-stat-value">{data.openTickets || 0}</span>
          </div>
        </div>

        {/* Charts */}
        <div className="adm-charts-grid">
          <div className="adm-chart-card">
            <h3>Orders per Day (Last 30 days)</h3>
            <div className="adm-chart-wrap">
              <Line data={ordersChart} options={chartOpts} />
            </div>
          </div>
          <div className="adm-chart-card">
            <h3>Revenue per Day</h3>
            <div className="adm-chart-wrap">
              <Bar data={revenueChart} options={chartOpts} />
            </div>
          </div>
          <div className="adm-chart-card">
            <h3>Order Status Distribution</h3>
            <div className="adm-chart-wrap">
              <Pie data={statusChart} options={pieOpts} />
            </div>
          </div>
          <div className="adm-chart-card">
            <h3>Top Transporters</h3>
            <div className="adm-chart-wrap">
              <Bar data={topTransChart} options={chartOpts} />
            </div>
          </div>
          <div className="adm-chart-card">
            <h3>Most Requested Truck Types</h3>
            <div className="adm-chart-wrap">
              <Pie data={truckChart} options={pieOpts} />
            </div>
          </div>
          <div className="adm-chart-card">
            <h3>New Customers per Month</h3>
            <div className="adm-chart-wrap">
              <Line data={custChart} options={chartOpts} />
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="adm-card">
          <h3 className="adm-card-title">Quick Insights</h3>
          <div className="adm-detail-grid">
            <div className="adm-detail-field">
              <span className="adm-detail-label">Avg Bid Amount</span>
              <span className="adm-detail-value">₹{Math.round(data.avgBidAmount || 0).toLocaleString()}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Pending Verifications</span>
              <span className="adm-detail-value">{data.pendingVerifications || 0}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Order Completion Rate</span>
              <span className="adm-detail-value">
                {data.totalOrders ? `${Math.round((data.completedOrders / data.totalOrders) * 100)}%` : '—'}
              </span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Avg Revenue / Order</span>
              <span className="adm-detail-value">
                {data.completedOrders ? `₹${Math.round(data.totalRevenue / data.completedOrders).toLocaleString()}` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
