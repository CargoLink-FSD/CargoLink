// Modern Driver Profile Page
// Redesigned with modern UI components

import React from 'react';
import { driverProfileFieldSchemas } from '../../utils/schemas';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { fetchDriverProfile } from '../../store/slices/driverSlice';
import Header from '../../components/common/Header';
import ProfileField from '../../components/profile/ProfileField';
import SecurityTab from '../../components/profile/SecurityTab';
import '../../styles/profile.css';
import Footer from '../../components/common/Footer';

const DriverProfile = () => {
  const {
    profile,
    loading,
    error,
    activeTab,
    setActiveTab,
    dispatch,
    updateDriverField,
    updateDriverPassword,
    uploadDriverProfilePicture,
  } = useDriverProfile();

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }
      await dispatch(uploadDriverProfilePicture(file));
      await dispatch(fetchDriverProfile());
    }
  };

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
                <div className="profile-avatar-wrapper">
                  {profile.profileImage ? (
                    <img 
                      src={`http://localhost:3000${profile.profileImage}`} 
                      alt="Profile" 
                      className="profile-avatar-large"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : (
                    <div className="profile-avatar-large">
                      {profile.firstName ? profile.firstName[0].toUpperCase() : '?'}
                    </div>
                  )}
                  <label className="profile-picture-upload-btn" title="Upload profile picture">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfilePictureChange}
                      style={{ display: 'none' }}
                    />
                  </label>
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
                      {Array.isArray(profile?.tripsCount)
                        ? profile.tripsCount.reduce((sum, item) => sum + (item.count || 0), 0)
                        : (typeof profile?.tripsCount === 'number' ? profile.tripsCount : 0)}
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
                updateDriverField={updateDriverField}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab dispatch={dispatch} updatePasswordAction={updateDriverPassword} userEmail={profile?.email} />
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

// Profile Info Component
const ProfileInfo = ({ profile, dispatch, updateDriverField }) => {
  if (!profile) return null;

  // Validation function for driver fields
  const validateField = (fieldValue, fieldType) => {
    try {
      const schema = driverProfileFieldSchemas[fieldType];
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
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="lastName"
          label="Last Name"
          value={profile?.lastName || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="email"
          label="Email"
          value={profile?.email || ''}
          type="email"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="phone"
          label="Phone"
          value={profile?.phone || ''}
          type="tel"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="gender"
          label="Gender"
          value={profile?.gender || 'Male'}
          type="select"
          options={['Male', 'Female', 'Other']}
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="licenseNumber"
          label="License Number"
          value={profile?.licenseNumber || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="address"
          label="Street Address"
          value={profile?.address || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="city"
          label="City"
          value={profile?.city || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="state"
          label="State"
          value={profile?.state || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="pin"
          label="PIN Code"
          value={profile?.pin || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateDriverField}
          validateFn={validateField}
        />
      </div>
    </div>
  );
};


// Security Tab Component
export default DriverProfile;