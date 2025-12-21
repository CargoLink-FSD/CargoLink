// Transporter Orders Redux Slice
// Manages transporter orders state and actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as transporterOrdersApi from '../../api/transporterOrders';

// Async thunk for fetching transporter's assigned orders
export const fetchTransporterOrders = createAsyncThunk(
  'transporterOrders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const orders = await transporterOrdersApi.getTransporterOrders();
      return orders;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch orders');
    }
  }
);

// Async thunk for fetching available orders for bidding
export const fetchAvailableOrders = createAsyncThunk(
  'transporterOrders/fetchAvailableOrders',
  async (_, { rejectWithValue }) => {
    try {
      const orders = await transporterOrdersApi.getAvailableOrders();
      return orders;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch available orders');
    }
  }
);

// Async thunk for fetching single order details
export const fetchTransporterOrderDetails = createAsyncThunk(
  'transporterOrders/fetchOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const order = await transporterOrdersApi.getTransporterOrderDetails(orderId);
      return order;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch order details');
    }
  }
);

// Async thunk for submitting a bid
export const submitOrderBid = createAsyncThunk(
  'transporterOrders/submitBid',
  async ({ orderId, bidData }, { rejectWithValue }) => {
    try {
      await transporterOrdersApi.submitBid(orderId, bidData);
      return { orderId, bidData };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to submit bid');
    }
  }
);

// Async thunk for withdrawing a bid
export const withdrawOrderBid = createAsyncThunk(
  'transporterOrders/withdrawBid',
  async ({ orderId, bidId }, { rejectWithValue }) => {
    try {
      await transporterOrdersApi.withdrawBid(orderId, bidId);
      return { orderId, bidId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to withdraw bid');
    }
  }
);

// Async thunk for fetching transporter's bids
export const fetchTransporterBids = createAsyncThunk(
  'transporterOrders/fetchBids',
  async (_, { rejectWithValue }) => {
    try {
      const bids = await transporterOrdersApi.getTransporterBids();
      return bids;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch bids');
    }
  }
);

// Async thunk for fetching transporter's vehicles
export const fetchTransporterVehicles = createAsyncThunk(
  'transporterOrders/fetchVehicles',
  async (_, { rejectWithValue }) => {
    try {
      const vehicles = await transporterOrdersApi.getTransporterVehicles();
      return vehicles;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch vehicles');
    }
  }
);

// Async thunk for assigning vehicle to order
export const assignVehicle = createAsyncThunk(
  'transporterOrders/assignVehicle',
  async ({ orderId, vehicleId }, { rejectWithValue }) => {
    try {
      await transporterOrdersApi.assignVehicleToOrder(orderId, vehicleId);
      return { orderId, vehicleId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to assign vehicle');
    }
  }
);

// Async thunk for unassigning vehicle from order
export const unassignVehicle = createAsyncThunk(
  'transporterOrders/unassignVehicle',
  async ({ tripId, orderId }, { rejectWithValue }) => {
    try {
      await transporterOrdersApi.unassignVehicleFromOrder(tripId, orderId);
      return { tripId, orderId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to unassign vehicle');
    }
  }
);

// Async thunk for starting transit
export const startOrderTransit = createAsyncThunk(
  'transporterOrders/startTransit',
  async (orderId, { rejectWithValue }) => {
    try {
      await transporterOrdersApi.startTransit(orderId);
      return orderId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to start transit');
    }
  }
);

// Async thunk for completing trip
export const completeOrderTrip = createAsyncThunk(
  'transporterOrders/completeTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      await transporterOrdersApi.completeTrip(tripId);
      return tripId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to complete trip');
    }
  }
);

// Initial state
const initialState = {
  orders: [],
  availableOrders: [],
  currentOrder: null,
  bids: [],
  vehicles: [],
  loading: false,
  error: null,
  filters: {
    searchTerm: '',
    statusFilter: 'all',
  },
};

// Slice
const transporterOrdersSlice = createSlice({
  name: 'transporterOrders',
  initialState,
  reducers: {
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
    // Set search filter
    setSearchTerm: (state, action) => {
      state.filters.searchTerm = action.payload;
    },
    // Set status filter
    setStatusFilter: (state, action) => {
      state.filters.statusFilter = action.payload;
    },
    // Clear current order
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transporter orders
      .addCase(fetchTransporterOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransporterOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchTransporterOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.orders = [];
      })

      // Fetch available orders
      .addCase(fetchAvailableOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.availableOrders = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchAvailableOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.availableOrders = [];
      })

      // Fetch order details
      .addCase(fetchTransporterOrderDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransporterOrderDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchTransporterOrderDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Submit bid
      .addCase(submitOrderBid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitOrderBid.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(submitOrderBid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Withdraw bid
      .addCase(withdrawOrderBid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(withdrawOrderBid.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(withdrawOrderBid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch transporter bids
      .addCase(fetchTransporterBids.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransporterBids.fulfilled, (state, action) => {
        state.loading = false;
        state.bids = action.payload;
        state.error = null;
      })
      .addCase(fetchTransporterBids.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch transporter vehicles
      .addCase(fetchTransporterVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransporterVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchTransporterVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Assign vehicle
      .addCase(assignVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignVehicle.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(assignVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Unassign vehicle
      .addCase(unassignVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unassignVehicle.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(unassignVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Start transit
      .addCase(startOrderTransit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startOrderTransit.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(startOrderTransit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Complete trip
      .addCase(completeOrderTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeOrderTrip.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(completeOrderTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions and selectors
export const { clearError, setSearchTerm, setStatusFilter, clearCurrentOrder } = transporterOrdersSlice.actions;

// Selectors
export const selectAllTransporterOrders = (state) => state.transporterOrders.orders;
export const selectAvailableOrders = (state) => state.transporterOrders.availableOrders;
export const selectFilteredTransporterOrders = (state) => {
  const { orders, filters } = state.transporterOrders;
  
  // Ensure orders is always an array
  if (!Array.isArray(orders)) {
    return [];
  }
  
  let filtered = [...orders];

  if (filters.searchTerm) {
    const search = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(order => 
      order._id?.toLowerCase().includes(search) ||
      order.pickup?.city?.toLowerCase().includes(search) ||
      order.delivery?.city?.toLowerCase().includes(search)
    );
  }

  if (filters.statusFilter && filters.statusFilter !== 'all') {
    filtered = filtered.filter(order => 
      order.status?.toLowerCase() === filters.statusFilter.toLowerCase()
    );
  }

  return filtered;
};

export const selectCurrentTransporterOrder = (state) => state.transporterOrders.currentOrder;
export const selectTransporterBids = (state) => state.transporterOrders.bids;
export const selectTransporterVehicles = (state) => state.transporterOrders.vehicles;
export const selectTransporterOrdersLoading = (state) => state.transporterOrders.loading;
export const selectTransporterOrdersError = (state) => state.transporterOrders.error;

export default transporterOrdersSlice.reducer;
