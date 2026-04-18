// Transporter Orders Redux Slice
// Manages transporter orders state and actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as transporterOrdersApi from '../../api/transporterOrders';

// Async thunk for fetching transporter's assigned orders
export const fetchTransporterOrders = createAsyncThunk(
  'transporterOrders/fetchOrders',
  async ({ search = '', status = 'all' } = {}, { rejectWithValue }) => {
    try {
      const orders = await transporterOrdersApi.getTransporterOrders({ search, status });
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

// Initial state
const initialState = {
  orders: [],
  availableOrders: [],
  currentOrder: null,
  bids: [],
  loading: false,
  error: null,
};

// Slice
const transporterOrdersSlice = createSlice({
  name: 'transporterOrders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
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
    }
});

// Export actions and selectors
export const { clearError, clearCurrentOrder } = transporterOrdersSlice.actions;

// Selectors
export const selectAllTransporterOrders = (state) => state.transporterOrders.orders;
export const selectAvailableOrders = (state) => state.transporterOrders.availableOrders;
export const selectCurrentTransporterOrder = (state) => state.transporterOrders.currentOrder;
export const selectTransporterBids = (state) => state.transporterOrders.bids;
export const selectTransporterOrdersLoading = (state) => state.transporterOrders.loading;
export const selectTransporterOrdersError = (state) => state.transporterOrders.error;

export default transporterOrdersSlice.reducer;
