import { useState } from 'react';

export const useVehicleForm = () => {
  const [formData, setFormData] = useState({
    truck_id: '',
    name: '',
    truck_type: '',
    registration: '',
    capacity: '',
    manufacture_year: '',
    last_service_date: '',
    next_service_date: '',
    status: 'Available'
  });

  const resetForm = () => {
    setFormData({
      truck_id: '',
      name: '',
      truck_type: '',
      registration: '',
      capacity: '',
      manufacture_year: '',
      last_service_date: '',
      next_service_date: '',
      status: 'Available'
    });
  };

  const setFormValue = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const setFormValues = (values) => {
    setFormData(prev => ({ ...prev, ...values }));
  };

  const populateForm = (vehicle) => {
    setFormData({
      truck_id: vehicle._id || vehicle.truck_id || '',
      name: vehicle.name || '',
      truck_type: vehicle.truck_type || vehicle.type || '',
      registration: vehicle.registration || vehicle.registrationNumber || '',
      capacity: vehicle.capacity || '',
      manufacture_year: vehicle.manufacture_year || vehicle.manufactureYear || '',
      last_service_date: vehicle.last_service_date ? vehicle.last_service_date.split('T')[0] : '',
      next_service_date: vehicle.next_service_date ? vehicle.next_service_date.split('T')[0] : '',
      status: vehicle.status || 'Available'
    });
  };

  return {
    formData,
    setFormData,
    resetForm,
    setFormValue,
    setFormValues,
    populateForm
  };
};