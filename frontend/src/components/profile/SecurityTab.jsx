import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { passwordUpdateSchema } from '../../utils/schemas';

const SecurityTab = ({ dispatch, updatePasswordAction }) => {
  const { showSuccess, showError } = useNotification();
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate using schema
      passwordUpdateSchema.parse(passwordData);
      
      await dispatch(
        updatePasswordAction({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        })
      ).unwrap();
      
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      showSuccess('Password updated successfully!');
    } catch (error) {
      // Handle Zod validation errors
      if (error.issues) {
        showError(error.issues[0].message);
      } else {
        showError(error || 'Failed to update password');
      }
    }
  };

  return (
    <div className="security-section">
      <div className="card-header-row">
        <h2 className="card-title">Security Settings</h2>
      </div>

      <div className="security-form-card">
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', color: 'var(--gray-800)' }}>
          Change Password
        </h3>
        <form className="password-form" onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="current-password">Current Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword.current ? "text" : "password"}
                id="current-password"
                name="current-password"
                autoComplete="current-password"
                className="form-input"
                placeholder="Enter current password"
                value={passwordData.oldPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, oldPassword: e.target.value })
                }
                required
              />
              <button 
                type="button" 
                className="btn-icon-eye" 
                onClick={() => setShowPassword({...showPassword, current: !showPassword.current})} 
                tabIndex={-1} 
                aria-label="Show/Hide Password"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword.new ? "text" : "password"}
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                className="form-input"
                placeholder="Enter new password (min 8 characters)"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                required
              />
              <button 
                type="button" 
                className="btn-icon-eye" 
                onClick={() => setShowPassword({...showPassword, new: !showPassword.new})} 
                tabIndex={-1} 
                aria-label="Show/Hide Password"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword.confirm ? "text" : "password"}
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                className="form-input"
                placeholder="Re-enter new password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                required
              />
              <button 
                type="button" 
                className="btn-icon-eye" 
                onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})} 
                tabIndex={-1} 
                aria-label="Show/Hide Password"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Update Password
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setPasswordData({
                  oldPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                })
              }
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityTab;
