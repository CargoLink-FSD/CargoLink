import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import http from '../../api/http';
import Header from '../../components/common/Header';
import './UserManagement.css';

export default function UserManagement() {
  const { showNotification } = useNotification();
  
  const [currentFilter, setCurrentFilter] = useState('customer');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchUsers();
  }, [currentFilter, searchTerm, sortBy]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await http.get(`/api/admin/users?role=${currentFilter}&search=${searchTerm}&sort=${sortBy}`);
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showNotification({ message: 'Failed to load users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await http.del(`/api/admin/users/${currentFilter}/${userId}`);
      showNotification({ message: 'User deleted successfully', type: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      showNotification({ message: 'Failed to delete user', type: 'error' });
    }
  };

  const filterUsers = (role) => {
    setCurrentFilter(role);
    setSearchTerm('');
  };

  if (loading && users.length === 0) {
    return (
      <>
        <Header />
        <div className="users-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="main-content users-container">
        <div className="page-header">
          <h1 className="page-title">Manage Users</h1>
        </div>

        <div className="tab-switch">
          <button
            className={`btn tab-btn ${currentFilter === 'customer' ? 'active' : ''}`}
            onClick={() => filterUsers('customer')}
          >
            Customers
          </button>
          <button
            className={`btn tab-btn ${currentFilter === 'transporter' ? 'active' : ''}`}
            onClick={() => filterUsers('transporter')}
          >
            Transporters
          </button>
        </div>

        <div className="filter-bar">
          <div className="search-box">
            <input
              type="text"
              id="searchInput"
              placeholder="Search by name, email or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              id="sortFilter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort By Date Joined</option>
              <option value="name">Sort By Name</option>
              <option value="id">Sort By ID</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th className="header-cell">ID</th>
                <th className="header-cell">User</th>
                <th className="header-cell">Email</th>
                <th className="header-cell">Phone</th>
                <th className="header-cell">No of orders</th>
                <th className="header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    No Users Found
                  </td>
                </tr>
              ) : currentFilter === 'customer' ? (
                users.map((user) => (
                  <tr key={user.customer_id}>
                    <td>{user.customer_id}</td>
                    <td>{user.first_name} {user.last_name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || 'N/A'}</td>
                    <td>{user.noOfOrders || 0}</td>
                    <td>
                      <div className="action-icons">
                        <span
                          className="action-icon delete-icon"
                          onClick={() => deleteUser(user.customer_id)}
                          title="Delete user"
                        ></span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                users.map((user) => (
                  <tr key={user.transporter_id}>
                    <td>{user.transporter_id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.primary_contact || 'N/A'}</td>
                    <td>{user.noOfOrders || 0}</td>
                    <td>
                      <div className="action-icons">
                        <span
                          className="action-icon delete-icon"
                          onClick={() => deleteUser(user.transporter_id)}
                          title="Delete user"
                        ></span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
