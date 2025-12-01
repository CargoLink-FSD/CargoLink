import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    newCustomers: 0,
    pendingOrders: 0
  });
  
  const [ordersPerDay, setOrdersPerDay] = useState([]);
  const [revenuePerDay, setRevenuePerDay] = useState([]);
  const [topTransporters, setTopTransporters] = useState([]);
  const [newCustomersPerMonth, setNewCustomersPerMonth] = useState([]);
  const [truckTypes, setTruckTypes] = useState([]);
  const [orderStatusDistribution, setOrderStatusDistribution] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await http.get('/api/admin/dashboard/stats');
      const data = response.data;
      
      setStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        newCustomers: data.newCustomers || 0,
        pendingOrders: data.pendingOrders || 0
      });
      
      setOrdersPerDay(data.ordersPerDay || []);
      setRevenuePerDay(data.revenuePerDay || []);
      setTopTransporters(data.topTransporters || []);
      setNewCustomersPerMonth(data.newCustomersPerMonth || []);
      setTruckTypes(data.truckTypes || []);
      setOrderStatusDistribution(data.orderStatusDistribution || []);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      showNotification({ message: 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const ordersChartData = {
    labels: ordersPerDay.map(item => item.order_day),
    datasets: [{
      label: 'Orders Count',
      data: ordersPerDay.map(item => item.total_orders),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1,
      fill: true
    }]
  };

  const revenueChartData = {
    labels: revenuePerDay.map(item => item.order_day),
    datasets: [{
      label: 'Revenue',
      data: revenuePerDay.map(item => item.total_revenue),
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      tension: 0.1,
      fill: true
    }]
  };

  const transportersChartData = {
    labels: topTransporters.map(item => item.name),
    datasets: [{
      label: 'Orders Completed',
      data: topTransporters.map(item => item.total_orders),
      backgroundColor: 'rgb(255, 99, 132)'
    }]
  };

  const customersChartData = {
    labels: newCustomersPerMonth.map(item => item.month),
    datasets: [{
      label: 'New Customers',
      data: newCustomersPerMonth.map(item => item.new_customers),
      borderColor: 'rgb(153, 102, 255)',
      backgroundColor: 'rgba(153, 102, 255, 0.2)',
      tension: 0.1,
      fill: true
    }]
  };

  const truckTypesChartData = {
    labels: truckTypes.map(item => item.truck_type),
    datasets: [{
      label: 'Number of Requests',
      data: truckTypes.map(item => item.total_orders),
      backgroundColor: 'rgb(75, 192, 192)'
    }]
  };

  const orderStatusChartData = {
    labels: orderStatusDistribution.map(item => item.status),
    datasets: [{
      data: orderStatusDistribution.map(item => item.count),
      backgroundColor: [
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(153, 102, 255)'
      ]
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right'
      }
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="dashboard-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="dashboard-container">
        {/* Dashboard Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p>{stats.totalOrders}</p>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p>${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>New Customers</h3>
            <p>{stats.newCustomers}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Orders</h3>
            <p>{stats.pendingOrders}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="dashboard-charts">
          <div className="chart-container">
            <h2>Orders per Day</h2>
            <div className="chart-wrapper">
              <Bar data={ordersChartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="chart-container">
            <h2>Revenue per Day</h2>
            <div className="chart-wrapper">
              <Bar data={revenueChartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="chart-container">
            <h2>Top Transporters</h2>
            <div className="chart-wrapper">
              <Bar data={transportersChartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="chart-container">
            <h2>New Customers per Month</h2>
            <div className="chart-wrapper">
              <Bar data={customersChartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="chart-container">
            <h2>Most Requested Truck Types</h2>
            <div className="chart-wrapper">
              <Bar data={truckTypesChartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="chart-container">
            <h2>Order Status Distribution</h2>
            <div className="chart-wrapper">
              <Pie data={orderStatusChartData} options={pieChartOptions} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
