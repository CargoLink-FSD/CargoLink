// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import ordersReducer from './slices/ordersSlice';
import transporterOrdersReducer from './slices/transporterOrdersSlice';

// Configure and export the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: ordersReducer,
    transporterOrders: transporterOrdersReducer,
  },
});

export default store;
