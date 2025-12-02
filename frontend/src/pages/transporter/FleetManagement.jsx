import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Import Header and Footer
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';

// Import Components
import Modal from '../../components/common/Modal';
import { InputField, Button } from '../../components/forms';

// Import our new API and Hooks
import { useFleetManagement } from '../../hooks/fleet/useFleetManagement';
import { useVehicleForm } from '../../hooks/fleet/useVehicleForm';

// Import Styles
import '../../styles/styles.css';
import '../../styles/layout.css';
import '../../styles/Fleet.css';
import '../../styles/notification.css';

const FleetManagement = () => {
  const { vehicles, loading, createVehicle, editVehicle, removeVehicle } = useFleetManagement();
  const { formData, setFormValue, populateForm, resetForm } = useVehicleForm();
  
  const [filters, setFilters] = useState({ search: '', status: 'all', type: 'all' });

  // Modal states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const [currentVehicle, setCurrentVehicle] = useState(null); 
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  // Filter Logic
  const filteredVehicles = vehicles.filter(v => {
    if (!v) return false;
    const vName = (v.name || '').toString();
    const vReg = (v.registration || v.registrationNumber || '').toString();
    const vType = (v.truck_type || v.type || '').toString();
    const vStatus = (v.status || '').toString();

    const q = filters.search.toLowerCase();
    const matchesSearch = vName.toLowerCase().includes(q) || vReg.toLowerCase().includes(q);
    const matchesStatus = filters.status === 'all' || vStatus.toLowerCase() === filters.status.toLowerCase();
    const matchesType = filters.type === 'all' || vType.toLowerCase() === filters.type.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  // --- Handlers ---

  const openAddModal = () => {
    setCurrentVehicle(null);
    resetForm();
    setShowVehicleModal(true);
  };

  const openEditModal = (vehicle) => {
    setCurrentVehicle(vehicle);
    populateForm(vehicle);
    setShowVehicleModal(true);
  };

  const openDescriptionModal = (vehicle) => {
    setCurrentVehicle(vehicle);
    setShowDescriptionModal(true);
  };

  const openConfirmDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowConfirmModal(true);
  };

  const closeAll = () => {
    setShowVehicleModal(false);
    setShowConfirmModal(false);
    setShowDescriptionModal(false);
    setCurrentVehicle(null);
    setVehicleToDelete(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormValue(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Construct payload - Removed current_trip_id
      const payload = { 
        ...formData, 
        truck_type: formData.truck_type, 
        registration: formData.registration,
        last_service_date: formData.last_service_date || null,
        next_service_date: formData.next_service_date || null
      };

      if (currentVehicle && (currentVehicle._id || currentVehicle.truck_id)) {
        const id = currentVehicle._id || currentVehicle.truck_id;
        await editVehicle(id, payload);
      } else {
        await createVehicle(payload);
      }
      closeAll();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      const id = vehicleToDelete._id || vehicleToDelete.truck_id;
      await removeVehicle(id);
      closeAll();
    } catch (err) {
      console.error(err);
      alert('Failed to delete vehicle');
    }
  };

  return (
    <div className="fleet-management-page">
      <Header />

      <main className="container main-content">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">My Fleet</h1>
          <button id="add-vehicle-btn" className="btn btn-primary" onClick={openAddModal}>Add New Vehicle</button>
        </div>

        {/* Search Controls */}
        <div className="controls-section">
          <div className="search-bar">
            <input
              type="text"
              id="search"
              placeholder="Search vehicles..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <button id="search-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <select id="status-filter" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">In Maintenance</option>
          </select>

          <select id="type-filter" value={filters.type} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}>
            <option value="all">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Trailer">Trailer</option>
            <option value="Container">Container</option>
            <option value="Refrigerated">Refrigerated</option>
            <option value="Tanker">Tanker</option>
          </select>
        </div>

        {/* Loading / Grid */}
        {loading ? (
          <div id="fleet-loading" className="loading" style={{ padding: '1rem' }}>Loading fleet...</div>
        ) : (
          <>
            {filteredVehicles.length === 0 ? (
              <div id="fleet-empty" className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                <h3>No vehicles in your fleet</h3>
                <p>Add your first vehicle to start managing your fleet</p>
                <button id="empty-add-vehicle" className="btn btn-primary" onClick={openAddModal}>Add Vehicle</button>
              </div>
            ) : (
              <div className="fleet-grid" id="fleet-grid">
                {filteredVehicles.map(vehicle => (
                  <div key={vehicle._id || vehicle.truck_id} className="vehicle-card">
                    <div className="vehicle-header">
                      <div className="vehicle-identity">
                        <h3>{vehicle.name}</h3>
                        <span className="registration">{vehicle.registration || vehicle.registrationNumber}</span>
                      </div>
                      <span className={`status-badge ${vehicle.status ? vehicle.status.toLowerCase().replace(/\s+/g, '') : ''}`}>
                        {vehicle.status}
                      </span>
                    </div>

                    <div className="vehicle-info-block">
                      <div className="info-row">
                        <span className="icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                        </span>
                        <span className="label">Type:</span>
                        <span className="value">{vehicle.truck_type || vehicle.type}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        </span>
                        <span className="label">Capacity:</span>
                        <span className="value">{vehicle.capacity} tons</span>
                      </div>

                      <div className="info-row">
                        <span className="icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </span>
                        <span className="label">Manufacture Year:</span>
                        <span className="value">{vehicle.manufacture_year || vehicle.manufactureYear}</span>
                      </div>

                      <div className="info-row">
                        <span className="icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                        </span>
                        <span className="label">Last Service:</span>
                        <span className="value">{vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'N/A'}</span>
                      </div>

                      <div className="info-row">
                        <span className="icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                        </span>
                        <span className="label">Next Service Due:</span>
                        <span className="value">{vehicle.next_service_date ? new Date(vehicle.next_service_date).toLocaleDateString() : 'Not Scheduled yet'}</span>
                      </div>

                      <div className="info-row">
                        <span className="icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </span>
                        <span className="label">Order ID:</span>
                        <span className="value">{vehicle.current_trip_id || 'Not Assigned'}</span>
                      </div>
                    </div>

                    <div className="vehicle-actions">
                      <Link to={`/transporter/fleet/${vehicle._id || vehicle.truck_id}`} className="btn btn-details">Details</Link>
                      <button className="btn btn-update" onClick={() => openEditModal(vehicle)}>Update</button>
                      <button className="btn btn-remove" onClick={() => openConfirmDelete(vehicle)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* --- Modals using Original HTML Structure --- */}

      {/* Add/Edit Vehicle Modal */}
      {showVehicleModal && (
        <div id="vehicle-modal" className="fleet-dialog" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="modal-title">{currentVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
              <span className="close" onClick={closeAll}>&times;</span>
            </div>
            <div className="modal-body">
              <form id="vehicle-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="truck-name">Vehicle Name*</label>
                  <input id="truck-name" name="name" className="input-field" required value={formData.name} onChange={handleFormChange} minLength={3} maxLength={50} />
                </div>

                <div className="form-group">
                  <label htmlFor="truck-type">Vehicle Type*</label>
                  <select id="truck-type" name="truck_type" className="input-field" required value={formData.truck_type} onChange={handleFormChange}>
                    <option value="">Select Type</option>
                    <option value="Truck">Truck</option>
                    <option value="Container">Container</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Refrigerated">Refrigerated Truck</option>
                    <option value="Tanker">Tanker</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="truck-registration">Registration Number*</label>
                  <input id="truck-registration" name="registration" className="input-field" required value={formData.registration} onChange={handleFormChange} pattern="[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}" />
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="capacity">Capacity (Tons)*</label>
                    <input id="capacity" name="capacity" type="number" className="input-field" required min={1} max={100} value={formData.capacity} onChange={handleFormChange} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="manufacture-year">Year*</label>
                    <input id="manufacture-year" name="manufacture_year" type="number" className="input-field" min={1900} max={new Date().getFullYear()} required value={formData.manufacture_year} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="last-service">Last Service</label>
                    <input id="last-service" name="last_service_date" type="date" className="input-field" value={formData.last_service_date} onChange={handleFormChange} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="next-service">Next Service</label>
                    <input id="next-service" name="next_service_date" type="date" className="input-field" value={formData.next_service_date} onChange={handleFormChange} />
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary">{currentVehicle ? 'Update' : 'Save'}</button>
                  <button type="button" className="btn btn-secondary" onClick={closeAll}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {showDescriptionModal && (
        <div id="description-modal" className="fleet-dialog" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Vehicle Details</h3>
              <span className="close" onClick={closeAll}>&times;</span>
            </div>
            <div className="modal-body">
              <div id="vehicle-description-content">
                {currentVehicle ? (
                  <div>
                    <p><strong>Name:</strong> {currentVehicle.name}</p>
                    <p><strong>Type:</strong> {currentVehicle.truck_type || currentVehicle.type}</p>
                    <p><strong>Registration:</strong> {currentVehicle.registration || currentVehicle.registrationNumber}</p>
                    <p><strong>Capacity:</strong> {currentVehicle.capacity} Tons</p>
                    <p><strong>Manufactured:</strong> {currentVehicle.manufacture_year || currentVehicle.manufactureYear}</p>
                    <p><strong>Last service:</strong> {currentVehicle.last_service_date ? new Date(currentVehicle.last_service_date).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Next service:</strong> {currentVehicle.next_service_date ? new Date(currentVehicle.next_service_date).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Order ID:</strong> {currentVehicle.current_trip_id || 'None'}</p>
                  </div>
                ) : (
                  <p>No details</p>
                )}
              </div>
              <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                 <button type="button" className="btn btn-secondary close-description" onClick={closeAll}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div id="confirm-modal" className="fleet-dialog" style={{ display: 'block' }}>
          <div className="modal-content confirm-content">
            <div className="modal-header">
              <h3>Confirm Action</h3>
              <span className="close" onClick={closeAll}>&times;</span>
            </div>
            <div className="modal-body">
              <p id="confirm-message">Are you sure you want to remove this vehicle?</p>
              <div className="form-actions confirm-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button id="confirm-yes" className="btn btn-danger" onClick={handleDelete}>Yes, Remove</button>
                <button id="confirm-no" className="btn btn-secondary" onClick={closeAll}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FleetManagement;