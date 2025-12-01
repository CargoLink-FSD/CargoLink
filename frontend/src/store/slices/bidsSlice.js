/**
 * Bids Redux Slice
 * Manages bid-related state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as bidsApi from '../../api/bids';

// Initial state
const initialState = {
  availableOrders: [],
  myBids: [],
  orderBids: {},
  loading: false,
  error: null,
  submitting: false,
};

// Async Thunks

/**
 * Fetch available orders for bidding
 */
export const fetchAvailableOrders = createAsyncThunk(
  'bids/fetchAvailableOrders',
  async (_, { rejectWithValue }) => {
    try {
      const data = await bidsApi.fetchAvailableOrders();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch available orders');
    }
  }
);

/**
 * Fetch transporter's own bids
 */
export const fetchMyBids = createAsyncThunk(
  'bids/fetchMyBids',
  async (_, { rejectWithValue }) => {
    try {
      const data = await bidsApi.fetchMyBids();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch your bids');
    }
  }
);

/**
 * Submit a bid for an order
 */
export const submitBid = createAsyncThunk(
  'bids/submitBid',
  async ({ orderId, bidAmount, notes }, { rejectWithValue }) => {
    try {
      const data = await bidsApi.submitBid(orderId, bidAmount, notes);
      return { orderId, data };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to submit bid');
    }
  }
);

/**
 * Withdraw a bid
 */
export const withdrawBid = createAsyncThunk(
  'bids/withdrawBid',
  async ({ orderId, bidId }, { rejectWithValue }) => {
    try {
      await bidsApi.withdrawBid(orderId, bidId);
      return { orderId, bidId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to withdraw bid');
    }
  }
);

/**
 * Get bids for a specific order
 */
export const getOrderBids = createAsyncThunk(
  'bids/getOrderBids',
  async (orderId, { rejectWithValue }) => {
    try {
      const data = await bidsApi.getOrderBids(orderId);
      return { orderId, bids: data };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch order bids');
    }
  }
);

// Slice
const bidsSlice = createSlice({
  name: 'bids',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearBids: (state) => {
      state.availableOrders = [];
      state.myBids = [];
      state.orderBids = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Available Orders
      .addCase(fetchAvailableOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.availableOrders = action.payload;
      })
      .addCase(fetchAvailableOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch My Bids
      .addCase(fetchMyBids.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyBids.fulfilled, (state, action) => {
        state.loading = false;
        state.myBids = action.payload;
      })
      .addCase(fetchMyBids.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Submit Bid
      .addCase(submitBid.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitBid.fulfilled, (state, action) => {
        state.submitting = false;
        // Mark order as already bid in available orders
        const order = state.availableOrders.find(o => o._id === action.payload.orderId);
        if (order) {
          order.already_bid = true;
        }
      })
      .addCase(submitBid.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      
      // Withdraw Bid
      .addCase(withdrawBid.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(withdrawBid.fulfilled, (state, action) => {
        state.submitting = false;
        state.myBids = state.myBids.filter(bid => bid.id !== action.payload.bidId);
      })
      .addCase(withdrawBid.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      
      // Get Order Bids
      .addCase(getOrderBids.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOrderBids.fulfilled, (state, action) => {
        state.loading = false;
        state.orderBids[action.payload.orderId] = action.payload.bids;
      })
      .addCase(getOrderBids.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearBids } = bidsSlice.actions;
export default bidsSlice.reducer;
