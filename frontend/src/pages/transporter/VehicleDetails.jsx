import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getVehicle, deleteVehicle } from '../../api/fleet';
import Modal from '../../components/common/Modal';
import '../../styles/truck-details.css';

const VehicleDetails = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [vehicleId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const vehicleData = await getVehicle(vehicleId);
      setVehicle(vehicleData.data || vehicleData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle(vehicleId);
      navigate('/transporter/fleet');
    } catch (error) {
      alert('Failed to delete vehicle');
    }
  };

  if (loading) return <div className="container main-content">Loading...</div>;
  if (!vehicle) return <div className="container main-content">Vehicle not found</div>;

  return (
    <div className="container main-content">
      {/* Page Header matching truck-details.ejs */}
      <div className="page-header">
        <div className="page-title">
            <h1 id="truck-title">Truck Details</h1>
        </div>
        <div className="page-actions">
            <Link to="/transporter/fleet" className="btn btn-outline">
                ← Back to Fleet
            </Link>
        </div>
      </div>

      <div className="truck-details-container">
        <div className="truck-card">
            {/* Truck Header */}
            <div className="truck-header">
                <h3 id="truck-name">{vehicle.name}</h3>
                <span id="truck-status-badge" className={`status-badge ${vehicle.status?.toLowerCase()}`}>
                    {vehicle.status}
                </span>
            </div>
            
            {/* Info Grid */}
            <div className="truck-info-grid" id="truck-info-grid">
                <div className="info-item">
                    <span className="label">Type</span>
                    <span className="value">{vehicle.truck_type || vehicle.type}</span>
                </div>
                <div className="info-item">
                    <span className="label">Registration</span>
                    <span className="value">{vehicle.registration || vehicle.registrationNumber}</span>
                </div>
                <div className="info-item">
                    <span className="label">Capacity</span>
                    <span className="value">{vehicle.capacity} Tons</span>
                </div>
                <div className="info-item">
                    <span className="label">Year</span>
                    <span className="value">{vehicle.manufacture_year || vehicle.manufactureYear}</span>
                </div>
                <div className="info-item">
                    <span className="label">Last Service</span>
                    <span className="value">{vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="info-item">
                    <span className="label">Next Service</span>
                    <span className="value">{vehicle.next_service_date ? new Date(vehicle.next_service_date).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>

            {/* Actions Container */}
            <div id="truck-actions-container" className="truck-actions">
                <button className="btn btn-danger" onClick={() => setIsDeleteModalOpen(true)}>Remove Vehicle</button>
            </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Action">
        <div className="modal-body">
            <p>Are you sure you want to permanently remove <strong>{vehicle.name}</strong>?</p>
            <div className="form-actions confirm-actions" style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                <button id="confirm-yes" className="btn btn-danger" onClick={handleDelete}>Yes, Remove</button>
                <button id="confirm-no" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleDetails;