import { useState, useEffect } from 'react';
import { getFleet, addVehicle, updateVehicle, deleteVehicle } from '../../api/fleet';

export const useFleetManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFleet = async () => {
    try {
      setLoading(true);
      const response = await getFleet();

      // Since we've fixed the API to return the correct structure, we can simplify this
      let fleetData = [];
      if (Array.isArray(response)) {
        fleetData = response;
      } else {
        fleetData = [response];
      }

      setVehicles(fleetData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch fleet', err);
      setError(err.message || 'Failed to fetch fleet');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const createVehicle = async (vehicleData) => {
    try {
      const response = await addVehicle(vehicleData);
      await fetchFleet(); // Refresh the fleet list
      return response;
    } catch (err) {
      console.error('Failed to add vehicle', err);
      throw err;
    }
  };

  const editVehicle = async (vehicleId, vehicleData) => {
    try {
      const response = await updateVehicle(vehicleId, vehicleData);
      await fetchFleet(); // Refresh the fleet list
      return response;
    } catch (err) {
      console.error('Failed to update vehicle', err);
      throw err;
    }
  };

  const removeVehicle = async (vehicleId) => {
    try {
      const response = await deleteVehicle(vehicleId);
      await fetchFleet(); // Refresh the fleet list
      return response;
    } catch (err) {
      console.error('Failed to delete vehicle', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  return {
    vehicles,
    loading,
    error,
    fetchFleet,
    createVehicle,
    editVehicle,
    removeVehicle
  };
};