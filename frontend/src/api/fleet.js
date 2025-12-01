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

export default { getFleet, getVehicle, addVehicle, updateVehicle, deleteVehicle };