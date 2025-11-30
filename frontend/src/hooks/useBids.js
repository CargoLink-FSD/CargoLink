/**
 * Custom hook for managing available orders and bidding
 */
import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableOrders, submitBid as submitBidAction } from '../store/slices/bidsSlice';
import { useNotification } from '../context/NotificationContext';

const initialFilters = { location: '', vehicleType: '', minPrice: '', maxPrice: '' };

export function useBids() {
  const dispatch = useDispatch();
  const { availableOrders, loading, submitting, error } = useSelector((state) => state.bids);
  const { showSuccess, showError } = useNotification();
  const [filters, setFilters] = useState(initialFilters);

  const loadOrders = useCallback(() => {
    dispatch(fetchAvailableOrders());
  }, [dispatch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  const filtered = availableOrders.filter(o => {
    const pickupCity = o.pickup?.city || '';
    const deliveryCity = o.delivery?.city || '';
    const locOk = !filters.location || 
      pickupCity.toLowerCase().includes(filters.location.toLowerCase()) ||
      deliveryCity.toLowerCase().includes(filters.location.toLowerCase());
    const typeOk = !filters.vehicleType || o.truck_type?.toLowerCase() === filters.vehicleType.toLowerCase();
    const min = filters.minPrice ? parseFloat(filters.minPrice) : 0;
    const max = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
    const priceOk = o.max_price >= min && o.max_price <= max;
    return locOk && typeOk && priceOk;
  });

  const placeBid = async (index, orderId) => {
    const amountEl = document.getElementById(`bid-amount-${index}`);
    const notesEl = document.getElementById(`notes-${index}`);
    const rawAmount = amountEl?.value;
    const currentPrice = availableOrders.find(o => o._id === orderId)?.max_price;
    const bidAmount = parseInt(rawAmount, 10);
    
    if (!bidAmount || bidAmount <= 0) {
      showError('Enter a valid bid amount');
      return;
    }
    if (bidAmount >= currentPrice) {
      showError('Bid must be less than max price');
      return;
    }
    
    try {
      await dispatch(submitBidAction({ 
        orderId, 
        bidAmount, 
        notes: notesEl?.value || '' 
      })).unwrap();
      
      showSuccess('Bid submitted successfully');
      amountEl.value = '';
      notesEl.value = '';
      loadOrders();
    } catch (err) {
      showError(err || 'Failed to submit bid');
    }
  };

  return {
    loading,
    submitting,
    filters,
    filteredOrders: filtered,
    handleFilterChange,
    placeBid,
    loadOrders,
  };
}
