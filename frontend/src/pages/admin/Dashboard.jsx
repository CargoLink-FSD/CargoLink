import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import './AdminStyles.css';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler,
);

const RANGE_OPTIONS = [
  { value: '1h', label: 'Past Hour' },
  { value: '24h', label: 'Past 24 Hours' },
  { value: '7d', label: 'Past Week' },
  { value: '30d', label: 'Past 30 Days' },
  { value: '90d', label: 'Past 90 Days' },
  { value: '1y', label: 'Past Year' },
  { value: 'all', label: 'All Time' },
];

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
];

const safeNumber = (value) => Number(value || 0);
const formatCurrency = (value) => `Rs ${Math.round(safeNumber(value)).toLocaleString()}`;
const toPercent = (value, total) => (total > 0 ? `${Math.round((value / total) * 100)}%` : '--');

const getRangeLabel = (value) => RANGE_OPTIONS.find((item) => item.value === value)?.label || 'Selected Range';

export default function Dashboard() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [range, setRange] = useState('30d');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );

  const fetchData = useCallback(async (nextRange = range) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({ range: nextRange });
      const res = await http.get(`/api/admin/dashboard/stats?${query.toString()}`);
      setData(res?.data || res || null);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error(err);
      showNotification({ message: 'Failed to load dashboard', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [range, showNotification]);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  useEffect(() => {
    let rafId;

    const handleResize = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        setViewportWidth(window.innerWidth);
      });
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  const windowLabel = data?.window?.label || getRangeLabel(range);

  const ordersSeries = data?.ordersPerDay || [];
  const revenueSeries = data?.revenuePerDay || [];
  const customerSeries = data?.newCustomersPerMonth || [];
  const topTransporters = data?.topTransporters || [];
  const topRoutes = data?.topRoutes || [];
  const orderStatusDistribution = data?.orderStatusDistribution || [];
  const fleetUtilization = data?.fleetUtilization || [];
  const truckTypeDistribution = data?.truckTypes || [];
  const paymentStatusDistribution = data?.paymentStatusDistribution || [];
  const tripStatusDistribution = data?.tripStatusDistribution || [];
  const ticketCategoryDistribution = data?.ticketCategoryDistribution || [];
  const ticketPriorityDistribution = data?.ticketPriorityDistribution || [];
  const resolvedTicketsTrend = data?.resolvedTicketsTrend || [];
  const managerResolvedTickets = data?.managerResolvedTickets || [];
  const managerOpenTicketLoad = data?.managerOpenTicketLoad || [];
  const managerStatusDistribution = data?.managerStatusDistribution || [];

  const ordersChart = useMemo(() => ({
    labels: ordersSeries.map((d) => d.order_day).reverse(),
    datasets: [{
      label: 'Orders',
      data: ordersSeries.map((d) => d.total_orders).reverse(),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      tension: 0.35,
      fill: true,
      pointRadius: 2,
    }],
  }), [ordersSeries]);

  const revenueChart = useMemo(() => ({
    labels: revenueSeries.map((d) => d.order_day).reverse(),
    datasets: [{
      label: 'Revenue',
      data: revenueSeries.map((d) => d.total_revenue).reverse(),
      backgroundColor: 'rgba(16,185,129,0.75)',
      borderRadius: 6,
    }],
  }), [revenueSeries]);

  const topTransportersChart = useMemo(() => ({
    labels: topTransporters.map((d) => d.name || 'Unknown'),
    datasets: [{
      label: 'Completed Orders',
      data: topTransporters.map((d) => d.total_orders),
      backgroundColor: '#8b5cf6',
      borderRadius: 6,
    }],
  }), [topTransporters]);

  const topRoutesChart = useMemo(() => ({
    labels: topRoutes.map((d) => d.route || 'Unknown'),
    datasets: [{
      label: 'Orders',
      data: topRoutes.map((d) => d.total_orders),
      backgroundColor: '#0ea5e9',
      borderRadius: 6,
    }],
  }), [topRoutes]);

  const orderStatusChart = useMemo(() => ({
    labels: orderStatusDistribution.map((d) => d.status),
    datasets: [{
      data: orderStatusDistribution.map((d) => d.count),
      backgroundColor: CHART_COLORS.slice(0, orderStatusDistribution.length),
    }],
  }), [orderStatusDistribution]);

  const fleetUtilizationChart = useMemo(() => ({
    labels: fleetUtilization.map((d) => d.status),
    datasets: [{
      data: fleetUtilization.map((d) => d.count),
      backgroundColor: CHART_COLORS.slice(0, fleetUtilization.length),
    }],
  }), [fleetUtilization]);

  const paymentStatusChart = useMemo(() => ({
    labels: paymentStatusDistribution.map((d) => d.status),
    datasets: [{
      data: paymentStatusDistribution.map((d) => d.count),
      backgroundColor: CHART_COLORS.slice(0, paymentStatusDistribution.length),
    }],
  }), [paymentStatusDistribution]);

  const tripStatusChart = useMemo(() => ({
    labels: tripStatusDistribution.map((d) => d.status),
    datasets: [{
      label: 'Trips',
      data: tripStatusDistribution.map((d) => d.count),
      backgroundColor: '#f59e0b',
      borderRadius: 6,
    }],
  }), [tripStatusDistribution]);

  const truckTypeChart = useMemo(() => ({
    labels: truckTypeDistribution.map((d) => d.truck_type),
    datasets: [{
      data: truckTypeDistribution.map((d) => d.total_orders),
      backgroundColor: CHART_COLORS.slice(0, truckTypeDistribution.length),
    }],
  }), [truckTypeDistribution]);

  const newCustomersChart = useMemo(() => ({
    labels: customerSeries.map((d) => d.month).reverse(),
    datasets: [{
      label: 'New Customers',
      data: customerSeries.map((d) => d.new_customers).reverse(),
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236,72,153,0.1)',
      tension: 0.35,
      fill: true,
      pointRadius: 2,
    }],
  }), [customerSeries]);

  const ticketCategoryChart = useMemo(() => ({
    labels: ticketCategoryDistribution.map((d) => d.category || 'Other'),
    datasets: [{
      data: ticketCategoryDistribution.map((d) => d.count),
      backgroundColor: CHART_COLORS.slice(0, ticketCategoryDistribution.length),
    }],
  }), [ticketCategoryDistribution]);

  const ticketPriorityChart = useMemo(() => ({
    labels: ticketPriorityDistribution.map((d) => d.priority || 'unknown'),
    datasets: [{
      data: ticketPriorityDistribution.map((d) => d.count),
      backgroundColor: CHART_COLORS.slice(0, ticketPriorityDistribution.length),
    }],
  }), [ticketPriorityDistribution]);

  const resolvedTicketsTrendChart = useMemo(() => ({
    labels: resolvedTicketsTrend.map((d) => d.period).reverse(),
    datasets: [{
      label: 'Resolved Tickets',
      data: resolvedTicketsTrend.map((d) => d.resolved_tickets).reverse(),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.14)',
      tension: 0.35,
      fill: true,
      pointRadius: 2,
    }],
  }), [resolvedTicketsTrend]);

  const managerResolvedChart = useMemo(() => ({
    labels: managerResolvedTickets.map((d) => d.name || 'Unknown'),
    datasets: [{
      label: 'Resolved Tickets',
      data: managerResolvedTickets.map((d) => d.resolved_tickets),
      backgroundColor: '#14b8a6',
      borderRadius: 6,
    }],
  }), [managerResolvedTickets]);

  const managerOpenLoadChart = useMemo(() => ({
    labels: managerOpenTicketLoad.map((d) => d.name || 'Unknown'),
    datasets: [{
      label: 'Open Tickets',
      data: managerOpenTicketLoad.map((d) => d.open_tickets),
      backgroundColor: '#ef4444',
      borderRadius: 6,
    }],
  }), [managerOpenTicketLoad]);

  const managerStatusChart = useMemo(() => ({
    labels: managerStatusDistribution.map((d) => d.status || 'unknown'),
    datasets: [{
      data: managerStatusDistribution.map((d) => d.count),
      backgroundColor: CHART_COLORS.slice(0, managerStatusDistribution.length),
    }],
  }), [managerStatusDistribution]);

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
    },
  };

  const isCompactChartViewport = viewportWidth <= 1280;

  const pieOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isCompactChartViewport ? 'bottom' : 'right',
        labels: {
          font: { size: isCompactChartViewport ? 11 : 12 },
          padding: isCompactChartViewport ? 10 : 12,
          boxWidth: isCompactChartViewport ? 12 : 14,
        },
      },
    },
  }), [isCompactChartViewport]);

  const topRoutesOpts = {
    ...chartOpts,
    indexAxis: 'y',
  };

  if (!data) {
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

  return (
    <>
      <Header />
      <div className="admin-container">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Dashboard</h1>
          <p className="adm-page-subtitle">Dynamic platform analytics and operational health</p>
        </div>

        <div className="adm-filter-bar" style={{ marginBottom: 18 }}>
          <select className="adm-select" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button className="adm-btn adm-btn-outline" onClick={() => fetchData(range)} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Window: {windowLabel}
            {lastUpdatedAt ? ` | Updated ${lastUpdatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
        </div>

        <div className="adm-stats-row">
          <div className="adm-stat-card blue">
            <span className="adm-stat-label">Orders ({windowLabel})</span>
            <span className="adm-stat-value">{safeNumber(data.totalOrders).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card green">
            <span className="adm-stat-label">Revenue ({windowLabel})</span>
            <span className="adm-stat-value">{formatCurrency(data.totalRevenue)}</span>
          </div>
          <div className="adm-stat-card purple">
            <span className="adm-stat-label">Payments ({windowLabel})</span>
            <span className="adm-stat-value">{safeNumber(data.totalPayments).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card cyan">
            <span className="adm-stat-label">Payment Amount</span>
            <span className="adm-stat-value">{formatCurrency(data.totalPaymentAmount)}</span>
          </div>
          <div className="adm-stat-card orange">
            <span className="adm-stat-label">Trips ({windowLabel})</span>
            <span className="adm-stat-value">{safeNumber(data.totalTrips).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card purple">
            <span className="adm-stat-label">Current Active Trips</span>
            <span className="adm-stat-value">{safeNumber(data.activeTrips).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card pink">
            <span className="adm-stat-label">Fleet Size</span>
            <span className="adm-stat-value">{safeNumber(data.totalVehicles).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card blue">
            <span className="adm-stat-label">Drivers</span>
            <span className="adm-stat-value">{safeNumber(data.totalDrivers).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card cyan">
            <span className="adm-stat-label">Transporters</span>
            <span className="adm-stat-value">{safeNumber(data.totalTransporters).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card gray">
            <span className="adm-stat-label">Managers</span>
            <span className="adm-stat-value">{safeNumber(data.totalManagers).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card red">
            <span className="adm-stat-label">Open Tickets</span>
            <span className="adm-stat-value">{safeNumber(data.openTickets).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card orange">
            <span className="adm-stat-label">Tickets Created ({windowLabel})</span>
            <span className="adm-stat-value">{safeNumber(data.ticketsCreatedInRange).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card green">
            <span className="adm-stat-label">Resolved Tickets ({windowLabel})</span>
            <span className="adm-stat-value">{safeNumber(data.resolvedTicketsInRange).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card red">
            <span className="adm-stat-label">Assigned Open Tickets</span>
            <span className="adm-stat-value">{safeNumber(data.openAssignedTickets).toLocaleString()}</span>
          </div>
          <div className="adm-stat-card gray">
            <span className="adm-stat-label">Top Resolver ({windowLabel})</span>
            <span className="adm-stat-value">{data.topResolverManager || '--'}</span>
          </div>
          <div className="adm-stat-card orange">
            <span className="adm-stat-label">Pending Cashouts</span>
            <span className="adm-stat-value">{safeNumber(data.pendingCashouts).toLocaleString()}</span>
          </div>
        </div>

        <div className="adm-charts-grid">
          <div className="adm-chart-card">
            <h3>Orders Trend</h3>
            <div className="adm-chart-wrap"><Line data={ordersChart} options={chartOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Revenue Trend</h3>
            <div className="adm-chart-wrap"><Bar data={revenueChart} options={chartOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Order Status Distribution</h3>
            <div className="adm-chart-wrap"><Pie data={orderStatusChart} options={pieOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Payment Status Distribution</h3>
            <div className="adm-chart-wrap"><Pie data={paymentStatusChart} options={pieOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Top Transporters</h3>
            <div className="adm-chart-wrap"><Bar data={topTransportersChart} options={chartOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Top Routes by Volume</h3>
            <div className="adm-chart-wrap"><Bar data={topRoutesChart} options={topRoutesOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Fleet Utilization</h3>
            <div className="adm-chart-wrap"><Pie data={fleetUtilizationChart} options={pieOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Most Requested Truck Types</h3>
            <div className="adm-chart-wrap"><Pie data={truckTypeChart} options={pieOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>New Customers Trend</h3>
            <div className="adm-chart-wrap"><Line data={newCustomersChart} options={chartOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Trip Status Distribution</h3>
            <div className="adm-chart-wrap"><Bar data={tripStatusChart} options={chartOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Resolved Tickets Trend</h3>
            <div className="adm-chart-wrap"><Line data={resolvedTicketsTrendChart} options={chartOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Top Managers by Resolved Tickets</h3>
            <div className="adm-chart-wrap"><Bar data={managerResolvedChart} options={topRoutesOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Manager Open Ticket Workload</h3>
            <div className="adm-chart-wrap"><Bar data={managerOpenLoadChart} options={topRoutesOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Ticket Category Mix</h3>
            <div className="adm-chart-wrap"><Pie data={ticketCategoryChart} options={pieOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Ticket Priority Mix</h3>
            <div className="adm-chart-wrap"><Pie data={ticketPriorityChart} options={pieOpts} /></div>
          </div>

          <div className="adm-chart-card">
            <h3>Manager Status Distribution</h3>
            <div className="adm-chart-wrap"><Pie data={managerStatusChart} options={pieOpts} /></div>
          </div>
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title">Quick Insights</h3>
          <div className="adm-detail-grid">
            <div className="adm-detail-field">
              <span className="adm-detail-label">Avg Bid Amount</span>
              <span className="adm-detail-value">{formatCurrency(data.avgBidAmount)}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Order Completion Rate</span>
              <span className="adm-detail-value">{toPercent(safeNumber(data.completedOrders), safeNumber(data.totalOrders))}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Payment Success Rate</span>
              <span className="adm-detail-value">{toPercent(safeNumber(data.successfulPayments), safeNumber(data.totalPayments))}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Trip Completion Rate</span>
              <span className="adm-detail-value">{toPercent(safeNumber(data.completedTrips), safeNumber(data.totalTrips))}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Avg Revenue per Completed Order</span>
              <span className="adm-detail-value">{safeNumber(data.completedOrders) > 0 ? formatCurrency(safeNumber(data.totalRevenue) / safeNumber(data.completedOrders)) : '--'}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Active Managers</span>
              <span className="adm-detail-value">{safeNumber(data.activeManagers).toLocaleString()}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Ticket Resolution Rate</span>
              <span className="adm-detail-value">{toPercent(safeNumber(data.resolvedTicketsInRange), safeNumber(data.ticketsCreatedInRange))}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Resolution Load (Resolved/Open)</span>
              <span className="adm-detail-value">{safeNumber(data.openAssignedTickets) > 0 ? (safeNumber(data.resolvedTicketsInRange) / safeNumber(data.openAssignedTickets)).toFixed(2) : '--'}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Pending Verifications</span>
              <span className="adm-detail-value">{safeNumber(data.pendingVerifications).toLocaleString()}</span>
            </div>
            <div className="adm-detail-field">
              <span className="adm-detail-label">Top Route</span>
              <span className="adm-detail-value">{data.topRoutes?.[0]?.route || '--'}</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
