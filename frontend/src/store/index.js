// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import customerReducer from './slices/customerSlice';
import transporterReducer from './slices/transporterSlice';
import ordersReducer from './slices/ordersSlice';
import transporterOrdersReducer from './slices/transporterOrdersSlice';
import bidsReducer from './slices/bidsSlice';

// Configure and export the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    customer: customerReducer,
    transporter: transporterReducer,
    orders: ordersReducer,
    transporterOrders: transporterOrdersReducer,
    bids: bidsReducer,
  },
});

export default store;
