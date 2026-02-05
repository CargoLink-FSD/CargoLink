// Orders Redux Slice
// Manages customer orders state and actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as ordersApi from '../../api/orders';

// Async thunk for fetching customer orders
export const fetchCustomerOrders = createAsyncThunk(
  'orders/fetchCustomerOrders',
  async (_, { rejectWithValue }) => {
    try {
      const orders = await ordersApi.getCustomerOrders();
      return orders;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch orders');
    }
  }
);

// Async thunk for fetching single order details
export const fetchOrderDetails = createAsyncThunk(
  'orders/fetchOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const order = await ordersApi.getOrderDetails(orderId);
      return order;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch order details');
    }
  }
);

// Async thunk for deleting an order
export const deleteCustomerOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      await ordersApi.deleteOrder(orderId);
      return orderId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete order');
    }
  }
);

// Async thunk for fetching order bids
export const fetchOrderBids = createAsyncThunk(
  'orders/fetchOrderBids',
  async (orderId, { rejectWithValue }) => {
    try {
      const bids = await ordersApi.getOrderBids(orderId);
      return { orderId, bids };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch bids');
    }
  }
);

// Async thunk for accepting a bid
export const acceptOrderBid = createAsyncThunk(
  'orders/acceptBid',
  async ({ orderId, bidId }, { rejectWithValue }) => {
    try {
      await ordersApi.acceptBid(orderId, bidId);
      return { orderId, bidId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to accept bid');
    }
  }
);

// Async thunk for rejecting a bid
export const rejectOrderBid = createAsyncThunk(
  'orders/rejectBid',
  async ({ orderId, bidId }, { rejectWithValue }) => {
    try {
      await ordersApi.rejectBid(orderId, bidId);
      return { orderId, bidId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to reject bid');
    }
  }
);

// Async thunk for confirming pickup
export const confirmOrderPickup = createAsyncThunk(
  'orders/confirmPickup',
  async (orderId, { rejectWithValue }) => {
    try {
      await ordersApi.confirmPickup(orderId);
      return orderId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to confirm pickup');
    }
  }
);

// Async thunk for confirming delivery
export const confirmDelivery = createAsyncThunk(
  'orders/confirmDelivery',
  async (orderId, { rejectWithValue }) => {
    try {
      await ordersApi.confirmDelivery(orderId);
      return orderId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to confirm delivery');
    }
  }
);

// Async thunk for placing a new order
export const placeNewOrder = createAsyncThunk(
  'orders/placeOrder',
  async ({ orderData, cargoPhoto }, { rejectWithValue }) => {
    try {
      const response = await ordersApi.placeOrder(orderData, cargoPhoto);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to place order');
    }
  }
);

// Initial state
const initialState = {
  orders: [],
  currentOrder: null,
  orderBids: {},
  loading: false,
  error: null,
  filters: {
    searchTerm: '',
    statusFilter: 'all',
  },
};

// Slice
const ordersSlice = createSlice({
  name: 'orders',
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
      // Fetch customer orders
      .addCase(fetchCustomerOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(fetchCustomerOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch order details
      .addCase(fetchOrderDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete order
      .addCase(deleteCustomerOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomerOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = state.orders.filter(order => order._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteCustomerOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch order bids
      .addCase(fetchOrderBids.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderBids.fulfilled, (state, action) => {
        state.loading = false;
        state.orderBids[action.payload.orderId] = action.payload.bids;
        state.error = null;
      })
      .addCase(fetchOrderBids.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Accept bid
      .addCase(acceptOrderBid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptOrderBid.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(acceptOrderBid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Reject bid
      .addCase(rejectOrderBid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectOrderBid.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(rejectOrderBid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Confirm pickup
      .addCase(confirmOrderPickup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmOrderPickup.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder.status = 'In Transit';
        state.error = null;
      })
      .addCase(confirmOrderPickup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Confirm delivery
      .addCase(confirmDelivery.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmDelivery.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(confirmDelivery.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Place new order
      .addCase(placeNewOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeNewOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(placeNewOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions and selectors
export const { clearError, setSearchTerm, setStatusFilter, clearCurrentOrder } = ordersSlice.actions;

// Selectors
export const selectAllOrders = (state) => state.orders.orders;
export const selectFilteredOrders = (state) => {
  const { orders, filters } = state.orders;
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

export const selectCurrentOrder = (state) => state.orders.currentOrder;
export const selectOrderBids = (orderId) => (state) => state.orders.orderBids[orderId] || [];
export const selectOrdersLoading = (state) => state.orders.loading;
export const selectOrdersError = (state) => state.orders.error;

export default ordersSlice.reducer;
