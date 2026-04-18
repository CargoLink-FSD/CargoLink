// src/components/trackOrder/CustomerActions.jsx
import React, { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';



const CustomerActions = ({ order }) => {
  const handleCall = (phone) => {
    if (phone && phone !== "N/A") {
      window.open(`tel:${phone}`);
    } else {
      alert("No phone number available");
    }
  };

  const handleEmail = (email) => {
    if (email && email !== "N/A") {
      window.open(`mailto:${email}`);
    } else {
      alert("No email address available");
    }
  };

  return (
    <>
      {order.status === 'Started' ? (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">Confirm Pickup</h2>
          </div>
          <div className="action-buttons">
            <h3>OTP: {order.otp || "0000"}</h3>
          </div>
        </div>
      ) : order.payment_status === 'Paid' ? (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">Delivery Complete</h2>
          </div>
          <div className="action-buttons" style={{ justifyContent: 'center', padding: '12px 0' }}>
            <span style={{ color: '#2e7d32', fontWeight: 600, fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <CircleCheck size={18} aria-hidden="true" />
              <span>Payment Completed</span>
            </span>
          </div>
        </div>
      ) : order.status === 'Payment Pending' ? (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">Payment Pending</h2>
          </div>
          <div className="action-buttons" style={{ justifyContent: 'center', padding: '12px 0' }}>
            <span style={{ color: '#555', fontSize: '0.95rem' }}>
              Please complete payment from the My Orders page.
            </span>
          </div>
        </div>
      ) : (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">Order In Progress</h2>
          </div>
          <div className="action-buttons" style={{ justifyContent: 'center', padding: '12px 0' }}>
            <span style={{ color: '#555', fontSize: '0.95rem' }}>
              Payment becomes available after delivery confirmation.
            </span>
          </div>
        </div>
      )}

      <div className="card customer-info-card">
        <div className="card-header">
          <h2 className="card-title">Transporter Information</h2>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Person</p>
          <p className="detail-value">{order.assigned_transporter_id?.name || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Phone</p>
          <p className="detail-value">{order.assigned_transporter_id?.primary_contact || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Email</p>
          <p className="detail-value">{order.assigned_transporter_id?.email || "N/A"}</p>
        </div>
        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => handleCall(order.assigned_transporter_id?.primary_contact)}
          >
            Call Transporter
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleEmail(order.assigned_transporter_id?.email)}
          >
            Email Transporter
          </button>
        </div>
      </div>
    </>
  );
};


const TransporterActions = ({ order }) => {
  const [otp, setOtp] = useState('');
  const { showNotification } = useNotification();
  

  const handleConfirmPickup = async () => {
    if (!otp) {
      alert('Please enter the OTP');
      return;
    }

    try {
      // OTP confirmation is now handled at the trip level via ActiveTrip page
      showNotification({ message: 'Please use the Active Trip page to confirm pickup with OTP', type: 'info' });
      setOtp('');
    } catch (err) {
      showNotification({ message: 'Incorrect OTP', type: 'error' });
    }
  };

  const handleCall = (phone) => {
    if (phone && phone !== "N/A") {
      window.open(`tel:${phone}`);
    } else {
      alert("No phone number available");
    }
  };

  const handleEmail = (email) => {
    if (email && email !== "N/A") {
      window.open(`mailto:${email}`);
    } else {
      alert("No email address available");
    }
  };

  return (
    <>
      {order.status === 'Started' ? (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">Confirm Pickup</h2>
          </div>
          <div className="action-buttons">
            <input
              id="otp_input"
              type="number"
              max="9999"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
            />
            <button className="btn btn-success" onClick={handleConfirmPickup}>
              Confirm OTP
            </button>
          </div>
        </div>
      ) : (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">In Progress</h2>
          </div>
          <div className="action-buttons" style={{ justifyContent: 'center', padding: '12px 0' }}>
            <span style={{ color: '#555', fontSize: '0.95rem' }}>Order is in transit</span>
          </div>
        </div>
      )}

      <div className="card customer-info-card">
        <div className="card-header">
          <h2 className="card-title">Customer Information</h2>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Person</p>
          <p className="detail-value">{(order.customer_id)? `${order.customer_id.firstName} ${order.customer_id.lastName}`: "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Phone</p>
          <p className="detail-value">{order.customer_id?.phone || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Email</p>
          <p className="detail-value">{order.customer_id?.email || "N/A"}</p>
        </div>
        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => handleCall(order.customer_id?.phone)}
          >
            Call Customer
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleEmail(order.customer_id?.email)}
          >
            Email Customer
          </button>
        </div>
      </div>
    </>
  );
};

const UserActions = ({ order, userRole }) => {
  return (
    <>
      {userRole === 'customer' ? (
        <CustomerActions order={order} />
      ) : (
        <TransporterActions order={order} />
      )}
    </>
  );
};

export default UserActions;