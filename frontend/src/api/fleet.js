// Fleet Management API Endpoints
// All fleet-related API calls (get, add, update, delete vehicles)

import { http } from './http';

export const getFleet = async () => {
  const response = await http.get('/api/transporters/fleet');
  // Return the actual fleet data, which is nested in response.data.fleet
  return response.data?.fleet || response.data || [];
};

export const getVehicle = async (vehicleId) => {
  const response = await http.get(`/api/transporters/fleet/${vehicleId}`);
  return response.data;
};

export const addVehicle = async (vehicleData) => {
  const response = await http.post('/api/transporters/fleet', vehicleData);
  return response.data;
};

export const updateVehicle = async (vehicleId, vehicleData) => {
  const response = await http.put(`/api/transporters/fleet/${vehicleId}`, vehicleData);
  return response.data;
};

export const deleteVehicle = async (vehicleId) => {
  const response = await http.del(`/api/transporters/fleet/${vehicleId}`);
  return response.data;
};

// Truck Status Management
export const setTruckMaintenance = async (vehicleId) => {
  const response = await http.post(`/api/transporters/fleet/${vehicleId}/set-maintenance`);
  return response.data;
};

export const setTruckAvailable = async (vehicleId) => {
  const response = await http.post(`/api/transporters/fleet/${vehicleId}/set-available`);
  return response.data;
};

export const setTruckUnavailable = async (vehicleId) => {
  const response = await http.post(`/api/transporters/fleet/${vehicleId}/set-unavailable`);
  return response.data;
};

export const scheduleMaintenance = async (vehicleId, nextServiceDate) => {
  const response = await http.post(`/api/transporters/fleet/${vehicleId}/schedule-maintenance`, {
    next_service_date: nextServiceDate
  });
  return response.data;
};

export default { 
  getFleet, 
  getVehicle, 
  addVehicle, 
  updateVehicle, 
  deleteVehicle,
  setTruckMaintenance,
  setTruckAvailable,
  setTruckUnavailable,
  scheduleMaintenance
};