// Modern Customer Profile Page
// Redesigned with modern UI components

import React, { useState } from 'react';
import { profileFieldSchemas, addressSchema } from '../../utils/schemas';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import { useNotification } from '../../context/NotificationContext';
import Header from '../../components/common/Header';
import ProfileField from '../../components/profile/ProfileField';
import SecurityTab from '../../components/profile/SecurityTab';
import '../../styles/profile.css';
import Footer from '../../components/common/Footer';

const CustomerProfile = () => {
  const {
    profile,
    addresses,
    loading,
    error,
    activeTab,
    setActiveTab,
    showAddressForm,
    setShowAddressForm,
    dispatch,
    updateCustomerField,
    updateCustomerPassword,
    addCustomerAddress,
    deleteCustomerAddress,
  } = useCustomerProfile();

  if (loading && !profile) {
    return (
      <div className="container main-content">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--gray-500)' }}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="container main-content">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--error)' }}>
            Unable to load profile. {error || 'Please try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div style={{ paddingTop: '80px' }}>
        <div className="profile-container">
          {/* Profile Header Card */}
          <div className="profile-header-card">
          <div className="profile-header-content">
            <div className="profile-header-left">
              <div className="profile-avatar-large">
                {profile.firstName ? profile.firstName[0].toUpperCase() : '?'}
              </div>
              <div className="profile-header-info">
                <div className="profile-name-row">
                  <h1 className="profile-display-name">{profile.firstName} {profile.lastName}</h1>
                  <span className="status-badge active">Active</span>
                </div>
                <p className="profile-header-email">{profile.email}</p>
                <p className="profile-member-since">
                  Member since {new Date(profile.memberSince).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="profile-header-right">
              <div className="profile-stats-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <div className="stat-info">
                  <div className="stat-value">
                    {Array.isArray(profile?.orderCount)
                      ? profile.orderCount.reduce((sum, item) => sum + (item.count || 0), 0)
                      : (typeof profile?.orderCount === 'number' ? profile.orderCount : 0)}
                  </div>
                  <div className="stat-label">Total Orders</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal Info
          </button>
          <button
            className={`profile-tab ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            Addresses
          </button>
          <button
            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {activeTab === 'personal' && (
            <ProfileInfo 
              profile={profile} 
              dispatch={dispatch}
              updateCustomerField={updateCustomerField}
            />
          )}

          {activeTab === 'addresses' && (
            <AddressesTab
              addresses={addresses}
              showAddressForm={showAddressForm}
              setShowAddressForm={setShowAddressForm}
              dispatch={dispatch}
              addCustomerAddress={addCustomerAddress}
              deleteCustomerAddress={deleteCustomerAddress}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab dispatch={dispatch} updatePasswordAction={updateCustomerPassword} userEmail={profile?.email} />
          )}
        </div>
      </div>
      </div>
      <Footer />
    </>
  );
};

// Profile Info Component
const ProfileInfo = ({ profile, dispatch, updateCustomerField }) => {
  if (!profile) return null;

  // Validation function for customer fields
  const validateField = (fieldValue, fieldType) => {
    try {
      const schema = profileFieldSchemas[fieldType];
      if (!schema) {
        return { valid: false, msg: 'Invalid field type' };
      }
      schema.parse(fieldValue);
      return { valid: true };
    } catch (error) {
      // Handle Zod validation errors
      return { valid: false, msg: error.issues[0].message };
    }
  };

  return (
    <div className="profile-info-card">
      <div className="card-header-row">
        <h2 className="card-title">Personal Information</h2>
      </div>

      <div className="profile-fields-grid">
        <ProfileField
          fieldKey="firstName"
          label="First Name"
          value={profile?.firstName || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateCustomerField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="lastName"
          label="Last Name"
          value={profile?.lastName || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateCustomerField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="email"
          label="Email"
          value={profile?.email || ''}
          type="email"
          dispatch={dispatch}
          updateAction={updateCustomerField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="phone"
          label="Phone"
          value={profile?.phone || ''}
          type="tel"
          dispatch={dispatch}
          updateAction={updateCustomerField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="dob"
          label="Date of Birth"
          value={profile?.dob || ''}
          displayValue={
            profile?.dob
              ? new Date(profile.dob).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric'
                })
              : ''
          }
          type="date"
          dispatch={dispatch}
          updateAction={updateCustomerField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="gender"
          label="Gender"
          value={profile?.gender || 'Male'}
          type="select"
          options={['Male', 'Female', 'Other']}
          dispatch={dispatch}
          updateAction={updateCustomerField}
          validateFn={validateField}
        />
      </div>
    </div>
  );
};

// Addresses Tab Component
const AddressesTab = ({ addresses, showAddressForm, setShowAddressForm, dispatch, addCustomerAddress, deleteCustomerAddress }) => {
  const { showSuccess, showError } = useNotification();
  const [addressFormData, setAddressFormData] = useState({
    address_label: '',
    street: '',
    city: '',
    state: '',
    pin: '',
    phone: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    try {
      // Create a partial schema for single field validation
      const fieldSchemas = {
        address_label: addressSchema.shape.address_label,
        street: addressSchema.shape.street,
        city: addressSchema.shape.city,
        state: addressSchema.shape.state,
        pin: addressSchema.shape.pin,
        phone: addressSchema.shape.phone,
      };
      
      if (fieldSchemas[name]) {
        fieldSchemas[name].parse(value);
      }
      
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
      return true;
    } catch (error) {
      setFieldErrors(prev => ({ ...prev, [name]: error.issues[0].message }));
      return false;
    }
  };

  const handleFieldChange = (name, value) => {
    setAddressFormData({ ...addressFormData, [name]: value });
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleFieldBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, addressFormData[name]);
  };

  const handleAddAddress = () => {
    setShowAddressForm(true);
  };

  const handleCancelAddAddress = () => {
    setShowAddressForm(false);
    setAddressFormData({
      address_label: '',
      street: '',
      city: '',
      state: '',
      pin: '',
      phone: '',
    });
    setFieldErrors({});
    setTouched({});
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();

    // Validate using schema
    try {
      addressSchema.parse(addressFormData);
      await dispatch(addCustomerAddress(addressFormData)).unwrap();
      handleCancelAddAddress();
      showSuccess('Address added successfully');
    } catch (error) {
      // Handle Zod validation errors
      showError(error.issues[0].message);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        await dispatch(deleteCustomerAddress(addressId)).unwrap();
        showSuccess('Address deleted successfully');
      } catch (error) {
        showError('Failed to delete address');
      }
    }
  };

  return (
    <>
      <div className="addresses-container">
        <div className="card-header-row">
          <h2 className="card-title">Shipping Addresses</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddAddress}
          >
            + Add Address
          </button>
        </div>

        {showAddressForm && (
          <div className="address-form-container">
            <form onSubmit={handleAddressSubmit}>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label htmlFor="new-address-type">Address Label</label>
                  <input
                    type="text"
                    id="new-address-type"
                    className={`form-input ${fieldErrors.address_label && touched.address_label ? 'error' : ''}`}
                    placeholder="Home, Work, etc."
                    value={addressFormData.address_label}
                    onChange={(e) => handleFieldChange('address_label', e.target.value)}
                    onBlur={() => handleFieldBlur('address_label')}
                    required
                  />
                  {fieldErrors.address_label && touched.address_label && (
                    <div className="field-error-message" style={{ marginTop: '4px', fontSize: '0.875rem', color: '#ef4444' }}>
                      {fieldErrors.address_label}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="new-address-street">Street Address</label>
                  <input
                    type="text"
                    id="new-address-street"
                    className={`form-input ${fieldErrors.street && touched.street ? 'error' : ''}`}
                    placeholder="Enter street address"
                    value={addressFormData.street}
                    onChange={(e) => handleFieldChange('street', e.target.value)}
                    onBlur={() => handleFieldBlur('street')}
                    required
                  />
                  {fieldErrors.street && touched.street && (
                    <div className="field-error-message" style={{ marginTop: '4px', fontSize: '0.875rem', color: '#ef4444' }}>
                      {fieldErrors.street}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="new-address-city">City</label>
                  <input
                    type="text"
                    id="new-address-city"
                    className={`form-input ${fieldErrors.city && touched.city ? 'error' : ''}`}
                    placeholder="Enter city"
                    value={addressFormData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    onBlur={() => handleFieldBlur('city')}
                    required
                  />
                  {fieldErrors.city && touched.city && (
                    <div className="field-error-message" style={{ marginTop: '4px', fontSize: '0.875rem', color: '#ef4444' }}>
                      {fieldErrors.city}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="new-address-state">State</label>
                  <input
                    type="text"
                    id="new-address-state"
                    className={`form-input ${fieldErrors.state && touched.state ? 'error' : ''}`}
                    placeholder="Enter state"
                    value={addressFormData.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    onBlur={() => handleFieldBlur('state')}
                    required
                  />
                  {fieldErrors.state && touched.state && (
                    <div className="field-error-message" style={{ marginTop: '4px', fontSize: '0.875rem', color: '#ef4444' }}>
                      {fieldErrors.state}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="new-address-zip">PIN Code</label>
                  <input
                    type="text"
                    id="new-address-zip"
                    className={`form-input ${fieldErrors.pin && touched.pin ? 'error' : ''}`}
                    placeholder="6-digit PIN"
                    value={addressFormData.pin}
                    onChange={(e) => handleFieldChange('pin', e.target.value)}
                    onBlur={() => handleFieldBlur('pin')}
                    required
                  />
                  {fieldErrors.pin && touched.pin && (
                    <div className="field-error-message" style={{ marginTop: '4px', fontSize: '0.875rem', color: '#ef4444' }}>
                      {fieldErrors.pin}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="new-address-phone">Phone Number</label>
                  <input
                    type="tel"
                    id="new-address-phone"
                    className={`form-input ${fieldErrors.phone && touched.phone ? 'error' : ''}`}
                    placeholder="10-digit mobile number"
                    value={addressFormData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    required
                  />
                  {fieldErrors.phone && touched.phone && (
                    <div className="field-error-message" style={{ marginTop: '4px', fontSize: '0.875rem', color: '#ef4444' }}>
                      {fieldErrors.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Save Address
                </button>
                <button type="button" className="btn btn-outline" onClick={handleCancelAddAddress}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="addresses-list">
          {addresses && addresses.length > 0 ? (
            addresses.map((address, index) => (
              <div key={index} className="address-item-card">
                <div className="address-item-header">
                  <span className="address-label-badge">{address.address_label}</span>
                  <button
                    type="button"
                    className="btn-icon-delete"
                    onClick={() => handleDeleteAddress(index)}
                    title="Delete address"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
                <div className="address-item-body">
                  <p>{address.street}</p>
                  <p>{address.city}, {address.state} - {address.pin}</p>
                  <p>Phone: {address.phone}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data-message">
              <p>No addresses found</p>
              <p style={{ fontSize: '0.95rem', marginTop: '8px', color: 'var(--gray-400)' }}>
                Add your first shipping address to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Security Tab Component
export default CustomerProfile;