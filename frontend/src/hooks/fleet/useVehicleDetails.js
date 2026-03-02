import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getVehicle, 
  deleteVehicle,
  setTruckMaintenance,
  setTruckAvailable,
  setTruckUnavailable,
  scheduleMaintenance,
  getFleetSchedule,
  addFleetScheduleBlock,
  removeFleetScheduleBlock,
} from '../../api/fleet';

export const useVehicleDetails = (vehicleId) => {
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

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

  // ─── Schedule Methods ─────────────────────────────────────────────────────────

  const fetchSchedule = useCallback(async (startDate, endDate) => {
    try {
      setScheduleLoading(true);
      const data = await getFleetSchedule(vehicleId, startDate, endDate);
      setScheduleBlocks(data.blocks || []);
      return data;
    } catch (error) {
      console.error('Failed to fetch fleet schedule', error);
      throw error;
    } finally {
      setScheduleLoading(false);
    }
  }, [vehicleId]);

  const handleAddScheduleBlock = async (blockData) => {
    try {
      setActionLoading(true);
      const result = await addFleetScheduleBlock(vehicleId, blockData);
      return result;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to add schedule block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveScheduleBlock = async (blockId) => {
    try {
      setActionLoading(true);
      await removeFleetScheduleBlock(vehicleId, blockId);
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to remove schedule block');
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
    refetch: fetchDetails,

    // Schedule
    scheduleBlocks,
    scheduleLoading,
    fetchSchedule,
    handleAddScheduleBlock,
    handleRemoveScheduleBlock,
  };
};

export default useVehicleDetails;
