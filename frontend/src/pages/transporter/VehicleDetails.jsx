import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVehicleDetails } from '../../hooks/fleet/useVehicleDetails';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import '../../styles/truck-details.css';

const VehicleDetails = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [scheduleDate, setScheduleDate] = useState('');

  const {
    vehicle,
    loading,
    actionLoading,
    handleDelete: deleteVehicle,
    handleSetMaintenance,
    handleSetAvailable,
    handleSetUnavailable,
    handleScheduleMaintenance: scheduleMaintenance
  } = useVehicleDetails(vehicleId);

  const { showSuccess, showError } = useNotification();

  const onSetMaintenance = async () => {
    try {
      const result = await handleSetMaintenance();
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    }
  };

  const onSetAvailable = async () => {
    try {
      const result = await handleSetAvailable();
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    }
  };

  const onSetUnavailable = async () => {
    try {
      const result = await handleSetUnavailable();
      showSuccess(result.message);
    } catch (error) {
      showError(error.message);
    }
  };

  const onScheduleMaintenance = async (e) => {
    e.preventDefault();
    if (!scheduleDate) {
      showError('Please select a date for maintenance');
      return;
    }
    try {
      const result = await scheduleMaintenance(scheduleDate);
      showSuccess(result.message);
      setScheduleDate('');
    } catch (error) {
      showError(error.message);
    }
  };

  const renderActionButtons = () => {
    if (!vehicle) return null;

    const status = vehicle.status;
    const hasNextServiceDate = !!(vehicle.next_service_date && 
                                  vehicle.next_service_date !== 'Not Scheduled' && 
                                  vehicle.next_service_date !== 'null' && 
                                  vehicle.next_service_date !== '');

    const minDate = new Date().toISOString().split('T')[0];

    // Helper for button styles
    const btnClass = "btn-action";

    if (status === 'In Maintenance') {
      return (
        <>
          <button className={btnClass} onClick={onSetAvailable} disabled={actionLoading}>
            Set Available
          </button>
          {!hasNextServiceDate && (
            <div className="schedule-container">
               <input 
                type="date" 
                className="date-input"
                min={minDate}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                disabled={actionLoading}
              />
              <button className={btnClass} onClick={onScheduleMaintenance} disabled={actionLoading}>
                Schedule Maintenance
              </button>
            </div>
          )}
        </>
      );
    } else if (status === 'Available') {
      return (
        <>
          <button className={btnClass} onClick={onSetMaintenance} disabled={actionLoading}>
            Set Maintenance
          </button>
          <button className={btnClass} onClick={onSetUnavailable} disabled={actionLoading}>
            Set Unavailable
          </button>
           {!hasNextServiceDate && (
            <div className="schedule-container">
               <input 
                type="date" 
                className="date-input"
                min={minDate}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                disabled={actionLoading}
              />
              <button className={btnClass} onClick={onScheduleMaintenance} disabled={actionLoading}>
                Schedule Maintenance
              </button>
            </div>
          )}
        </>
      );
    } else if (status === 'Unavailable') {
      return (
        <>
          <button className={btnClass} onClick={onSetAvailable} disabled={actionLoading}>
            Set Available
          </button>
           {!hasNextServiceDate && (
            <div className="schedule-container">
               <input 
                type="date" 
                className="date-input"
                min={minDate}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                disabled={actionLoading}
              />
              <button className={btnClass} onClick={onScheduleMaintenance} disabled={actionLoading}>
                Schedule Maintenance
              </button>
            </div>
          )}
        </>
      );
    } else if (status === 'Assigned') {
      return (
        <>
          <button className={btnClass} onClick={onSetUnavailable} disabled={actionLoading}>
            Set Unavailable
          </button>
          <button className={btnClass} onClick={onSetAvailable} disabled={actionLoading}>
            Set Available
          </button>
          <button className={btnClass} onClick={onSetMaintenance} disabled={actionLoading}>
            Set Maintenance
          </button>
        </>
      );
    }
    return null;
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!vehicle) return <div className="error-screen">Vehicle not found</div>;

  return (
    <div className="truck-details-page">
      <Header />
      <main className="container">
        <div className="page-header">
          <div className="title-section">
            <h1>Truck Details - {vehicle.name}</h1>
            <div className="title-underline"></div>
          </div>
          <Link to="/transporter/fleet" className="btn-back">
            ← Back to Fleet
          </Link>
        </div>

        <div className="details-card">
          <div className="card-header">
            <h2>{vehicle.name}</h2>
            <span className={`status-text ${vehicle.status ? vehicle.status.toLowerCase().replace(/\s+/g, '') : ''}`}>
              {vehicle.status ? vehicle.status.toUpperCase() : 'UNKNOWN'}
            </span>
          </div>

          <div className="details-grid">
            <div className="detail-item">
              <label>Registration</label>
              <p>{vehicle.registration || vehicle.registrationNumber}</p>
            </div>
            <div className="detail-item">
              <label>Type</label>
              <p>{vehicle.truck_type || vehicle.type}</p>
            </div>
            <div className="detail-item">
              <label>Capacity</label>
              <p>{vehicle.capacity} tons</p>
            </div>
            <div className="detail-item">
              <label>Manufacture Year</label>
              <p>{vehicle.manufacture_year || vehicle.manufactureYear}</p>
            </div>
            <div className="detail-item">
              <label>Last Service Date</label>
              <p>{vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="detail-item">
              <label>Next Service Date</label>
              <p>{vehicle.next_service_date ? new Date(vehicle.next_service_date).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          <div className="card-actions">
            {renderActionButtons()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VehicleDetails;