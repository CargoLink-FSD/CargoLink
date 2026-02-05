import React from 'react';
import { Button } from '../forms';

const vehicleTypeOptions = [
  { value: '', label: 'Select vehicle type', disabled: true },
  { value: 'mini-truck', label: 'Mini Truck' },
  { value: 'pickup', label: 'Pickup Truck' },
  { value: 'truck', label: 'Standard Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'container', label: 'Container Truck' },
];

const VehiclesEditor = ({ vehicles = [], errors = {}, onRemove, onAdd, register }) => {
  const getFieldError = (index, key) => {
    const vehicleErrors = errors?.vehicles?.[index];
    return vehicleErrors?.[key]?.message || '';
  };

  return (
    <div className="vehicles-section">
      {errors.vehicles?.message && <span className="error-message">{errors.vehicles.message}</span>}

      {vehicles.map((vehicle, index) => {
        return (
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
          </div>
        );
      })}

      <div className="add-vehicle-section">
        <Button type="button" variant="outline" onClick={onAdd}>
          + Add Another Vehicle
        </Button>
      </div>
    </div>
  );
};

export default VehiclesEditor;
