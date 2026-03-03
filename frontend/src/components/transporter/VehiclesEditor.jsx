import React from 'react';
import { Button } from '../forms';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const vehicleTypeOptions = [
  { value: '', label: 'Select vehicle type', disabled: true },
  { value: 'mini-truck', label: 'Mini Truck' },
  { value: 'pickup', label: 'Pickup Truck' },
  { value: 'truck', label: 'Standard Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'container', label: 'Container Truck' },
];

const VehiclesEditor = ({ vehicles = [], errors = {}, onRemove, onAdd, register, rcFiles = {}, rcErrors = {}, onRcFileChange }) => {
  const getFieldError = (index, key) => {
    const vehicleErrors = errors?.vehicles?.[index];
    return vehicleErrors?.[key]?.message || '';
  };

  const handleRcChange = (index, file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      onRcFileChange?.(index, null, 'Only JPEG, PNG, or PDF files are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      onRcFileChange?.(index, null, 'File size must be less than 5MB');
      return;
    }
    onRcFileChange?.(index, file, null);
  };

  const getRcPreview = (index) => {
    const file = rcFiles[`vehicle_rc_${index}`];
    if (!file) return null;
    if (file.type === 'application/pdf') {
      return <span className="rc-file-name">📄 {file.name} (PDF)</span>;
    }
    return <img src={URL.createObjectURL(file)} alt="RC Preview" className="rc-preview-img" style={{ maxWidth: '100%', maxHeight: '120px', marginTop: '6px', borderRadius: '4px' }} />;
  };

  return (
    <div className="vehicles-section">
      {errors.vehicles?.message && <span className="error-message">{errors.vehicles.message}</span>}

      {vehicles.map((vehicle, index) => (
        <div key={vehicle.id || index} className="vehicle-section">
          <div className="vehicle-header">
            <h4>Vehicle {index + 1}</h4>
            {vehicles.length > 1 && (
              <Button
                type="button"
                variant="outline"
                className="remove-vehicle"
                onClick={() => onRemove(index)}
              >
                Remove
              </Button>
            )}
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor={`vehicles.${index}.name`}>
              Vehicle Name *
            </label>
            <input
              className="input-field"
              type="text"
              id={`vehicles.${index}.name`}
              placeholder="Enter vehicle name"
              {...register(`vehicles.${index}.name`)}
            />
            {getFieldError(index, 'name') && (
              <span className="error-message">{getFieldError(index, 'name')}</span>
            )}
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor={`vehicles.${index}.type`}>
              Vehicle Type *
            </label>
            <select
              className="input-field"
              id={`vehicles.${index}.type`}
              {...register(`vehicles.${index}.type`)}
            >
              {vehicleTypeOptions.map(opt => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
            {getFieldError(index, 'type') && (
              <span className="error-message">{getFieldError(index, 'type')}</span>
            )}
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor={`vehicles.${index}.registrationNumber`}>
              Vehicle Registration Number *
            </label>
            <input
              className="input-field"
              type="text"
              id={`vehicles.${index}.registrationNumber`}
              placeholder="Enter vehicle registration number"
              {...register(`vehicles.${index}.registrationNumber`)}
            />
            {getFieldError(index, 'registrationNumber') && (
              <span className="error-message">{getFieldError(index, 'registrationNumber')}</span>
            )}
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor={`vehicles.${index}.capacity`}>
              Vehicle Capacity (in tons) *
            </label>
            <input
              className="input-field"
              type="number"
              id={`vehicles.${index}.capacity`}
              placeholder="Enter vehicle capacity"
              {...register(`vehicles.${index}.capacity`)}
            />
            {getFieldError(index, 'capacity') && (
              <span className="error-message">{getFieldError(index, 'capacity')}</span>
            )}
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor={`vehicles.${index}.manufacture_year`}>
              Manufacture Year *
            </label>
            <input
              className="input-field"
              type="text"
              id={`vehicles.${index}.manufacture_year`}
              placeholder="Enter manufacture year (YYYY)"
              {...register(`vehicles.${index}.manufacture_year`)}
            />
            {getFieldError(index, 'manufacture_year') && (
              <span className="error-message">{getFieldError(index, 'manufacture_year')}</span>
            )}
          </div>

          {/* Vehicle RC Upload — inside each vehicle card */}
          <div className="form-group rc-upload-group">
            <label className="input-label" htmlFor={`vehicle_rc_${index}`}>
              Vehicle RC (Registration Certificate) *
            </label>
            <input
              className="input-field"
              type="file"
              id={`vehicle_rc_${index}`}
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handleRcChange(index, e.target.files[0])}
            />
            {rcFiles[`vehicle_rc_${index}`] && (
              <div className="rc-preview">{getRcPreview(index)}</div>
            )}
            {rcErrors?.[`vehicle_rc_${index}`] && (
              <span className="error-message">{rcErrors[`vehicle_rc_${index}`]}</span>
            )}
          </div>
        </div>
      ))}

      <div className="add-vehicle-section">
        <Button type="button" variant="outline" onClick={onAdd}>
          + Add Another Vehicle
        </Button>
      </div>
    </div>
  );
};

export default VehiclesEditor;
