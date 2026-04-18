// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import customerReducer from './slices/customerSlice';
import driverReducer from './slices/driverSlice';
import transporterReducer from './slices/transporterSlice';
import ordersReducer from './slices/ordersSlice';
import transporterOrdersReducer from './slices/transporterOrdersSlice';
import bidsReducer from './slices/bidsSlice';
import chatReducer from './slices/chatSlice';
import walletReducer from './slices/walletSlice';
import adminCashoutsReducer from './slices/adminCashoutsSlice';

// Configure and export the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    customer: customerReducer,
    driver: driverReducer,
    transporter: transporterReducer,
    orders: ordersReducer,
    transporterOrders: transporterOrdersReducer,
    bids: bidsReducer,
    chat: chatReducer,
    wallet: walletReducer,
    adminCashouts: adminCashoutsReducer,
  },
});


export default store;
