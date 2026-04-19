// src/components/trackOrder/CustomerActions.jsx
import React, { useState } from 'react';



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

  console.log("CustomerActions order:", order);

  return (
    <>
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

      <div className="card customer-info-card">
      <div className="card-header">
          <h2 className="card-title">Driver Information</h2>
        </div>
        <div className="detail-group">
          <p className="detail-label">Driver Name</p>
          <p className="detail-value">{`${order.scheduled_assignment?.driver?.firstName} ${order.scheduled_assignment?.driver?.lastName}`}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Contact Phone</p>
          <p className="detail-value">{order.scheduled_assignment?.driver?.phone || "N/A"}</p>
        </div>
        <div className="detail-group">
          <p className="detail-label">Vehicle</p>
          <p className="detail-value">
            {order.scheduled_assignment?.vehicle?.registration
              ? order.scheduled_assignment.vehicle.registration.replace(
                  /^([A-Z]{2})(\d{2})([A-Z]{2})(\d{4})$/,
                  "$1 $2 $3 $4"
                )
              : "N/A"}
          </p>        </div>
        <div className="action-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => handleCall(order.scheduled_assignment?.driver?.phone )}
          >
            Call Driver
          </button>
      </div>
      </div>

    </>
  );
};


const TransporterActions = ({ order }) => {

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