import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getVehicle, 
  deleteVehicle,
  setTruckMaintenance,
  setTruckAvailable,
  setTruckUnavailable,
  scheduleMaintenance
} from '../../api/fleet';

export const useVehicleDetails = (vehicleId) => {
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [vehicleId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const vehicleData = await getVehicle(vehicleId);
      setVehicle(vehicleData.data || vehicleData);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVehicle(vehicleId);
      return { success: true, message: 'Vehicle deleted successfully' };
    } catch (error) {
      throw new Error('Failed to delete vehicle');
    }
  };

  const handleSetMaintenance = async () => {
    try {
      setActionLoading(true);
      await setTruckMaintenance(vehicleId);
      await fetchDetails();
      return { success: true, message: 'Truck set to maintenance' };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set maintenance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetAvailable = async () => {
    try {
      setActionLoading(true);
      await setTruckAvailable(vehicleId);
      await fetchDetails();
      return { success: true, message: 'Truck set to available' };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set available');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetUnavailable = async () => {
    try {
      setActionLoading(true);
      await setTruckUnavailable(vehicleId);
      await fetchDetails();
      return { success: true, message: 'Truck set to unavailable' };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to set unavailable');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleMaintenance = async (scheduleDate) => {
    if (!scheduleDate) {
      throw new Error('Please select a date');
    }

    try {
      setActionLoading(true);
      await scheduleMaintenance(vehicleId, scheduleDate);
      await fetchDetails();
      return { success: true, message: 'Maintenance scheduled successfully' };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to schedule maintenance');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    vehicle,
    loading,
    actionLoading,
    handleDelete,
    handleSetMaintenance,
    handleSetAvailable,
    handleSetUnavailable,
    handleScheduleMaintenance,
    refetch: fetchDetails
  };
};

export default useVehicleDetails;
