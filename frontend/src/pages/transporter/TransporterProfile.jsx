// Transporter Profile Page
// Converted from transporter_profile.ejs and profile_transporter.js

import React from 'react';
import { transporterProfileFieldSchemas } from '../../utils/schemas';
import { useTransporterProfile } from '../../hooks/useTransporterProfile';
import Header from '../../components/common/Header';
import ProfileField from '../../components/profile/ProfileField';
import SecurityTab from '../../components/profile/SecurityTab';
import '../../styles/profile.css';

const TransporterProfile = () => {
  const {
    profile,
    loading,
    error,
    activeTab,
    switchTab,
    dispatch,
    updateTransporterField,
    updateTransporterPassword,
  } = useTransporterProfile();

  if (loading && !profile) {
    return (
      <>
        <Header />
        <div style={{ paddingTop: '80px' }}>
          <div className="profile-container">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--gray-500)' }}>Loading your profile...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profile && !loading) {
    return (
      <>
        <Header />
        <div style={{ paddingTop: '80px' }}>
          <div className="profile-container">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--error)' }}>
                Unable to load profile. {error || 'Please try again.'}
              </p>
            </div>
          </div>
        </div>
      </>
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
                {profile?.companyName ? profile.companyName[0].toUpperCase() : '?'}
              </div>
              <div className="profile-header-info">
                <div className="profile-name-row">
                  <h1 className="profile-display-name">{profile?.companyName}</h1>
                  <span className="status-badge active">Active</span>
                </div>
                <p className="profile-header-email">{profile?.email}</p>
                <p className="profile-member-since">
                  Member since {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
            <div className="profile-header-right">
              <div className="profile-stats-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <div className="stat-info">
                  <div className="stat-value">
                    {Array.isArray(profile?.orderCount)
                      ? profile.orderCount.reduce((sum, item) => sum + (item.count || 0), 0)
                      : 0}
                  </div>
                  <div className="stat-label">Total Trips</div>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '40px' }}>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <div className="stat-info">
                  <div className="stat-value">{profile?.fleetCount || 0}</div>
                  <div className="stat-label">Fleet Count</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => switchTab('personal')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Business Information
          </button>
          <button
            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => switchTab('security')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Security
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && (
          <div className="tab-content active">
            <TransporterInfo 
              profile={profile} 
              dispatch={dispatch}
              updateTransporterField={updateTransporterField}
            />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="tab-content active">
            <SecurityTab dispatch={dispatch} updatePasswordAction={updateTransporterPassword} />
          </div>
        )}
      </div>
      </div>
    </>
  );
};

// Transporter Info Component
const TransporterInfo = ({ profile, dispatch, updateTransporterField }) => {
  // Validation function for transporter fields
  const validateField = (fieldValue, fieldType) => {
    try {
      const schema = transporterProfileFieldSchemas[fieldType];
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
    <div className="profile-section-card">
      <div className="card-header-row">
        <h2 className="card-title">Business Information</h2>
      </div>
      <div className="profile-fields-grid">
        <ProfileField
          fieldKey="name"
          label="Company Name"
          value={profile?.companyName || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="email"
          label="Email"
          value={profile?.email || ''}
          type="email"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="primary_contact"
          label="Primary Contact"
          value={profile?.phone || ''}
          type="tel"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="secondary_contact"
          label="Secondary Contact"
          value={profile?.secondaryContact || ''}
          type="tel"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
          optional={true}
        />
        <ProfileField
          fieldKey="pan"
          label="PAN Number"
          value={profile?.panNumber || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="gst_in"
          label="GST Number"
          value={profile?.gstNumber || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="street"
          label="Street Address"
          value={profile?.address || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="city"
          label="City"
          value={profile?.city || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="state"
          label="State"
          value={profile?.state || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="pin"
          label="PIN Code"
          value={profile?.pin || ''}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
      </div>
    </div>
  );
};

export default TransporterProfile;
