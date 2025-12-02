import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './AssignVehicleModal.css';

const AssignVehicleModal = ({ isOpen, onClose, order, vehicles, onConfirm }) => {
  const [selectedVehicle, setSelectedVehicle] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedVehicle('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedVehicle) {
      console.log('Modal: Confirming assignment with vehicleId:', selectedVehicle);
      onConfirm(selectedVehicle);
    } else {
      console.error('Modal: No vehicle selected!');
    }
  };

  const modalContent = (
    <div className="assign-vehicle-modal-overlay" onClick={handleOverlayClick}>
      <div className="assign-vehicle-modal-content">
        <div className="assign-vehicle-modal-header">
          <h2>Assign Vehicle</h2>
          <button 
            className="assign-vehicle-modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="assign-vehicle-modal-body">
          <div className="assign-vehicle-order-info">
            <p><strong>Order ID:</strong> #{order._id.slice(-8).toUpperCase()}</p>
            <p><strong>Route:</strong> {order.pickup?.city} → {order.delivery?.city}</p>
            <p><strong>Truck Type:</strong> {order.truck_type}</p>
          </div>

          <div className="assign-vehicle-form-group">
            <label htmlFor="vehicle-select">Select Vehicle</label>
            <select
              id="vehicle-select"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="assign-vehicle-select"
            >
              <option value="">-- Select a vehicle --</option>
              {vehicles && vehicles.length > 0 ? (
                vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.registration} - {vehicle.truck_type} ({vehicle.status})
                  </option>
                ))
              ) : (
                <option disabled>No vehicles available</option>
              )}
            </select>
          </div>
        </div>

        <div className="assign-vehicle-modal-footer">
          <button 
            className="assign-vehicle-btn-cancel" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="assign-vehicle-btn-confirm" 
            onClick={handleConfirm}
            disabled={!selectedVehicle}
          >
            Assign Vehicle
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};

export default AssignVehicleModal;
