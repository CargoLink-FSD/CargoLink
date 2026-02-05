import React from "react";
import { transporterProfileFieldSchemas } from "../../utils/schemas";
import { useTransporterProfile } from "../../hooks/useTransporterProfile";
import RatingsTab from "../../components/transporter/RatingsTab";
import Header from "../../components/common/Header";
import { Truck, Box, User, MessageSquare, Shield } from "lucide-react";
import ProfileField from "../../components/profile/ProfileField";
import SecurityTab from "../../components/profile/SecurityTab";
import "../../styles/profile.css";
import Footer from "../../components/common/Footer";

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
  } = useTransporterProfile();

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
                <div className="profile-avatar-large">
                  {profile?.companyName
                    ? profile.companyName[0].toUpperCase()
                    : "S"}
                </div>
                <div className="profile-header-info">
                  <div className="profile-name-row">
                    <h1 className="profile-display-name">
                      {profile?.companyName || "SpeedCargo Logistics"}
                    </h1>
                    <span className="status-badge active">Active</span>
                  </div>
                  <p className="profile-header-email">
                    {profile?.email || "operations@speedcargo.com"}
                  </p>
                  <p className="profile-member-since">
                    Member since{" "}
                    {profile?.memberSince
                      ? new Date(profile.memberSince).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "October 12, 2025"}
                  </p>
                </div>
              </div>

              <div className="profile-header-right">
                <div className="header-stat-box">
                  <div className="stat-icon-container blue-bg">
                    <Truck size={20} className="stat-icon" />
                  </div>
                  <div className="stat-text">
                    <span className="stat-number">
                      {Array.isArray(profile?.orderCount)
                        ? profile.orderCount.reduce(
                            (sum, item) => sum + (item.count || 0),
                            0
                          )
                        : 5}
                    </span>
                    <span className="stat-label">Total Trips</span>
                  </div>
                </div>

                <div className="header-stat-box">
                  <div className="stat-icon-container blue-bg">
                    <Box size={20} className="stat-icon" />
                  </div>
                  <div className="stat-text">
                    <span className="stat-number">
                      {profile?.fleetCount || 5}
                    </span>
                    <span className="stat-label">Fleet Count</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="profile-tabs">
            <button
              className={`profile-tab ${
                activeTab === "personal" ? "active" : ""
              }`}
              onClick={() => switchTab("personal")}
            >
              <User size={18} />
              Business Information
            </button>
            <button
              className={`profile-tab ${
                activeTab === "ratings" ? "active" : ""
              }`}
              onClick={() => switchTab("ratings")}
            >
              <MessageSquare size={18} />
              Ratings & Reviews
            </button>
            <button
              className={`profile-tab ${
                activeTab === "security" ? "active" : ""
              }`}
              onClick={() => switchTab("security")}
            >
              <Shield size={18} />
              Security
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

export default TransporterProfile;
