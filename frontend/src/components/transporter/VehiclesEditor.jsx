import React from 'react';
import { InputField, Select, Button } from '../forms';

const vehicleTypeOptions = [
  { value: '', label: 'Select vehicle type', disabled: true },
  { value: 'mini-truck', label: 'Mini Truck' },
  { value: 'pickup', label: 'Pickup Truck' },
  { value: 'truck', label: 'Standard Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'container', label: 'Container Truck' },
];

const VehiclesEditor = ({ vehicles = [], errors = {}, onFieldChange, onRemove, onAdd }) => {
  const getFieldError = (index, key) => {
    return errors[`vehicles[${index}][${key}]`] || '';
  };

  return (
    <div className="vehicles-section">
      {errors.vehicles && <span className="error-message">{errors.vehicles}</span>}

      {vehicles.map((vehicle, index) => {
        return (
          <div key={index} className="vehicle-section">
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

            <InputField
              label="Vehicle Name"
              placeholder="Enter vehicle name"
              name={`vehicles[${index}][name]`}
              value={vehicle.name ?? ''}
              onChange={(e) => onFieldChange(index, 'name', e.target.value)}
              error={getFieldError(index, 'name')}
              required
            />

            <Select
              label="Vehicle Type"
              name={`vehicles[${index}][type]`}
              value={vehicle.type ?? ''}
              onChange={(e) => onFieldChange(index, 'type', e.target.value)}
              error={getFieldError(index, 'type')}
              required
              options={vehicleTypeOptions}
            />

            <InputField
              label="Vehicle Registration Number"
              placeholder="Enter vehicle registration number"
              name={`vehicles[${index}][registrationNumber]`}
              value={vehicle.registrationNumber ?? ''}
              onChange={(e) => onFieldChange(index, 'registrationNumber', e.target.value)}
              error={getFieldError(index, 'registrationNumber')}
              required
            />

            <InputField
              type="number"
              label="Vehicle Capacity (in tons)"
              placeholder="Enter vehicle capacity"
              name={`vehicles[${index}][capacity]`}
              value={vehicle.capacity ?? ''}
              onChange={(e) => onFieldChange(index, 'capacity', e.target.value)}
              error={getFieldError(index, 'capacity')}
              required
            />

            <InputField
              label="Manufacture Year"
              placeholder="Enter manufacture year (YYYY)"
              name={`vehicles[${index}][manufacture_year]`}
              value={vehicle.manufacture_year ?? ''}
              onChange={(e) => onFieldChange(index, 'manufacture_year', e.target.value)}
              error={getFieldError(index, 'manufacture_year')}
              required
            />
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
