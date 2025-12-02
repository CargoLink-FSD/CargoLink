// src/components/trackOrder/CustomerActions.jsx
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
// import { confirmPickup } from '../../store/slices/ordersSlice';


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
      ) : (
        <div className="card update-status-card">
          <div className="card-header">
            <h2 className="card-title">Complete Delivery</h2>
          </div>
          <div className="action-buttons">
            <Link to={`/customer/paynow?orderId=${order.id}`} className="btn btn-primary">
              Pay Now
            </Link>
          </div>
        </div>
      )}

      <div className="card customer-info-card">
        <div className="card-header">
          <h2 className="card-title">Transporter Information</h2>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Person</p>
          <p className="detail-value">{order.transporter?.contactPerson || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Phone</p>
          <p className="detail-value">{order.transporter?.contactPhone || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Email</p>
          <p className="detail-value">{order.transporter?.email || "N/A"}</p>
        </div>
        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => handleCall(order.transporter?.contactPhone)}
          >
            Call Transporter
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleEmail(order.transporter?.email)}
          >
            Email Transporter
          </button>
        </div>
      </div>
    </>
  );
};


const TransporterActions = ({ order }) => {
  const dispatch = useDispatch();
  const { orderId } = useParams();
  const [otp, setOtp] = useState('');

  const handleConfirmPickup = async () => {
    if (!otp) {
      alert('Please enter OTP');
      return;
    }

    try {
      // await dispatch(confirmPickup({ orderId, otp })).unwrap();
      alert('Pickup Confirmed!');
      setOtp('');
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleUpdateLocation = () => {
    alert('Update location functionality to be implemented');
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
            <h2 className="card-title">Updates</h2>
          </div>
          <div className="action-buttons">
            <button className="btn btn-warning" onClick={handleUpdateLocation}>
              Update Location
            </button>
          </div>
        </div>
      )}

      <div className="card customer-info-card">
        <div className="card-header">
          <h2 className="card-title">Customer Information</h2>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Person</p>
          <p className="detail-value">{order.customer?.contactPerson || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Phone</p>
          <p className="detail-value">{order.customer?.contactPhone || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Email</p>
          <p className="detail-value">{order.customer?.email || "N/A"}</p>
        </div>
        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => handleCall(order.customer?.contactPhone)}
          >
            Call Customer
          </button>
          <button 
            className="btn btn-outline" 
            onClick={() => handleEmail(order.customer?.email)}
          >
            Email Customer
          </button>
        </div>
      </div>
    </>
  );
};

const UserActions = ({ order, userRole }) => {
  console.log('UserActions received userRole:', userRole);
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