import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';

const ProfileField = ({ 
  fieldKey, 
  label, 
  value, 
  displayValue, 
  type, 
  options, 
  icon, 
  dispatch,
  updateAction,
  validateFn,
  optional = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fieldValue, setFieldValue] = useState(value);
  const [originalValue, setOriginalValue] = useState(value);
  const [validationError, setValidationError] = useState('');
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    setFieldValue(value);
    setOriginalValue(value);
  }, [value]);

  const handleEdit = () => {
    setIsEditing(true);
    setOriginalValue(fieldValue);
  };

  const handleCancel = () => {
    setFieldValue(originalValue);
    setValidationError('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Allow empty values for optional fields
    if (optional && !fieldValue) {
      try {
        await dispatch(updateAction({ fieldType: fieldKey, fieldValue })).unwrap();
        setValidationError('');
        setIsEditing(false);
        showSuccess('Update successful');
      } catch (error) {
        showError(error || 'An Error Occurred');
      }
      return;
    }

    // Validate using the provided validation function
    const { valid, msg } = validateFn(fieldValue, fieldKey);
    if (!valid) {
      setValidationError(msg);
      return;
    }

    try {
      await dispatch(updateAction({ fieldType: fieldKey, fieldValue })).unwrap();
      setValidationError('');
      setIsEditing(false);
      showSuccess('Update successful');
    } catch (error) {
      showError(error || 'An Error Occurred');
    }
  };

  const getDisplayValue = () => {
    if (displayValue !== undefined) return displayValue;
    if (fieldKey === 'dob' && fieldValue) {
      const date = new Date(fieldValue);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    }
    return fieldValue;
  };

  const handleFieldChange = (e) => {
    const newValue = e.target.value;
    setFieldValue(newValue);
    
    // Validate on change when editing
    if (isEditing && validateFn) {
      const { valid, msg } = validateFn(newValue, fieldKey);
      if (!valid) {
        setValidationError(msg);
      } else {
        setValidationError('');
      }
    }
  };

  return (
    <div className="profile-field">
      <label className="field-label-with-icon">
        {icon && <span className="field-icon">{icon}</span>}
        {label}
      </label>
      <div className="field-input-row">
        {type === 'select' ? (
          <select
            className={`field-input ${validationError && isEditing ? 'error' : ''}`}
            value={fieldValue}
            onChange={handleFieldChange}
            disabled={!isEditing}
          >
            <option value="">Select {label}</option>
            {options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={isEditing && type === 'date' ? 'date' : (type === 'date' ? 'text' : type)}
            className={`field-input ${validationError && isEditing ? 'error' : ''}`}
            value={isEditing && type === 'date' ? (fieldValue ? new Date(fieldValue).toISOString().split('T')[0] : '') : (type === 'date' ? getDisplayValue() : fieldValue)}
            onChange={handleFieldChange}
            disabled={!isEditing}
            readOnly={!isEditing}
          />
        )}
        {/* Edit button for each field */}
        {!isEditing ? (
          <button className="btn-icon-edit" type="button" onClick={handleEdit} title="Edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        ) : (
          <div className="field-action-buttons">
            <button className="btn-icon-check" type="button" onClick={handleSave} title="Save">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button className="btn-icon-close" type="button" onClick={handleCancel} title="Cancel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
      {validationError && isEditing && (
        <div className="field-error-message">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {validationError}
        </div>
      )}
    </div>
  );
};

export default ProfileField;
