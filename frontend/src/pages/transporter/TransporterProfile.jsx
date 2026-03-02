import React, { useState, useEffect } from "react";
import { transporterProfileFieldSchemas } from "../../utils/schemas";
import { useTransporterProfile } from "../../hooks/useTransporterProfile";
import RatingsTab from "../../components/transporter/RatingsTab";
import Header from "../../components/common/Header";
import { Truck, Box, User, MessageSquare, Shield, FileText } from "lucide-react";
import ProfileField from "../../components/profile/ProfileField";
import SecurityTab from "../../components/profile/SecurityTab";
import { getVerificationStatus } from "../../api/transporter";
import "../../styles/profile.css";
import Footer from "../../components/common/Footer";
// Transporter Profile Page
// Converted from transporter_profile.ejs and profile_transporter.js
import { fetchTransporterProfile } from '../../store/slices/transporterSlice';

const TransporterProfile = () => {
  const {
    profile,
    ratings,
    loading,
    error,
    activeTab,
    switchTab,
    dispatch,
    updateTransporterField,
    updateTransporterPassword,
    uploadTransporterProfilePicture,
  } = useTransporterProfile();

  const [verificationInfo, setVerificationInfo] = useState(null);

  useEffect(() => {
    getVerificationStatus()
      .then(res => setVerificationInfo(res))
      .catch(() => { });
  }, []);

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
      await dispatch(uploadTransporterProfilePicture(file));
      await dispatch(fetchTransporterProfile());
    }
  };

  if (loading && !profile) {
    return (
      <>
        <Header />
        <div style={{ paddingTop: "80px" }}>
          <div className="profile-container">
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "1.2rem", color: "var(--gray-500)" }}>
                Loading your profile...
              </p>
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
        <div style={{ paddingTop: "80px" }}>
          <div className="profile-container">
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ fontSize: "1.2rem", color: "var(--error)" }}>
                Unable to load profile. {error || "Please try again."}
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
      <div className="profile-main-wrapper" style={{ paddingTop: "80px" }}>
        <div className="profile-container">
          {/* Profile Header Card */}
          <div className="profile-header-card">
            <div className="profile-header-content">
              <div className="profile-header-left">
                <div className="profile-avatar-wrapper">
                  {profile?.profileImage ? (
                    <img
                      src={`http://localhost:3000${profile.profileImage}`}
                      alt="Profile"
                      className="profile-avatar-large"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : (
                    <div className="profile-avatar-large">
                      {profile?.companyName ? profile.companyName[0].toUpperCase() : '?'}
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
              className={`profile-tab ${activeTab === "personal" ? "active" : ""
                }`}
              onClick={() => switchTab("personal")}
            >
              <User size={18} />
              Business Information
            </button>
            <button
              className={`profile-tab ${activeTab === "ratings" ? "active" : ""
                }`}
              onClick={() => switchTab("ratings")}
            >
              <MessageSquare size={18} />
              Ratings & Reviews
            </button>
            <button
              className={`profile-tab ${activeTab === "security" ? "active" : ""
                }`}
              onClick={() => switchTab("security")}
            >
              <Shield size={18} />
              Security
            </button>
            <button
              className={`profile-tab ${activeTab === "documents" ? "active" : ""
                }`}
              onClick={() => switchTab("documents")}
            >
              <FileText size={18} />
              Documents
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="profile-tab-content">
            {activeTab === "personal" && (
              <div className="tab-pane active">
                <TransporterInfo
                  profile={profile}
                  dispatch={dispatch}
                  updateTransporterField={updateTransporterField}
                />
              </div>
            )}
            {activeTab === "ratings" && (
              <div className="tab-pane active">
                <RatingsTab ratings={ratings} />
              </div>
            )}
            {activeTab === "security" && (
              <div className="tab-pane active">
                <SecurityTab
                  dispatch={dispatch}
                  updatePasswordAction={updateTransporterPassword}
                  userEmail={profile?.email}
                />
              </div>
            )}
            {activeTab === "documents" && (
              <div className="tab-pane active">
                <DocumentsTab verificationInfo={verificationInfo} />
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

// Transporter Info Component
const TransporterInfo = ({ profile, dispatch, updateTransporterField }) => {
  const validateField = (fieldValue, fieldType) => {
    try {
      const schema = transporterProfileFieldSchemas[fieldType];
      if (!schema) return { valid: false, msg: "Invalid field type" };
      schema.parse(fieldValue);
      return { valid: true };
    } catch (error) {
      return { valid: false, msg: error.issues[0].message };
    }
  };

  return (
    <div className="profile-content-card">
      <div className="card-header-row">
        <h2 className="card-title">Business Information</h2>
      </div>
      <div className="profile-fields-grid">
        <ProfileField
          fieldKey="name"
          label="Company Name"
          value={profile?.companyName || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="email"
          label="Email"
          value={profile?.email || ""}
          type="email"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="primary_contact"
          label="Primary Contact"
          value={profile?.phone || ""}
          type="tel"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="secondary_contact"
          label="Secondary Contact"
          value={profile?.secondaryContact || ""}
          type="tel"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
          optional={true}
        />
        <ProfileField
          fieldKey="pan"
          label="PAN Number"
          value={profile?.panNumber || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="gst_in"
          label="GST Number"
          value={profile?.gstNumber || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="street"
          label="Street Address"
          value={profile?.address || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="city"
          label="City"
          value={profile?.city || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="state"
          label="State"
          value={profile?.state || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
        <ProfileField
          fieldKey="pin"
          label="PIN Code"
          value={profile?.pin || ""}
          type="text"
          dispatch={dispatch}
          updateAction={updateTransporterField}
          validateFn={validateField}
        />
      </div>
    </div>
  );
};

// Documents Tab Component
const DocumentsTab = ({ verificationInfo }) => {
  const API_BASE = 'http://localhost:3000';

  const statusBadge = (status) => {
    const map = {
      approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
      pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
        fontSize: '0.75rem', fontWeight: 600, background: s.bg, color: s.color,
      }}>{s.label}</span>
    );
  };

  const DocRow = ({ label, doc }) => {
    if (!doc || !doc.url) return (
      <div className="profile-field-row" style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}><strong>{label}:</strong> Not uploaded</span>
      </div>
    );
    return (
      <div className="profile-field-row" style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{label}</span>
          {doc.adminNote && (
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#dc2626' }}>Note: {doc.adminNote}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {statusBadge(doc.adminStatus || 'pending')}
          <a href={`${API_BASE}${doc.url}`} target="_blank" rel="noopener noreferrer"
            style={{ color: '#4f46e5', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' }}>
            View ↗
          </a>
        </div>
      </div>
    );
  };

  if (!verificationInfo) {
    return (
      <div className="profile-content-card">
        <div className="card-header-row"><h2 className="card-title">Verification Documents</h2></div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading document status...</p>
      </div>
    );
  }

  const docs = verificationInfo.documents || {};
  const fleet = verificationInfo.fleet || [];
  const overallStatus = verificationInfo.verificationStatus || 'unsubmitted';

  const overallMap = {
    unsubmitted: { text: 'Documents not yet uploaded', bg: '#f3f4f6', color: '#6b7280' },
    under_review: { text: 'Under Manager Review', bg: '#cce5ff', color: '#004085' },
    approved: { text: 'Fully Verified', bg: '#d1fae5', color: '#065f46' },
    rejected: { text: 'One or more documents rejected', bg: '#fee2e2', color: '#991b1b' },
  };
  const overall = overallMap[overallStatus] || overallMap.unsubmitted;

  return (
    <div className="profile-content-card">
      <div className="card-header-row">
        <h2 className="card-title">Verification Documents</h2>
        <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, background: overall.bg, color: overall.color }}>
          {overall.text}
        </span>
      </div>

      <div style={{ marginTop: '8px' }}>
        <DocRow label="PAN Card" doc={docs.pan_card} />
        <DocRow label="Driving License" doc={docs.driving_license} />
        {docs.vehicle_rcs && docs.vehicle_rcs.length > 0 && (
          <>
            <p style={{ marginTop: '16px', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>
              Vehicle Registration Certificates
            </p>
            {docs.vehicle_rcs.map((rc, idx) => {
              const vehicle = fleet.find(v => v._id?.toString() === rc.vehicleId?.toString());
              const label = vehicle?.registration
                ? `Vehicle RC — ${vehicle.registration}`
                : `Vehicle RC #${idx + 1}`;
              return <DocRow key={idx} label={label} doc={rc} />;
            })}
          </>
        )}
        {(!docs.pan_card && !docs.driving_license && !(docs.vehicle_rcs?.length)) && (
          <p style={{ color: '#6b7280', fontSize: '0.875rem', padding: '16px 0' }}>
            No documents uploaded yet. Complete the document upload step to get verified.
          </p>
        )}
      </div>
    </div>
  );
};

export default TransporterProfile;
